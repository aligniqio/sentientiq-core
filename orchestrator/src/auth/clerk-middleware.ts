import { Request, Response, NextFunction } from 'express';
import { Webhook } from 'svix';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

// JWKS client for verifying Clerk JWTs
const client = jwksClient({
  jwksUri: `https://api.clerk.com/v1/jwks`,
  cache: true,
  rateLimit: true,
});

function getKey(header: any, callback: any) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
    } else {
      const signingKey = key?.getPublicKey();
      callback(null, signingKey);
    }
  });
}

// Verify Clerk JWT tokens
export async function verifyClerkToken(token: string): Promise<any> {
  return new Promise((resolve, reject) => {
    jwt.verify(token, getKey as any, {
      algorithms: ['RS256'],
    }, (err, decoded) => {
      if (err) {
        reject(err);
      } else {
        resolve(decoded);
      }
    });
  });
}

// Middleware to validate Clerk session
export async function requireClerkAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No authorization token' });
    }

    const decoded = await verifyClerkToken(token);
    
    // Add user info to request
    (req as any).auth = {
      userId: decoded.sub,
      orgId: decoded.org_id,
      sessionId: decoded.sid,
      email: decoded.email,
    };

    next();
  } catch (error) {
    console.error('Clerk auth error:', error);
    res.status(401).json({ error: 'Invalid authorization' });
  }
}

// Webhook validation for Clerk events
export function validateClerkWebhook(req: Request): boolean {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error('CLERK_WEBHOOK_SECRET not configured');
  }

  const svix_id = req.headers['svix-id'] as string;
  const svix_timestamp = req.headers['svix-timestamp'] as string;
  const svix_signature = req.headers['svix-signature'] as string;

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return false;
  }

  const webhook = new Webhook(webhookSecret);
  
  try {
    webhook.verify(JSON.stringify(req.body), {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    });
    return true;
  } catch (error) {
    console.error('Webhook validation failed:', error);
    return false;
  }
}

// Extract tenant ID from Clerk org or user
export function getTenantId(auth: any): string {
  // Use org ID if available, otherwise use user ID
  return auth.orgId || auth.userId;
}

// Type for authenticated user
export interface AuthenticatedUser {
  userId: string;
  orgId?: string;
  sessionId: string;
  email?: string;
  clerkId?: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  tier?: 'free' | 'starter' | 'growth' | 'scale' | 'enterprise';
  isSuper?: boolean;
}