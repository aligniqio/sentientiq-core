import { useUser } from '@clerk/clerk-react';
import { isAdmin } from '../lib/admin-check';

interface AdminRouteProps {
  children: React.ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>;
  }

  if (!user || !isAdmin(user)) {
    // Log the attempt
    const email = user?.emailAddresses?.[0]?.emailAddress || 'unknown';
    console.warn(`🚨 Unauthorized admin access attempt by: ${email} (${user?.id || 'no-id'})`);
    
    // Show unauthorized message
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-red-500 mb-4">Access Denied</h1>
          <p className="text-white/60">You don't have permission to access this area.</p>
          <p className="text-white/40 text-sm mt-4">This incident has been logged.</p>
          <button 
            onClick={() => window.location.href = '/'}
            className="mt-8 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}