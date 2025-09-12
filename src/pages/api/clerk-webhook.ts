import { NextApiRequest, NextApiResponse } from 'next';
import { Webhook } from 'svix';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase with service role
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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify the webhook signature
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('CLERK_WEBHOOK_SECRET not set');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  const svix_id = req.headers['svix-id'] as string;
  const svix_timestamp = req.headers['svix-timestamp'] as string;
  const svix_signature = req.headers['svix-signature'] as string;

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return res.status(400).json({ error: 'Missing svix headers' });
  }

  const body = JSON.stringify(req.body);
  const wh = new Webhook(webhookSecret);
  
  let evt: any;
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    });
  } catch (err) {
    console.error('Webhook verification failed:', err);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  // Store webhook event for debugging
  await supabase.from('webhook_events').insert({
    source: 'clerk',
    event_type: evt.type,
    event_id: evt.data.id,
    payload: evt,
    processed: false
  });

  try {
    switch (evt.type) {
      case 'user.created':
      case 'user.updated':
        await handleUserUpsert(evt.data);
        break;
        
      case 'user.deleted':
        await handleUserDeleted(evt.data);
        break;
        
      case 'organizationMembership.created':
        await handleMembershipCreated(evt.data);
        break;
        
      case 'organizationMembership.deleted':
        await handleMembershipDeleted(evt.data);
        break;
        
      case 'organizationInvitation.accepted':
        await handleInvitationAccepted(evt.data);
        break;
        
      case 'organization.created':
      case 'organization.updated':
        await handleOrganizationUpsert(evt.data);
        break;
        
      default:
        console.log('Unhandled webhook type:', evt.type);
    }

    // Mark as processed
    await supabase
      .from('webhook_events')
      .update({ 
        processed: true, 
        processed_at: new Date().toISOString() 
      })
      .eq('event_id', evt.data.id);

    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    
    // Mark as failed
    await supabase
      .from('webhook_events')
      .update({ 
        processed: true,
        processed_at: new Date().toISOString(),
        error: error.message 
      })
      .eq('event_id', evt.data.id);
    
    return res.status(500).json({ error: 'Processing failed' });
  }
}

async function handleUserUpsert(userData: any) {
  const email = userData.email_addresses?.[0]?.email_address;
  if (!email) return;

  const { error } = await supabase
    .from('users')
    .upsert({
      clerk_user_id: userData.id,
      email: email,
      name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || email,
      metadata: {
        avatar_url: userData.image_url,
        created_at_clerk: userData.created_at,
        external_accounts: userData.external_accounts
      },
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'clerk_user_id'
    });

  if (error) {
    console.error('Error upserting user:', error);
    throw error;
  }
}

async function handleUserDeleted(userData: any) {
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('clerk_user_id', userData.id);

  if (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
}

async function handleMembershipCreated(membershipData: any) {
  // Get user from our database
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_user_id', membershipData.public_user_data?.user_id)
    .single();

  if (!user) {
    console.log('User not found for membership:', membershipData.public_user_data?.user_id);
    return;
  }

  // Map Clerk organization ID to our organization
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('metadata->clerk_org_id', membershipData.organization.id)
    .single();

  if (!org) {
    console.log('Organization not found:', membershipData.organization.id);
    return;
  }

  const { error } = await supabase
    .from('memberships')
    .upsert({
      user_id: user.id,
      organization_id: org.id,
      role: membershipData.role === 'admin' ? 'admin' : 'user',
      invitation_status: 'accepted',
      joined_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,organization_id'
    });

  if (error) {
    console.error('Error creating membership:', error);
    throw error;
  }
}

async function handleMembershipDeleted(membershipData: any) {
  // Get user from our database
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_user_id', membershipData.public_user_data?.user_id)
    .single();

  if (!user) return;

  // Map Clerk organization ID to our organization
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('metadata->clerk_org_id', membershipData.organization.id)
    .single();

  if (!org) return;

  const { error } = await supabase
    .from('memberships')
    .delete()
    .eq('user_id', user.id)
    .eq('organization_id', org.id);

  if (error) {
    console.error('Error deleting membership:', error);
    throw error;
  }
}

async function handleInvitationAccepted(invitationData: any) {
  const email = invitationData.email_address;
  
  // Update membership status
  const { error } = await supabase
    .from('memberships')
    .update({
      invitation_status: 'accepted',
      joined_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('clerk_invitation_id', invitationData.id);

  if (error) {
    console.error('Error updating invitation status:', error);
    throw error;
  }
}

async function handleOrganizationUpsert(orgData: any) {
  // Check if we have this org ID in metadata
  const orgId = orgData.public_metadata?.organizationId;
  
  if (orgId) {
    // Update the Clerk org ID reference
    const { error } = await supabase
      .from('organizations')
      .update({
        metadata: {
          clerk_org_id: orgData.id,
          clerk_slug: orgData.slug
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', orgId);

    if (error) {
      console.error('Error updating organization:', error);
      throw error;
    }
  }
}

// Disable body parsing to get raw body for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper to get raw body
async function getRawBody(req: NextApiRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      resolve(data);
    });
    req.on('error', reject);
  });
}