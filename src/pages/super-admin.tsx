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
  Plus,
  X,
  Eye,
  Crown,
  Trash2,
  UserPlus,
  Shield
} from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { useSuperAdmin } from '../hooks/useSuperAdmin';

interface Tenant {
  id: string;
  clerk_org_id: string;
  name: string;
  slug: string;
  subscription_tier: string;
  subscription_status: string;
  created_at: string;
  updated_at: string;
  monthly_event_limit: number;
  monthly_events_used: number;
  team_members_limit: number;
  tenant_id: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  features?: {
    white_label?: boolean;
    api_access?: boolean;
    priority_support?: boolean;
  };
}

export default function SuperAdmin() {
  const { user } = useUser();
  const navigate = useNavigate();
  const { isSuperAdmin, isLoading: checkingAdmin, supabase } = useSuperAdmin();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [showAddTenant, setShowAddTenant] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [selectedOrgForUser, setSelectedOrgForUser] = useState<Tenant | null>(null);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'user'
  });
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTenant, setNewTenant] = useState({
    name: '',
    email: '',
    tenant_type: 'standard',
    revenue_share: 0.30, // Default 30% revenue share
    demo_days: 7 // For demo accounts
  });

  // Real stats from actual data - NO DEMO DATA
  const fetchStats = async () => {
    if (!supabase) return;
    try {
      // Fetch metrics from organizations table
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select('*');

      if (orgsError) {
        console.error('Error fetching organizations:', orgsError);
        return;
      }

      const totalOrgs = orgsData?.length || 0;
      const whiteLabel = orgsData?.filter((t: any) => t.features?.white_label).length || 0;
      const totalMembers = orgsData?.reduce((sum: number, org: any) => sum + (org.team_members_limit || 1), 0) || 0;
      
      // Calculate real MRR based on subscription tiers
      const tierPrices: Record<string, number> = { 
        free: 0, 
        starter: 497,      // Entry level
        growth: 1997,      // Full platform  
        scale: 4997,       // Advanced features
        enterprise: 9997,  // Custom everything
        agency: 999        // White-label partners (+ rev share)
      };
      
      const mrr = orgsData?.reduce((sum: number, org: any) => {
        return sum + (tierPrices[org.subscription_tier] || 0);
      }, 0) || 0;

      // No revenue share in current schema, default to 0
      const avgRevShare = 0;

      // Set only the stats we have real data for
      setStats([
        { icon: Building2, label: 'Organizations', value: totalOrgs.toString(), color: 'from-blue-500 to-blue-600' },
        { icon: Crown, label: 'White Label', value: whiteLabel.toString(), color: 'from-purple-500 to-pink-500' },
        { icon: DollarSign, label: 'MRR', value: `$${mrr.toLocaleString()}`, color: 'from-green-500 to-green-600' },
        { icon: Users, label: 'Total Members', value: totalMembers.toString(), color: 'from-indigo-500 to-purple-600' },
        // Additional metrics
        { icon: Network, label: 'Avg Rev Share', value: `${(avgRevShare * 100).toFixed(1)}%`, color: 'from-yellow-500 to-orange-500' },
        { icon: Brain, label: 'Questions', value: '-', color: 'from-pink-500 to-rose-600' },
        { icon: TrendingUp, label: 'Growth', value: '-', color: 'from-emerald-500 to-teal-600' },
        { icon: Zap, label: 'Active Today', value: '-', color: 'from-orange-500 to-red-500' },
      ]);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleAddTenant = async () => {
    if (!supabase) return; // Skip if no Supabase client
    
    // Handle demo account creation differently
    if (newTenant.tenant_type === 'demo') {
      try {
        const { data, error } = await supabase
          .rpc('create_demo_account', {
            p_email: newTenant.email,
            p_name: newTenant.name,
            p_expires_in_days: newTenant.demo_days
          });
        
        if (error) throw error;
        
        console.log('Demo account created:', data);
        alert(`✅ Demo account created for ${newTenant.name}\n\nExpires in ${newTenant.demo_days} days\nEmail: ${newTenant.email}\nPassword: DemoPass123!`);
        
        // Refresh tenants list
        fetchTenants();
        setShowAddTenant(false);
        setNewTenant({ name: '', email: '', tenant_type: 'standard', revenue_share: 0.30, demo_days: 7 });
        return;
      } catch (error) {
        console.error('Failed to create demo account:', error);
        alert('Failed to create demo account. Check console for details.');
        return;
      }
    }
    
    // Extract domain from email
    const domain = newTenant.email.split('@')[1];
    
    try {
      // First create organization in Clerk
      const apiUrl = import.meta.env.DEV 
        ? 'http://localhost:8888/.netlify/functions/create-organization'
        : '/.netlify/functions/create-organization';
      
      const clerkResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          companyName: newTenant.name,
          adminEmail: newTenant.email,
          tenantType: newTenant.tenant_type,
          subscriptionTier: newTenant.tenant_type === 'agency' ? 'agency' : 
                           newTenant.tenant_type === 'enterprise' ? 'enterprise' :
                           newTenant.tenant_type === 'scale' ? 'scale' :
                           newTenant.tenant_type === 'growth' ? 'growth' : 'starter',
          userId: user?.id // Associate current user with the org
        })
      });

      if (!clerkResponse.ok) {
        const errorData = await clerkResponse.json();
        throw new Error(errorData.error || 'Failed to create Clerk organization');
      }

      const { organizationId } = await clerkResponse.json();
      
      // Then create tenant in Supabase with Clerk org ID
      const { error } = await supabase
        .from('organizations')
        .insert({
          name: newTenant.name,
          domain,
          admin_email: newTenant.email,
          clerk_organization_id: organizationId,
          subscription_tier: newTenant.tenant_type === 'agency' ? 'agency' : newTenant.tenant_type,
          features: {
            white_label: newTenant.tenant_type === 'agency',
            api_access: true,
            sage_assistant: true,
            emotional_detection: true,
            behavioral_analytics: true
          },
          created_at: new Date().toISOString(),
          settings: {
            branding: {
              primary_color: '#6366f1',
              logo_url: null,
              name: newTenant.name
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
      
      console.log(`New ${newTenant.tenant_type} organization created: ${newTenant.name}`);
      
      // Refresh tenants list
      fetchTenants();
      setShowAddTenant(false);
      setNewTenant({ name: '', email: '', tenant_type: 'standard', revenue_share: 0.30, demo_days: 7 });
      
      // Show success message
      alert(`✅ Organization ${newTenant.name} created successfully and you've been added as an admin.`);
    } catch (error) {
      console.error('Failed to add tenant:', error);
      alert(`Failed to create organization: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const fetchTenants = async () => {
    if (!supabase) return; // Skip if no Supabase client
    try {
      const { data, error } = await supabase
        .from('organizations')
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

  const switchContext = (tenant: Tenant) => {
    // Store the organization context
    localStorage.setItem('admin_context_org', JSON.stringify(tenant));
    console.log(`Switching context to: ${tenant.name}`);
    // You could navigate to a tenant-specific view or update the UI
    alert(`Context switched to ${tenant.name}. You're now viewing as this organization.`);
  };

  const openAddUserModal = (tenant: Tenant) => {
    setSelectedOrgForUser(tenant);
    setShowAddUser(true);
    setNewUser({ name: '', email: '', role: 'user' });
  };

  const addUserToOrg = async () => {
    if (!supabase || !selectedOrgForUser) return;
    
    try {
      // Call the backend API to send Clerk invitation
      const apiUrl = import.meta.env.DEV 
        ? 'http://localhost:8888/.netlify/functions/invite-user'
        : '/.netlify/functions/invite-user';
      
      const inviteResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-clerk-user-id': user?.id || ''
        },
        body: JSON.stringify({
          email: newUser.email,
          name: newUser.name,
          organizationId: selectedOrgForUser.id,
          organizationName: selectedOrgForUser.name,
          role: newUser.role
        })
      });

      if (!inviteResponse.ok) {
        const errorData = await inviteResponse.json();
        throw new Error(errorData.error || 'Failed to send invitation');
      }

      const { invitationId } = await inviteResponse.json();
      
      // Then add user to memberships table with Clerk invitation ID
      const { error } = await supabase
        .from('memberships')
        .insert({
          organization_id: selectedOrgForUser.id,
          user_email: newUser.email,
          user_name: newUser.name,
          role: newUser.role,
          clerk_invitation_id: invitationId,
          invitation_status: 'pending',
          created_at: new Date().toISOString()
        });
      
      if (error) throw error;
      
      alert(`✅ Invitation sent to ${newUser.name} (${newUser.email}) for ${selectedOrgForUser.name}`);
      setShowAddUser(false);
      setSelectedOrgForUser(null);
      setNewUser({ name: '', email: '', role: 'user' }); // Reset form
      // Optionally refresh stats
      fetchStats();
    } catch (error) {
      console.error('Failed to add user:', error);
      alert(`Failed to send invitation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const deleteTenant = async (tenant: Tenant) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${tenant.name}?\n\nThis action cannot be undone.`
    );
    
    if (!confirmDelete) return;
    
    if (!supabase) {
      alert('Database connection not available');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', tenant.id);
      
      if (error) throw error;
      
      // Refresh the list
      fetchTenants();
      alert(`✅ ${tenant.name} has been deleted.`);
    } catch (error) {
      console.error('Failed to delete tenant:', error);
      alert('Failed to delete organization. Check console for details.');
    }
  };

  useEffect(() => {
    // Check super admin status from database
    if (checkingAdmin) return; // Still checking
    
    if (!isSuperAdmin) {
      window.location.href = '/';
      return;
    }
    
    // Only fetch data when supabase is ready and user is super admin
    if (supabase && isSuperAdmin) {
      fetchTenants();
      fetchStats();
      
      // Refresh stats every 30 seconds
      const interval = setInterval(fetchStats, 30000);
      return () => clearInterval(interval);
    }
  }, [isSuperAdmin, checkingAdmin, supabase]);

  return (
    <>
      {/* Header */}
      <PageHeader 
        title="Super Admin"
        subtitle="Organization & membership management dashboard"
      />
          
          {/* Add Organization Button */}
          <div className="flex justify-end mb-6">
            <button
              onClick={() => setShowAddTenant(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg shadow-purple-500/20"
            >
              <Plus className="w-5 h-5" />
              Add Organization
            </button>
          </div>

          {/* Stats Grid */}
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

          {/* Admin Control Cards */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h2 className="text-2xl font-bold text-white mb-6">Admin Controls</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Debug Tool Card */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="glass-card p-6 cursor-pointer hover:border-purple-500/50 transition-all"
                onClick={() => navigate('/debug-super-admin')}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl">
                    <Zap className="w-6 h-6 text-purple-400" />
                  </div>
                  <span className="text-xs text-purple-400 font-mono">DEBUG</span>
                </div>
                <h3 className="text-white font-semibold mb-2">System Debug</h3>
                <p className="text-white/60 text-sm">Check auth status, database connections, and permissions</p>
              </motion.div>

              {/* Implementation Guide Card */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="glass-card p-6 cursor-pointer hover:border-blue-500/50 transition-all"
                onClick={() => navigate('/system/implementation')}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl">
                    <Network className="w-6 h-6 text-blue-400" />
                  </div>
                  <span className="text-xs text-blue-400 font-mono">SETUP</span>
                </div>
                <h3 className="text-white font-semibold mb-2">Implementation</h3>
                <p className="text-white/60 text-sm">Script setup guide and detect.js configuration</p>
              </motion.div>

              {/* Database Health Card */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="glass-card p-6 cursor-pointer hover:border-green-500/50 transition-all"
                onClick={() => alert('Database health dashboard coming soon')}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl">
                    <Brain className="w-6 h-6 text-green-400" />
                  </div>
                  <span className="text-xs text-green-400 font-mono">HEALTHY</span>
                </div>
                <h3 className="text-white font-semibold mb-2">Database Health</h3>
                <p className="text-white/60 text-sm">Monitor Supabase and system performance</p>
              </motion.div>

              {/* API Keys Card */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="glass-card p-6 cursor-pointer hover:border-orange-500/50 transition-all"
                onClick={() => alert('API key management coming soon')}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-xl">
                    <Shield className="w-6 h-6 text-orange-400" />
                  </div>
                  <span className="text-xs text-orange-400 font-mono">SECURE</span>
                </div>
                <h3 className="text-white font-semibold mb-2">API Keys</h3>
                <p className="text-white/60 text-sm">Manage tenant API keys and access tokens</p>
              </motion.div>
            </div>
          </motion.div>

          {/* Organizations Table */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6"
          >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Organizations</h2>
            <div className="text-sm text-white/60">
              {tenants.filter(t => t.features?.white_label).length} White Label • {tenants.length} Total
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
                  <th className="text-left text-white/60 font-medium pb-4">Rev Share</th>
                  <th className="text-left text-white/60 font-medium pb-4">Referral</th>
                  <th className="text-left text-white/60 font-medium pb-4">Stripe</th>
                  <th className="text-left text-white/60 font-medium pb-4">Created</th>
                  <th className="text-left text-white/60 font-medium pb-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-white/40">
                      Loading organizations...
                    </td>
                  </tr>
                ) : tenants.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-white/40">
                      No organizations yet. Click "Add Tenant" to create one.
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
                      <td className="py-4 text-white font-medium">{tenant.name}</td>
                      <td className="py-4 text-white/80">{tenant.slug || tenant.tenant_id}</td>
                      <td className="py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          tenant.subscription_tier === 'free'
                            ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-300 border border-green-500/30'
                            : tenant.features?.white_label 
                            ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        }`}>
                          {tenant.subscription_tier === 'free' ? '🎭 Demo' : tenant.features?.white_label ? '👑 Agency' : 'Standard'}
                        </span>
                      </td>
                      <td className="py-4">
                        <span className="text-white/80 capitalize">{tenant.subscription_tier}</span>
                      </td>
                      <td className="py-4 text-green-400 font-medium">
                        {tenant.features?.white_label ? '30%' : '0%'}
                      </td>
                      <td className="py-4 text-white/60">
                        {tenant.slug || '-'}
                      </td>
                      <td className="py-4 text-white/60">
                        {tenant.stripe_customer_id ? '✓' : '-'}
                      </td>
                      <td className="py-4 text-white/60">
                        {new Date(tenant.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-4">
                        <button 
                          className="text-blue-400 hover:text-blue-300 mr-3 transition-colors"
                          onClick={() => switchContext(tenant)}
                          title="Switch Context"
                        >
                          <Eye className="w-4 h-4 inline" />
                        </button>
                        <button 
                          className="text-green-400 hover:text-green-300 mr-3 transition-colors"
                          onClick={() => openAddUserModal(tenant)}
                          title="Add User"
                        >
                          <UserPlus className="w-4 h-4 inline" />
                        </button>
                        <button 
                          className="text-red-400 hover:text-red-300 transition-colors"
                          onClick={() => deleteTenant(tenant)}
                          title="Delete Organization"
                        >
                          <Trash2 className="w-4 h-4 inline" />
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
                      value={newTenant.name}
                      onChange={(e) => setNewTenant({...newTenant, name: e.target.value})}
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
                      <option value="starter" className="bg-gray-900">Starter - Essential emotion detection ($497/mo)</option>
                      <option value="growth" className="bg-gray-900">Growth - Full platform access ($1,997/mo)</option>
                      <option value="scale" className="bg-gray-900">Scale - Advanced features ($4,997/mo)</option>
                      <option value="enterprise" className="bg-gray-900">Enterprise - Custom everything ($9,997/mo+)</option>
                      <option value="agency" className="bg-gray-900">Agency - White-label & resell ($999/mo + revenue share)</option>
                      <option value="demo" className="bg-gray-900">Demo - Time-limited clickaround (FREE)</option>
                    </select>
                  </div>

                  {newTenant.tenant_type === 'agency' && (
                    <div>
                      <label className="block text-white/60 mb-2 text-sm font-medium">Commission Rate (%)</label>
                      <input
                        type="number"
                        min="10"
                        max="50"
                        value={newTenant.revenue_share * 100}
                        onChange={(e) => setNewTenant({...newTenant, revenue_share: parseInt(e.target.value) / 100})}
                        className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-400 transition-colors"
                        placeholder="20"
                      />
                      <p className="text-xs text-white/40 mt-1">
                        Agency gets {(newTenant.revenue_share * 100).toFixed(0)}% of all revenue from their referred customers
                      </p>
                    </div>
                  )}

                  {newTenant.tenant_type === 'demo' && (
                    <div>
                      <label className="block text-white/60 mb-2 text-sm font-medium">Demo Duration (days)</label>
                      <input
                        type="number"
                        min="1"
                        max="90"
                        value={newTenant.demo_days}
                        onChange={(e) => setNewTenant({...newTenant, demo_days: parseInt(e.target.value) || 7})}
                        className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-400 transition-colors"
                        placeholder="7"
                      />
                      <p className="text-xs text-white/40 mt-1">
                        Demo account will expire after {newTenant.demo_days} days
                      </p>
                    </div>
                  )}

                  <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-4 border border-purple-500/20">
                    <p className="text-sm text-white/80">
                      {newTenant.tenant_type === 'demo' ? (
                        <>
                          <span className="font-bold text-green-400">Demo Account (FREE):</span>
                          <br />• Read-only clickaround access
                          <br />• Pre-populated with sample data
                          <br />• Perfect for investors & skeptics
                          <br />• Auto-expires after {newTenant.demo_days} days
                          <br />• No Math.random() - just UI exploration
                        </>
                      ) : newTenant.tenant_type === 'agency' ? (
                        <>
                          <span className="font-bold text-purple-400">Agency Partner ($999/mo):</span>
                          <br />• White-label the entire platform
                          <br />• {(newTenant.revenue_share * 100).toFixed(0)}% revenue share on referrals
                          <br />• API access for custom integrations
                          <br />• Priority support & training
                          <br />• Can create sub-organizations
                        </>
                      ) : newTenant.tenant_type === 'starter' ? (
                        <>
                          <span className="font-bold text-blue-400">Starter - Know WHO is feeling WHAT ($497/mo):</span>
                          <br />• Identity resolution: Name + Company + Value
                          <br />• Detect 12 emotions with 95% confidence
                          <br />• Basic interventions (email, Slack alerts)
                          <br />• Weekly accountability scorecard
                          <br />• Up to 10,000 identified sessions/mo
                        </>
                      ) : newTenant.tenant_type === 'growth' ? (
                        <>
                          <span className="font-bold text-indigo-400">Growth - Intervene before they leave ($1,997/mo):</span>
                          <br />• Everything in Starter, plus:
                          <br />• CRM sync (Salesforce, HubSpot)
                          <br />• Automated interventions by value tier
                          <br />• Real-time Slack/email alerts
                          <br />• Revenue attribution tracking
                          <br />• Up to 100,000 identified sessions/mo
                        </>
                      ) : newTenant.tenant_type === 'scale' ? (
                        <>
                          <span className="font-bold text-pink-400">Scale - Your emotional data moat ($4,997/mo):</span>
                          <br />• Everything in Growth, plus:
                          <br />• Unlimited identified sessions
                          <br />• Custom intervention rules
                          <br />• API access for your stack
                          <br />• Cross-domain tracking
                          <br />• Dedicated success manager
                          <br />• Quarterly ROI analysis
                        </>
                      ) : newTenant.tenant_type === 'enterprise' ? (
                        <>
                          <span className="font-bold text-amber-400">Enterprise - Your rules. Your infrastructure. (Custom):</span>
                          <br />• Self-hosted deployment option
                          <br />• Custom emotion models
                          <br />• White-label capability
                          <br />• Multi-brand support
                          <br />• SLA with 99.99% uptime
                          <br />• Executive briefings
                        </>
                      ) : (
                        <>
                          <span className="font-bold text-gray-400">Select a tier above</span>
                        </>
                      )}
                    </p>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={handleAddTenant}
                      disabled={!newTenant.name || !newTenant.email}
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

        {/* Add User Modal */}
        <AnimatePresence>
          {showAddUser && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-6">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-gradient-to-br from-gray-900 to-gray-950 rounded-2xl p-8 w-full max-w-md border border-green-500/20 shadow-2xl shadow-green-500/10"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-white">Add New User</h3>
                  <button
                    onClick={() => {
                      setShowAddUser(false);
                      setSelectedOrgForUser(null);
                    }}
                    className="text-white/60 hover:text-white transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-white/60 mb-2 text-sm font-medium">Full Name</label>
                    <input
                      type="text"
                      value={newUser.name}
                      onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                      className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-green-400 transition-colors"
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <label className="block text-white/60 mb-2 text-sm font-medium">Email Address</label>
                    <input
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                      className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-green-400 transition-colors"
                      placeholder="john@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-white/60 mb-2 text-sm font-medium">Associated Tenant</label>
                    <select
                      value={selectedOrgForUser?.id || ''}
                      onChange={(e) => {
                        const org = tenants.find(t => t.id === e.target.value);
                        setSelectedOrgForUser(org || null);
                      }}
                      className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:border-green-400 transition-colors"
                    >
                      <option value="">Select a tenant...</option>
                      {tenants.map(tenant => (
                        <option key={tenant.id} value={tenant.id}>
                          {tenant.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-white/60 mb-2 text-sm font-medium">Role</label>
                    <select
                      value={newUser.role}
                      onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                      className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:border-green-400 transition-colors"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                      <option value="owner">Owner</option>
                    </select>
                  </div>

                  <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-xl p-4 border border-green-500/20">
                    <p className="text-sm text-white/80">
                      <span className="font-bold text-green-400">User Access:</span>
                      <br />• Will receive an invitation email
                      <br />• Access to {selectedOrgForUser?.name || 'selected organization'}
                      <br />• {newUser.role === 'admin' ? 'Can manage team settings' : newUser.role === 'owner' ? 'Full organization control' : 'Standard user access'}
                    </p>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={addUserToOrg}
                      disabled={!newUser.name || !newUser.email || !selectedOrgForUser}
                      className="flex-1 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-xl hover:from-green-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                    >
                      Add User
                    </button>
                    <button
                      onClick={() => {
                        setShowAddUser(false);
                        setSelectedOrgForUser(null);
                      }}
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
    </>
  );
}