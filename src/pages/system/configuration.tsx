import React from 'react';
import { TemplateGallery } from '../../components/TemplateGallery';
import PageHeader from '../../components/PageHeader';
import { useUser } from '@clerk/clerk-react';
import { motion } from 'framer-motion';

export const Configuration: React.FC = () => {
  const { user } = useUser();

  // Determine tier based on user metadata or default to starter
  const currentTier = (user?.publicMetadata?.tier as 'starter' | 'growth' | 'scale' | 'enterprise') || 'starter';
  const tenantId = user?.id || 'demo';

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Intervention Configuration"
        subtitle="Select and customize intervention templates for your marketing campaigns"
      />

      <div className="pb-20">
        {/* Glassmorphic container for Template Gallery */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8"
        >
          <TemplateGallery
            tenantId={tenantId}
            currentTier={currentTier}
            onTemplateSelect={(template) => {
              console.log('Template selected:', template);
            }}
          />
        </motion.div>

        {/* Philosophy Footer - matching the intervention page style */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center text-gray-400"
        >
          <p className="text-sm">
            Transparency in intelligence. No hidden magic.
          </p>
        </motion.div>
      </div>
    </div>
  );
};