import React from 'react';
import { InterventionConfigurator } from '../../components/InterventionConfigurator';
import PageHeader from '../../components/PageHeader';
import { motion } from 'framer-motion';

export const Configuration: React.FC = () => {
  return (
    <div className="min-h-screen">
      <PageHeader
        title="Intervention Configuration"
        subtitle="Your website is sacred. Let's make these interventions feel like they belong."
      />

      <div className="pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-7xl mx-auto"
        >
          <InterventionConfigurator />
        </motion.div>

        {/* Philosophy Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-16 text-center text-gray-400"
        >
          <p className="text-sm">
            After GTM hell, this is where the magic happens.
          </p>
          <p className="text-xs mt-2">
            Every gradient. Every shadow. Every word. Under your control.
          </p>
        </motion.div>
      </div>
    </div>
  );
};