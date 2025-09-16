/**
 * Template Preview Page
 * Live demo of intervention templates with real interactions
 */

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const Head = ({ children }: { children: React.ReactNode }) => null;
import { interventionTemplates } from '@/data/intervention-templates';
import { cssEngine } from '@/services/css-engine';
import { InterventionTemplate, TenantBranding } from '@/types/intervention-templates';
import { ShoppingCart, Heart, User, Search, X, Star, TrendingUp, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TemplatePreviewPage() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const templateId = location.pathname.split('/').pop();
  const tenant = params.get('tenant') || 'demo';
  const [template, setTemplate] = useState<InterventionTemplate | null>(null);
  const [showIntervention, setShowIntervention] = useState(false);
  const [interventionType, setInterventionType] = useState<'modal' | 'banner' | 'toast' | 'badge'>('modal');
  const [cartCount, setCartCount] = useState(2);

  // Demo branding
  const demoBranding: TenantBranding = {
    tenantId: tenant as string,
    tier: 'growth',
    selectedTemplate: templateId as string,
    brand: {
      companyName: 'Demo Store',
      primaryColor: '#0066ff',
      secondaryColor: '#ffffff',
      accentColor: '#ff6b00',
      fontFamily: 'Inter, sans-serif'
    }
  };

  useEffect(() => {
    if (templateId) {
      const foundTemplate = interventionTemplates.find(t => t.id === templateId);
      setTemplate(foundTemplate || null);

      // Auto-trigger intervention after 2 seconds
      const timer = setTimeout(() => {
        setShowIntervention(true);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [templateId]);

  useEffect(() => {
    if (template && showIntervention) {
      // Inject CSS
      const css = cssEngine.generateTemplateCSS(template, demoBranding, interventionType);
      cssEngine.injectStyles(css, `${template.id}-${interventionType}`);
    }
  }, [template, showIntervention, interventionType]);

  const renderIntervention = () => {
    if (!template) return null;

    const styles = cssEngine.generateInlineStyles(template, demoBranding, interventionType);

    // Helper function to parse CSS string into style object
    const parseCSS = (cssString: string): React.CSSProperties => {
      const styleObj: any = {};
      if (!cssString) return styleObj;
      cssString.split(';').forEach(rule => {
        const [property, value] = rule.split(':').map(s => s?.trim());
        if (property && value) {
          const camelCase = property.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
          styleObj[camelCase] = value;
        }
      });
      return styleObj;
    };

    switch (interventionType) {
      case 'modal':
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="sentient-modal-overlay"
            onClick={() => setShowIntervention(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className={`sentient-modal sentient-modal-${template.id}`}
              style={parseCSS(styles.container)}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="sentient-modal-close"
                onClick={() => setShowIntervention(false)}
              >
                <X className="w-5 h-5" />
              </button>

              <div className="sentient-modal-header" style={parseCSS(styles.header)}>
                <h2 className="text-2xl font-bold mb-2">Wait! Don't Leave Empty-Handed</h2>
              </div>

              <div className="sentient-modal-body" style={parseCSS(styles.body)}>
                <p className="mb-4">
                  We noticed you're interested in our products. Here's an exclusive 15% discount just for you!
                </p>
                <div className="flex items-center gap-2 mb-6">
                  <Clock className="w-5 h-5 text-orange-500" />
                  <span className="text-sm">Offer expires in 24 hours</span>
                </div>
              </div>

              <div className="sentient-modal-footer" style={parseCSS(styles.footer)}>
                <button
                  className="sentient-modal-button w-full"
                  style={parseCSS(styles.button)}
                  onClick={() => {
                    setShowIntervention(false);
                    setCartCount(cartCount + 1);
                  }}
                >
                  Claim Your Discount
                </button>
              </div>
            </motion.div>
          </motion.div>
        );

      case 'banner':
        return (
          <motion.div
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            exit={{ y: -100 }}
            className={`sentient-banner sentient-banner-${template.id}`}
            style={parseCSS(styles.container)}
          >
            <div className="sentient-banner-body" style={parseCSS(styles.body)}>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                <span>Flash Sale: 25% off everything! Use code: FLASH25</span>
              </div>
              <button
                className="sentient-banner-button"
                style={parseCSS(styles.button)}
                onClick={() => setShowIntervention(false)}
              >
                Shop Now
              </button>
            </div>
          </motion.div>
        );

      case 'toast':
        return (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            className={`sentient-toast sentient-toast-${template.id}`}
            style={parseCSS(styles.container)}
          >
            <div className="sentient-toast-body" style={parseCSS(styles.body)}>
              <div className="sentient-toast-icon">
                <ShoppingCart className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="font-medium">3 people just bought this!</p>
                <p className="text-sm opacity-80">Limited stock remaining</p>
              </div>
            </div>
          </motion.div>
        );

      case 'badge':
        return (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className={`sentient-badge sentient-badge-${template.id}`}
            style={{
              ...parseCSS(styles.container),
              position: 'fixed',
              bottom: '100px',
              right: '20px'
            }}
          >
            <div className="sentient-badge-body" style={parseCSS(styles.body)}>
              🔥 Hot Deal - Save 30%
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  if (!template) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Template Preview - {template.name}</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Demo E-commerce Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-8">
                <h1 className="text-2xl font-bold">Demo Store</h1>
                <nav className="hidden md:flex items-center gap-6">
                  <a href="#" className="text-gray-600 hover:text-black">Products</a>
                  <a href="#" className="text-gray-600 hover:text-black">Categories</a>
                  <a href="#" className="text-gray-600 hover:text-black">Deals</a>
                  <a href="#" className="text-gray-600 hover:text-black">About</a>
                </nav>
              </div>

              <div className="flex items-center gap-4">
                <Search className="w-5 h-5 text-gray-600" />
                <User className="w-5 h-5 text-gray-600" />
                <Heart className="w-5 h-5 text-gray-600" />
                <div className="relative">
                  <ShoppingCart className="w-5 h-5 text-gray-600" />
                  {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Intervention Controls */}
        <div className="bg-black text-white p-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="font-medium">Preview Controls:</span>
              <div className="flex gap-2">
                {(['modal', 'banner', 'toast', 'badge'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => {
                      setInterventionType(type);
                      setShowIntervention(false);
                      setTimeout(() => setShowIntervention(true), 100);
                    }}
                    className={`px-3 py-1 rounded text-sm ${
                      interventionType === type ? 'bg-white text-black' : 'bg-gray-800 hover:bg-gray-700'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                setShowIntervention(false);
                setTimeout(() => setShowIntervention(true), 100);
              }}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg font-medium hover:opacity-90"
            >
              Trigger Intervention
            </button>
          </div>
        </div>

        {/* Demo Products Grid */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="text-3xl font-bold mb-8">Featured Products</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm hover:shadow-lg transition-shadow">
                <div className="aspect-square bg-gray-200 rounded-t-lg"></div>
                <div className="p-4">
                  <h3 className="font-medium mb-1">Product {i + 1}</h3>
                  <div className="flex items-center gap-1 mb-2">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} className={`w-4 h-4 ${j < 4 ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                    ))}
                    <span className="text-sm text-gray-500">(24)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold">${(99 + i * 20).toFixed(2)}</span>
                    <button className="px-3 py-1 bg-black text-white rounded text-sm hover:bg-gray-800">
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>

        {/* Render Intervention */}
        <AnimatePresence>
          {showIntervention && renderIntervention()}
        </AnimatePresence>
      </div>
    </>
  );
}