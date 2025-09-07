// Admin authorization - hardcoded for now since Supabase is wiped
// This is a temporary solution until proper role management is restored

export const ADMIN_EMAILS = [
  'matt@sentientiq.ai',
  // Add your admin email here
];

export const ADMIN_USER_IDS = [
  // Add your Clerk user ID here when you get it
  // 'user_2abc...'
];

export function isAdmin(user: any): boolean {
  if (!user) return false;
  
  // Check by email
  const email = user.emailAddresses?.[0]?.emailAddress || user.email;
  if (email && ADMIN_EMAILS.includes(email)) {
    return true;
  }
  
  // Check by user ID
  if (user.id && ADMIN_USER_IDS.includes(user.id)) {
    return true;
  }
  
  return false;
}

// For super admin features (like viewing all tenants)
export function isSuperAdmin(user: any): boolean {
  const email = user.emailAddresses?.[0]?.emailAddress || user.email;
  return email === 'matt@sentientiq.ai';
}