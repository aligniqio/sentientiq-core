import { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useSuperAdmin } from '../hooks/useSuperAdmin';

export default function DebugSuperAdmin() {
  const { user } = useUser();
  const { isSuperAdmin, isLoading, supabase } = useSuperAdmin();
  const [dbCheck, setDbCheck] = useState<any>(null);
  
  useEffect(() => {
    const checkDatabase = async () => {
      if (!supabase || !user) return;
      
      const email = user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress;
      
      // Check by clerk ID
      const { data: byId, error: idError } = await supabase
        .from('users')
        .select('*')
        .eq('clerk_user_id', user.id)
        .single();
        
      // Check by email
      const { data: byEmail, error: emailError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
        
      // Get all super admins
      const { data: superAdmins } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'super_admin');
        
      setDbCheck({
        clerkUserId: user.id,
        userEmail: email,
        byIdResult: byId,
        byIdError: idError?.message,
        byEmailResult: byEmail,
        byEmailError: emailError?.message,
        allSuperAdmins: superAdmins
      });
    };
    
    if (user && supabase) {
      checkDatabase();
    }
  }, [user, supabase]);
  
  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-2xl font-bold mb-6">Super Admin Debug Info</h1>
      
      <div className="space-y-4 font-mono text-sm">
        <div className="bg-gray-900 p-4 rounded">
          <h2 className="text-green-400 mb-2">Hook Results:</h2>
          <div>isSuperAdmin: {String(isSuperAdmin)}</div>
          <div>isLoading: {String(isLoading)}</div>
          <div>supabase initialized: {String(!!supabase)}</div>
        </div>
        
        <div className="bg-gray-900 p-4 rounded">
          <h2 className="text-green-400 mb-2">Clerk User Info:</h2>
          <div>ID: {user?.id}</div>
          <div>Primary Email: {user?.primaryEmailAddress?.emailAddress}</div>
          <div>All Emails: {user?.emailAddresses?.map(e => e.emailAddress).join(', ')}</div>
        </div>
        
        {dbCheck && (
          <div className="bg-gray-900 p-4 rounded">
            <h2 className="text-green-400 mb-2">Database Check Results:</h2>
            <div className="space-y-2">
              <div className="text-yellow-400">Query by Clerk ID ({dbCheck.clerkUserId}):</div>
              <pre className="text-xs overflow-auto">
                {dbCheck.byIdError ? `Error: ${dbCheck.byIdError}` : JSON.stringify(dbCheck.byIdResult, null, 2)}
              </pre>
              
              <div className="text-yellow-400">Query by Email ({dbCheck.userEmail}):</div>
              <pre className="text-xs overflow-auto">
                {dbCheck.byEmailError ? `Error: ${dbCheck.byEmailError}` : JSON.stringify(dbCheck.byEmailResult, null, 2)}
              </pre>
              
              <div className="text-yellow-400">All Super Admins in Database:</div>
              <pre className="text-xs overflow-auto">
                {JSON.stringify(dbCheck.allSuperAdmins, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}