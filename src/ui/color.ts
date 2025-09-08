export function hexToRgb(hex: string) {
  const h = hex.replace('#','');
  const bigint = parseInt(h.length===3 ? h.split('').map(x=>x+x).join('') : h, 16);
  return [(bigint>>16)&255, (bigint>>8)&255, bigint&255] as const;
}

export function rgba(hex: string, a = 0.12) {
  const [r,g,b] = hexToRgb(hex); 
  return `rgba(${r},${g},${b},${a})`;
}