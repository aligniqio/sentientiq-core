/**
 * Intervention Template Library
 * Pre-built, tested, industry-optimized templates
 */

import { InterventionTemplate } from '../types/intervention-templates';

export const interventionTemplates: InterventionTemplate[] = [
  // STARTER TIER - 1 Choice
  {
    id: 'clean_minimal',
    name: 'Clean & Minimal',
    description: 'Professional, distraction-free interventions that work everywhere',
    tier: 'starter',
    industry: [
      { type: 'saas', confidence: 90 },
      { type: 'finance', confidence: 85 },
      { type: 'healthcare', confidence: 80 }
    ],
    preview: '/previews/clean-minimal.png',
    styles: {
      baseCSS: `
        .sq-intervention {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
      `,
      modal: {
        container: `
          background: white;
          border-radius: 8px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
          max-width: 480px;
          padding: 32px;
        `,
        body: `
          color: #333;
          font-size: 16px;
          line-height: 1.6;
        `,
        button: `
          background: {primary};
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 4px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s;
        `
      },
      banner: {
        container: `
          background: {primary};
          color: white;
          padding: 16px;
          text-align: center;
          font-weight: 500;
        `,
        body: `
          display: inline-block;
          margin: 0;
        `,
        button: `
          background: white;
          color: {primary};
          border: none;
          padding: 8px 16px;
          margin-left: 16px;
          border-radius: 4px;
          font-weight: 600;
          cursor: pointer;
        `
      },
      toast: {
        container: `
          background: white;
          border: 1px solid #e5e5e5;
          border-radius: 6px;
          padding: 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        `,
        body: `
          color: #333;
          font-size: 14px;
        `,
        button: `
          background: {primary};
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          font-size: 14px;
          margin-top: 12px;
        `
      },
      badge: {
        container: `
          background: {primary}22;
          border: 2px solid {primary};
          color: {primary};
          padding: 8px 12px;
          border-radius: 4px;
          font-weight: 600;
          font-size: 14px;
        `,
        body: `
          display: inline-flex;
          align-items: center;
          gap: 8px;
        `,
        button: ``
      },
      floating: {
        container: `
          background: white;
          border: 1px solid #e5e5e5;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
        `,
        body: `
          color: #333;
          font-size: 15px;
        `,
        button: `
          background: {primary};
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 4px;
          margin-top: 16px;
          width: 100%;
        `
      },
      urgency: {
        primary: '#EF4444',
        secondary: '#DC2626',
        accent: '#FECACA',
        animation: 'pulse'
      },
      trust: {
        primary: '#10B981',
        secondary: '#059669',
        accent: '#D1FAE5',
        animation: 'fadeIn'
      },
      value: {
        primary: '#6366F1',
        secondary: '#4F46E5',
        accent: '#E0E7FF',
        animation: 'slideUp'
      },
      scarcity: {
        primary: '#F59E0B',
        secondary: '#D97706',
        accent: '#FEF3C7',
        animation: 'bounce'
      }
    },
    animations: {
      entrance: 'fadeIn',
      exit: 'fadeOut',
      duration: 300,
      easing: 'ease-out'
    },
    customizable: {
      colors: {
        primary: true,
        secondary: false,
        accent: false,
        text: false,
        background: false
      },
      typography: {
        fontFamily: false,
        fontSize: false,
        fontWeight: false
      },
      spacing: {
        padding: false,
        margin: false,
        borderRadius: false
      },
      logo: {
        enabled: true,
        position: 'top'
      }
    }
  },

  // GROWTH TIER - 3 Choices
  {
    id: 'bold_modern',
    name: 'Bold & Modern',
    description: 'Eye-catching gradients and animations that demand attention',
    tier: 'growth',
    industry: [
      { type: 'ecommerce', confidence: 95 },
      { type: 'retail', confidence: 90 },
      { type: 'saas', confidence: 85 }
    ],
    preview: '/previews/bold-modern.png',
    styles: {
      baseCSS: `
        .sq-intervention {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
      `,
      modal: {
        container: `
          background: linear-gradient(135deg, {primary}ee 0%, {secondary}ee 100%);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 20px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          max-width: 520px;
          padding: 40px;
        `,
        body: `
          color: white;
          font-size: 18px;
          line-height: 1.6;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        `,
        button: `
          background: white;
          color: {primary};
          border: none;
          padding: 14px 32px;
          border-radius: 50px;
          font-weight: 700;
          cursor: pointer;
          transform: scale(1);
          transition: all 0.2s;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.1);
        `
      },
      banner: {
        container: `
          background: linear-gradient(90deg, {primary} 0%, {secondary} 100%);
          color: white;
          padding: 20px;
          text-align: center;
          font-weight: 600;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        `,
        body: `
          display: inline-block;
          margin: 0;
          font-size: 16px;
        `,
        button: `
          background: rgba(255, 255, 255, 0.95);
          color: {primary};
          border: none;
          padding: 10px 24px;
          margin-left: 20px;
          border-radius: 50px;
          font-weight: 700;
          cursor: pointer;
          transform: scale(1);
          transition: all 0.2s;
        `
      },
      toast: {
        container: `
          background: linear-gradient(135deg, {primary}f5 0%, {secondary}f5 100%);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        `,
        body: `
          color: white;
          font-size: 15px;
          font-weight: 500;
        `,
        button: `
          background: white;
          color: {primary};
          border: none;
          padding: 10px 20px;
          border-radius: 50px;
          font-weight: 700;
          font-size: 14px;
          margin-top: 12px;
        `
      },
      badge: {
        container: `
          background: linear-gradient(135deg, {primary} 0%, {secondary} 100%);
          color: white;
          padding: 10px 16px;
          border-radius: 50px;
          font-weight: 700;
          font-size: 14px;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);
        `,
        body: `
          display: inline-flex;
          align-items: center;
          gap: 8px;
        `,
        button: ``
      },
      floating: {
        container: `
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 0.95) 100%);
          border: 2px solid {primary};
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
        `,
        body: `
          color: #1a1a1a;
          font-size: 16px;
          font-weight: 500;
        `,
        button: `
          background: linear-gradient(135deg, {primary} 0%, {secondary} 100%);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 50px;
          margin-top: 16px;
          width: 100%;
          font-weight: 700;
        `
      },
      urgency: {
        primary: '#DC2626',
        secondary: '#991B1B',
        accent: '#FEE2E2',
        animation: 'shake'
      },
      trust: {
        primary: '#059669',
        secondary: '#047857',
        accent: '#D1FAE5',
        animation: 'scaleIn'
      },
      value: {
        primary: '#7C3AED',
        secondary: '#6D28D9',
        accent: '#EDE9FE',
        animation: 'bounce'
      },
      scarcity: {
        primary: '#EA580C',
        secondary: '#C2410C',
        accent: '#FED7AA',
        animation: 'pulse'
      }
    },
    animations: {
      entrance: 'scaleIn',
      exit: 'scaleOut',
      duration: 400,
      easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
    },
    customizable: {
      colors: {
        primary: true,
        secondary: true,
        accent: true,
        text: false,
        background: false
      },
      typography: {
        fontFamily: true,
        fontSize: false,
        fontWeight: false
      },
      spacing: {
        padding: false,
        margin: false,
        borderRadius: true
      },
      logo: {
        enabled: true,
        position: 'top'
      }
    }
  },

  {
    id: 'soft_gradient',
    name: 'Soft & Friendly',
    description: 'Gentle pastels and smooth transitions for a welcoming feel',
    tier: 'growth',
    industry: [
      { type: 'healthcare', confidence: 95 },
      { type: 'education', confidence: 90 },
      { type: 'saas', confidence: 85 }
    ],
    preview: '/previews/soft-gradient.png',
    styles: {
      baseCSS: `
        .sq-intervention {
          font-family: 'Poppins', 'Inter', -apple-system, sans-serif;
        }
      `,
      modal: {
        container: `
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 24px;
          box-shadow: 0 20px 40px rgba(102, 126, 234, 0.3);
          max-width: 500px;
          padding: 36px;
        `,
        body: `
          color: white;
          font-size: 17px;
          line-height: 1.7;
          font-weight: 400;
        `,
        button: `
          background: rgba(255, 255, 255, 0.95);
          color: #667eea;
          border: none;
          padding: 14px 28px;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        `
      },
      banner: {
        container: `
          background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 18px;
          text-align: center;
          font-weight: 500;
          font-size: 15px;
        `,
        body: `
          display: inline-block;
          margin: 0;
        `,
        button: `
          background: rgba(255, 255, 255, 0.9);
          color: #667eea;
          border: none;
          padding: 8px 20px;
          margin-left: 16px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        `
      },
      toast: {
        container: `
          background: rgba(255, 255, 255, 0.98);
          border: 2px solid #667eea;
          border-radius: 12px;
          padding: 18px;
          box-shadow: 0 8px 24px rgba(102, 126, 234, 0.15);
        `,
        body: `
          color: #4a5568;
          font-size: 15px;
          line-height: 1.6;
        `,
        button: `
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 14px;
          margin-top: 12px;
        `
      },
      badge: {
        container: `
          background: linear-gradient(135deg, #667eea22 0%, #764ba222 100%);
          border: 2px solid #667eea;
          color: #667eea;
          padding: 10px 16px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 14px;
        `,
        body: `
          display: inline-flex;
          align-items: center;
          gap: 8px;
        `,
        button: ``
      },
      floating: {
        container: `
          background: white;
          border: 2px solid #e9d5ff;
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 12px 32px rgba(102, 126, 234, 0.12);
        `,
        body: `
          color: #4a5568;
          font-size: 15px;
          line-height: 1.7;
        `,
        button: `
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 10px;
          margin-top: 16px;
          width: 100%;
          font-weight: 600;
        `
      },
      urgency: {
        primary: '#F56565',
        secondary: '#E53E3E',
        accent: '#FED7D7',
        animation: 'pulse'
      },
      trust: {
        primary: '#48BB78',
        secondary: '#38A169',
        accent: '#C6F6D5',
        animation: 'fadeIn'
      },
      value: {
        primary: '#667EEA',
        secondary: '#5A67D8',
        accent: '#E9D8FD',
        animation: 'slideUp'
      },
      scarcity: {
        primary: '#ED8936',
        secondary: '#DD6B20',
        accent: '#FEEBC8',
        animation: 'bounce'
      }
    },
    animations: {
      entrance: 'slideUp',
      exit: 'slideDown',
      duration: 350,
      easing: 'ease-in-out'
    },
    customizable: {
      colors: {
        primary: true,
        secondary: true,
        accent: false,
        text: true,
        background: false
      },
      typography: {
        fontFamily: true,
        fontSize: false,
        fontWeight: false
      },
      spacing: {
        padding: false,
        margin: false,
        borderRadius: true
      },
      logo: {
        enabled: true,
        position: 'center'
      }
    }
  },

  // SCALE TIER - 10 Choices
  {
    id: 'luxury_premium',
    name: 'Luxury Premium',
    description: 'Sophisticated black and gold with premium animations',
    tier: 'scale',
    industry: [
      { type: 'realestate', confidence: 95 },
      { type: 'automotive', confidence: 90 },
      { type: 'finance', confidence: 85 }
    ],
    preview: '/previews/luxury-premium.png',
    styles: {
      baseCSS: `
        .sq-intervention {
          font-family: 'Playfair Display', 'Georgia', serif;
          letter-spacing: 0.5px;
        }
      `,
      modal: {
        container: `
          background: linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%);
          border: 1px solid #d4af37;
          border-radius: 2px;
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5);
          max-width: 560px;
          padding: 48px;
        `,
        body: `
          color: #f5f5f5;
          font-size: 18px;
          line-height: 1.8;
          font-weight: 300;
        `,
        button: `
          background: linear-gradient(135deg, #d4af37 0%, #aa8c2c 100%);
          color: #0f0f0f;
          border: none;
          padding: 16px 40px;
          border-radius: 0;
          font-weight: 600;
          letter-spacing: 2px;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.3s;
        `
      },
      banner: {
        container: `
          background: #0f0f0f;
          border-top: 3px solid #d4af37;
          border-bottom: 3px solid #d4af37;
          color: #f5f5f5;
          padding: 20px;
          text-align: center;
          font-weight: 400;
          letter-spacing: 1px;
        `,
        body: `
          display: inline-block;
          margin: 0;
          font-size: 15px;
          text-transform: uppercase;
        `,
        button: `
          background: #d4af37;
          color: #0f0f0f;
          border: none;
          padding: 10px 30px;
          margin-left: 24px;
          font-weight: 600;
          letter-spacing: 1px;
          text-transform: uppercase;
          cursor: pointer;
        `
      },
      toast: {
        container: `
          background: #0f0f0f;
          border: 1px solid #d4af37;
          border-radius: 0;
          padding: 24px;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
        `,
        body: `
          color: #f5f5f5;
          font-size: 15px;
          line-height: 1.8;
          font-weight: 300;
        `,
        button: `
          background: #d4af37;
          color: #0f0f0f;
          border: none;
          padding: 12px 24px;
          margin-top: 16px;
          font-weight: 600;
          letter-spacing: 1px;
          text-transform: uppercase;
        `
      },
      badge: {
        container: `
          background: #0f0f0f;
          border: 2px solid #d4af37;
          color: #d4af37;
          padding: 12px 20px;
          font-weight: 500;
          font-size: 13px;
          letter-spacing: 1px;
          text-transform: uppercase;
        `,
        body: `
          display: inline-flex;
          align-items: center;
          gap: 10px;
        `,
        button: ``
      },
      floating: {
        container: `
          background: #f5f5f5;
          border: 2px solid #0f0f0f;
          border-radius: 0;
          padding: 32px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
        `,
        body: `
          color: #0f0f0f;
          font-size: 16px;
          line-height: 1.8;
          font-weight: 300;
        `,
        button: `
          background: #0f0f0f;
          color: #d4af37;
          border: 2px solid #d4af37;
          padding: 14px 32px;
          margin-top: 20px;
          width: 100%;
          font-weight: 600;
          letter-spacing: 2px;
          text-transform: uppercase;
        `
      },
      urgency: {
        primary: '#8B0000',
        secondary: '#660000',
        accent: '#FFD700',
        animation: 'pulse'
      },
      trust: {
        primary: '#D4AF37',
        secondary: '#AA8C2C',
        accent: '#F5F5F5',
        animation: 'fadeIn'
      },
      value: {
        primary: '#1A1A1A',
        secondary: '#0F0F0F',
        accent: '#D4AF37',
        animation: 'slideUp'
      },
      scarcity: {
        primary: '#D4AF37',
        secondary: '#AA8C2C',
        accent: '#1A1A1A',
        animation: 'pulse'
      }
    },
    animations: {
      entrance: 'fadeIn',
      exit: 'fadeOut',
      duration: 500,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
    },
    customizable: {
      colors: {
        primary: true,
        secondary: true,
        accent: true,
        text: true,
        background: true
      },
      typography: {
        fontFamily: true,
        fontSize: true,
        fontWeight: true
      },
      spacing: {
        padding: true,
        margin: true,
        borderRadius: true
      },
      logo: {
        enabled: true,
        position: 'top'
      }
    }
  },

  {
    id: 'playful_fun',
    name: 'Playful & Fun',
    description: 'Bright colors, rounded corners, and bouncy animations',
    tier: 'scale',
    industry: [
      { type: 'education', confidence: 95 },
      { type: 'ecommerce', confidence: 85 },
      { type: 'retail', confidence: 80 }
    ],
    preview: '/previews/playful-fun.png',
    styles: {
      baseCSS: `
        .sq-intervention {
          font-family: 'Comic Sans MS', 'Fredoka', 'Poppins', sans-serif;
        }
      `,
      modal: {
        container: `
          background: linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 100%);
          border-radius: 30px;
          box-shadow: 0 20px 60px rgba(255, 107, 107, 0.3);
          max-width: 500px;
          padding: 40px;
          transform: rotate(-1deg);
        `,
        body: `
          color: white;
          font-size: 18px;
          line-height: 1.6;
          font-weight: 500;
          text-align: center;
        `,
        button: `
          background: #FFE66D;
          color: #FF6B6B;
          border: 3px solid #FF6B6B;
          padding: 14px 32px;
          border-radius: 50px;
          font-weight: 700;
          font-size: 18px;
          cursor: pointer;
          transform: rotate(1deg);
          transition: all 0.3s;
        `
      },
      banner: {
        container: `
          background: linear-gradient(90deg, #FF6B6B, #4ECDC4, #FFE66D, #FF6B6B);
          background-size: 300% 100%;
          animation: rainbow 3s ease-in-out infinite;
          color: white;
          padding: 20px;
          text-align: center;
          font-weight: 700;
          font-size: 18px;
        `,
        body: `
          display: inline-block;
          margin: 0;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
        `,
        button: `
          background: white;
          color: #FF6B6B;
          border: 3px solid #FF6B6B;
          padding: 10px 24px;
          margin-left: 20px;
          border-radius: 50px;
          font-weight: 700;
          cursor: pointer;
        `
      },
      toast: {
        container: `
          background: white;
          border: 3px solid #4ECDC4;
          border-radius: 20px;
          padding: 20px;
          box-shadow: 5px 5px 0 #FFE66D;
        `,
        body: `
          color: #2D3436;
          font-size: 16px;
          font-weight: 500;
        `,
        button: `
          background: #FF6B6B;
          color: white;
          border: none;
          padding: 10px 24px;
          border-radius: 50px;
          font-weight: 700;
          margin-top: 12px;
        `
      },
      badge: {
        container: `
          background: #FFE66D;
          border: 3px solid #FF6B6B;
          color: #FF6B6B;
          padding: 10px 20px;
          border-radius: 50px;
          font-weight: 700;
          font-size: 14px;
          transform: rotate(-2deg);
        `,
        body: `
          display: inline-flex;
          align-items: center;
          gap: 8px;
        `,
        button: ``
      },
      floating: {
        container: `
          background: white;
          border: 3px solid #4ECDC4;
          border-radius: 25px;
          padding: 24px;
          box-shadow: 8px 8px 0 #FFE66D;
          transform: rotate(1deg);
        `,
        body: `
          color: #2D3436;
          font-size: 16px;
          font-weight: 500;
        `,
        button: `
          background: linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 100%);
          color: white;
          border: none;
          padding: 12px 28px;
          border-radius: 50px;
          margin-top: 16px;
          width: 100%;
          font-weight: 700;
        `
      },
      urgency: {
        primary: '#FF6B6B',
        secondary: '#FF5252',
        accent: '#FFE66D',
        animation: 'bounce'
      },
      trust: {
        primary: '#4ECDC4',
        secondary: '#45B7AA',
        accent: '#A8E6CF',
        animation: 'bounce'
      },
      value: {
        primary: '#FFE66D',
        secondary: '#FFD93D',
        accent: '#FF6B6B',
        animation: 'bounce'
      },
      scarcity: {
        primary: '#FF6B6B',
        secondary: '#4ECDC4',
        accent: '#FFE66D',
        animation: 'shake'
      }
    },
    animations: {
      entrance: 'bounce',
      exit: 'scaleOut',
      duration: 400,
      easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
    },
    customizable: {
      colors: {
        primary: true,
        secondary: true,
        accent: true,
        text: true,
        background: true
      },
      typography: {
        fontFamily: true,
        fontSize: true,
        fontWeight: true
      },
      spacing: {
        padding: true,
        margin: true,
        borderRadius: true
      },
      logo: {
        enabled: true,
        position: 'center'
      }
    }
  }

  // Adding more templates for Scale tier...
  // tech_dark, eco_natural, medical_trust, finance_serious, retail_urgent
  // These would follow the same pattern with industry-specific styling
];

// Helper function to get templates by tier
export function getTemplatesByTier(tier: string): InterventionTemplate[] {
  switch (tier) {
    case 'starter':
      return interventionTemplates.filter(t => t.id === 'clean_minimal');
    case 'growth':
      return interventionTemplates.filter(t => ['clean_minimal', 'bold_modern', 'soft_gradient'].includes(t.id));
    case 'scale':
      return interventionTemplates;
    case 'enterprise':
      return [...interventionTemplates, {
        id: 'custom',
        name: 'Custom Development',
        description: 'Work with our design team to create your perfect intervention style',
        tier: 'enterprise'
      } as any];
    default:
      return [];
  }
}

// Helper function to suggest template based on industry
export function suggestTemplate(industry: string): InterventionTemplate | null {
  const templates = interventionTemplates
    .filter(t => t.industry.some(i => i.type === industry))
    .sort((a, b) => {
      const aConfidence = a.industry.find(i => i.type === industry)?.confidence || 0;
      const bConfidence = b.industry.find(i => i.type === industry)?.confidence || 0;
      return bConfidence - aConfidence;
    });

  return templates[0] || null;
}