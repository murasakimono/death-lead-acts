import React, { useRef, useState } from 'react';
import { Link2, Trash2, RotateCcw } from 'lucide-react';
import { getPortraitUrl, type BoardLink, type BoardNodePos, type CaseFile, type PinnedQuote } from '../types';
import { sfx } from '../api';

interface BoardViewProps {
  caseFile: CaseFile;
  unlockedEvidence: Set<string>;
  pinnedQuotes?: PinnedQuote[];
  nodes: Record<string, BoardNodePos>;
  links: BoardLink[];
  onMoveNode: (id: string, x: number, y: number) => void;
  onAddLink: (from: string, to: string, label: BoardLink['label']) => void;
  onRemoveLink: (linkId: string) => void;
  onResetLayout: () => void;
}

const TILTS = [-2.2, 1.4, -1.1, 2.0, -1.7, 1.2, -2.0, 1.6];

export const BoardView: React.FC<BoardViewProps> = ({
  caseFile,
  unlockedEvidence,
  pinnedQuotes = [],
  nodes,
  links,
  onMoveNode,
  onAddLink,
  onRemoveLink,
  onResetLayout,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [connectMode, setConnectMode] = useState<BoardLink['label'] | null>(null);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);

  const visibleEvidence = caseFile.evidence.filter((e) => unlockedEvidence.has(e.id));

  const startDrag = (id: string, e: React.MouseEvent) => {
    if (connectMode) {
      e.stopPropagation();
      sfx.click();
      if (!connectFrom) {
        setConnectFrom(id);
      } else if (connectFrom !== id) {
        onAddLink(connectFrom, id, connectMode);
        setConnectFrom(null);
      } else {
        setConnectFrom(null);
      }
      return;
    }

    const pos = nodes[id];
    if (!pos || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setDraggingId(id);
    setDragOffset({
      x: e.clientX - rect.left - pos.x,
      y: e.clientY - rect.top - pos.y,
    });
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!draggingId || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const nx = Math.max(16, Math.min(rect.width - 210, e.clientX - rect.left - dragOffset.x));
    const ny = Math.max(16, Math.min(rect.height - 150, e.clientY - rect.top - dragOffset.y));
    onMoveNode(draggingId, nx, ny);
  };

  const stopDrag = () => setDraggingId(null);

  const cardPinPoint = (id: string) => {
    const p = nodes[id] || { x: 80, y: 80 };
    const isSuspect = caseFile.suspects.some((s) => s.id === id);
    return { x: p.x + (isSuspect ? 86 : 108), y: p.y + 10 };
  };

  return (
    <div className="h-full flex flex-col p-3.5 gap-3 overflow-hidden">
      {/* Minimal Brass/Walnut Desk Toolbar */}
      <div className="noir-panel px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="font-editorial italic text-sm text-[#D6C6A5] tracking-wide mr-2">
            Soruşturma Panosu
          </span>
          <div className="h-4 w-px bg-[#2E2922]" />
          {(['ÇELİŞKİ', 'BAĞLANTI', 'ALİBİ'] as const).map((mode) => {
            const active = connectMode === mode;
            const col =
              mode === 'ÇELİŞKİ'
                ? active
                  ? 'bg-[#8C1D1D] border-[#C42B2B] text-white'
                  : 'border-[#3A2B28] text-[#D97777] hover:border-[#9E1B1B]'
                : mode === 'BAĞLANTI'
                ? active
                  ? 'bg-[#214252] border-[#7AA2B8] text-white'
                  : 'border-[#27333A] text-[#8FB3C7] hover:border-[#7AA2B8]'
                : active
                ? 'bg-[#5E481F] border-[#C49A52] text-white'
                : 'border-[#3B3323] text-[#D1B072] hover:border-[#C49A52]';
            return (
              <button
                key={mode}
                onClick={() => {
                  sfx.click();
                  setConnectFrom(null);
                  setConnectMode(active ? null : mode);
                }}
                className={`px-2.5 py-1 text-[10px] font-mono-tech uppercase tracking-wider border flex items-center gap-1.5 cursor-pointer transition ${col}`}
              >
                <Link2 className="w-3 h-3" />
                {active ? `İP ÇEK: ${mode}` : `${mode} İPİ`}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono-tech">
          {connectMode && (
            <span className="text-[#D6B06C] animate-pulse">
              {connectFrom ? 'Bağlanacak 2. karta tıkla...' : 'Başlangıç kartına tıkla...'}
            </span>
          )}
          <button
            onClick={() => {
              sfx.click();
              onResetLayout();
            }}
            className="px-2.5 py-1 bg-[#1A1815] border border-[#322D26] text-[#B8AE9B] hover:text-white flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" /> MASAYI TOPARLA
          </button>
        </div>
      </div>

      {/* Physical Smoked Cork & Walnut Board */}
      <div
        ref={containerRef}
        onMouseMove={onMouseMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
        className="flex-1 relative overflow-hidden border border-[#2C261F] cork-desk shadow-inner"
      >
        {/* Woven Red/Amber/Slate Yarn with Board Shadow */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-30">
          {links.map((lk) => {
            const a = cardPinPoint(lk.from);
            const b = cardPinPoint(lk.to);
            const midX = (a.x + b.x) / 2;
            const dist = Math.hypot(b.x - a.x, b.y - a.y);
            const sag = Math.min(82, dist * 0.19);
            const midY = (a.y + b.y) / 2 + sag;
            const path = `M ${a.x} ${a.y} Q ${midX} ${midY} ${b.x} ${b.y}`;
            const shadowPath = `M ${a.x + 3} ${a.y + 8} Q ${midX + 3} ${midY + 12} ${b.x + 3} ${b.y + 8}`;
            return (
              <g key={lk.id} className="pointer-events-auto cursor-pointer" onClick={() => onRemoveLink(lk.id)}>
                <path d={shadowPath} fill="none" stroke="rgba(0,0,0,0.48)" strokeWidth="3.5" />
                <path d={path} fill="none" stroke={lk.color} strokeWidth="2.4" strokeLinecap="round" />
                <rect
                  x={midX - 32}
                  y={midY - 9}
                  width="64"
                  height="17"
                  fill="#171411"
                  stroke={lk.color}
                  strokeWidth="1"
                />
                <text
                  x={midX}
                  y={midY + 3}
                  textAnchor="middle"
                  fill="#EAE2CF"
                  fontSize="8.5"
                  fontFamily="IBM Plex Mono"
                  fontWeight="600"
                >
                  {lk.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Tactile Polaroid Suspect Prints */}
        {caseFile.suspects.map((s, idx) => {
          const pos = nodes[s.id] || { x: 40 + idx * 200, y: 36 };
          const selected = connectFrom === s.id;
          const tilt = TILTS[idx % TILTS.length];
          return (
            <div
              key={s.id}
              onMouseDown={(e) => startDrag(s.id, e)}
              style={{
                left: pos.x,
                top: pos.y,
                transform: `rotate(${draggingId === s.id ? 0 : tilt}deg)`,
              }}
              className={`absolute w-[172px] p-2 pb-3 polaroid-card z-20 cursor-grab active:cursor-grabbing transition-transform duration-150 ${
                selected ? 'ring-2 ring-[#C42B2B] scale-[1.03]' : 'hover:scale-[1.02]'
              }`}
            >
              {/* Red 3D Pushpin */}
              <div className="pushpin-red absolute -top-1.5 left-1/2 -translate-x-1/2 z-30" />

              <div className="w-full h-[126px] bg-[#0B0A09] overflow-hidden border border-[#2A2520] relative">
                <img
                  src={getPortraitUrl(s.portrait_index)}
                  alt={s.name}
                  draggable={false}
                  className="w-full h-full object-cover contrast-110 saturate-75"
                />
                <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/75 text-[9px] font-mono-tech text-[#D6C6A5]">
                  {s.handedness.toUpperCase()}
                </div>
              </div>

              <div className="pt-2 px-0.5">
                <div className="font-typewriter text-[13px] font-bold text-[#181512] leading-tight truncate">
                  {s.name}
                </div>
                <div className="text-[10px] font-mono-tech text-[#5A5043] truncate mt-0.5">
                  {s.role} • {s.blood_type}
                </div>
              </div>
            </div>
          );
        })}

        {/* Physical Paper / Thermal / UV Evidence Slips */}
        {visibleEvidence.map((ev, idx) => {
          const pos = nodes[ev.id] || { x: 60 + idx * 220, y: 265 };
          const selected = connectFrom === ev.id;
          const tilt = TILTS[(idx + 3) % TILTS.length] * 0.85;
          const isDigital = ev.category === 'digital' || ev.category === 'secret';

          return (
            <div
              key={ev.id}
              onMouseDown={(e) => startDrag(ev.id, e)}
              style={{
                left: pos.x,
                top: pos.y,
                transform: `rotate(${draggingId === ev.id ? 0 : tilt}deg)`,
              }}
              className={`absolute w-[216px] p-3 pt-4 z-20 cursor-grab active:cursor-grabbing transition-transform duration-150 ${
                ev.is_uv_trace
                  ? 'bg-[#171120] border border-purple-500/60 text-purple-100 shadow-2xl'
                  : isDigital
                  ? 'thermal-slip'
                  : 'paper-slip'
              } ${selected ? 'ring-2 ring-[#C42B2B] scale-[1.03]' : 'hover:scale-[1.02]'}`}
            >
              <div className={`${isDigital || ev.is_uv_trace ? 'pushpin-red' : 'pushpin-brass'} absolute -top-1.5 left-1/2 -translate-x-1/2`} />

              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`text-[10px] font-mono-tech font-bold tracking-wider px-1.5 py-0.5 ${
                    ev.is_uv_trace
                      ? 'bg-purple-900/60 text-purple-200'
                      : isDigital
                      ? 'bg-[#1F2933] text-[#7AA2B8]'
                      : 'border border-[#9E1B1B] text-[#9E1B1B]'
                  }`}
                >
                  {ev.code}
                </span>
                {ev.timestamp && (
                  <span className={`text-[9px] font-mono-tech ${isDigital || ev.is_uv_trace ? 'text-slate-400' : 'text-[#6B5E4B]'}`}>
                    {ev.timestamp}
                  </span>
                )}
              </div>

              <div
                className={`text-xs font-bold leading-snug mb-1 ${
                  isDigital || ev.is_uv_trace ? 'text-slate-100' : 'font-typewriter text-[#1A1612]'
                }`}
              >
                {ev.title}
              </div>
              <div
                className={`text-[10px] leading-relaxed line-clamp-2 ${
                  isDigital || ev.is_uv_trace ? 'text-slate-400 font-mono-tech' : 'text-[#4A4033]'
                }`}
              >
                {ev.summary}
              </div>
            </div>
          );
        })}

        {/* Pinned AI Interrogation Quotes (Aged Index Slips) */}
        {pinnedQuotes.map((pq, idx) => {
          const pos = nodes[pq.id] || { x: 60 + idx * 220, y: 420 };
          const selected = connectFrom === pq.id;
          return (
            <div
              key={pq.id}
              onMouseDown={(e) => startDrag(pq.id, e)}
              style={{ left: pos.x, top: pos.y, transform: `rotate(${TILTS[(idx + 2) % TILTS.length]}deg)` }}
              className={`absolute w-[220px] p-3 pt-4 paper-slip border-l-4 !border-l-[#9E1B1B] z-20 cursor-grab active:cursor-grabbing ${
                selected ? 'ring-2 ring-[#C42B2B]' : ''
              }`}
            >
              <div className="pushpin-red absolute -top-1.5 left-1/2 -translate-x-1/2" />
              <div className="text-[9px] font-mono-tech font-bold text-[#9E1B1B] uppercase mb-1">
                İFADE KAYDI // {pq.suspectName}
              </div>
              <div className="font-typewriter text-[11px] text-[#1C1814] leading-snug line-clamp-3">
                &ldquo;{pq.text}&rdquo;
              </div>
            </div>
          );
        })}

        {links.length > 0 && (
          <div className="absolute bottom-3 right-3 px-2.5 py-1 bg-[#12100E]/90 border border-[#322C24] text-[10px] font-mono-tech text-[#B8AE9B] flex items-center gap-1.5 z-40">
            <Trash2 className="w-3 h-3 text-[#C42B2B]" /> İpi kaldırmak için etiketine tıkla
          </div>
        )}
      </div>
    </div>
  );
};
