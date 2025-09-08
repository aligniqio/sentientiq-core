import { PERSONA_META } from '../personas/meta';

export function AgentCard({
  id, selected, disabled, onToggle
}: { id: string; selected?: boolean; disabled?: boolean; onToggle?: (id:string)=>void }) {
  const p = PERSONA_META[id];
  if (!p) return null;

  return (
    <button
      onClick={()=>!disabled && onToggle?.(id)}
      disabled={disabled}
      className={[
        'group relative w-full text-left rounded-2xl border transition-all duration-200',
        selected ? 'border-white/40 bg-white/10 shadow-xl shadow-purple-500/10' : 'border-white/12 bg-white/[0.03] hover:bg-white/[0.06]',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      ].join(' ')}
      aria-pressed={!!selected}
    >
      <div className="p-4">
        {/* Title row */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[15px] md:text-base font-semibold truncate">{p.name}</div>
            <div className="text-xs md:text-sm text-white/60 truncate">{p.role}</div>
          </div>
          <div className={`h-4 w-4 rounded-full border transition-all ${selected ? 'bg-white border-white' : 'border-white/30'}`} />
        </div>

        {/* Credential chips */}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {p.creds.slice(0,2).map(c => (
            <span key={c} className="text-[10px] md:text-xs px-2 py-0.5 rounded-full bg-white/8 border border-white/10 text-white/80">
              {c}
            </span>
          ))}
        </div>

        {/* Personality line */}
        <div className="mt-2 text-[11px] md:text-[12px] leading-snug text-white/70 line-clamp-2">
          {p.voice}
        </div>
      </div>

      {/* Hover reveal (optional second line) */}
      {p.alt && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-2 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 transition">
          <div className="mx-4 mb-3 rounded-lg bg-black/40 backdrop-blur px-3 py-2 text-[11px] text-white/80">
            {p.alt}
          </div>
        </div>
      )}
    </button>
  );
}