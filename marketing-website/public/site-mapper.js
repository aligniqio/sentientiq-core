/**
 * SentientIQ Site Mapper
 * Intelligent element discovery and classification
 * This runs once to map the site structure, then caches the results
 */

(function() {
  'use strict';

  const SiteMapper = {
    // Confidence thresholds
    CONFIDENCE: {
      HIGH: 90,
      MEDIUM: 70,
      LOW: 50
    },

    // Initialize and run mapping
    init() {
      const cacheKey = `sq_sitemap_${window.location.hostname}_${window.location.pathname}`;
      const cached = this.loadCache(cacheKey);

      // Use cache if less than 24 hours old
      if (cached && (Date.now() - cached.timestamp < 86400000)) {
        console.log('📍 Using cached site map', cached.map);
        return cached.map;
      }

      console.log('🔍 Discovering site structure...');
      const map = this.discoverSite();
      this.saveCache(cacheKey, map);

      return map;
    },

    // Main discovery function
    discoverSite() {
      const map = {
        pricing: this.findPricingElements(),
        cart: this.findCartElements(),
        cta: this.findCTAElements(),
        forms: this.findForms(),
        navigation: this.findNavigation(),
        demo: this.findDemoElements(),
        testimonials: this.findTestimonials(),
        metadata: this.extractMetadata()
      };

      // Validate and score confidence
      this.validateMap(map);

      return map;
    },

    // Find pricing elements with high accuracy
    findPricingElements() {
      const elements = [];

      // Strategy 1: Currency symbols and price patterns
      const pricePattern = /\$[\d,]+\.?\d*|[\d,]+\.?\d*\s*(USD|EUR|GBP)|Price:?\s*[\d,]+/gi;
      const textNodes = document.evaluate(
        '//text()[normalize-space(.) != ""]',
        document.body,
        null,
        XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
        null
      );

      for (let i = 0; i < textNodes.snapshotLength; i++) {
        const node = textNodes.snapshotItem(i);
        if (pricePattern.test(node.textContent)) {
          const parent = node.parentElement;
          if (parent && !this.isInsideArticle(parent)) {
            elements.push({
              element: parent,
              selector: this.generateSelector(parent),
              confidence: this.CONFIDENCE.HIGH,
              type: 'price_display',
              value: node.textContent.trim()
            });
          }
        }
      }

      // Strategy 2: Structured data
      const structuredData = document.querySelectorAll('[itemtype*="schema.org/Offer"], [itemtype*="schema.org/Product"]');
      structuredData.forEach(el => {
        const priceEl = el.querySelector('[itemprop="price"], [itemprop="offers"]');
        if (priceEl) {
          elements.push({
            element: priceEl,
            selector: this.generateSelector(priceEl),
            confidence: this.CONFIDENCE.HIGH,
            type: 'structured_price',
            value: priceEl.textContent.trim()
          });
        }
      });

      // Strategy 3: Common pricing table patterns
      const pricingTables = document.querySelectorAll(
        '[class*="pricing"], [class*="price"], [class*="tier"], [class*="plan"], ' +
        '[id*="pricing"], [id*="price"], [id*="tier"], [id*="plan"], ' +
        '[data-pricing], [data-price], [data-plan]'
      );

      pricingTables.forEach(el => {
        // Check if it's actually a pricing context (has multiple price-like children)
        const priceChildren = el.querySelectorAll('[class*="price"], [class*="cost"], [class*="amount"]');
        const hasMultiplePrices = el.textContent.split('$').length > 2 ||
                                  el.textContent.split(/\d+\.?\d*\s*(\/month|\/year|\/mo|\/yr)/i).length > 2;

        if (priceChildren.length > 0 || hasMultiplePrices) {
          elements.push({
            element: el,
            selector: this.generateSelector(el),
            confidence: priceChildren.length > 2 ? this.CONFIDENCE.HIGH : this.CONFIDENCE.MEDIUM,
            type: 'pricing_section',
            childCount: priceChildren.length
          });
        }
      });

      // Strategy 4: Visual clustering - elements near prices are likely related
      const confirmedPrices = elements.filter(e => e.confidence >= this.CONFIDENCE.MEDIUM);
      confirmedPrices.forEach(priceEl => {
        const nearby = this.findNearbyElements(priceEl.element, 200); // 200px radius
        nearby.forEach(el => {
          if (el.tagName === 'BUTTON' || el.tagName === 'A') {
            elements.push({
              element: el,
              selector: this.generateSelector(el),
              confidence: this.CONFIDENCE.MEDIUM,
              type: 'price_cta',
              nearPrice: priceEl.selector
            });
          }
        });
      });

      return this.deduplicateElements(elements);
    },

    // Find cart and checkout elements
    findCartElements() {
      const elements = [];

      // Direct cart indicators
      const cartSelectors = [
        '[class*="cart"]', '[id*="cart"]',
        '[class*="basket"]', '[id*="basket"]',
        '[class*="checkout"]', '[id*="checkout"]',
        '[class*="purchase"]', '[id*="purchase"]',
        '[data-cart]', '[data-checkout]',
        'form[action*="cart"]', 'form[action*="checkout"]'
      ];

      document.querySelectorAll(cartSelectors.join(', ')).forEach(el => {
        // Filter out navigation links
        if (!this.isNavigationElement(el)) {
          elements.push({
            element: el,
            selector: this.generateSelector(el),
            confidence: el.tagName === 'FORM' ? this.CONFIDENCE.HIGH : this.CONFIDENCE.MEDIUM,
            type: this.classifyCartElement(el)
          });
        }
      });

      // Cart count indicators
      const cartCounts = document.querySelectorAll('[class*="count"], [class*="badge"], [class*="quantity"]');
      cartCounts.forEach(el => {
        const parent = el.closest('[class*="cart"], [id*="cart"]');
        if (parent) {
          elements.push({
            element: el,
            selector: this.generateSelector(el),
            confidence: this.CONFIDENCE.HIGH,
            type: 'cart_count'
          });
        }
      });

      return this.deduplicateElements(elements);
    },

    // Find primary CTAs
    findCTAElements() {
      const elements = [];
      const ctaKeywords = [
        'buy now', 'purchase', 'get started', 'start free', 'try free',
        'sign up', 'subscribe', 'add to cart', 'checkout', 'get access',
        'claim', 'download', 'install', 'begin', 'join', 'upgrade'
      ];

      // All buttons and prominent links
      const candidates = document.querySelectorAll('button, a[class*="btn"], a[class*="button"], [role="button"]');

      candidates.forEach(el => {
        const text = el.textContent.toLowerCase().trim();
        const isCtaText = ctaKeywords.some(keyword => text.includes(keyword));

        // Check visual prominence
        const styles = window.getComputedStyle(el);
        const isProminent =
          parseFloat(styles.fontSize) > 16 ||
          styles.backgroundColor !== 'rgba(0, 0, 0, 0)' ||
          styles.border !== 'none';

        if (isCtaText || isProminent) {
          const bounds = el.getBoundingClientRect();
          elements.push({
            element: el,
            selector: this.generateSelector(el),
            confidence: isCtaText ? this.CONFIDENCE.HIGH : this.CONFIDENCE.MEDIUM,
            type: this.classifyCTA(text),
            position: {
              aboveFold: bounds.top < window.innerHeight,
              x: bounds.left,
              y: bounds.top
            }
          });
        }
      });

      return this.deduplicateElements(elements);
    },

    // Find form elements
    findForms() {
      const elements = [];

      document.querySelectorAll('form').forEach(form => {
        const inputs = form.querySelectorAll('input, select, textarea');
        const hasEmail = form.querySelector('input[type="email"], input[name*="email"]');
        const hasPayment = form.querySelector(
          'input[name*="card"], input[name*="credit"], input[name*="payment"], ' +
          'input[placeholder*="card"], input[placeholder*="Card"]'
        );

        elements.push({
          element: form,
          selector: this.generateSelector(form),
          confidence: this.CONFIDENCE.HIGH,
          type: hasPayment ? 'payment_form' : hasEmail ? 'signup_form' : 'generic_form',
          fields: Array.from(inputs).map(input => ({
            name: input.name || input.id,
            type: input.type,
            required: input.required
          }))
        });
      });

      // Standalone important inputs
      const standaloneInputs = document.querySelectorAll(
        'input[type="email"]:not(form input), ' +
        'input[placeholder*="email" i]:not(form input)'
      );

      standaloneInputs.forEach(input => {
        elements.push({
          element: input,
          selector: this.generateSelector(input),
          confidence: this.CONFIDENCE.MEDIUM,
          type: 'standalone_email'
        });
      });

      return elements;
    },

    // Find navigation elements
    findNavigation() {
      const elements = [];

      const navElements = document.querySelectorAll(
        'nav, [role="navigation"], header, [class*="nav"], [class*="menu"]'
      );

      navElements.forEach(el => {
        const links = el.querySelectorAll('a');
        if (links.length > 2) {
          elements.push({
            element: el,
            selector: this.generateSelector(el),
            confidence: el.tagName === 'NAV' ? this.CONFIDENCE.HIGH : this.CONFIDENCE.MEDIUM,
            type: 'navigation',
            linkCount: links.length
          });
        }
      });

      return this.deduplicateElements(elements);
    },

    // Find demo/interactive elements
    findDemoElements() {
      const elements = [];

      // Iframes (often demos)
      document.querySelectorAll('iframe').forEach(iframe => {
        elements.push({
          element: iframe,
          selector: this.generateSelector(iframe),
          confidence: this.CONFIDENCE.MEDIUM,
          type: 'iframe_demo',
          src: iframe.src
        });
      });

      // Interactive canvases
      document.querySelectorAll('canvas').forEach(canvas => {
        elements.push({
          element: canvas,
          selector: this.generateSelector(canvas),
          confidence: this.CONFIDENCE.MEDIUM,
          type: 'canvas_demo'
        });
      });

      // Video elements
      document.querySelectorAll('video').forEach(video => {
        elements.push({
          element: video,
          selector: this.generateSelector(video),
          confidence: this.CONFIDENCE.HIGH,
          type: 'video_content',
          autoplay: video.autoplay
        });
      });

      // Code snippets
      document.querySelectorAll('pre, code, [class*="highlight"]').forEach(el => {
        if (el.textContent.length > 50) {
          elements.push({
            element: el,
            selector: this.generateSelector(el),
            confidence: this.CONFIDENCE.MEDIUM,
            type: 'code_example'
          });
        }
      });

      return this.deduplicateElements(elements);
    },

    // Find testimonials/social proof
    findTestimonials() {
      const elements = [];
      const testimonialKeywords = ['testimonial', 'review', 'feedback', 'rating', 'stars', 'quote'];

      document.querySelectorAll('[class*="testimonial"], [class*="review"], [class*="quote"], blockquote').forEach(el => {
        elements.push({
          element: el,
          selector: this.generateSelector(el),
          confidence: el.tagName === 'BLOCKQUOTE' ? this.CONFIDENCE.HIGH : this.CONFIDENCE.MEDIUM,
          type: 'testimonial'
        });
      });

      // Star ratings
      document.querySelectorAll('[class*="star"], [class*="rating"]').forEach(el => {
        if (el.textContent.includes('★') || el.querySelector('svg')) {
          elements.push({
            element: el,
            selector: this.generateSelector(el),
            confidence: this.CONFIDENCE.HIGH,
            type: 'rating'
          });
        }
      });

      return this.deduplicateElements(elements);
    },

    // Extract page metadata
    extractMetadata() {
      return {
        title: document.title,
        description: document.querySelector('meta[name="description"]')?.content,
        ogTitle: document.querySelector('meta[property="og:title"]')?.content,
        ogType: document.querySelector('meta[property="og:type"]')?.content,
        isEcommerce: !!document.querySelector('[itemtype*="Product"], [itemtype*="Offer"]'),
        hasShopping: !!document.querySelector('[class*="shop"], [class*="store"], [id*="shop"], [id*="store"]'),
        framework: this.detectFramework(),
        language: document.documentElement.lang || 'en'
      };
    },

    // Helper: Generate unique selector for element
    generateSelector(element) {
      if (element.id) {
        return `#${element.id}`;
      }

      const path = [];
      while (element && element.nodeType === Node.ELEMENT_NODE) {
        let selector = element.nodeName.toLowerCase();

        if (element.className && typeof element.className === 'string') {
          const classes = element.className.trim().split(/\s+/).slice(0, 2); // First 2 classes
          if (classes.length > 0 && classes[0]) {
            selector += `.${classes.join('.')}`;
          }
        }

        path.unshift(selector);
        if (element.id) {
          path.unshift(`#${element.id}`);
          break;
        }

        element = element.parentNode;
        if (path.length > 3) break; // Keep selector reasonable
      }

      return path.join(' > ');
    },

    // Helper: Find nearby elements
    findNearbyElements(element, radius) {
      const nearby = [];
      const bounds = element.getBoundingClientRect();
      const centerX = bounds.left + bounds.width / 2;
      const centerY = bounds.top + bounds.height / 2;

      const candidates = document.querySelectorAll('button, a, input, [role="button"]');
      candidates.forEach(el => {
        if (el === element) return;

        const elBounds = el.getBoundingClientRect();
        const elCenterX = elBounds.left + elBounds.width / 2;
        const elCenterY = elBounds.top + elBounds.height / 2;

        const distance = Math.hypot(centerX - elCenterX, centerY - elCenterY);
        if (distance <= radius) {
          nearby.push(el);
        }
      });

      return nearby;
    },

    // Helper: Check if element is inside article/blog content
    isInsideArticle(element) {
      return !!element.closest('article, [role="article"], .post, .blog, .content, main');
    },

    // Helper: Check if element is navigation
    isNavigationElement(element) {
      return !!element.closest('nav, [role="navigation"], header, footer');
    },

    // Helper: Classify cart element type
    classifyCartElement(element) {
      const text = element.textContent.toLowerCase();
      if (text.includes('checkout')) return 'checkout';
      if (text.includes('basket')) return 'basket';
      if (text.includes('bag')) return 'bag';
      return 'cart';
    },

    // Helper: Classify CTA type
    classifyCTA(text) {
      if (text.includes('buy') || text.includes('purchase')) return 'purchase';
      if (text.includes('cart')) return 'add_to_cart';
      if (text.includes('sign up') || text.includes('subscribe')) return 'signup';
      if (text.includes('free') || text.includes('trial')) return 'trial';
      if (text.includes('demo')) return 'demo';
      if (text.includes('download')) return 'download';
      return 'generic';
    },

    // Helper: Detect framework
    detectFramework() {
      if (window.React || document.querySelector('[data-reactroot]')) return 'react';
      if (window.Vue || document.querySelector('#app[data-v-]')) return 'vue';
      if (window.angular || document.querySelector('[ng-app]')) return 'angular';
      if (window.Shopify) return 'shopify';
      if (window.wp || document.querySelector('meta[name="generator"][content*="WordPress"]')) return 'wordpress';
      return 'unknown';
    },

    // Helper: Deduplicate elements
    deduplicateElements(elements) {
      const seen = new Set();
      return elements.filter(item => {
        const key = item.selector || item.element;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    },

    // Validate and score the map
    validateMap(map) {
      // Add confidence scores
      map.confidence = {
        pricing: map.pricing.length > 0 ? this.CONFIDENCE.HIGH : this.CONFIDENCE.LOW,
        cart: map.cart.length > 0 ? this.CONFIDENCE.MEDIUM : this.CONFIDENCE.LOW,
        cta: map.cta.length > 0 ? this.CONFIDENCE.HIGH : this.CONFIDENCE.LOW,
        overall: 0
      };

      // Calculate overall confidence
      const scores = Object.values(map.confidence).filter(v => typeof v === 'number');
      map.confidence.overall = scores.reduce((a, b) => a + b, 0) / scores.length;

      // Add warnings for missing critical elements
      map.warnings = [];
      if (map.pricing.length === 0) {
        map.warnings.push('No pricing elements detected');
      }
      if (map.cta.filter(c => c.position.aboveFold).length === 0) {
        map.warnings.push('No above-fold CTAs detected');
      }
    },

    // Cache management
    loadCache(key) {
      try {
        const cached = localStorage.getItem(key);
        return cached ? JSON.parse(cached) : null;
      } catch (e) {
        return null;
      }
    },

    saveCache(key, map) {
      try {
        // Strip out actual DOM elements before caching (only keep selectors)
        const cleanMap = {
          pricing: map.pricing.map(item => ({
            selector: item.selector,
            confidence: item.confidence,
            type: item.type,
            value: item.value
          })),
          cart: map.cart.map(item => ({
            selector: item.selector,
            confidence: item.confidence,
            type: item.type
          })),
          cta: map.cta.map(item => ({
            selector: item.selector,
            confidence: item.confidence,
            type: item.type,
            position: item.position
          })),
          forms: map.forms.map(item => ({
            selector: item.selector,
            confidence: item.confidence,
            type: item.type,
            fields: item.fields
          })),
          navigation: map.navigation.map(item => ({
            selector: item.selector,
            confidence: item.confidence,
            type: item.type,
            linkCount: item.linkCount
          })),
          demo: map.demo.map(item => ({
            selector: item.selector,
            confidence: item.confidence,
            type: item.type
          })),
          testimonials: map.testimonials.map(item => ({
            selector: item.selector,
            confidence: item.confidence,
            type: item.type
          })),
          metadata: map.metadata,
          confidence: map.confidence,
          warnings: map.warnings
        };

        localStorage.setItem(key, JSON.stringify({
          map: cleanMap,
          timestamp: Date.now(),
          url: window.location.href
        }));
      } catch (e) {
        console.warn('Could not cache site map:', e);
      }
    }
  };

  // Export for use
  window.SentientIQSiteMapper = SiteMapper;

  // Auto-run if data attribute is set
  if (document.currentScript?.getAttribute('data-auto-map') === 'true') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => SiteMapper.init());
    } else {
      SiteMapper.init();
    }
  }
})();