import { PERSONA_META } from '../personas/meta';
import { PERSONA_COLOR } from '../personas/colors';
import { rgba } from '../ui/color';

export function AgentCard({
  id, selected, disabled, onToggle, flashAll
}: {
  id: string;
  selected?: boolean;
  disabled?: boolean;
  onToggle?: (id: string) => void;
  flashAll?: boolean;  // pass true for ~1s after "Summon Entire Collective"
}) {
  const p = PERSONA_META[id];
  if (!p) return null;
  
  const color = PERSONA_COLOR[p.name] || '#64748b';
  const tint = rgba(color, 0.14);

  return (
    <button
      onClick={() => !disabled && onToggle?.(id)}
      disabled={disabled}
      className={[
        'agent-card agent-tint group w-full text-left min-h-[160px]',
        selected ? 'ring-1 ring-white/35 selected-tint' : '',
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:translate-y-[-1px]',
        flashAll && selected ? 'flash-green' : ''
      ].join(' ')}
      style={{ ['--tint' as any]: tint }}
      aria-pressed={!!selected}
    >
      <div className="p-4 h-full flex flex-col">
        {/* Title pinned top */}
        <div className="agent-title">
          <div className="text-[16px] font-semibold truncate">{p.name}</div>
          <div className="text-[12.5px] text-white/65 truncate">{p.role}</div>
        </div>

        {/* Chips float in middle */}
        <div className="flex-1 flex items-center">
          <div className="flex flex-wrap gap-1.5">
            {p.creds.slice(0, 2).map(c => (
              <span
                key={c}
                className="agent-chip text-white/90"
                style={{
                  background: rgba(color, 0.12),
                  borderColor: rgba(color, 0.35)
                }}
              >
                {c}
              </span>
            ))}
          </div>
        </div>

        {/* Voice line anchored to bottom */}
        <div className="text-[12px] leading-snug text-white/75 line-clamp-2 mt-2">
          {p.voice}
        </div>

        {/* Selection indicator */}
        <div className="absolute top-3 right-3">
          <div className={`h-3 w-3 rounded-full border transition-all ${
            selected ? 'bg-white border-white' : 'border-white/30'
          }`} />
        </div>
      </div>
    </button>
  );
}