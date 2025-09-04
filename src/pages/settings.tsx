import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Key, Cpu, AlertCircle, ChevronRight } from 'lucide-react';

const Settings: React.FC = () => {
  const sections = [
    {
      to: '/settings/safeguards',
      icon: Shield,
      title: 'Safeguards',
      desc: 'Operational guardrails, canaries, and rollback controls',
      accent: 'from-emerald-500/30 to-cyan-500/30'
    },
    {
      to: '/settings/api-keys',
      icon: Key,
      title: 'API Keys',
      desc: 'Manage authentication tokens and access control',
      accent: 'from-violet-500/30 to-pink-500/30'
    },
    {
      to: '/settings/model-versions',
      icon: Cpu,
      title: 'Model Versions',
      desc: 'Control which PhD agent versions are active',
      accent: 'from-blue-500/30 to-indigo-500/30'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-950/10 to-black p-8">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2">
            Settings
          </h1>
          <p className="text-purple-300">
            Configure your neural intelligence infrastructure
          </p>
        </motion.div>

        <div className="grid gap-4">
          {sections.map((section, idx) => (
            <motion.div
              key={section.to}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="group"
            >
              <Link
                to={section.to}
                className="block p-6 rounded-2xl backdrop-blur-md bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
              >
                <div className={`absolute -inset-px rounded-2xl bg-gradient-to-br ${section.accent} opacity-0 group-hover:opacity-20 blur-xl transition`} />
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <section.icon className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{section.title}</h3>
                      <p className="text-sm text-white/60 mt-1">{section.desc}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-white/60 transition-colors" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
            <div>
              <p className="text-sm text-yellow-200 font-medium">Production Settings</p>
              <p className="text-xs text-yellow-200/70 mt-1">
                Changes to these settings affect live neural processing. Proceed with caution.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Settings;