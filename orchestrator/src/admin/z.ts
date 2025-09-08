import { z } from 'zod';

export const TenantCreate = z.object({
  name: z.string().min(2),
  plan: z.enum(['free','starter','pro','team','enterprise']).default('free'),
  is_whitelabel: z.boolean().default(false),
  persona_cap: z.number().int().min(1).max(12).optional(),
  settings: z.object({
    marketing_domain: z.string().url().optional(),
    app_domain: z.string().url().optional(),
    logo_url: z.string().url().optional(),
    primary_color: z.string().optional(),
    email_from: z.string().optional(),
    email_domain: z.string().optional()
  }).partial().optional()
});

export const InviteCreate = z.object({
  tenantId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['super_admin','tenant_admin','user']).default('user')
});

export const MembershipCreate = z.object({
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(['super_admin','tenant_admin','user']).default('user')
});

export const TenantUpdate = z.object({
  tenantId: z.string().uuid(),
  name: z.string().min(2).optional(),
  plan: z.enum(['free','starter','pro','team','enterprise']).optional(),
  is_whitelabel: z.boolean().optional(),
  persona_cap: z.number().int().min(1).max(12).optional(),
  settings: z.record(z.any()).optional()
});