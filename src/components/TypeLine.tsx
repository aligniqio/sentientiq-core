// TypeLine.tsx - Theatrical typewriter effect for persona speech
import { useEffect, useRef, useState } from "react";

export function TypeLine({ 
  label, 
  color, 
  text, 
  speed = 28 
}: { 
  label: string; 
  color: string; 
  text: string; 
  speed?: number 
}) {
  const [shown, setShown] = useState("");
  const i = useRef(0);
  
  useEffect(() => {
    // Reset for new text
    i.current = 0;
    setShown("");
    
    const id = setInterval(() => {
      if (i.current < text.length) { 
        setShown(s => s + text[i.current++]); 
      } else {
        clearInterval(id);
      }
    }, speed);
    
    return () => clearInterval(id);
  }, [text, speed]);
  
  return (
    <div className="mb-4 leading-relaxed animate-fadeIn">
      <span 
        className="italic font-semibold mr-2" 
        style={{ color }}
      >
        {label}:
      </span>
      <span className="whitespace-pre-wrap text-white/90">
        {shown}
        {shown.length < text.length && (
          <span className="animate-pulse">▊</span>
        )}
      </span>
    </div>
  );
}