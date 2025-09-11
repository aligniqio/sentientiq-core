import React, { useState } from 'react';

export default function InterventionShowcase() {
  const [selectedIntervention, setSelectedIntervention] = useState(0);
  
  const interventions = [
    {
      trigger: "High-Value Rage",
      icon: "🚨",
      detection: "3 clicks in 300ms from $50k+ customer",
      actions: [
        "Slack alert to account owner (instant)",
        "Support chat auto-opens with context",
        "CRM task created with 1-hour SLA",
        "If on pricing: 20% discount auto-applied"
      ],
      outcome: "89% save rate when intervention < 30 seconds",
      revenueSaved: "$2.3M prevented churn last quarter"
    },
    {
      trigger: "Decision Paralysis",
      icon: "🔄",
      detection: "Hovering between options for >30 seconds",
      actions: [
        "Simplify to single recommendation",
        "Hide comparison table",
        "Show social proof for their industry",
        "Add urgency: 'Only 2 seats left at this price'"
      ],
      outcome: "67% proceed to purchase after simplification",
      revenueSaved: "$890k in recovered carts"
    },
    {
      trigger: "Sticker Shock",
      icon: "💰",
      detection: "Mouse velocity drops 90% near price",
      actions: [
        "Show ROI calculator overlay",
        "Display competitor pricing (higher)",
        "Trigger finance option: 'Split into 3 payments'",
        "Email follow-up with case study"
      ],
      outcome: "43% convert within 24 hours",
      revenueSaved: "$1.2M in delayed decisions captured"
    },
    {
      trigger: "Confusion Cascade",
      icon: "😵",
      detection: "Erratic scrolling + form abandonment",
      actions: [
        "Proactive chat: 'Need help with that?'",
        "Simplify form to 2 fields only",
        "Show video walkthrough",
        "Offer human callback within 5 minutes"
      ],
      outcome: "71% complete action with assistance",
      revenueSaved: "$560k in support tickets prevented"
    }
  ];
  
  const current = interventions[selectedIntervention];
  
  return (
    <section className="section py-20 bg-gradient-to-b from-transparent via-purple-900/5 to-transparent">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <p className="kicker">Interventions</p>
          <h2 className="mt-3 text-4xl font-bold">
            Every emotion has a <span className="gradient-text">prescribed response</span>
          </h2>
          <p className="mt-4 text-lg text-white/70 max-w-3xl mx-auto">
            We don't just detect emotions. We trigger immediate interventions 
            based on customer value, emotion intensity, and success patterns.
          </p>
        </div>
        
        {/* Intervention Selector */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {interventions.map((intervention, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedIntervention(idx)}
              className={`glass-card p-4 text-left transition-all ${
                selectedIntervention === idx 
                  ? 'border-purple-400/50 bg-purple-500/10' 
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              <div className="text-2xl mb-2">{intervention.icon}</div>
              <div className="text-sm font-medium">{intervention.trigger}</div>
            </button>
          ))}
        </div>
        
        {/* Intervention Details */}
        <div className="glass-card p-8 rounded-xl">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Detection */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-purple-400">
                Detection Pattern
              </h3>
              <div className="glass-card p-4 bg-red-500/5 border-red-500/20 mb-6">
                <p className="text-white/90">{current.detection}</p>
              </div>
              
              <h3 className="text-lg font-semibold mb-4 text-purple-400">
                Automated Actions
              </h3>
              <div className="space-y-3">
                {current.actions.map((action, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs text-green-400">{idx + 1}</span>
                    </div>
                    <p className="text-sm text-white/80">{action}</p>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Results */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-purple-400">
                Proven Outcomes
              </h3>
              
              <div className="space-y-6">
                <div className="glass-card p-6 bg-green-500/5 border-green-500/20">
                  <div className="text-3xl font-bold text-green-400 mb-2">
                    {current.outcome.split(' ')[0]}
                  </div>
                  <p className="text-white/70">
                    {current.outcome.substring(current.outcome.indexOf(' ') + 1)}
                  </p>
                </div>
                
                <div className="glass-card p-6 bg-blue-500/5 border-blue-500/20">
                  <div className="text-sm text-blue-400 mb-2">Revenue Impact</div>
                  <div className="text-2xl font-bold">
                    {current.revenueSaved}
                  </div>
                </div>
                
                {/* Speed Matters */}
                <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-4 rounded-lg border border-purple-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                    <span className="text-sm font-medium">Speed Matters</span>
                  </div>
                  <p className="text-sm text-white/60">
                    Interventions fire in <span className="text-white">under 500ms</span>.
                    Every second of delay costs 12% success rate.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Integration Bar */}
        <div className="flex flex-wrap items-center justify-center gap-6 mt-12 text-white/40">
          <span className="text-sm">Triggers interventions in:</span>
          <span className="flex items-center gap-2">
            <span className="text-white/60">Slack</span>
          </span>
          <span className="text-white/20">•</span>
          <span className="flex items-center gap-2">
            <span className="text-white/60">Salesforce</span>
          </span>
          <span className="text-white/20">•</span>
          <span className="flex items-center gap-2">
            <span className="text-white/60">HubSpot</span>
          </span>
          <span className="text-white/20">•</span>
          <span className="flex items-center gap-2">
            <span className="text-white/60">Intercom</span>
          </span>
          <span className="text-white/20">•</span>
          <span className="flex items-center gap-2">
            <span className="text-white/60">Your API</span>
          </span>
        </div>
      </div>
    </section>
  );
}