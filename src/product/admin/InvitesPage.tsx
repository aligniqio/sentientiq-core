import { useEffect, useState } from 'react';
import AdminShell from './AdminShell';
import { useAuth } from '@clerk/clerk-react';

export default function InvitesPage() {
  const [tenantId, setTenantId] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('user');
  const [rows, setRows] = useState<any[]>([]);
  const { getToken } = useAuth();

  async function authHeader() {
    const token = await getToken();
    return { 'Authorization': `Bearer ${token}` };
  }

  async function send() {
    if (!tenantId || !email) {
      alert('Please fill in tenant ID and email');
      return;
    }
    
    const headers = await authHeader();
    const res = await fetch('/v1/admin/invites', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify({ tenantId, email, role })
    });
    
    if (res.ok) {
      setTenantId('');
      setEmail('');
      setRole('user');
      load();
    } else {
      const err = await res.json();
      alert(`Error: ${err.error || 'Failed to send invite'}`);
    }
  }

  async function load() {
    const headers = await authHeader();
    const r = await fetch('/v1/admin/activity', { headers });
    const j = await r.json();
    setRows(j.data || []);
  }

  useEffect(() => { load(); }, []);

  return (
    <AdminShell>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-4">Send Invite</h2>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm text-gray-400 mb-1">Tenant UUID</label>
              <input 
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" 
                value={tenantId} 
                onChange={e => setTenantId(e.target.value)}
              />
            </div>
            
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm text-gray-400 mb-1">Email</label>
              <input 
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500"
                placeholder="email@company.com" 
                value={email} 
                onChange={e => setEmail(e.target.value)}
                type="email"
              />
            </div>
            
            <div className="min-w-[150px]">
              <label className="block text-sm text-gray-400 mb-1">Role</label>
              <select 
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                value={role} 
                onChange={e => setRole(e.target.value)}
              >
                <option value="user">User</option>
                <option value="tenant_admin">Tenant Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
            
            <button 
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg transition-all"
              onClick={send}
            >
              Send Invite
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">Recent Admin Events</h3>
          {rows.length === 0 ? (
            <p className="text-gray-400 text-sm">No recent activity</p>
          ) : (
            <div className="space-y-2">
              {rows.map((r: any) => (
                <div 
                  key={r.id} 
                  className="bg-white/5 border border-white/10 rounded-lg p-3 text-sm"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <span className="text-gray-400">
                        {new Date(r.created_at).toLocaleString()}
                      </span>
                      <span className="mx-2 text-gray-600">—</span>
                      <span className="font-medium text-purple-400">
                        {r.action}
                      </span>
                      {r.target && (
                        <>
                          <span className="mx-2 text-gray-600">—</span>
                          <span className="text-gray-300 font-mono text-xs">
                            {typeof r.target === 'string' ? r.target : JSON.stringify(r.target)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}