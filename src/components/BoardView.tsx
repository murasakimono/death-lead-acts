import React, { useRef, useState } from 'react';
import { Link2, Trash2, RotateCcw, Pin } from 'lucide-react';
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
    const nx = Math.max(12, Math.min(rect.width - 225, e.clientX - rect.left - dragOffset.x));
    const ny = Math.max(12, Math.min(rect.height - 120, e.clientY - rect.top - dragOffset.y));
    onMoveNode(draggingId, nx, ny);
  };

  const stopDrag = () => setDraggingId(null);

  const cardCenter = (id: string) => {
    const p = nodes[id] || { x: 80, y: 80 };
    return { x: p.x + 108, y: p.y + 12 };
  };

  return (
    <div className="h-full flex flex-col p-4 gap-3 overflow-hidden">
      <div className="noir-panel px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono-tech text-red-400 uppercase tracking-widest mr-2">
            KIRMIZI İP DELİL TAHTASI
          </span>
          {(['ÇELİŞKİ', 'BAĞLANTI', 'ALİBİ'] as const).map((mode) => {
            const active = connectMode === mode;
            const colClass =
              mode === 'ÇELİŞKİ'
                ? active
                  ? 'bg-red-600/30 border-red-500 text-red-100'
                  : 'border-slate-700 text-red-300'
                : mode === 'BAĞLANTI'
                ? active
                  ? 'bg-sky-600/30 border-sky-400 text-sky-100'
                  : 'border-slate-700 text-sky-300'
                : active
                ? 'bg-amber-600/30 border-amber-400 text-amber-100'
                : 'border-slate-700 text-amber-300';
            return (
              <button
                key={mode}
                onClick={() => {
                  sfx.click();
                  setConnectFrom(null);
                  setConnectMode(active ? null : mode);
                }}
                className={`px-2.5 py-1 text-[11px] font-mono-tech uppercase border flex items-center gap-1.5 cursor-pointer transition ${colClass}`}
              >
                <Link2 className="w-3 h-3" />
                {active ? `İP ÇEK: ${mode} (AKTİF)` : `${mode} İPİ`}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-xs font-mono-tech">
          {connectMode && (
            <span className="text-amber-300 animate-pulse">
              {connectFrom ? '2. kartı seç...' : '1. kartı seç...'}
            </span>
          )}
          <button
            onClick={() => {
              sfx.click();
              onResetLayout();
            }}
            className="px-2.5 py-1 bg-slate-900 border border-slate-700 text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" /> DİZİLİMİ SIFIRLA
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        onMouseMove={onMouseMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
        className="flex-1 relative overflow-hidden border border-slate-800 bg-[#07090D] noir-grid"
      >
        {/* Gravity-Sagging Physical Strings */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
          {links.map((lk) => {
            const a = cardCenter(lk.from);
            const b = cardCenter(lk.to);
            const midX = (a.x + b.x) / 2;
            const dist = Math.hypot(b.x - a.x, b.y - a.y);
            const sag = Math.min(75, dist * 0.17);
            const midY = (a.y + b.y) / 2 + sag;
            const path = `M ${a.x} ${a.y} Q ${midX} ${midY} ${b.x} ${b.y}`;
            return (
              <g key={lk.id} className="pointer-events-auto cursor-pointer" onClick={() => onRemoveLink(lk.id)}>
                <path d={path} fill="none" stroke="rgba(0,0,0,0.75)" strokeWidth="5" />
                <path d={path} fill="none" stroke={lk.color} strokeWidth="2.2" />
                <circle cx={a.x} cy={a.y} r="3.5" fill={lk.color} />
                <circle cx={b.x} cy={b.y} r="3.5" fill={lk.color} />
                <rect
                  x={midX - 31}
                  y={midY - 9}
                  width="62"
                  height="16"
                  rx="1"
                  fill="#090C12"
                  stroke={lk.color}
                  strokeWidth="1"
                />
                <text
                  x={midX}
                  y={midY + 2.5}
                  textAnchor="middle"
                  fill={lk.color}
                  fontSize="8.5"
                  fontFamily="JetBrains Mono"
                  fontWeight="700"
                >
                  {lk.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Noir Mugshot Suspect Cards */}
        {caseFile.suspects.map((s) => {
          const pos = nodes[s.id] || { x: 40, y: 40 };
          const selected = connectFrom === s.id;
          return (
            <div
              key={s.id}
              onMouseDown={(e) => startDrag(s.id, e)}
              style={{ left: pos.x, top: pos.y }}
              className={`absolute w-[216px] bg-[#10141C] border shadow-[0_14px_30px_rgba(0,0,0,0.7)] z-20 cursor-grab active:cursor-grabbing transition-shadow ${
                selected ? 'border-red-500 ring-2 ring-red-500/40' : 'border-slate-700/90 hover:border-slate-500'
              }`}
            >
              <div className="px-2.5 py-1 bg-[#0B0E14] border-b border-slate-800 flex items-center justify-between">
                <span className="text-[9px] font-mono-tech uppercase tracking-[0.18em] text-slate-400">
                  DOSYA // {s.id.toUpperCase()}
                </span>
                <Pin className="w-3 h-3 text-red-500" />
              </div>
              <div className="p-2.5 flex items-center gap-2.5">
                {/* Real Neo-Noir Photographic Mugshot */}
                <div className="w-12 h-14 mugshot-bg border border-slate-700 relative overflow-hidden shrink-0">
                  <img
                    src={getPortraitUrl(s.portrait_index)}
                    alt={s.name}
                    draggable={false}
                    className="w-full h-full object-cover contrast-115 brightness-95"
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">{s.name}</div>
                  <div className="text-[10px] font-mono-tech text-slate-400 truncate">{s.role}</div>
                  <div className="text-[9px] font-mono-tech text-sky-400 mt-0.5">
                    {s.handedness.toUpperCase()} • {s.blood_type}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Forensic / Digital / Physical Evidence Cards */}
        {visibleEvidence.map((ev) => {
          const pos = nodes[ev.id] || { x: 100, y: 260 };
          const selected = connectFrom === ev.id;
          const isDigital = ev.category === 'digital' || ev.category === 'secret';
          const borderCol = selected
            ? 'border-red-500 ring-2 ring-red-500/40'
            : ev.is_uv_trace
            ? 'border-purple-500/70 hover:border-purple-400'
            : isDigital
            ? 'border-sky-700/70 hover:border-sky-400'
            : 'border-amber-700/60 hover:border-amber-400';

          const headerBg = ev.is_uv_trace
            ? 'bg-purple-950/40 text-purple-300'
            : isDigital
            ? 'bg-sky-950/35 text-sky-300'
            : 'bg-amber-950/30 text-amber-300';

          return (
            <div
              key={ev.id}
              onMouseDown={(e) => startDrag(ev.id, e)}
              style={{ left: pos.x, top: pos.y }}
              className={`absolute w-[216px] bg-[#12161F] border shadow-[0_14px_30px_rgba(0,0,0,0.65)] z-20 cursor-grab active:cursor-grabbing ${borderCol}`}
            >
              <div className={`px-2.5 py-1 border-b border-slate-800/80 flex items-center justify-between ${headerBg}`}>
                <span className="text-[10px] font-mono-tech font-bold tracking-wider">{ev.code}</span>
                <Pin className="w-3 h-3" />
              </div>
              <div className="p-2.5">
                <div className="text-xs font-semibold text-slate-100 leading-snug mb-1">{ev.title}</div>
                <div className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">{ev.summary}</div>
              </div>
            </div>
          );
        })}

        {/* Pinned AI Interrogation Quote Cards */}
        {pinnedQuotes.map((pq) => {
          const pos = nodes[pq.id] || { x: 60, y: 420 };
          const selected = connectFrom === pq.id;
          return (
            <div
              key={pq.id}
              onMouseDown={(e) => startDrag(pq.id, e)}
              style={{ left: pos.x, top: pos.y }}
              className={`absolute w-[220px] bg-[#191216] border shadow-xl z-20 cursor-grab active:cursor-grabbing ${
                selected ? 'border-red-500 ring-2 ring-red-500/40' : 'border-red-800/70'
              }`}
            >
              <div className="px-2.5 py-1 bg-red-950/50 border-b border-red-900/60 flex items-center justify-between text-red-300">
                <span className="text-[9px] font-mono-tech font-bold uppercase">İFADE // {pq.suspectName}</span>
                <Pin className="w-3 h-3" />
              </div>
              <div className="p-2.5 text-[11px] text-slate-200 italic leading-snug line-clamp-3">
                &ldquo;{pq.text}&rdquo;
              </div>
            </div>
          );
        })}

        {links.length > 0 && (
          <div className="absolute bottom-3 right-3 px-2.5 py-1 bg-black/80 border border-slate-800 text-[10px] font-mono-tech text-slate-400 flex items-center gap-1.5 z-30">
            <Trash2 className="w-3 h-3 text-red-400" /> İpi silmek için etiketine tıkla
          </div>
        )}
      </div>
    </div>
  );
};
