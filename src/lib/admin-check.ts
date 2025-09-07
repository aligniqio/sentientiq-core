// Role-based authorization
// Roles: super_admin > tenant_admin > tenant > user

export const SUPER_ADMIN_EMAILS: string[] = [
  'matt@sentientiq.ai',
];

export const ADMIN_USER_IDS: string[] = [
  // Add Clerk user IDs here when needed
  // 'user_2abc...'
];

export type UserRole = 'super_admin' | 'tenant_admin' | 'tenant' | 'user';

export function getUserEmail(user: any): string {
  return user?.emailAddresses?.[0]?.emailAddress || user?.email || '';
}

// Check if user has admin access (tenant_admin or super_admin)
export function isAdmin(user: any): boolean {
  if (!user) return false;
  
  const email = getUserEmail(user);
  
  // Super admins are always admins
  if (SUPER_ADMIN_EMAILS.includes(email)) {
    return true;
  }
  
  // Check by user ID
  if (user.id && ADMIN_USER_IDS.includes(user.id)) {
    return true;
  }
  
  // TODO: Check role from Supabase when connected
  // const role = user.publicMetadata?.role || user.role;
  // return role === 'tenant_admin' || role === 'super_admin';
  
  return false;
}

// Check if user is a tenant (owns a white-label instance)
export function isTenant(user: any): boolean {
  const email = getUserEmail(user);
  
  // Super admins have all permissions
  if (SUPER_ADMIN_EMAILS.includes(email)) {
    return true;
  }
  
  // TODO: Check role from Supabase
  // const role = user.publicMetadata?.role || user.role;
  // return role === 'tenant' || role === 'tenant_admin' || role === 'super_admin';
  
  return false;
}

// Check if user is THE super admin
export function isSuperAdmin(user: any): boolean {
  const email = getUserEmail(user);
  return SUPER_ADMIN_EMAILS.includes(email);
  
  // TODO: Also check role from Supabase
  // const role = user.publicMetadata?.role || user.role;
  // return role === 'super_admin';
}