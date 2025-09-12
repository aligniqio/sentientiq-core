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
  Brain
} from 'lucide-react';
import { useSuperAdmin } from '../hooks/useSuperAdmin';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useClerk();
  const { user } = useUser();
  
  // Use the same super admin check as the super-admin page
  const { isSuperAdmin } = useSuperAdmin();

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
    { path: '/recommendations', icon: Zap, label: 'Recommendations', public: false },
    { path: '/emotional-dashboard', icon: Activity, label: 'Emotions', public: false },
    { path: '/billing', icon: Shield, label: 'Billing', public: false },
    ...(isSuperAdmin ? [
      { path: '/super-admin', icon: Crown, label: 'Super Admin', public: false },
      { path: '/system/implementation', icon: Settings, label: 'System', public: false }
    ] : []),
  ];

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