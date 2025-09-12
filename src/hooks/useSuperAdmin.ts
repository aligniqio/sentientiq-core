import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { getSupabaseClient } from '../lib/supabase';

/**
 * Hook to check if the current user is a super admin
 * Checks against the database, not hardcoded emails
 */
export function useSuperAdmin() {
  const { user } = useUser();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = getSupabaseClient();

  useEffect(() => {
    const checkSuperAdmin = async () => {
      if (!user || !supabase) {
        setIsSuperAdmin(false);
        setIsLoading(false);
        return;
      }

      try {
        // Check if user exists in database with super_admin role
        const { data, error } = await supabase
          .from('users')
          .select('role')
          .eq('clerk_user_id', user.id)
          .single();

        if (error) {
          // User might not exist yet, check by email
          const userEmail = user.emailAddresses?.[0]?.emailAddress;
          if (userEmail) {
            const { data: emailData, error: emailError } = await supabase
              .from('users')
              .select('role')
              .eq('email', userEmail)
              .single();

            if (!emailError && emailData?.role === 'super_admin') {
              setIsSuperAdmin(true);
              
              // Update the clerk_user_id for future lookups
              await supabase
                .from('users')
                .update({ clerk_user_id: user.id })
                .eq('email', userEmail);
            }
          }
        } else if (data?.role === 'super_admin') {
          setIsSuperAdmin(true);
        }
      } catch (error) {
        console.error('Error checking super admin status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user && supabase) {
      checkSuperAdmin();
    } else if (!user) {
      setIsSuperAdmin(false);
      setIsLoading(false);
    }
  }, [user, supabase]);

  return { isSuperAdmin, isLoading, supabase };
}

/**
 * Function to grant super admin access to a user
 * This should only be called by existing super admins
 */
export async function grantSuperAdminAccess(
  supabase: any,
  email: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // First check if user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // Error other than "not found"
      return { success: false, error: fetchError.message };
    }

    if (existingUser) {
      // Update existing user
      const { error: updateError } = await supabase
        .from('users')
        .update({ role: 'super_admin' })
        .eq('email', email);

      if (updateError) {
        return { success: false, error: updateError.message };
      }
    } else {
      // Create new super admin user
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          email: email,
          name: email.split('@')[0], // Default name from email
          role: 'super_admin'
        });

      if (insertError) {
        return { success: false, error: insertError.message };
      }
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Function to revoke super admin access
 */
export async function revokeSuperAdminAccess(
  supabase: any,
  email: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ role: 'user' })
      .eq('email', email);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}