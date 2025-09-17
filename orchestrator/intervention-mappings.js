/**
 * Intervention Mapping Configuration
 * Maps emotions to the 8 core interventions
 */

export const INTERVENTION_MAPPINGS = {
  // 💰 Discount Modal - Triggers on price sensitivity
  'price_shock': {
    intervention: 'discount_modal',
    threshold: 75,
    cooldown: 30000
  },
  'sticker_shock': {
    intervention: 'discount_modal',
    threshold: 75,
    cooldown: 30000
  },
  'price_hesitation': {
    intervention: 'discount_modal',
    threshold: 80,
    cooldown: 30000
  },

  // 🔒 Trust Badges - Show security and guarantees
  'skeptical': {
    intervention: 'trust_badges',
    threshold: 70,
    cooldown: 20000
  },
  'trust_hesitation': {
    intervention: 'trust_badges',
    threshold: 70,
    cooldown: 20000
  },
  'evaluation': {
    intervention: 'trust_badges',
    threshold: 60,
    cooldown: 20000
  },

  // ⏰ Urgency Banner - Limited time/stock
  'hesitation': {
    intervention: 'urgency_banner',
    threshold: 75,
    cooldown: 25000
  },
  'cart_review': {
    intervention: 'urgency_banner',
    threshold: 70,
    cooldown: 25000
  },
  'cart_hesitation': {
    intervention: 'urgency_banner',
    threshold: 80,
    cooldown: 25000
  },

  // 🔥 Social Toast - Real-time activity
  'evaluation': {
    intervention: 'social_toast',
    threshold: 60,
    cooldown: 15000
  },
  'comparison_shopping': {
    intervention: 'social_toast',
    threshold: 70,
    cooldown: 15000
  },
  'exploring': {
    intervention: 'social_toast',
    threshold: 50,
    cooldown: 15000
  },

  // 💬 Help Chat - Proactive support
  'confusion': {
    intervention: 'help_chat',
    threshold: 75,
    cooldown: 30000
  },
  'frustration': {
    intervention: 'help_chat',
    threshold: 80,
    cooldown: 30000
  },
  'rage_click': {
    intervention: 'help_chat',
    threshold: 90,
    cooldown: 30000
  },

  // ✨ Value Highlight - Reinforce value props
  'cart_hesitation': {
    intervention: 'value_highlight',
    threshold: 75,
    cooldown: 20000
  },
  'price_consideration': {
    intervention: 'value_highlight',
    threshold: 70,
    cooldown: 20000
  },

  // 📊 Comparison Modal - Show advantages
  'comparison_shopping': {
    intervention: 'comparison_modal',
    threshold: 75,
    cooldown: 25000
  },
  'anxiety': {
    intervention: 'comparison_modal',
    threshold: 70,
    cooldown: 25000
  },
  'price_evaluation': {
    intervention: 'comparison_modal',
    threshold: 65,
    cooldown: 25000
  },

  // 🚪 Exit Intent - Last chance offer
  'abandonment_intent': {
    intervention: 'exit_intent',
    threshold: 85,
    cooldown: 60000
  },
  'exit_risk': {
    intervention: 'exit_intent',
    threshold: 80,
    cooldown: 60000
  },
  'abandonment_warning': {
    intervention: 'exit_intent',
    threshold: 75,
    cooldown: 60000
  }
};

// Quick lookup for intervention priorities
export const INTERVENTION_PRIORITY = {
  'exit_intent': 'CRITICAL',
  'help_chat': 'HIGH',
  'discount_modal': 'HIGH',
  'urgency_banner': 'MEDIUM',
  'trust_badges': 'MEDIUM',
  'value_highlight': 'MEDIUM',
  'comparison_modal': 'LOW',
  'social_toast': 'LOW'
};