import React from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import { formatMinutesFrom19, type CaseFile } from '../types';

interface TimelineViewProps {
  caseFile: CaseFile;
  unlockedEvidence: Set<string>;
  autopsyLockedWindow: [number, number] | null;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  caseFile,
  unlockedEvidence,
  autopsyLockedWindow,
}) => {
  // Range: 19:00 (0) to 01:00 (360 min)
  const totalMin = 360;
  const hours = [0, 60, 120, 180, 240, 300, 360];

  const pct = (m: number) => `${Math.max(0, Math.min(100, (m / totalMin) * 100))}%`;

  return (
    <div className="h-full p-4 flex flex-col gap-4 overflow-hidden">
      <div className="noir-panel p-4 flex items-center justify-between">
        <div>
          <div className="text-xs font-mono-tech text-red-400 uppercase tracking-widest flex items-center gap-2">
            <Clock className="w-4 h-4" />
            GECE KRONOLOJİSİ & ALİBİ ÇAKIŞMA MATRİSİ (19:00 — 01:00)
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Üst kesik çubuk şüphelinin <span className="text-amber-300">iddia ettiği</span> konumdur; alt dolu çubuk ise{' '}
            <span className="text-sky-300">kanıtlanmış (CCTV / Kart / HTS)</span> gerçektir.
          </p>
        </div>

        <div className="flex items-center gap-4 text-[11px] font-mono-tech">
          <span className="flex items-center gap-1.5 text-amber-300">
            <span className="w-4 h-2 border border-dashed border-amber-400 inline-block" /> İDDİA
          </span>
          <span className="flex items-center gap-1.5 text-sky-300">
            <span className="w-4 h-2 bg-sky-500/70 inline-block" /> KANITLANMIŞ
          </span>
          <span className="flex items-center gap-1.5 text-red-400">
            <span className="w-4 h-2 bg-red-600/50 border border-red-500 inline-block" /> ÖLÜM PENCERESİ
          </span>
        </div>
      </div>

      <div className="flex-1 noir-panel p-5 overflow-y-auto relative">
        {/* Hour Axis */}
        <div className="grid grid-cols-12 mb-3 pb-2 border-b border-slate-800">
          <div className="col-span-3 text-[11px] font-mono-tech text-slate-500 uppercase">ŞÜPHELİ</div>
          <div className="col-span-9 relative h-5">
            {hours.map((h) => (
              <div
                key={h}
                style={{ left: pct(h) }}
                className="absolute -translate-x-1/2 text-[11px] font-mono-tech text-slate-400"
              >
                {formatMinutesFrom19(h)}
              </div>
            ))}
          </div>
        </div>

        {/* Suspect Tracks */}
        <div className="space-y-4 relative">
          {caseFile.suspects.map((s) => {
            const entries = caseFile.timeline.filter(
              (t) => t.suspect_id === s.id && (!t.evidence_id || unlockedEvidence.has(t.evidence_id))
            );
            const claimed = entries.filter((e) => e.is_claimed);
            const verified = entries.filter((e) => !e.is_claimed);

            return (
              <div key={s.id} className="grid grid-cols-12 items-center py-2 border-b border-slate-800/60">
                <div className="col-span-3 pr-3">
                  <div className="text-sm font-semibold text-white">{s.name}</div>
                  <div className="text-[11px] font-mono-tech text-slate-400">
                    {s.role} • {s.handedness}
                  </div>
                </div>

                <div className="col-span-9 relative h-14 bg-[#0B0E14] border border-slate-800/80 overflow-hidden">
                  {/* Hour grid lines */}
                  {hours.map((h) => (
                    <div
                      key={h}
                      style={{ left: pct(h) }}
                      className="absolute top-0 bottom-0 w-px bg-slate-800/70"
                    />
                  ))}

                  {/* Locked Death Window vertical highlight */}
                  {autopsyLockedWindow && (
                    <div
                      style={{
                        left: pct(autopsyLockedWindow[0]),
                        width: pct(autopsyLockedWindow[1] - autopsyLockedWindow[0]),
                      }}
                      className="absolute top-0 bottom-0 bg-red-600/20 border-x border-red-500/70 z-10 pointer-events-none"
                    />
                  )}

                  {/* Claimed bars (top half) */}
                  {claimed.map((c, idx) => (
                    <div
                      key={`c-${idx}`}
                      style={{
                        left: pct(c.start_min),
                        width: pct(Math.max(15, c.end_min - c.start_min)),
                      }}
                      title={`${c.location} (${formatMinutesFrom19(c.start_min)}-${formatMinutesFrom19(c.end_min)})`}
                      className="absolute top-1.5 h-5 border border-dashed border-amber-400/80 bg-amber-500/10 px-1.5 text-[10px] font-mono-tech text-amber-200 truncate leading-5"
                    >
                      {c.location}
                    </div>
                  ))}

                  {/* Verified bars (bottom half) */}
                  {verified.map((v, idx) => (
                    <div
                      key={`v-${idx}`}
                      style={{
                        left: pct(v.start_min),
                        width: pct(Math.max(18, v.end_min - v.start_min)),
                      }}
                      title={`${v.location} (${formatMinutesFrom19(v.start_min)}-${formatMinutesFrom19(v.end_min)})`}
                      className="absolute bottom-1.5 h-5 bg-sky-600/40 border border-sky-400 px-1.5 text-[10px] font-mono-tech text-white truncate leading-5 z-20"
                    >
                      {v.location}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {!autopsyLockedWindow && (
          <div className="mt-5 p-3 bg-amber-950/25 border border-amber-800/60 text-xs font-mono-tech text-amber-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Ölüm penceresi henüz kilitlenmedi. Adli & Dijital Dosya sekmesinden Adli Tıp Hesabı&apos;nı tamamlayarak kırmızı ölüm bandını buraya yansıtabilirsin.
          </div>
        )}
      </div>
    </div>
  );
};
