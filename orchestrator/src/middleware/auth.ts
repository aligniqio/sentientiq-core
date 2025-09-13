import { Request, Response, NextFunction } from 'express';

// Simple auth middleware stub for now
// Will be replaced with Clerk auth in production
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Add user to request for now
  (req as any).user = {
    id: 'test-user',
    email: 'test@example.com',
    tenantId: 'test-tenant'
  };
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  // Simple admin check
  (req as any).user = {
    id: 'admin-user',
    email: 'admin@example.com',
    tenantId: 'admin-tenant',
    isAdmin: true
  };
  next();
}

export function requireTenantAdmin(req: Request, res: Response, next: NextFunction) {
  // Simple tenant admin check
  (req as any).user = {
    id: 'tenant-admin-user',
    email: 'tenant-admin@example.com',
    tenantId: 'tenant-123',
    isAdmin: true
  };
  next();
}