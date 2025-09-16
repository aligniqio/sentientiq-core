/**
 * Intervention Template System Types
 * The difference between "cool tech" and "holy shit it works"
 */

export interface InterventionTemplate {
  id: string;
  name: string;
  description: string;
  tier: 'starter' | 'growth' | 'scale' | 'enterprise';
  industry: Industry[];
  preview: string;
  styles: TemplateStyles;
  animations: AnimationConfig;
  customizable: CustomizationOptions;
}

export interface Industry {
  type: 'ecommerce' | 'saas' | 'automotive' | 'healthcare' | 'finance' | 'retail' | 'realestate' | 'education';
  confidence: number;
}

export interface TemplateStyles {
  // Base template CSS
  baseCSS: string;

  // Component-specific styles
  modal: ComponentStyle;
  banner: ComponentStyle;
  toast: ComponentStyle;
  badge: ComponentStyle;
  floating: ComponentStyle;

  // Emotional state styles
  urgency: StateStyle;
  trust: StateStyle;
  value: StateStyle;
  scarcity: StateStyle;
}

export interface ComponentStyle {
  container: string;
  header?: string;
  body: string;
  footer?: string;
  button: string;
  close?: string;
}

export interface StateStyle {
  primary: string;
  secondary: string;
  accent: string;
  animation: string;
}

export interface AnimationConfig {
  entrance: 'fadeIn' | 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight' | 'scaleIn' | 'bounce';
  exit: 'fadeOut' | 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight' | 'scaleOut';
  duration: number;
  easing: string;
}

export interface CustomizationOptions {
  colors: {
    primary: boolean;
    secondary: boolean;
    accent: boolean;
    text: boolean;
    background: boolean;
  };
  typography: {
    fontFamily: boolean;
    fontSize: boolean;
    fontWeight: boolean;
  };
  spacing: {
    padding: boolean;
    margin: boolean;
    borderRadius: boolean;
  };
  logo: {
    enabled: boolean;
    position: 'top' | 'center' | 'bottom';
  };
}

export interface TenantBranding {
  tenantId: string;
  tier: 'starter' | 'growth' | 'scale' | 'enterprise';
  selectedTemplate: string;

  brand: {
    companyName: string;
    logoUrl?: string;
    primaryColor: string;
    secondaryColor?: string;
    accentColor?: string;
    fontFamily?: string;
  };

  customCSS?: string; // For enterprise only
  customMessages?: Record<string, string>; // Custom intervention text
}

export interface TemplateGalleryItem {
  template: InterventionTemplate;
  preview: {
    thumbnail: string;
    liveDemo: boolean;
    industries: string[];
  };
  availability: {
    tier: string;
    requiresUpgrade: boolean;
  };
}