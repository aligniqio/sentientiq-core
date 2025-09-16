import React from 'react';
import { TemplateGallery } from '../../components/TemplateGallery';
import { Activity } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';

export const Configuration: React.FC = () => {
  const { user } = useUser();

  // Determine tier based on user metadata or default to starter
  const currentTier = (user?.publicMetadata?.tier as 'starter' | 'growth' | 'scale' | 'enterprise') || 'starter';
  const tenantId = user?.id || 'demo';

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="w-8 h-8 text-cyan-400" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Intervention Configuration
            </h1>
          </div>
          <p className="text-gray-400">
            Select and customize intervention templates for your business
          </p>
        </div>

        {/* Template Gallery */}
        <TemplateGallery
          tenantId={tenantId}
          currentTier={currentTier}
          onTemplateSelect={(template) => {
            console.log('Template selected:', template);
          }}
        />
      </div>
    </div>
  );
};