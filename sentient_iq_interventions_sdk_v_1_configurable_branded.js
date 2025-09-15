/*
 * SentientIQ Interventions SDK v1
 * Configurable, branded interventions wired to SentientIQ v4.1 Intent Brain
 *
 * Usage (GTM-friendly):
 *   new SQInterventions({
 *     configUrl: 'https://cdn.sentientiq.ai/interventions/<tenant>.json',
 *     apiKey: '<your_api_key>',
 *     tenantId: '<tenant>',
 *     debug: true
 *   }).init();
 *
 * Or provide a global object (no network):
 *   window.SentientIQInterventionsConfig = { ... };
 */
(function(){
  'use strict';

  const DEFAULTS = {
    debug: false,
    respectDNT: true,
    analyticsEndpoint: null, // optional separate endpoint for intervention analytics
    frequencyDefaults: { perSession: 1, cooldownSec: 120 },
    theme: {
      brandName: 'Your Brand',
      primary: '#7f5af0',
      accent: '#22c55e',
      text: '#f8fafc',
      bg: '#0f1220',
      fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      logo: null
    }
  };

  function log(...args){ if (SQInterventions.globalDebug) console.log('[SQ-Interventions]', ...args); }

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function wildcardMatch(pattern, value){
    if (!pattern) return true;
    if (Array.isArray(pattern)) return pattern.some(p => wildcardMatch(p, value));
    const esc = pattern.replace(/[.+^${}()|[\]\\]/g, r => `\\${r}`);
    const rx = new RegExp('^' + esc.replace(/\*/g, '.*') + '$');
    return rx.test(value);
  }

  function qs(sel, root=document){ try { return root.querySelector(sel); } catch { return null; } }
  function qsa(sel, root=document){ try { return Array.from(root.querySelectorAll(sel)); } catch { return []; } }

  function injectStyle(id, css){
    if (document.getElementById(id)) return;
    const s = document.createElement('style'); s.id = id; s.textContent = css; document.head.appendChild(s);
  }

  function sendJson(url, payload){
    try {
      const body = JSON.stringify(payload);
      if (navigator.sendBeacon) {
        const blob = new Blob([body], { type: 'application/json' });
        navigator.sendBeacon(url, blob); return;
      }
      fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive:true }).catch(()=>{});
    } catch {}
  }

  function interpolate(str, ctx={}){
    if (!str) return '';
    return String(str).replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
      const parts = key.split('.');
      let val = ctx;
      for (const p of parts) { val = val?.[p]; if (val == null) break; }
      return (val == null) ? '' : String(val);
    });
  }

  class CapStore {
    constructor(ns){ this.ns = ns; this.k = `sq_caps_${ns}`; this.m = this.load(); }
    load(){ try { return JSON.parse(sessionStorage.getItem(this.k) || '{}'); } catch { return {}; } }
    save(){ try { sessionStorage.setItem(this.k, JSON.stringify(this.m)); } catch {}
    }
    canShow(id, { perSession=1, cooldownSec=120 } = {}){
      const now = Date.now();
      const c = this.m[id] || { count:0, last:0 };
      if (c.count >= perSession) return false;
      if (now - c.last < cooldownSec*1000) return false;
      return true;
    }
    markShown(id){
      const now = Date.now();
      const c = this.m[id] || { count:0, last:0 };
      c.count += 1; c.last = now; this.m[id] = c; this.save();
    }
  }

  class SQInterventions {
    static globalDebug = false;

    constructor(opts={}){
      this.opts = opts;
      SQInterventions.globalDebug = !!opts.debug;
      this.apiKey = opts.apiKey || window?.SentientIQ?.debug?.apiKey || null;
      this.tenantId = opts.tenantId || window?.SentientIQ?.tenantId || 'unknown';
      this.config = null;
      this.caps = new CapStore(this.tenantId);
      this.theme = { ...DEFAULTS.theme };
      this.analyticsEndpoint = null;
    }

    async init(){
      if (this.opts.respectDNT ?? DEFAULTS.respectDNT) {
        if (('doNotTrack' in navigator && navigator.doNotTrack === '1') || (window.doNotTrack === '1')) {
          log('DNT enabled; interventions disabled.');
          return;
        }
      }

      await this.loadConfig();
      this.applyTheme();
      this.installBaseStyles();
      this.registerActions();
      this.bridgeIntentPayloads();
      log('Initialized with config', this.config);
    }

    async loadConfig(){
      // Priority: explicit object → URL → defaults
      if (window.SentientIQInterventionsConfig) {
        this.config = window.SentientIQInterventionsConfig;
      } else if (this.opts.configUrl) {
        try {
          const res = await fetch(this.opts.configUrl, { cache: 'no-store' });
          this.config = await res.json();
        } catch (e) {
          log('Failed to fetch config; using defaults', e);
          this.config = { theme: DEFAULTS.theme, rules: [] };
        }
      } else {
        this.config = { theme: DEFAULTS.theme, rules: [] };
      }

      // Expand theme & analytics endpoint
      this.theme = { ...DEFAULTS.theme, ...(this.config.theme||{}) };
      this.analyticsEndpoint = this.config.analyticsEndpoint || this.opts.analyticsEndpoint || null;
    }

    applyTheme(){
      const r = document.documentElement;
      r.style.setProperty('--sq-primary', this.theme.primary);
      r.style.setProperty('--sq-accent', this.theme.accent);
      r.style.setProperty('--sq-text', this.theme.text);
      r.style.setProperty('--sq-bg', this.theme.bg);
      r.style.setProperty('--sq-font', this.theme.fontFamily);
    }

    installBaseStyles(){
      injectStyle('sq-interventions-base', `
        .sq-iv-root{position:fixed;inset:0;pointer-events:none;z-index:2147483000;font-family:var(--sq-font)}
        .sq-iv-tooltip{position:absolute;max-width:320px;background:linear-gradient(135deg,var(--sq-primary),#5b47d6);color:#fff;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.35);padding:12px 14px;pointer-events:auto}
        .sq-iv-tooltip .sq-iv-title{font-weight:700;margin:0 0 4px 0;font-size:14px}
        .sq-iv-tooltip .sq-iv-body{opacity:.95;font-size:12px;line-height:1.4}
        .sq-iv-tooltip .sq-iv-cta{margin-top:8px;display:inline-flex;align-items:center;gap:8px;background:#fff;color:#1a1a2e;border-radius:10px;padding:8px 10px;font-weight:600;text-decoration:none}
        .sq-iv-modal-veil{position:fixed;inset:0;background:rgba(0,0,0,.45);backdrop-filter:saturate(120%) blur(2px);pointer-events:auto}
        .sq-iv-modal{position:fixed;right:24px;bottom:24px;width:360px;max-width:92vw;background:linear-gradient(135deg,#161a2b,#0f1220);color:#eef2ff;border:1px solid rgba(127,90,240,.35);border-radius:16px;box-shadow:0 25px 60px rgba(0,0,0,.45);padding:18px;pointer-events:auto}
        .sq-iv-modal .sq-iv-h{display:flex;align-items:center;gap:10px;margin-bottom:8px}
        .sq-iv-modal .sq-iv-logo{width:28px;height:28px;border-radius:8px;background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden}
        .sq-iv-modal .sq-iv-title{font-size:16px;font-weight:700}
        .sq-iv-modal .sq-iv-body{opacity:.95;font-size:13px;line-height:1.5;margin-top:6px}
        .sq-iv-row{display:flex;gap:10px;margin-top:12px}
        .sq-iv-btn{flex:1;display:inline-flex;align-items:center;justify-content:center;padding:10px 12px;border-radius:12px;text-decoration:none;font-weight:700}
        .sq-iv-btn.primary{background:var(--sq-primary);color:#fff}
        .sq-iv-btn.secondary{background:transparent;color:#d1d5db;border:1px solid rgba(255,255,255,.2)}
        .sq-iv-close{position:absolute;top:10px;right:10px;cursor:pointer;opacity:.8}
      `);
      if (!qs('#sq-iv-root')) {
        const root = document.createElement('div');
        root.id = 'sq-iv-root';
        root.className = 'sq-iv-root';
        document.body.appendChild(root);
      }
    }

    registerActions(){
      window.SentientIQ = window.SentientIQ || {}; // safety
      const actions = window.SentientIQ.actions = window.SentientIQ.actions || {};

      // Each action finds the first matching rule for its action name and displays it
      actions.micro_assist_tooltip = () => this.trigger('micro_assist_tooltip');
      actions.offer_help_or_incentive = () => this.trigger('offer_help_or_incentive');
      actions.exit_intent_save = () => this.trigger('exit_intent_save');
      actions.confusion_helper = () => this.trigger('confusion_helper');
      actions.frustration_unblock = () => this.trigger('frustration_unblock');

      log('Registered actions:', Object.keys(actions));
    }

    bridgeIntentPayloads(){
      // Try to capture latest intent payload for richer rule matching
      try {
        const inst = window.SentientIQInstance;
        const prev = inst.intentOnEmotion;
        inst.intentOnEmotion = (payload) => {
          window.SentientIQ = window.SentientIQ || {}; 
          window.SentientIQ.__lastIntent = payload; // {emotion, behavior, context}
          try { prev?.(payload); } catch {}
        };
      } catch {}
    }

    getLastEmotion(){
      try {
        const h = window.SentientIQInstance?.emotionHistory; 
        return h && h.length ? h[h.length-1] : null; // {emotion, confidence, behavior, timestamp}
      } catch { return null; }
    }

    getContext(){
      const lastIntent = window.SentientIQ?.__lastIntent || {};
      const lastEmotion = this.getLastEmotion() || {};
      return { lastIntent, lastEmotion, url: location.href, path: location.pathname, ts: Date.now() };
    }

    findMatchingRule(action){
      const rules = (this.config?.rules||[]).filter(r => r.action === action);
      if (!rules.length) return null;
      const ctx = this.getContext();
      for (const r of rules){
        if (this.matches(r, ctx)) return r;
      }
      return null;
    }

    matches(rule, ctx){
      // Basic page matching
      if (rule.when?.pages && !wildcardMatch(rule.when.pages, ctx.path)) return false;
      if (rule.when?.excludePages && wildcardMatch(rule.when.excludePages, ctx.path)) return false;
      // Emotion filters
      if (rule.when?.emotionsAny){
        const e = ctx.lastEmotion?.emotion || ctx.lastIntent?.emotion;
        if (!e || !rule.when.emotionsAny.includes(e)) return false;
      }
      if (rule.when?.minConfidence){
        const c = Number(ctx.lastEmotion?.confidence ?? 0);
        if (c < rule.when.minConfidence) return false;
      }
      // Context element filter
      if (rule.when?.contextElementAny){
        const el = ctx.lastIntent?.context?.element;
        if (!el || !rule.when.contextElementAny.includes(el)) return false;
      }
      // Device
      if (rule.when?.device){
        const isMobile = matchMedia('(max-width: 768px)').matches;
        if (rule.when.device === 'mobile' && !isMobile) return false;
        if (rule.when.device === 'desktop' && isMobile) return false;
      }
      // Frequency caps
      const freq = { ...DEFAULTS.frequencyDefaults, ...(rule.frequency||{}) };
      if (!this.caps.canShow(rule.id || rule.action, freq)) return false;
      return true;
    }

    trigger(action){
      const rule = this.findMatchingRule(action);
      if (!rule) { log('No rule matched for action', action); return; }
      // Render variant
      const variant = rule.variant || { type:'tooltip' };
      const detail = this.getContext();
      this.render(rule, variant, detail);
      this.caps.markShown(rule.id || rule.action);
      this.track('impression', rule, detail);
    }

    render(rule, variant, detail){
      const ctx = this.composeTemplateCtx(rule, detail);
      switch ((variant.type||'tooltip')){
        case 'tooltip': return this.renderTooltip(rule, variant, ctx);
        case 'modal': return this.renderModal(rule, variant, ctx);
        default: return this.renderTooltip(rule, variant, ctx);
      }
    }

    composeTemplateCtx(rule, detail){
      const brand = this.theme;
      const globals = this.config.globals || {};
      const visitor = this.guessVisitor();
      return { brand, globals, visitor, detail };
    }

    guessVisitor(){
      // lightweight visitor seed; real systems would read your app's user info
      const name = (window.__sq_vname) || null;
      return { first_name: name || 'there' };
    }

    renderTooltip(rule, v, ctx){
      const targetSel = v.target || '[data-sq-target="primary-cta"], button, [role="button"]';
      const target = qs(targetSel) || qs('button');
      const root = qs('#sq-iv-root');
      if (!target || !root) return;

      // Compute placement
      const r = target.getBoundingClientRect();
      const top = Math.max(8, r.top + window.scrollY - 8);
      const left = Math.min(window.scrollX + r.left, window.scrollX + window.innerWidth - 360);

      const el = document.createElement('div');
      el.className = 'sq-iv-tooltip';
      el.style.top = `${top}px`; el.style.left = `${left}px`;
      const title = interpolate(v.title || `${ctx.brand.brandName} Assistant`, ctx);
      const body = interpolate(v.body || 'Need a hand?', ctx);
      const cta = v.cta || { label: 'Chat now', href: (this.config.globals?.supportUrl || '#') };
      el.innerHTML = `
        <div class="sq-iv-title">${title}</div>
        <div class="sq-iv-body">${body}</div>
        <a class="sq-iv-cta" href="${interpolate(cta.href, ctx)}" target="_blank" rel="noopener">${interpolate(cta.label, ctx)}</a>
      `;
      root.appendChild(el);

      // Auto-close
      setTimeout(() => { el.style.transition='opacity .25s ease'; el.style.opacity='0'; setTimeout(()=>el.remove(), 260); }, (v.ttlMs || 8000));
    }

    renderModal(rule, v, ctx){
      const root = qs('#sq-iv-root'); if (!root) return;
      const veil = document.createElement('div'); veil.className = 'sq-iv-modal-veil';
      const box = document.createElement('div'); box.className = 'sq-iv-modal';
      const title = interpolate(v.title || `${ctx.brand.brandName} concierge`, ctx);
      const body = interpolate(v.body || 'Can I connect you with a specialist?', ctx);
      const primary = v.primary || { label:'Talk to a specialist', href: (this.config.globals?.supportUrl || '#') };
      const secondary = v.secondary || { label:'Maybe later', href:'#' };

      const logoHtml = this.theme.logo ? `<img src="${this.theme.logo}" alt="logo" style="width:100%;height:100%;object-fit:contain">` : `<span style="font-weight:800;color:var(--sq-primary)">${(this.theme.brandName||'SQ').slice(0,2)}</span>`;

      box.innerHTML = `
        <div class="sq-iv-h"><div class="sq-iv-logo">${logoHtml}</div><div class="sq-iv-title">${title}</div><div class="sq-iv-close" aria-label="Close">✕</div></div>
        <div class="sq-iv-body">${body}</div>
        <div class="sq-iv-row">
          <a class="sq-iv-btn primary" href="${interpolate(primary.href, ctx)}" target="_blank" rel="noopener">${interpolate(primary.label, ctx)}</a>
          <a class="sq-iv-btn secondary" href="${interpolate(secondary.href, ctx)}">${interpolate(secondary.label, ctx)}</a>
        </div>
      `;
      root.appendChild(veil); root.appendChild(box);

      const close = () => { [box, veil].forEach(n=>{ if(!n) return; n.style.transition='opacity .2s ease'; n.style.opacity='0'; setTimeout(()=>n.remove(), 220); }); };
      qs('.sq-iv-close', box)?.addEventListener('click', () => { close(); this.track('dismiss', rule, this.getContext()); });
      veil.addEventListener('click', () => { close(); this.track('dismiss', rule, this.getContext()); });
      qsa('a', box).forEach(a => a.addEventListener('click', () => this.track('click', rule, this.getContext())));

      // Auto-close TTL
      if (v.ttlMs) setTimeout(close, v.ttlMs);
    }

    track(kind, rule, detail){
      if (!this.analyticsEndpoint) return;
      const payload = {
        kind,
        ts: Date.now(),
        tenant_id: this.tenantId,
        api_key: this.apiKey ? this.apiKey.slice(0,4)+'…' : null,
        rule_id: rule.id || rule.action,
        action: rule.action,
        path: location.pathname,
        emotion: detail?.lastEmotion?.emotion || detail?.lastIntent?.emotion || null,
        confidence: detail?.lastEmotion?.confidence || null
      };
      sendJson(this.analyticsEndpoint, payload);
    }
  }

  // Expose globally
  window.SQInterventions = SQInterventions;

})();
