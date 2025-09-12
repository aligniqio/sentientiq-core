import { NextApiRequest, NextApiResponse } from 'next';
import { createClerkClient } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Clerk
const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!
});

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      email,
      name,
      organizationId,
      organizationName,
      role = 'user'
    } = req.body;

    // Validate required fields
    if (!email || !organizationId) {
      return res.status(400).json({ 
        error: 'Email and organizationId are required' 
      });
    }

    // First, check if user already exists in Clerk
    let clerkUser;
    try {
      const users = await clerkClient.users.getUserList({
        emailAddress: [email]
      });
      
      if (users.data && users.data.length > 0) {
        clerkUser = users.data[0];
        console.log('Found existing Clerk user:', clerkUser.id);
        
        // If user exists, add them to the organization directly
        try {
          // Check if they're already a member
          const memberships = await clerkClient.organizations.getOrganizationMembershipList({
            organizationId: organizationId
          });
          
          const existingMember = memberships.data?.find(
            m => m.publicUserData?.userId === clerkUser.id
          );
          
          if (!existingMember) {
            // Add to Clerk organization
            await clerkClient.organizations.createOrganizationMembership({
              organizationId: organizationId,
              userId: clerkUser.id,
              role: role === 'admin' ? 'admin' : 'basic_member'
            });
          }
          
          // Update/create user in Supabase
          const { data: userData, error: userError } = await supabase
            .from('users')
            .upsert({
              clerk_user_id: clerkUser.id,
              email: email,
              name: name || clerkUser.firstName + ' ' + clerkUser.lastName,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'clerk_user_id'
            })
            .select()
            .single();
          
          if (userError) throw userError;
          
          // Add membership in Supabase
          const { error: membershipError } = await supabase
            .from('memberships')
            .upsert({
              user_id: userData.id,
              organization_id: organizationId,
              user_email: email,
              user_name: name,
              role: role,
              invitation_status: 'accepted',
              joined_at: new Date().toISOString()
            }, {
              onConflict: 'user_id,organization_id'
            });
          
          if (membershipError) throw membershipError;
          
          return res.status(200).json({ 
            success: true,
            message: 'User added to organization',
            userId: clerkUser.id
          });
        } catch (orgError) {
          console.error('Error adding user to organization:', orgError);
          throw orgError;
        }
      }
    } catch (searchError) {
      console.log('User not found, will send invitation');
    }

    // If user doesn't exist, create an invitation
    try {
      // First, ensure the organization exists in Clerk
      let clerkOrg;
      try {
        clerkOrg = await clerkClient.organizations.getOrganization({
          organizationId: organizationId
        });
      } catch (orgError) {
        // Organization doesn't exist in Clerk, create it
        const { data: orgData } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', organizationId)
          .single();
        
        if (orgData) {
          clerkOrg = await clerkClient.organizations.createOrganization({
            name: orgData.company_name,
            slug: orgData.domain?.replace(/\./g, '-') || orgData.company_name.toLowerCase().replace(/\s+/g, '-'),
            publicMetadata: {
              organizationId: organizationId,
              tier: orgData.subscription_tier
            }
          });
        }
      }

      // Create the invitation
      const invitation = await clerkClient.organizations.createOrganizationInvitation({
        organizationId: clerkOrg?.id || organizationId,
        emailAddress: email,
        inviterUserId: req.headers['x-clerk-user-id'] as string || 'system',
        role: role === 'admin' ? 'admin' : 'basic_member',
        publicMetadata: {
          organizationName: organizationName,
          invitedBy: 'super_admin'
        }
      });

      // Store invitation in Supabase memberships
      const { error: membershipError } = await supabase
        .from('memberships')
        .insert({
          organization_id: organizationId,
          user_email: email,
          user_name: name,
          role: role,
          clerk_invitation_id: invitation.id,
          invitation_status: 'pending'
        });
      
      if (membershipError) {
        // If duplicate, update instead
        if (membershipError.code === '23505') {
          await supabase
            .from('memberships')
            .update({
              clerk_invitation_id: invitation.id,
              invitation_status: 'pending',
              updated_at: new Date().toISOString()
            })
            .eq('organization_id', organizationId)
            .eq('user_email', email);
        } else {
          throw membershipError;
        }
      }

      return res.status(200).json({ 
        success: true,
        invitationId: invitation.id,
        message: 'Invitation sent successfully'
      });
    } catch (inviteError: any) {
      console.error('Error creating invitation:', inviteError);
      return res.status(400).json({ 
        error: inviteError.message || 'Failed to create invitation' 
      });
    }
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal server error' 
    });
  }
}