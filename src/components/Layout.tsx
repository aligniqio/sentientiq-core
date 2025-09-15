import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useClerk, useUser } from '@clerk/clerk-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  X,
  LogOut,
  Shield,
  Zap,
  Crown,
  BarChart3,
  Activity,
  Settings,
  Brain,
  ChevronDown,
  Code,
  Users,
  Eye,
  Check
} from 'lucide-react';
import { useSuperAdmin } from '../hooks/useSuperAdmin';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [systemExpanded, setSystemExpanded] = useState(false);
  const [contextDropdownOpen, setContextDropdownOpen] = useState(false);
  const [selectedContext, setSelectedContext] = useState<{
    type: 'default' | 'tier' | 'tenant';
    value: string;
    label: string;
  }>({ type: 'default', value: 'default', label: 'Default View' });

  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useClerk();
  const { user } = useUser();

  // Use the same super admin check as the super-admin page
  const { isSuperAdmin } = useSuperAdmin();

  // Mock tenant list - in production, fetch from API
  const [tenants, setTenants] = useState<Array<{id: string, name: string, tier: string}>>([]);

  useEffect(() => {
    if (isSuperAdmin) {
      // Fetch tenants for super admin
      fetchTenants();
    }
  }, [isSuperAdmin]);

  const fetchTenants = async () => {
    // Mock data - replace with actual API call
    setTenants([
      { id: 'acme_corp', name: 'Acme Corp', tier: 'enterprise' },
      { id: 'bobs_bikes', name: "Bob's Bikes", tier: 'starter' },
      { id: 'tech_startup', name: 'TechStartup Inc', tier: 'growth' },
      { id: 'mega_retail', name: 'MegaRetail', tier: 'scale' }
    ]);
  };

  // Auto-expand System menu if on a system page
  useEffect(() => {
    if (location.pathname.startsWith('/system/')) {
      setSystemExpanded(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const menuItems = [
    { path: '/scorecard', icon: BarChart3, label: 'Scorecard', public: false },
    { path: '/actions', icon: Zap, label: 'Actions', public: false },
    { path: '/emotional-dashboard', icon: Activity, label: 'Emotions', public: false },
    { path: '/usage-dashboard', icon: Activity, label: 'Usage', public: false },
    { path: '/billing', icon: Shield, label: 'Billing', public: false },
    ...(isSuperAdmin ? [
      { path: '/super-admin', icon: Crown, label: 'Super Admin', public: false }
    ] : []),
  ];

  // System menu with children (only for super admin)
  const systemMenu = isSuperAdmin ? {
    icon: Settings,
    label: 'System',
    children: [
      { path: '/system/implementation', icon: Code, label: 'Implementation' },
      { path: '/system/configuration', icon: Zap, label: 'Interventions' }
    ]
  } : null;

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // Don't show sidebar/layout on auth pages
  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Neural Cathedral Background - Layered for depth */}
      <div className="neural-bg" />
      
      {/* Neural Network Pattern - Above the animated orbs for visual depth */}
      <div className="fixed inset-0 z-[1] pointer-events-none opacity-[0.03]">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="neural-grid" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
              <circle cx="30" cy="30" r="1" fill="currentColor" className="text-purple-400" />
              <line x1="30" y1="30" x2="60" y2="30" stroke="currentColor" strokeWidth="0.5" className="text-purple-400/50" />
              <line x1="30" y1="30" x2="30" y2="60" stroke="currentColor" strokeWidth="0.5" className="text-purple-400/50" />
              <line x1="30" y1="30" x2="0" y2="30" stroke="currentColor" strokeWidth="0.5" className="text-purple-400/50" />
              <line x1="30" y1="30" x2="30" y2="0" stroke="currentColor" strokeWidth="0.5" className="text-purple-400/50" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#neural-grid)" />
        </svg>
      </div>


      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-black/50 backdrop-blur-xl border border-white/10 md:hidden"
      >
        {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Glassmorphic Sidebar */}
      <AnimatePresence>
        {(sidebarOpen || !isMobile) && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed left-0 top-0 h-full w-64 z-40 backdrop-blur-2xl bg-white/5 border-r border-white/10"
          >
            {/* Logo */}
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg blur-lg opacity-50" />
                  <div className="relative w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-lg font-bold">SentientIQ</h1>
                  <p className="text-xs text-gray-400">Emotional Intelligence</p>
                </div>
              </div>
            </div>

            {/* User Info */}
            {user && (
              <div className="p-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center text-sm font-bold">
                    {user.firstName?.[0] || user.emailAddresses?.[0]?.emailAddress?.[0] || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {user.firstName || user.emailAddresses?.[0]?.emailAddress}
                    </p>
                    <p className="text-xs text-gray-400">Active</p>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <nav className="p-4 space-y-2">
              {menuItems.map((item) => {
                const isActive = location.pathname === item.path;
                const isAccessible = item.public || user;

                if (!isAccessible) return null;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`
                      flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200
                      ${isActive
                        ? 'bg-white/10 text-white border border-white/20'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }
                    `}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{item.label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="ml-auto w-1 h-4 bg-gradient-to-b from-purple-500 to-blue-500 rounded-full"
                      />
                    )}
                  </Link>
                );
              })}

              {/* System Accordion Menu */}
              {systemMenu && (
                <div className="space-y-2">
                  <button
                    onClick={() => setSystemExpanded(!systemExpanded)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200
                      ${location.pathname.startsWith('/system/')
                        ? 'bg-white/10 text-white border border-white/20'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }
                    `}
                  >
                    <systemMenu.icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{systemMenu.label}</span>
                    <ChevronDown
                      className={`w-4 h-4 ml-auto transition-transform ${
                        systemExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {systemExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="pl-4 space-y-1">
                          {systemMenu.children.map((child) => {
                            const isChildActive = location.pathname === child.path;
                            return (
                              <Link
                                key={child.path}
                                to={child.path}
                                onClick={() => setSidebarOpen(false)}
                                className={`
                                  flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200
                                  ${isChildActive
                                    ? 'bg-white/10 text-white border border-white/20'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                  }
                                `}
                              >
                                <child.icon className="w-4 h-4" />
                                <span className="text-sm">{child.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </nav>

            {/* Bottom Actions */}
            {user && (
              <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="text-sm font-medium">Sign Out</span>
                </button>
              </div>
            )}

          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content - Standardized from Scorecard */}
      <main className={`relative z-10 ${!isMobile ? 'ml-64' : ''}`}>
        <div className="min-h-screen">
          {/* Super Admin Context Switcher */}
          {isSuperAdmin && (
            <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-xl border-b border-white/10">
              <div className="mx-auto max-w-7xl px-6 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-purple-400" />
                    <span className="text-sm text-gray-400">Viewing as:</span>
                  </div>

                  <div className="relative">
                    <button
                      onClick={() => setContextDropdownOpen(!contextDropdownOpen)}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 border border-purple-500/30 rounded-lg hover:bg-purple-600/30 transition-all"
                    >
                      <Users className="w-4 h-4" />
                      <span className="text-sm font-medium">{selectedContext.label}</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${contextDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown Menu */}
                    <AnimatePresence>
                      {contextDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute right-0 mt-2 w-80 bg-gray-900 border border-gray-800 rounded-lg shadow-xl overflow-hidden"
                        >
                          {/* Default View */}
                          <button
                            onClick={() => {
                              setSelectedContext({ type: 'default', value: 'default', label: 'Default View' });
                              setContextDropdownOpen(false);
                              // Clear any context overrides
                              localStorage.removeItem('sq_context_override');
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-gray-800 transition-colors flex items-center justify-between"
                          >
                            <span className="text-sm">Default View</span>
                            {selectedContext.type === 'default' && <Check className="w-4 h-4 text-green-400" />}
                          </button>

                          {/* Tier Views */}
                          <div className="border-t border-gray-800">
                            <div className="px-4 py-2 text-xs text-gray-500 uppercase tracking-wide">View as Tier</div>
                            {['starter', 'growth', 'scale', 'enterprise'].map(tier => (
                              <button
                                key={tier}
                                onClick={() => {
                                  const label = `${tier.charAt(0).toUpperCase() + tier.slice(1)} Tier`;
                                  setSelectedContext({ type: 'tier', value: tier, label });
                                  setContextDropdownOpen(false);
                                  // Set context override
                                  localStorage.setItem('sq_context_override', JSON.stringify({ type: 'tier', value: tier }));
                                }}
                                className="w-full px-4 py-3 text-left hover:bg-gray-800 transition-colors flex items-center justify-between"
                              >
                                <div>
                                  <div className="text-sm">{tier.charAt(0).toUpperCase() + tier.slice(1)}</div>
                                  <div className="text-xs text-gray-500">
                                    {tier === 'starter' && '$497/mo'}
                                    {tier === 'growth' && '$1,997/mo'}
                                    {tier === 'scale' && '$4,997/mo'}
                                    {tier === 'enterprise' && 'Custom'}
                                  </div>
                                </div>
                                {selectedContext.value === tier && selectedContext.type === 'tier' &&
                                  <Check className="w-4 h-4 text-green-400" />}
                              </button>
                            ))}
                          </div>

                          {/* Tenant Views */}
                          <div className="border-t border-gray-800">
                            <div className="px-4 py-2 text-xs text-gray-500 uppercase tracking-wide">View as Tenant</div>
                            {tenants.map(tenant => (
                              <button
                                key={tenant.id}
                                onClick={() => {
                                  setSelectedContext({ type: 'tenant', value: tenant.id, label: tenant.name });
                                  setContextDropdownOpen(false);
                                  // Set context override
                                  localStorage.setItem('sq_context_override', JSON.stringify({ type: 'tenant', value: tenant.id }));
                                }}
                                className="w-full px-4 py-3 text-left hover:bg-gray-800 transition-colors flex items-center justify-between"
                              >
                                <div>
                                  <div className="text-sm">{tenant.name}</div>
                                  <div className="text-xs text-gray-500">{tenant.tier} tier</div>
                                </div>
                                {selectedContext.value === tenant.id && selectedContext.type === 'tenant' &&
                                  <Check className="w-4 h-4 text-green-400" />}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {selectedContext.type !== 'default' && (
                    <button
                      onClick={() => {
                        setSelectedContext({ type: 'default', value: 'default', label: 'Default View' });
                        localStorage.removeItem('sq_context_override');
                      }}
                      className="text-xs text-gray-400 hover:text-white transition-colors"
                    >
                      Clear Override
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="mx-auto max-w-7xl px-6 pt-12 pb-20">
            {children}
          </div>
        </div>
      </main>


      {/* Overlay for mobile */}
      {sidebarOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;