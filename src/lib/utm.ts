// src/lib/utm.ts
export function captureUtms() {
  try {
    // Defensive URL parsing - use URLSearchParams directly
    const search = window.location.search;
    if (!search) return;
    
    const params = new URLSearchParams(search);
    const keys = ["utm_source","utm_medium","utm_campaign","utm_term","utm_content"];
    const utm: Record<string,string> = {};
    
    keys.forEach(k => { 
      const v = params.get(k); 
      if (v) utm[k] = v; 
    });
    
    if (Object.keys(utm).length) {
      sessionStorage.setItem("utm", JSON.stringify(utm));
    }
  } catch (e) {
    // Silently fail if URL parsing fails
    console.warn('UTM capture failed:', e);
  }
}

export function getUtms(): Record<string,string> | null {
  try { 
    return JSON.parse(sessionStorage.getItem("utm") || "null"); 
  } catch { 
    return null; 
  }
}