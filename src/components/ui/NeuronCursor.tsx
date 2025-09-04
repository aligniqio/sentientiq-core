import { useEffect, useRef } from "react";

export default function NeuronCursor() {
  const ref = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext("2d")!;
    let W = c.width = window.innerWidth;
    let H = c.height = window.innerHeight;
    
    const nodes: { x: number; y: number; vx: number; vy: number; life: number }[] = [];
    
    const onMove = (e: MouseEvent) => {
      for (let i = 0; i < 4; i++) {
        nodes.push({
          x: e.clientX,
          y: e.clientY,
          vx: (Math.random() - 0.5) * 1.2,
          vy: (Math.random() - 0.5) * 1.2,
          life: 1
        });
      }
    };
    
    const onResize = () => {
      W = c.width = window.innerWidth;
      H = c.height = window.innerHeight;
    };
    
    window.addEventListener("mousemove", onMove);
    window.addEventListener("resize", onResize);
    
    let raf: number;
    
    const loop = () => {
      ctx.clearRect(0, 0, W, H);
      
      nodes.forEach((n, i) => {
        n.x += n.vx;
        n.y += n.vy;
        n.life -= 0.02;
        
        ctx.fillStyle = `rgba(167, 139, 250, ${n.life})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, 1.8, 0, Math.PI * 2);
        ctx.fill();
        
        for (let j = i + 1; j < nodes.length; j++) {
          const m = nodes[j];
          const dx = n.x - m.x;
          const dy = n.y - m.y;
          const d = dx * dx + dy * dy;
          
          if (d < 1200) {
            ctx.strokeStyle = `rgba(96, 165, 250, ${0.12 * (1 - d / 1200)})`;
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(m.x, m.y);
            ctx.stroke();
          }
        }
      });
      
      for (let i = nodes.length - 1; i >= 0; i--) {
        if (nodes[i].life <= 0) {
          nodes.splice(i, 1);
        }
      }
      
      raf = requestAnimationFrame(loop);
    };
    
    loop();
    
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", onResize);
    };
  }, []);
  
  return <canvas ref={ref} className="pointer-events-none fixed inset-0 -z-10" />;
}