import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        tenantId: string;
        isAdmin?: boolean;
      };
      auth?: {
        userId: string;
        orgId?: string;
        sessionId: string;
        email?: string;
      };
    }
  }
}

export {};