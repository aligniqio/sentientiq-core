/**
 * Dynamic CSS Generation Engine
 * Transforms templates into branded, optimized intervention styles
 */

import { InterventionTemplate, TenantBranding } from '@/types/intervention-templates';

export class CSSEngine {
  private static instance: CSSEngine;
  private styleCache = new Map<string, string>();
  private injectedStyles = new Set<string>();

  private constructor() {}

  static getInstance(): CSSEngine {
    if (!CSSEngine.instance) {
      CSSEngine.instance = new CSSEngine();
    }
    return CSSEngine.instance;
  }

  /**
   * Generate complete CSS for a template with tenant branding
   */
  generateTemplateCSS(
    template: InterventionTemplate,
    branding: TenantBranding,
    componentType: 'modal' | 'banner' | 'toast' | 'badge' | 'floating' = 'modal'
  ): string {
    const cacheKey = `${template.id}-${branding.tenantId}-${componentType}`;

    // Return cached version if available
    if (this.styleCache.has(cacheKey)) {
      return this.styleCache.get(cacheKey)!;
    }

    // Get component styles
    const componentStyles = template.styles[componentType];
    const brand = branding.brand;

    // Build CSS variables
    const cssVars = `
      --sentient-primary: ${brand.primaryColor};
      --sentient-secondary: ${brand.secondaryColor || '#ffffff'};
      --sentient-accent: ${brand.accentColor || brand.primaryColor};
      --sentient-font: ${brand.fontFamily || 'system-ui, -apple-system, sans-serif'};
      --sentient-radius: ${this.getRadiusValue(template)};
      --sentient-shadow: ${this.getShadowValue(template)};
    `;

    // Generate component-specific CSS
    const componentCSS = this.generateComponentCSS(
      componentType,
      componentStyles,
      template,
      branding
    );

    // Generate animation CSS
    const animationCSS = this.generateAnimationCSS(template.animations);

    // Combine all CSS
    const fullCSS = `
      /* SentientIQ Template: ${template.name} */
      .sentient-${componentType}-${template.id} {
        ${cssVars}
        font-family: var(--sentient-font);
      }

      ${componentCSS}
      ${animationCSS}

      /* Custom tenant CSS (if enterprise) */
      ${branding.tier === 'enterprise' && branding.customCSS ? branding.customCSS : ''}
    `.trim();

    // Cache the result
    this.styleCache.set(cacheKey, fullCSS);

    return fullCSS;
  }

  /**
   * Generate component-specific CSS
   */
  private generateComponentCSS(
    type: string,
    styles: any,
    template: InterventionTemplate,
    branding: TenantBranding
  ): string {
    const processStyle = (style: string) => {
      return style
        .replace(/{primary}/g, 'var(--sentient-primary)')
        .replace(/{secondary}/g, 'var(--sentient-secondary)')
        .replace(/{accent}/g, 'var(--sentient-accent)')
        .replace(/{font}/g, 'var(--sentient-font)')
        .replace(/{radius}/g, 'var(--sentient-radius)')
        .replace(/{shadow}/g, 'var(--sentient-shadow)');
    };

    switch (type) {
      case 'modal':
        return `
          .sentient-modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(4px);
            z-index: 999998;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
          }

          .sentient-modal {
            ${processStyle(styles.container)}
            position: relative;
            max-width: 500px;
            width: 100%;
            z-index: 999999;
          }

          .sentient-modal-header {
            ${styles.header ? processStyle(styles.header) : ''}
          }

          .sentient-modal-body {
            ${processStyle(styles.body)}
          }

          .sentient-modal-footer {
            ${styles.footer ? processStyle(styles.footer) : ''}
          }

          .sentient-modal-button {
            ${processStyle(styles.button)}
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .sentient-modal-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
          }

          .sentient-modal-close {
            ${styles.close ? processStyle(styles.close) : ''}
            position: absolute;
            top: 1rem;
            right: 1rem;
            background: transparent;
            border: none;
            cursor: pointer;
            opacity: 0.7;
            transition: opacity 0.2s;
          }

          .sentient-modal-close:hover {
            opacity: 1;
          }
        `;

      case 'banner':
        return `
          .sentient-banner {
            ${processStyle(styles.container)}
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 999997;
          }

          .sentient-banner-body {
            ${processStyle(styles.body)}
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
          }

          .sentient-banner-button {
            ${processStyle(styles.button)}
            white-space: nowrap;
            cursor: pointer;
          }
        `;

      case 'toast':
        return `
          .sentient-toast {
            ${processStyle(styles.container)}
            position: fixed;
            bottom: 1rem;
            right: 1rem;
            z-index: 999996;
            max-width: 400px;
          }

          .sentient-toast-body {
            ${processStyle(styles.body)}
            display: flex;
            align-items: center;
            gap: 0.75rem;
          }

          .sentient-toast-icon {
            flex-shrink: 0;
          }
        `;

      case 'badge':
        return `
          .sentient-badge {
            ${processStyle(styles.container)}
            position: absolute;
            z-index: 10;
            display: inline-flex;
            align-items: center;
            white-space: nowrap;
          }

          .sentient-badge-body {
            ${processStyle(styles.body)}
          }
        `;

      case 'floating':
        return `
          .sentient-floating {
            ${processStyle(styles.container)}
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            z-index: 999995;
          }

          .sentient-floating-body {
            ${processStyle(styles.body)}
          }

          .sentient-floating-button {
            ${processStyle(styles.button)}
            cursor: pointer;
          }
        `;

      default:
        return '';
    }
  }

  /**
   * Generate animation CSS
   */
  private generateAnimationCSS(animations: any): string {
    const { entrance, exit, duration, easing } = animations;

    // Define keyframes for animations
    const keyframes = {
      fadeIn: `
        @keyframes sentientFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `,
      fadeOut: `
        @keyframes sentientFadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
      `,
      slideUp: `
        @keyframes sentientSlideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `,
      slideDown: `
        @keyframes sentientSlideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `,
      slideLeft: `
        @keyframes sentientSlideLeft {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `,
      slideRight: `
        @keyframes sentientSlideRight {
          from { transform: translateX(-100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `,
      scaleIn: `
        @keyframes sentientScaleIn {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `,
      scaleOut: `
        @keyframes sentientScaleOut {
          from { transform: scale(1); opacity: 1; }
          to { transform: scale(0.8); opacity: 0; }
        }
      `,
      bounce: `
        @keyframes sentientBounce {
          0% { transform: translateY(100%); opacity: 0; }
          60% { transform: translateY(-10%); opacity: 1; }
          80% { transform: translateY(5%); }
          100% { transform: translateY(0); }
        }
      `
    };

    // Get relevant keyframes
    const entranceKeyframe = (keyframes as any)[entrance] || keyframes.fadeIn;
    const exitKeyframe = (keyframes as any)[exit] || keyframes.fadeOut;

    return `
      ${entranceKeyframe}
      ${exitKeyframe}

      .sentient-animate-in {
        animation: ${this.getAnimationName(entrance)} ${duration}ms ${easing} forwards;
      }

      .sentient-animate-out {
        animation: ${this.getAnimationName(exit)} ${duration}ms ${easing} forwards;
      }
    `;
  }

  /**
   * Inject styles into the document
   */
  injectStyles(css: string, id: string): void {
    // Check if already injected
    if (this.injectedStyles.has(id)) {
      return;
    }

    // Create style element
    const styleEl = document.createElement('style');
    styleEl.id = `sentient-style-${id}`;
    styleEl.textContent = css;

    // Inject into head
    document.head.appendChild(styleEl);
    this.injectedStyles.add(id);
  }

  /**
   * Remove injected styles
   */
  removeStyles(id: string): void {
    const styleEl = document.getElementById(`sentient-style-${id}`);
    if (styleEl) {
      styleEl.remove();
      this.injectedStyles.delete(id);
    }
  }

  /**
   * Generate inline styles for quick testing
   */
  generateInlineStyles(
    template: InterventionTemplate,
    branding: TenantBranding,
    componentType: 'modal' | 'banner' | 'toast' | 'badge' | 'floating' = 'modal'
  ): Record<string, string> {
    const styles = template.styles[componentType];
    const brand = branding.brand;

    const processStyle = (style: string) => {
      return style
        .replace(/{primary}/g, brand.primaryColor)
        .replace(/{secondary}/g, brand.secondaryColor || '#ffffff')
        .replace(/{accent}/g, brand.accentColor || brand.primaryColor)
        .replace(/{font}/g, brand.fontFamily || 'system-ui')
        .replace(/{radius}/g, this.getRadiusValue(template))
        .replace(/{shadow}/g, this.getShadowValue(template));
    };

    return {
      container: processStyle(styles.container),
      header: styles.header ? processStyle(styles.header) : '',
      body: processStyle(styles.body),
      footer: styles.footer ? processStyle(styles.footer) : '',
      button: processStyle(styles.button),
      close: styles.close ? processStyle(styles.close) : ''
    };
  }

  /**
   * Clear style cache
   */
  clearCache(): void {
    this.styleCache.clear();
  }

  // Helper methods
  private getRadiusValue(template: InterventionTemplate): string {
    const tierRadius = {
      starter: '8px',
      growth: '12px',
      scale: '16px',
      enterprise: '20px'
    };
    return tierRadius[template.tier] || '8px';
  }

  private getShadowValue(template: InterventionTemplate): string {
    const tierShadow = {
      starter: '0 4px 6px rgba(0, 0, 0, 0.1)',
      growth: '0 10px 25px rgba(0, 0, 0, 0.1)',
      scale: '0 20px 40px rgba(0, 0, 0, 0.15)',
      enterprise: '0 30px 60px rgba(0, 0, 0, 0.2)'
    };
    return tierShadow[template.tier] || '0 4px 6px rgba(0, 0, 0, 0.1)';
  }

  private getAnimationName(type: string): string {
    const animationMap: Record<string, string> = {
      fadeIn: 'sentientFadeIn',
      fadeOut: 'sentientFadeOut',
      slideUp: 'sentientSlideUp',
      slideDown: 'sentientSlideDown',
      slideLeft: 'sentientSlideLeft',
      slideRight: 'sentientSlideRight',
      scaleIn: 'sentientScaleIn',
      scaleOut: 'sentientScaleOut',
      bounce: 'sentientBounce'
    };
    return animationMap[type] || 'sentientFadeIn';
  }
}

export const cssEngine = CSSEngine.getInstance();