// ui/SenseiCandy.tsx
import React, { createContext, useContext, useRef, useEffect, useState } from "react";

/* ---------- Toasts ---------- */
type Toast = { id:number; kind:"success"|"error"|"info"; msg:string };
const ToastCtx = createContext<{ push:(t:Omit<Toast,"id">)=>void }>({ push: () => {} });
function Toaster({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = (t: Omit<Toast,"id">) => {
    const id = Date.now() + Math.random();
    setItems(x => [...x, { id, ...t }]);
    setTimeout(() => setItems(x => x.filter(i => i.id !== id)), 3500);
  };
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="fixed right-4 top-4 z-[9999] space-y-2">
        {items.map(i=>(
          <div key={i.id}
            className={`rounded-xl px-4 py-3 text-sm shadow-lg backdrop-blur-xl ring-1
            ${i.kind==="success"?"bg-emerald-500/15 ring-emerald-400/30 text-emerald-200":
              i.kind==="error"?"bg-rose-500/15 ring-rose-400/30 text-rose-200":
              "bg-white/10 ring-white/20 text-white/90"}`}>
            {i.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useCandyToast = () => useContext(ToastCtx);

/* ---------- Confetti (GO) ---------- */
function Confetti({ fire, tone="go", power=0.5 }:{ fire:boolean; tone?:"go"|"wait"; power?:number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (!fire || !ref.current) return;
    const c = ref.current, ctx = c.getContext("2d")!;
    let W = (c.width = window.innerWidth), H = (c.height = window.innerHeight);
    
    // ease power: smoother ramp (0..1)
    const ease = (t:number) => t*t;  // easeInQuad
    const P = ease(Math.max(0, Math.min(1, power)));
    
    // scale knobs
    const COUNT   = Math.round(80 + 240 * P);      // 80 .. 320 particles
    const SPEED   = 1 + 1.6 * P;                   // velocity multiplier
    const GRAV    = 0.12 + 0.18 * P;               // gravity
    const FADE    = 0.012 - 0.006 * P;             // slower fade for bigger bursts
    const HUEBASE = tone === "go" ? 120 : 20;      // green/blue vs amber/rose
    
    const parts = Array.from({ length: COUNT }).map(() => ({
      x: W/2, y: H/2,
      r: Math.random()*2 + (P>0.6 ? 2 : 1),        // slightly bigger dots at high power
      vx: (Math.random()-0.5) * 6 * SPEED,
      vy: (Math.random()-0.8) * -8 * SPEED,
      a: 1,
      h: HUEBASE + Math.random() * 40
    }));
    
    let raf = 0;
    const tick = () => {
      ctx.clearRect(0,0,W,H);
      let alive = false;
      for (const p of parts) {
        p.vy += GRAV;
        p.x  += p.vx;
        p.y  += p.vy;
        p.a  -= FADE;
        if (p.a > 0) alive = true;
        ctx.globalAlpha = Math.max(p.a, 0);
        ctx.fillStyle = `hsl(${p.h} 90% 60%)`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
      }
      if (alive) raf = requestAnimationFrame(tick);
    };
    tick();
    
    const onR = () => { W = c.width = innerWidth; H = c.height = innerHeight; };
    window.addEventListener("resize", onR);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onR); };
  }, [fire, tone, power]);
  
  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-[9998]" />;
}

/* ---------- Neuron cursor trail ---------- */
function NeuronCursor() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c=ref.current!, ctx=c.getContext("2d")!;
    let W=c.width=innerWidth, H=c.height=innerHeight;
    const nodes:{x:number;y:number;vx:number;vy:number;life:number}[]=[];
    const onMove=(e:MouseEvent)=>{for(let i=0;i<4;i++) nodes.push({x:e.clientX,y:e.clientY,vx:(Math.random()-0.5)*1.2,vy:(Math.random()-0.5)*1.2,life:1});};
    const onR=()=>{W=c.width=innerWidth;H=c.height=innerHeight;};
    window.addEventListener("mousemove", onMove); window.addEventListener("resize", onR);
    let raf:number;
    const loop=()=>{ ctx.clearRect(0,0,W,H);
      nodes.forEach((n,i)=>{ n.x+=n.vx;n.y+=n.vy;n.life-=0.02;
        ctx.fillStyle=`rgba(167,139,250,${n.life})`; ctx.beginPath(); ctx.arc(n.x,n.y,1.8,0,Math.PI*2); ctx.fill();
        for(let j=i+1;j<nodes.length;j++){const m=nodes[j], dx=n.x-m.x, dy=n.y-m.y, d=dx*dx+dy*dy;
          if(d<1200){ ctx.strokeStyle=`rgba(96,165,250,${0.12*(1-d/1200)})`; ctx.beginPath(); ctx.moveTo(n.x,n.y); ctx.lineTo(m.x,m.y); ctx.stroke(); }
        }
      });
      for(let i=nodes.length-1;i>=0;i--) if(nodes[i].life<=0) nodes.splice(i,1);
      raf=requestAnimationFrame(loop);
    }; loop();
    return ()=>{ cancelAnimationFrame(raf); window.removeEventListener("mousemove", onMove); window.removeEventListener("resize", onR); };
  },[]);
  return <canvas ref={ref} className="pointer-events-none fixed inset-0 -z-10" />;
}

/* ---------- Consensus bar ---------- */
export function ConsensusBar({ value }:{ value:number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-3 w-40 overflow-hidden rounded-full bg-white/10">
        <div className="absolute inset-y-0 left-0 w-0 animate-[pulse_2s_ease-in-out_infinite] bg-gradient-to-r from-violet-400 via-sky-400 to-emerald-400"
             style={{ width: `${value}%` }}/>
      </div>
      <span className="text-sm font-semibold">{value}%</span>
      <style>{`@keyframes pulse{0%,100%{filter:saturate(1)}50%{filter:saturate(1.3)}}`}</style>
    </div>
  );
}

/* ---------- PulseDot (LIVE/OFFLINE) ---------- */
export function PulseDot({ live }:{ live:boolean }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-xs font-medium ring-1 ring-white/10">
      <span className="relative flex h-2.5 w-2.5">
        {live && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />}
        <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${live?"bg-emerald-400":"bg-amber-400"}`} />
      </span>
      {live ? "LIVE" : "OFFLINE"}
    </span>
  );
}

/* ---------- Ticker ---------- */
export function EviTicker({ items }:{ items:{agent:string; evi:number}[] }) {
  return (
    <div className="overflow-hidden whitespace-nowrap border-b border-white/10 bg-black/40 text-xs font-mono">
      <div className="animate-marquee inline-block py-1">
        {items.map((i,idx)=>(
          <span key={idx} className="mx-6">{i.agent}: <span className="font-semibold text-emerald-300">{i.evi.toFixed(1)}</span></span>
        ))}
      </div>
      <style>{`@keyframes marquee{0%{transform:translateX(100%)}100%{transform:translateX(-100%)}} .animate-marquee{animation:marquee 20s linear infinite}`}</style>
    </div>
  );
}

/* ---------- Loader ---------- */
export function NeuronLoader(){
  return (
    <div className="relative h-16 w-16">
      {[...Array(6)].map((_,i)=>(
        <div key={i} className="absolute inset-0 animate-spin"
             style={{animationDuration:`${2+i*0.3}s`, transform:`rotate(${i*60}deg)`}}>
          <div className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-violet-400 shadow-[0_0_8px_2px_rgba(167,139,250,.7)]"/>
        </div>
      ))}
    </div>
  );
}

/* ---------- Provider ---------- */
type Props = {
  children: React.ReactNode;
  confetti?: boolean;
  cursor?: boolean;
  toasts?: boolean;
};
export function SenseiCandyProvider({ children, confetti=true, cursor=true, toasts=true }: Props){
  const [burst, setBurst] = useState<{ tone:"go"|"wait"; power:number } | null>(null);
  
  useEffect(() => {
    const onDecision = (e: Event) => {
      const ce = e as CustomEvent<{ decision:"GO"|"WAIT"; confidence:number }>;
      const { decision, confidence } = ce.detail || { decision: "WAIT", confidence: 0.5 };
      // map confidence → power (0..1). GO uses conf; WAIT uses (1-conf) so high-certainty WAIT still looks weighty but muted
      const p = Math.max(0, Math.min(1, decision === "GO" ? (confidence - 0.5) / 0.5 : (1 - confidence)));
      setBurst({ tone: decision === "GO" ? "go" : "wait", power: p });
      // auto-clear after 2s
      setTimeout(() => setBurst(null), 2000);
    };
    
    window.addEventListener("sensei:decision", onDecision as any);
    (window as any).sensei = {
      decision: (decision: "GO"|"WAIT", confidence = 0.5) =>
        window.dispatchEvent(new CustomEvent("sensei:decision", { detail: { decision, confidence } })),
      go: () => window.dispatchEvent(new CustomEvent("sensei:decision", { detail: { decision: "GO", confidence: 0.85 } })),
      wait: () => window.dispatchEvent(new CustomEvent("sensei:decision", { detail: { decision: "WAIT", confidence: 0.5 } })),
    };
    return () => {
      window.removeEventListener("sensei:decision", onDecision as any);
      delete (window as any).sensei;
    };
  }, []);
  
  return (
    <>
      {cursor && <NeuronCursor />}
      {confetti && burst && (
        <Confetti fire tone={burst.tone} power={burst.power} />
      )}
      {toasts ? <Toaster>{children}</Toaster> : <>{children}</>}
    </>
  );
}