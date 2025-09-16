/**
 * Intervention Renderer
 * Takes choreographer decisions and makes them real
 * The DOM whisperer
 */

import { cssEngine } from './css-engine';
import { interventionTemplates } from '@/data/intervention-templates';

interface RenderedIntervention {
  id: string;
  element: HTMLElement;
  type: string;
  dismissHandler?: () => void;
  interactionHandler?: () => void;
}

export class InterventionRenderer {
  private static instance: InterventionRenderer;
  private activeInterventions = new Map<string, RenderedIntervention>();
  private portalRoot?: HTMLElement;

  private constructor() {
    this.initializePortal();
  }

  static getInstance(): InterventionRenderer {
    if (!InterventionRenderer.instance) {
      InterventionRenderer.instance = new InterventionRenderer();
    }
    return InterventionRenderer.instance;
  }

  private initializePortal() {
    // Create a portal root for interventions
    this.portalRoot = document.createElement('div');
    this.portalRoot.id = 'sentientiq-intervention-portal';
    this.portalRoot.style.cssText = 'position: fixed; top: 0; left: 0; width: 0; height: 0; z-index: 999999; pointer-events: none;';

    if (document.body) {
      document.body.appendChild(this.portalRoot);
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        document.body.appendChild(this.portalRoot!);
      });
    }
  }

  public render(intervention: any, tenantBranding: any): string {
    const id = `intervention-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Get template (or use dynamic template)
    const template = interventionTemplates.find(t => t.id === intervention.template) || this.getDynamicTemplate(intervention);

    // Generate CSS
    const css = cssEngine.generateTemplateCSS(template, tenantBranding, intervention.type);
    cssEngine.injectStyles(css, id);

    // Create intervention element
    const element = this.createInterventionElement(id, intervention, template);

    // Apply initial state
    element.style.opacity = '0';
    element.style.pointerEvents = 'auto';

    // Add to portal
    this.portalRoot?.appendChild(element);

    // Animate in
    requestAnimationFrame(() => {
      element.classList.add('sentient-animate-in');
      element.style.opacity = '1';
    });

    // Set up handlers
    const renderedIntervention: RenderedIntervention = {
      id,
      element,
      type: intervention.type,
      dismissHandler: () => this.dismiss(id),
      interactionHandler: () => this.handleInteraction(id)
    };

    this.activeInterventions.set(id, renderedIntervention);

    // Set up auto-dismiss if needed
    this.setupPersistence(id, intervention);

    return id;
  }

  private createInterventionElement(id: string, intervention: any, template: any): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.id = id;
    wrapper.className = `sentient-intervention sentient-${intervention.type} sentient-${intervention.type}-${template.id}`;

    switch (intervention.type) {
      case 'modal':
        wrapper.innerHTML = this.createModalHTML(intervention, template);
        wrapper.style.cssText = 'position: fixed; inset: 0; pointer-events: auto;';
        this.attachModalHandlers(wrapper, id);
        break;

      case 'banner':
        wrapper.innerHTML = this.createBannerHTML(intervention, template);
        wrapper.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; pointer-events: auto;';
        this.attachBannerHandlers(wrapper, id);
        break;

      case 'toast':
        wrapper.innerHTML = this.createToastHTML(intervention, template);
        const toastPosition = this.calculateToastPosition();
        wrapper.style.cssText = `position: fixed; ${toastPosition}; pointer-events: auto;`;
        this.attachToastHandlers(wrapper, id);
        break;

      case 'badge':
        wrapper.innerHTML = this.createBadgeHTML(intervention, template);
        const badgePosition = this.calculateBadgePosition(intervention);
        wrapper.style.cssText = `position: fixed; ${badgePosition}; pointer-events: auto;`;
        this.attachBadgeHandlers(wrapper, id);
        break;

      case 'floating':
        wrapper.innerHTML = this.createFloatingHTML(intervention, template);
        const floatingPosition = this.calculateFloatingPosition(intervention);
        wrapper.style.cssText = `position: fixed; ${floatingPosition}; pointer-events: auto;`;
        this.attachFloatingHandlers(wrapper, id);
        break;
    }

    // Apply attention grabber if specified
    if (intervention.animation?.attentionGrabber) {
      this.applyAttentionGrabber(wrapper, intervention.animation.attentionGrabber);
    }

    return wrapper;
  }

  private createModalHTML(intervention: any, template: any): string {
    const { content } = intervention;
    const discountBadge = content.discount ? `<span class="discount-badge">${content.discount}% OFF</span>` : '';

    return `
      <div class="sentient-modal-overlay">
        <div class="sentient-modal">
          <button class="sentient-modal-close" aria-label="Close">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          <div class="sentient-modal-header">
            ${discountBadge}
            <h2>${content.headline}</h2>
          </div>
          <div class="sentient-modal-body">
            <p>${content.body}</p>
          </div>
          <div class="sentient-modal-footer">
            <button class="sentient-modal-button sentient-primary-action">
              ${content.cta}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private createBannerHTML(intervention: any, template: any): string {
    const { content } = intervention;
    return `
      <div class="sentient-banner">
        <div class="sentient-banner-body">
          <div class="sentient-banner-content">
            <strong>${content.headline}</strong>
            ${content.body ? `<span>${content.body}</span>` : ''}
          </div>
          <button class="sentient-banner-button sentient-primary-action">
            ${content.cta}
          </button>
        </div>
      </div>
    `;
  }

  private createToastHTML(intervention: any, template: any): string {
    const { content } = intervention;
    const icon = this.getToastIcon(intervention);

    return `
      <div class="sentient-toast">
        <div class="sentient-toast-body">
          ${icon}
          <div class="sentient-toast-content">
            <strong>${content.headline}</strong>
            ${content.body ? `<p>${content.body}</p>` : ''}
          </div>
          ${content.cta ? `<button class="sentient-toast-action sentient-primary-action">${content.cta}</button>` : ''}
        </div>
      </div>
    `;
  }

  private createBadgeHTML(intervention: any, template: any): string {
    const { content } = intervention;
    return `
      <div class="sentient-badge">
        <div class="sentient-badge-body">
          ${content.headline}
        </div>
      </div>
    `;
  }

  private createFloatingHTML(intervention: any, template: any): string {
    const { content } = intervention;
    const discountAmount = content.discount ? `${content.discount}%` : '';

    return `
      <div class="sentient-floating">
        <div class="sentient-floating-body">
          ${discountAmount && `<div class="sentient-floating-discount">${discountAmount}</div>`}
          <div class="sentient-floating-content">
            <h3>${content.headline}</h3>
            <p>${content.body}</p>
          </div>
          <button class="sentient-floating-button sentient-primary-action">
            ${content.cta}
          </button>
        </div>
      </div>
    `;
  }

  private getToastIcon(intervention: any): string {
    const iconMap = {
      'trust_signals': '🔒',
      'social_proof': '👥',
      'urgency': '⏰',
      'discount': '💰',
      'help': '💬',
      'success': '✅',
      'warning': '⚠️'
    };

    const iconType = intervention.template.split('_')[0];
    const icon = (iconMap as any)[iconType] || '📢';

    return `<div class="sentient-toast-icon">${icon}</div>`;
  }

  private calculateToastPosition(): string {
    // Stack toasts from bottom-right
    const activeToasts = Array.from(this.activeInterventions.values())
      .filter(i => i.type === 'toast');

    const offset = activeToasts.length * 80; // 80px spacing between toasts
    return `bottom: ${20 + offset}px; right: 20px;`;
  }

  private calculateBadgePosition(intervention: any): string {
    const { position } = intervention;

    if (position?.element) {
      // Position near specific element
      const target = document.querySelector(position.element);
      if (target) {
        const rect = target.getBoundingClientRect();
        return `top: ${rect.top - 10}px; left: ${rect.right + 10}px;`;
      }
    }

    // Default position
    return 'bottom: 100px; right: 20px;';
  }

  private calculateFloatingPosition(intervention: any): string {
    const { position } = intervention;

    if (position?.coordinates) {
      return `top: ${position.coordinates.y}px; left: ${position.coordinates.x}px;`;
    }

    if (position?.element) {
      const target = document.querySelector(position.element);
      if (target) {
        const rect = target.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        return `top: ${centerY}px; left: ${centerX}px; transform: translate(-50%, -50%);`;
      }
    }

    return 'bottom: 80px; right: 20px;';
  }

  private applyAttentionGrabber(element: HTMLElement, type: string) {
    const animations = {
      pulse: `
        @keyframes sentient-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `,
      shake: `
        @keyframes sentient-shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
      `,
      glow: `
        @keyframes sentient-glow {
          0%, 100% { box-shadow: 0 0 5px rgba(0, 123, 255, 0.5); }
          50% { box-shadow: 0 0 20px rgba(0, 123, 255, 0.8); }
        }
      `,
      bounce: `
        @keyframes sentient-bounce {
          0%, 100% { transform: translateY(0); }
          25% { transform: translateY(-10px); }
          75% { transform: translateY(5px); }
        }
      `
    };

    const animationCSS = (animations as any)[type] || animations.pulse;
    const styleId = `attention-${type}-${Date.now()}`;

    // Inject animation CSS
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      ${animationCSS}
      #${element.id} {
        animation: sentient-${type} 1s ease-in-out 3;
      }
    `;
    document.head.appendChild(style);

    // Clean up after animation
    setTimeout(() => {
      document.getElementById(styleId)?.remove();
    }, 3000);
  }

  private attachModalHandlers(wrapper: HTMLElement, id: string) {
    // Close button
    wrapper.querySelector('.sentient-modal-close')?.addEventListener('click', () => {
      this.dismiss(id);
    });

    // Overlay click
    wrapper.querySelector('.sentient-modal-overlay')?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).classList.contains('sentient-modal-overlay')) {
        this.dismiss(id);
      }
    });

    // Primary action
    wrapper.querySelector('.sentient-primary-action')?.addEventListener('click', () => {
      this.handleInteraction(id);
    });

    // ESC key
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.dismiss(id);
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }

  private attachBannerHandlers(wrapper: HTMLElement, id: string) {
    wrapper.querySelector('.sentient-primary-action')?.addEventListener('click', () => {
      this.handleInteraction(id);
    });
  }

  private attachToastHandlers(wrapper: HTMLElement, id: string) {
    wrapper.querySelector('.sentient-primary-action')?.addEventListener('click', () => {
      this.handleInteraction(id);
    });

    // Auto-dismiss on hover (feels premium)
    wrapper.addEventListener('mouseenter', () => {
      setTimeout(() => this.dismiss(id), 500);
    });
  }

  private attachBadgeHandlers(wrapper: HTMLElement, id: string) {
    wrapper.addEventListener('click', () => {
      this.handleInteraction(id);
    });
  }

  private attachFloatingHandlers(wrapper: HTMLElement, id: string) {
    wrapper.querySelector('.sentient-primary-action')?.addEventListener('click', () => {
      this.handleInteraction(id);
    });

    // Make draggable (because why not)
    this.makeDraggable(wrapper);
  }

  private makeDraggable(element: HTMLElement) {
    let isDragging = false;
    let startX: number;
    let startY: number;
    let initialX: number;
    let initialY: number;

    element.addEventListener('mousedown', (e) => {
      if ((e.target as HTMLElement).tagName === 'BUTTON') return;

      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;

      const rect = element.getBoundingClientRect();
      initialX = rect.left;
      initialY = rect.top;

      element.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      element.style.left = `${initialX + deltaX}px`;
      element.style.top = `${initialY + deltaY}px`;
      element.style.right = 'auto';
      element.style.bottom = 'auto';
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
      element.style.cursor = 'grab';
    });
  }

  private setupPersistence(id: string, intervention: any) {
    const { timing } = intervention;

    switch (timing.persistence) {
      case 'timed':
        setTimeout(() => this.dismiss(id), timing.duration);
        break;

      case 'until-scroll':
        const scrollHandler = () => {
          this.dismiss(id);
          window.removeEventListener('scroll', scrollHandler);
        };
        window.addEventListener('scroll', scrollHandler);
        break;

      case 'until-interaction':
        const clickHandler = (e: MouseEvent) => {
          const intervention = this.activeInterventions.get(id);
          if (intervention && !intervention.element.contains(e.target as Node)) {
            this.dismiss(id);
            document.removeEventListener('click', clickHandler);
          }
        };
        // Delay to prevent immediate dismissal
        setTimeout(() => {
          document.addEventListener('click', clickHandler);
        }, 100);
        break;

      case 'sticky':
        // Stays until explicitly dismissed
        break;
    }
  }

  public dismiss(id: string) {
    const intervention = this.activeInterventions.get(id);
    if (!intervention) return;

    // Animate out
    intervention.element.classList.remove('sentient-animate-in');
    intervention.element.classList.add('sentient-animate-out');
    intervention.element.style.opacity = '0';

    // Remove after animation
    setTimeout(() => {
      intervention.element.remove();
      this.activeInterventions.delete(id);

      // Clean up CSS
      cssEngine.removeStyles(id);

      // Notify choreographer
      if (intervention.dismissHandler) {
        intervention.dismissHandler();
      }
    }, 500);
  }

  private handleInteraction(id: string) {
    const intervention = this.activeInterventions.get(id);
    if (!intervention) return;

    console.log(`🎯 Intervention interacted: ${id}`);

    // Notify choreographer
    if (intervention.interactionHandler) {
      intervention.interactionHandler();
    }

    // Add success animation
    intervention.element.classList.add('sentient-success');

    // Dismiss after success
    setTimeout(() => this.dismiss(id), 1000);
  }

  private getDynamicTemplate(intervention: any): any {
    // Create a dynamic template on the fly
    return {
      id: 'dynamic',
      name: 'Dynamic Template',
      tier: 'enterprise',
      industry: [],
      preview: '',
      styles: {
        modal: {
          container: 'background: white; border-radius: 16px; padding: 32px; box-shadow: 0 20px 40px rgba(0,0,0,0.15);',
          header: 'margin-bottom: 16px;',
          body: 'margin-bottom: 24px; color: #333;',
          footer: 'display: flex; gap: 12px;',
          button: 'background: {primary}; color: white; padding: 12px 24px; border-radius: 8px; border: none; font-weight: 600;'
        },
        banner: {
          container: 'background: linear-gradient(90deg, {primary}, {accent}); padding: 16px;',
          body: 'color: white; display: flex; align-items: center; justify-content: space-between;',
          button: 'background: white; color: {primary}; padding: 8px 16px; border-radius: 6px; border: none;'
        },
        toast: {
          container: 'background: white; border-radius: 12px; padding: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);',
          body: 'display: flex; align-items: center; gap: 12px;',
          button: 'background: {primary}; color: white; padding: 6px 12px; border-radius: 4px; border: none;'
        },
        badge: {
          container: 'background: {primary}; color: white; padding: 8px 16px; border-radius: 20px; font-weight: 600;',
          body: ''
        },
        floating: {
          container: 'background: white; border-radius: 16px; padding: 20px; box-shadow: 0 15px 35px rgba(0,0,0,0.1); cursor: grab;',
          body: 'margin-bottom: 16px;',
          button: 'background: {primary}; color: white; padding: 10px 20px; border-radius: 8px; border: none; width: 100%;'
        }
      },
      animations: {
        entrance: intervention.animation?.entrance || 'fadeIn',
        exit: intervention.animation?.exit || 'fadeOut',
        duration: 500,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
      },
      customizable: {
        colors: { primary: true, secondary: true, accent: true, text: true, background: true },
        typography: { fontFamily: true, fontSize: true, fontWeight: true },
        spacing: { padding: true, margin: true, borderRadius: true },
        logo: { enabled: false, position: 'top' }
      }
    };
  }

  public isActive(type?: string): boolean {
    if (type) {
      return Array.from(this.activeInterventions.values()).some(i => i.type === type);
    }
    return this.activeInterventions.size > 0;
  }

  public dismissAll() {
    this.activeInterventions.forEach((_, id) => this.dismiss(id));
  }
}

export const renderer = InterventionRenderer.getInstance();