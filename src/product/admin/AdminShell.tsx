import React from 'react';

export default function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="relative z-10">
        {/* Background effects matching main app */}
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-950/20 via-black to-blue-950/20" />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="relative z-10 p-8">
          <header className="mb-8 backdrop-blur-2xl bg-white/5 border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">A</span>
                </div>
                <h1 className="text-2xl font-bold">Super Admin</h1>
              </div>
              <nav className="flex gap-6 text-sm">
                <a href="/admin/tenants" className="text-gray-400 hover:text-white transition-colors">Tenants</a>
                <a href="/admin/users" className="text-gray-400 hover:text-white transition-colors">Users</a>
                <a href="/admin/invites" className="text-gray-400 hover:text-white transition-colors">Invites</a>
                <a href="/admin/activity" className="text-gray-400 hover:text-white transition-colors">Activity</a>
              </nav>
            </div>
          </header>
          
          <div className="backdrop-blur-2xl bg-white/5 border border-white/10 rounded-xl p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}