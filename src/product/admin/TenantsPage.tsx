import { useEffect, useState } from 'react';
import AdminShell from './AdminShell';
import { useAuth } from '@clerk/clerk-react';

export default function TenantsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const { getToken } = useAuth();

  async function authHeader() {
    const token = await getToken();
    return { 'Authorization': `Bearer ${token}` };
  }

  async function load() {
    const headers = await authHeader();
    const r = await fetch(`/v1/admin/tenants${q ? `?q=${encodeURIComponent(q)}` : ''}`, { headers });
    const j = await r.json();
    setRows(j.data || j);
  }

  useEffect(() => { load(); }, []);

  return (
    <AdminShell>
      <div className="flex items-center gap-3 mb-6">
        <input 
          value={q} 
          onChange={e => setQ(e.target.value)} 
          placeholder="Search tenants..." 
          className="flex-1 max-w-sm bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
        />
        <button 
          className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg transition-colors"
          onClick={load}
        >
          Search
        </button>
        <CreateTenantButton onDone={load} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 px-4 text-gray-400">Name</th>
              <th className="text-left py-3 px-4 text-gray-400">Plan</th>
              <th className="text-left py-3 px-4 text-gray-400">Whitelabel</th>
              <th className="text-left py-3 px-4 text-gray-400">Cap</th>
              <th className="text-left py-3 px-4 text-gray-400">Created</th>
            </tr>
          </thead>
          <tbody>
            {rows?.map((t: any) => (
              <tr key={t.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="py-3 px-4">{t.name}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    t.plan === 'enterprise' ? 'bg-purple-600/20 text-purple-400' :
                    t.plan === 'pro' || t.plan === 'team' ? 'bg-blue-600/20 text-blue-400' :
                    'bg-gray-600/20 text-gray-400'
                  }`}>
                    {t.plan}
                  </span>
                </td>
                <td className="py-3 px-4">{t.is_whitelabel ? '✓' : '-'}</td>
                <td className="py-3 px-4">{t.persona_cap ?? '-'}</td>
                <td className="py-3 px-4 text-gray-400">{new Date(t.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}

function CreateTenantButton({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [plan, setPlan] = useState('free');
  const [wl, setWL] = useState(false);
  const [cap, setCap] = useState('');
  const { getToken } = useAuth();

  async function submit() {
    const token = await getToken();
    const body: any = { name, plan, is_whitelabel: wl };
    if (cap) body.persona_cap = parseInt(cap);
    
    await fetch('/v1/admin/tenants', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(body)
    });
    setOpen(false);
    setName('');
    setPlan('free');
    setWL(false);
    setCap('');
    onDone();
  }

  return (
    <>
      <button 
        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg transition-all"
        onClick={() => setOpen(true)}
      >
        New Tenant
      </button>
      
      {open && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm grid place-items-center z-50">
          <div className="bg-zinc-900 border border-white/10 rounded-xl p-6 w-[480px] space-y-4">
            <h3 className="text-xl font-semibold">Create Tenant</h3>
            
            <input 
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-400"
              placeholder="Tenant name" 
              value={name} 
              onChange={e => setName(e.target.value)}
            />
            
            <div className="flex items-center gap-3">
              <label className="text-gray-400">Plan:</label>
              <select 
                value={plan} 
                onChange={e => setPlan(e.target.value)} 
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2"
              >
                <option value="free">Free</option>
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="team">Team</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            
            <input 
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-400"
              placeholder="Persona cap (optional, 1-12)" 
              value={cap} 
              onChange={e => setCap(e.target.value)}
              type="number"
              min="1"
              max="12"
            />
            
            <label className="flex items-center gap-2 text-gray-400">
              <input 
                type="checkbox" 
                checked={wl} 
                onChange={e => setWL(e.target.checked)}
                className="rounded"
              />
              Whitelabel
            </label>
            
            <div className="flex justify-end gap-3 pt-2">
              <button 
                className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg transition-colors"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button 
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg transition-all"
                onClick={submit}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}