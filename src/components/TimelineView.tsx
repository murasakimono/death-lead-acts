import React from 'react';
import { Clock, AlertCircle, Route, CheckCircle2 } from 'lucide-react';
import { formatMinutesFrom19, type CaseFile } from '../types';
import { sfx } from '../api';

interface TimelineViewProps {
  caseFile: CaseFile;
  unlockedEvidence: Set<string>;
  autopsyLockedWindow: [number, number] | null;
  routeSteps: string[];
  routeVerified: boolean;
  onRouteStepsChange: (steps: string[]) => void;
  onVerifyRoute: (ok: boolean, msg: string) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  caseFile,
  unlockedEvidence,
  autopsyLockedWindow,
  routeSteps,
  routeVerified,
  onRouteStepsChange,
  onVerifyRoute,
}) => {
  const totalMin = 360;
  const hours = [0, 60, 120, 180, 240, 300, 360];
  const pct = (m: number) => `${Math.max(0, Math.min(100, (m / totalMin) * 100))}%`;

  const toggleRoomInRoute = (roomName: string) => {
    if (routeVerified) return;
    sfx.click();
    if (routeSteps.includes(roomName)) {
      onRouteStepsChange(routeSteps.filter((x) => x !== roomName));
    } else if (routeSteps.length >= 3) {
      onRouteStepsChange([routeSteps[1], routeSteps[2], roomName]);
    } else {
      onRouteStepsChange([...routeSteps, roomName]);
    }
  };

  const handleCheckRoute = () => {
    if (routeSteps.length !== 3) return;
    const crimeRoom = caseFile.rooms[0]?.name;
    const corridorRoom = caseFile.rooms[2]?.name;
    const isActionCenter = routeSteps[1] === crimeRoom;
    const usesCorridor = routeSteps[0] === corridorRoom || routeSteps[2] === corridorRoom;
    if (isActionCenter && usesCorridor) {
      sfx.discover();
      onVerifyRoute(true, `ROTA DOĞRULANDI: ${routeSteps.join(' → ')} (Olay odası ve koridor geçişi tutarlı!)`);
    } else {
      sfx.error();
      onVerifyRoute(false, `Rota tutarsız: 2. adım olay odası (${crimeRoom}) olmalı ve giriş/kaçışta ana koridor (${corridorRoom}) kullanılmalı.`);
    }
  };

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
          <div className="mt-5 p-3 bg-[#1C1610] border border-[#5E481F] text-xs font-mono-tech text-[#D6B06C] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Ölüm penceresi henüz kilitlenmedi. Adli Lab sekmesinden Ölüm Saati hesabını doğrulayarak kırmızı bandı buraya yansıt.
          </div>
        )}

        {/* Crime Route Reconstruction Bar */}
        <div className="mt-5 pt-4 border-t border-[#2E2922] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono-tech text-[#C49A52] uppercase tracking-wider flex items-center gap-1.5">
              <Route className="w-3.5 h-3.5" /> OLAY YERİ ROTA YENİDEN İNŞASI (GİRİŞ → EYLEM → KAÇIŞ)
            </span>
            {routeVerified ? (
              <span className="text-[10px] font-mono-tech text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> ROTA ADLİ OLARAK DOĞRULANDI
              </span>
            ) : routeSteps.length === 3 ? (
              <button
                onClick={handleCheckRoute}
                className="px-2.5 py-1 bg-[#8C1D1D] hover:bg-[#A62323] border border-[#C42B2B] text-[10px] font-mono-tech text-white uppercase cursor-pointer"
              >
                ROTAYI DOĞRULA
              </button>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {caseFile.rooms.map((r) => {
              const idx = routeSteps.indexOf(r.name);
              return (
                <button
                  key={r.id}
                  onClick={() => toggleRoomInRoute(r.name)}
                  className={`px-3 py-1.5 text-[11px] font-mono-tech border cursor-pointer transition ${
                    idx >= 0
                      ? 'bg-[#8C1D1D]/40 border-[#C42B2B] text-[#F5EFE2]'
                      : 'bg-[#12100E] border-[#2E2922] text-[#9A8F7D] hover:border-[#C49A52]'
                  }`}
                >
                  {idx >= 0 ? `${idx + 1}. ` : ''}{r.name}
                </button>
              );
            })}
          </div>
          {routeSteps.length > 0 && (
            <div className="text-xs font-typewriter text-[#D6C6A5]">
              Çizilen Rota: {routeSteps.join('  →  ')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
