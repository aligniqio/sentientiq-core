import { createClerkClient } from '@clerk/clerk-sdk-node';

export async function handler(event, context) {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { 
      companyName, 
      adminEmail, 
      tenantType,
      subscriptionTier,
      userId // Current user ID to associate with org
    } = JSON.parse(event.body);

    // Initialize Clerk client
    const clerkClient = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY
    });

    // Create organization in Clerk
    const organization = await clerkClient.organizations.createOrganization({
      name: companyName,
      publicMetadata: {
        tenantType,
        subscriptionTier,
        adminEmail
      }
    });

    // Add the current user as an admin of the new organization
    if (userId) {
      await clerkClient.organizations.createOrganizationMembership({
        organizationId: organization.id,
        userId,
        role: 'admin'
      });
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        organizationId: organization.id,
        name: organization.name
      })
    };
  } catch (error) {
    console.error('Error creating organization:', error);
    return {
      statusCode: error.statusCode || 500,
      body: JSON.stringify({ 
        error: error.message || 'Failed to create organization',
        details: error.errors || []
      })
    };
  }
}