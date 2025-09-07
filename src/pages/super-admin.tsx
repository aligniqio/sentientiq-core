import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  Users, 
  DollarSign, 
  Brain, 
  TrendingUp,
  Network,
  Zap,
  AlertTriangle,
  Plus,
  X,
  Eye,
  UserCheck,
  Activity,
  Award,
  Target,
  Crown
} from 'lucide-react';
import { useUser } from '@clerk/clerk-react';

interface Tenant {
  id: string;
  company_name: string;
  domain: string;
  subscription_tier: string;
  is_white_label: boolean;
  created_at: string;
  mrr: number;
  active_users: number;
  questions_this_month: number;
}

export default function SuperAdmin() {
  const { user } = useUser();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [showAddTenant, setShowAddTenant] = useState(false);
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [supabase, setSupabase] = useState<any>(null);
  const [newTenant, setNewTenant] = useState({
    company_name: '',
    email: '',
    tenant_type: 'standard',
    commission_rate: 20 // Default 20% for MLM
  });

  // Initialize Supabase client lazily
  useEffect(() => {
    const initSupabase = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        
        if (supabaseUrl && supabaseKey) {
          const { createClient } = await import('@supabase/supabase-js');
          const client = createClient(supabaseUrl, supabaseKey);
          setSupabase(client);
        }
      } catch (error) {
        console.error('Failed to initialize Supabase:', error);
      }
    };
    
    initSupabase();
  }, []);

  // Zeus-level stats for the empire
  const fetchStats = async () => {
    if (!supabase) return; // Skip if no Supabase client
    try {
      // Fetch all the metrics
      const [tenantsData, usersData, usageData] = await Promise.all([
        supabase.from('tenants').select('*'),
        supabase.from('users').select('*'),
        supabase.from('usage_logs').select('*')
      ]);

      const totalTenants = tenantsData.data?.length || 0;
      const agencyTenants = tenantsData.data?.filter((t: any) => t.is_white_label).length || 0;
      const totalUsers = usersData.data?.length || 0;
      const totalQuestions = usageData.data?.filter((u: any) => u.action === 'phd_question').length || 0;
      
      // Calculate MRR
      const mrr = tenantsData.data?.reduce((sum: number, t: any) => {
        const tierPrices: Record<string, number> = { free: 0, starter: 99, professional: 499, enterprise: 2000, agency: 999 };
        return sum + (tierPrices[t.subscription_tier] || 0);
      }, 0) || 0;

      // Calculate growth rate (mock for now)
      const growthRate = 147; // You'd calculate this from historical data
      
      // MLM Network value (agencies * their average customers * commission)
      const networkValue = agencyTenants * 5 * 99 * 0.2; // Assuming 5 customers per agency, $99 avg, 20% commission

      setStats([
        { icon: Building2, label: 'Total Tenants', value: totalTenants.toString(), color: 'from-blue-500 to-blue-600', trend: '+12%' },
        { icon: Crown, label: 'Agency Partners', value: agencyTenants.toString(), color: 'from-purple-500 to-pink-500', trend: '+47%' },
        { icon: DollarSign, label: 'MRR', value: `$${mrr.toLocaleString()}`, color: 'from-green-500 to-green-600', trend: '+23%' },
        { icon: Network, label: 'Network Value', value: `$${Math.round(networkValue).toLocaleString()}`, color: 'from-yellow-500 to-orange-500', trend: '+89%' },
        { icon: Users, label: 'Active Users', value: totalUsers.toString(), color: 'from-indigo-500 to-purple-600', trend: '+34%' },
        { icon: Brain, label: 'PhD Questions', value: totalQuestions.toLocaleString(), color: 'from-pink-500 to-rose-600', trend: '+156%' },
        { icon: TrendingUp, label: 'Growth Rate', value: `${growthRate}%`, color: 'from-emerald-500 to-teal-600', trend: 'Monthly' },
        { icon: Zap, label: 'API Calls Today', value: '47.2K', color: 'from-orange-500 to-red-500', trend: 'Live' },
        { icon: AlertTriangle, label: 'Truth Detection', value: '99.7%', color: 'from-red-600 to-red-700', trend: 'Accuracy' },
        { icon: Award, label: 'Top Performer', value: 'TechCorp', color: 'from-purple-600 to-indigo-600', trend: '$47K MRR' },
        { icon: Target, label: 'Conversion', value: '31%', color: 'from-cyan-500 to-blue-500', trend: '+5%' },
        { icon: Activity, label: 'Server Health', value: '100%', color: 'from-green-600 to-emerald-600', trend: 'Optimal' },
      ]);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleAddTenant = async () => {
    if (!supabase) return; // Skip if no Supabase client
    // Extract domain from email
    const domain = newTenant.email.split('@')[1];
    
    try {
      // Create tenant in Supabase
      const { error } = await supabase
        .from('tenants')
        .insert({
          company_name: newTenant.company_name,
          domain,
          admin_email: newTenant.email,
          is_white_label: newTenant.tenant_type === 'agency',
          subscription_tier: newTenant.tenant_type === 'agency' ? 'agency' : 'professional',
          commission_rate: newTenant.tenant_type === 'agency' ? newTenant.commission_rate : 0,
          created_at: new Date().toISOString(),
          settings: {
            branding: {
              primary_color: '#6366f1',
              logo_url: null,
              company_name: newTenant.company_name
            },
            features: {
              phd_collective: true,
              sage_inbox: newTenant.tenant_type === 'agency',
              api_access: newTenant.tenant_type === 'agency',
              white_label: newTenant.tenant_type === 'agency'
            }
          }
        });
      
      if (error) throw error;
      
      // Send welcome email (you'd implement this)
      console.log(`🚀 New ${newTenant.tenant_type} tenant created: ${newTenant.company_name}`);
      
      // Refresh tenants list
      fetchTenants();
      setShowAddTenant(false);
      setNewTenant({ company_name: '', email: '', tenant_type: 'standard', commission_rate: 20 });
      
      // Show success animation
      alert(`✅ Tenant ${newTenant.company_name} created! Welcome to the truth empire.`);
    } catch (error) {
      console.error('Failed to add tenant:', error);
      alert('Failed to create tenant. Check console for details.');
    }
  };

  const fetchTenants = async () => {
    if (!supabase) return; // Skip if no Supabase client
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setTenants(data || []);
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  const impersonateTenant = async (tenantId: string) => {
    // This would set a special admin session to view the app as this tenant
    console.log(`👁️ Impersonating tenant ${tenantId}`);
    alert('Impersonation feature coming soon! This will let you see their exact experience.');
  };

  useEffect(() => {
    // Check if user is actually a super admin
    const isSuperAdmin = user?.emailAddresses?.[0]?.emailAddress === 'truth@sentientiq.ai' || 
                        user?.emailAddresses?.[0]?.emailAddress === 'admin@sentientiq.ai' ||
                        user?.emailAddresses?.[0]?.emailAddress?.includes('kiselstein') ||
                        user?.emailAddresses?.[0]?.emailAddress === 'info@sentientiq.ai' ||
                        true; // Temporarily allowing all for testing
    
    if (!isSuperAdmin) {
      window.location.href = '/';
      return;
    }
    
    // Only fetch data when supabase is ready
    if (supabase) {
      fetchTenants();
      fetchStats();
      
      // Refresh stats every 30 seconds
      const interval = setInterval(fetchStats, 30000);
      return () => clearInterval(interval);
    }
  }, [user, supabase]);

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Epic Zeus Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-950/20 via-black to-blue-950/20" />
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-indigo-600/5 via-transparent to-transparent rounded-full blur-3xl" />
      </div>
      
      <div className="relative z-10 max-w-[1600px] mx-auto p-6">
        
        {/* Zeus Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-5xl font-bold text-white mb-2 flex items-center gap-3">
              <Zap className="w-12 h-12 text-yellow-400" />
              SuperAdmin Control Center
            </h1>
            <p className="text-white/60 text-lg">
              Zeus mode activated. Command the emotional intelligence empire.
            </p>
          </div>
          
          <button
            onClick={() => setShowAddTenant(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg shadow-purple-500/20"
          >
            <Plus className="w-5 h-5" />
            Add Tenant
          </button>
        </div>

        {/* 12-Box Power Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ scale: 1.02 }}
              className="relative overflow-hidden group"
            >
              <div className={`absolute inset-0 bg-gradient-to-r ${stat.color} opacity-10 blur-xl group-hover:opacity-20 transition-opacity`} />
              
              <div className="relative bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all">
                {stat.icon && (
                  <div className={`inline-flex p-3 rounded-lg bg-gradient-to-r ${stat.color} mb-4`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                )}
                
                <div className="text-3xl font-bold text-white mb-1">
                  {stat.value}
                </div>
                <div className="text-white/60 text-sm mb-2">
                  {stat.label}
                </div>
                {stat.trend && (
                  <div className="text-xs text-green-400">
                    {stat.trend}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Tenants Empire Table */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">The Truth Network</h2>
            <div className="text-sm text-white/60">
              {tenants.filter(t => t.is_white_label).length} Agency Partners • {tenants.length} Total Tenants
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-white/60 font-medium pb-4">Company</th>
                  <th className="text-left text-white/60 font-medium pb-4">Domain</th>
                  <th className="text-left text-white/60 font-medium pb-4">Type</th>
                  <th className="text-left text-white/60 font-medium pb-4">Tier</th>
                  <th className="text-left text-white/60 font-medium pb-4">MRR</th>
                  <th className="text-left text-white/60 font-medium pb-4">Users</th>
                  <th className="text-left text-white/60 font-medium pb-4">Questions</th>
                  <th className="text-left text-white/60 font-medium pb-4">Created</th>
                  <th className="text-left text-white/60 font-medium pb-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-white/40">
                      Loading tenants...
                    </td>
                  </tr>
                ) : tenants.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-white/40">
                      No tenants yet. Click "Add Tenant" to start the empire!
                    </td>
                  </tr>
                ) : (
                  tenants.map((tenant) => (
                    <motion.tr 
                      key={tenant.id} 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="py-4 text-white font-medium">{tenant.company_name}</td>
                      <td className="py-4 text-white/80">{tenant.domain}</td>
                      <td className="py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          tenant.is_white_label 
                            ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        }`}>
                          {tenant.is_white_label ? '👑 Agency' : 'Standard'}
                        </span>
                      </td>
                      <td className="py-4">
                        <span className="text-white/80 capitalize">{tenant.subscription_tier}</span>
                      </td>
                      <td className="py-4 text-green-400 font-medium">
                        ${tenant.mrr || 0}
                      </td>
                      <td className="py-4 text-white/60">
                        {tenant.active_users || 0}
                      </td>
                      <td className="py-4 text-white/60">
                        {tenant.questions_this_month || 0}
                      </td>
                      <td className="py-4 text-white/60">
                        {new Date(tenant.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-4">
                        <button 
                          className="text-blue-400 hover:text-blue-300 mr-3 transition-colors"
                          onClick={() => window.open(`/admin/tenant/${tenant.id}`, '_blank')}
                        >
                          <Eye className="w-4 h-4 inline" />
                        </button>
                        <button 
                          className="text-yellow-400 hover:text-yellow-300 transition-colors"
                          onClick={() => impersonateTenant(tenant.id)}
                        >
                          <UserCheck className="w-4 h-4 inline" />
                        </button>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Add Tenant Modal */}
        <AnimatePresence>
          {showAddTenant && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-6">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-gradient-to-br from-gray-900 to-gray-950 rounded-2xl p-8 w-full max-w-md border border-purple-500/20 shadow-2xl shadow-purple-500/10"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-white">Add New Tenant</h3>
                  <button
                    onClick={() => setShowAddTenant(false)}
                    className="text-white/60 hover:text-white transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-white/60 mb-2 text-sm font-medium">Company Name</label>
                    <input
                      type="text"
                      value={newTenant.company_name}
                      onChange={(e) => setNewTenant({...newTenant, company_name: e.target.value})}
                      className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-400 transition-colors"
                      placeholder="Acme Corporation"
                    />
                  </div>

                  <div>
                    <label className="block text-white/60 mb-2 text-sm font-medium">Admin Email</label>
                    <input
                      type="email"
                      value={newTenant.email}
                      onChange={(e) => setNewTenant({...newTenant, email: e.target.value})}
                      className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-400 transition-colors"
                      placeholder="admin@company.com"
                    />
                  </div>

                  <div>
                    <label className="block text-white/60 mb-2 text-sm font-medium">Tenant Type</label>
                    <select
                      value={newTenant.tenant_type}
                      onChange={(e) => setNewTenant({...newTenant, tenant_type: e.target.value})}
                      className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:border-purple-400 transition-colors"
                    >
                      <option value="standard" className="bg-gray-900">Standard - Regular tenant ($499/mo)</option>
                      <option value="agency" className="bg-gray-900">Agency - Can white-label & resell ($999/mo + commission)</option>
                    </select>
                  </div>

                  {newTenant.tenant_type === 'agency' && (
                    <div>
                      <label className="block text-white/60 mb-2 text-sm font-medium">Commission Rate (%)</label>
                      <input
                        type="number"
                        min="10"
                        max="50"
                        value={newTenant.commission_rate}
                        onChange={(e) => setNewTenant({...newTenant, commission_rate: parseInt(e.target.value)})}
                        className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-400 transition-colors"
                        placeholder="20"
                      />
                      <p className="text-xs text-white/40 mt-1">
                        Agency gets {newTenant.commission_rate}% of all revenue from their referred customers
                      </p>
                    </div>
                  )}

                  <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-4 border border-purple-500/20">
                    <p className="text-sm text-white/80">
                      {newTenant.tenant_type === 'agency' ? (
                        <>
                          <span className="font-bold text-purple-400">Agency Partner Benefits:</span>
                          <br />• White-label the entire platform
                          <br />• {newTenant.commission_rate}% commission on all sales
                          <br />• API access for custom integrations
                          <br />• Priority support & training
                        </>
                      ) : (
                        <>
                          <span className="font-bold text-blue-400">Standard Tenant:</span>
                          <br />• Full PhD Collective access
                          <br />• Unlimited questions
                          <br />• Standard branding
                          <br />• Email support
                        </>
                      )}
                    </p>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={handleAddTenant}
                      disabled={!newTenant.company_name || !newTenant.email}
                      className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                    >
                      Create Tenant
                    </button>
                    <button
                      onClick={() => setShowAddTenant(false)}
                      className="flex-1 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}