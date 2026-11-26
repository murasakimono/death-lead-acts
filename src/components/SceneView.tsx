import React, { useEffect, useRef, useState } from 'react';
import {
  Flashlight,
  Sparkles,
  CheckCircle2,
  Eye,
  ShieldAlert,
  ZoomIn,
  Layers,
} from 'lucide-react';
import { getSceneUrl, type CaseFile, type SceneHotspot } from '../types';
import { sfx } from '../api';
import { ObjectInspectModal } from './ObjectInspectModal';

interface SceneViewProps {
  caseFile: CaseFile;
  unlockedEvidence: Set<string>;
  onDiscoverEvidence: (evidenceId: string, message: string) => void;
}

export const SceneView: React.FC<SceneViewProps> = ({
  caseFile,
  unlockedEvidence,
  onDiscoverEvidence,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bgImgRef = useRef<HTMLImageElement | null>(null);
  const [uvMode, setUvMode] = useState(false);
  const [zoomLens, setZoomLens] = useState(false);
  const [viewMode, setViewMode] = useState<'photo' | 'blueprint'>('photo');
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [selectedHotspot, setSelectedHotspot] = useState<SceneHotspot | null>(null);
  const [inspectModalHotspot, setInspectModalHotspot] = useState<SceneHotspot | null>(null);
  const [discoveryCard, setDiscoveryCard] = useState<SceneHotspot | null>(null);

  const uvModeRef = useRef(uvMode);
  const zoomRef = useRef(zoomLens);
  const viewModeRef = useRef(viewMode);
  const mouseRef = useRef(mousePos);
  const unlockedRef = useRef(unlockedEvidence);

  useEffect(() => { uvModeRef.current = uvMode; }, [uvMode]);
  useEffect(() => { zoomRef.current = zoomLens; }, [zoomLens]);
  useEffect(() => { viewModeRef.current = viewMode; }, [viewMode]);
  useEffect(() => { mouseRef.current = mousePos; }, [mousePos]);
  useEffect(() => { unlockedRef.current = unlockedEvidence; }, [unlockedEvidence]);

  useEffect(() => {
    const img = new Image();
    img.src = getSceneUrl(caseFile.venue_index);
    img.onload = () => {
      bgImgRef.current = img;
    };
  }, [caseFile.venue_index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key.toLowerCase() === 'u') {
        sfx.click();
        setUvMode((v) => !v);
      } else if (e.key.toLowerCase() === 'z') {
        sfx.click();
        setZoomLens((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const motes = Array.from({ length: 48 }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00045,
      vy: (Math.random() - 0.5) * 0.00045,
      r: 0.9 + Math.random() * 1.5,
    }));

    let rafId = 0;
    let tick = 0;

    const render = () => {
      tick += 0.022;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr)) {
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
      }

      const w = rect.width;
      const h = rect.height;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.fillStyle = '#05070B';
      ctx.fillRect(0, 0, w, h);

      const mx = (mouseRef.current.x / 100) * w;
      const my = (mouseRef.current.y / 100) * h;
      const beamRadius = Math.min(w, h) * (zoomRef.current ? 0.34 : 0.25);

      if (viewModeRef.current === 'photo' && bgImgRef.current) {
        // Cover-fit high-res Neo-Noir room illustration
        const img = bgImgRef.current;
        const scale = Math.max(w / img.width, h / img.height);
        const dw = img.width * scale;
        const dh = img.height * scale;
        const dx = (w - dw) / 2;
        const dy = (h - dh) / 2;
        ctx.drawImage(img, dx, dy, dw, dh);

        // Subtle UV tint over photo when UV mode active
        if (uvModeRef.current) {
          ctx.fillStyle = 'rgba(59, 7, 100, 0.34)';
          ctx.fillRect(0, 0, w, h);
        } else if (caseFile.scene_weather === 'blackout') {
          // Flickering crimson emergency blackout strobe
          const strobe = 0.08 + Math.max(0, Math.sin(tick * 5.2)) * 0.14;
          ctx.fillStyle = `rgba(185, 28, 28, ${strobe})`;
          ctx.fillRect(0, 0, w, h);
        } else if (caseFile.scene_weather === 'fog') {
          // Drifting nocturnal mist layer
          const fogGrad = ctx.createLinearGradient(0, h * 0.4, 0, h);
          fogGrad.addColorStop(0, 'rgba(148, 163, 184, 0)');
          fogGrad.addColorStop(1, 'rgba(148, 163, 184, 0.18)');
          ctx.fillStyle = fogGrad;
          ctx.fillRect(0, 0, w, h);
        } else {
          // Diagonal night rain streaks
          ctx.save();
          ctx.strokeStyle = 'rgba(186, 230, 253, 0.14)';
          ctx.lineWidth = 1;
          for (let r = 0; r < 34; r++) {
            const rx = ((r * 97 + tick * 140) % (w + 120)) - 60;
            const ry = ((r * 61 + tick * 420) % (h + 80)) - 40;
            ctx.beginPath();
            ctx.moveTo(rx, ry);
            ctx.lineTo(rx - 8, ry + 26);
            ctx.stroke();
          }
          ctx.restore();
        }
      } else {
        // Blueprint architectural fallback / toggle mode
        ctx.strokeStyle = uvModeRef.current ? 'rgba(139, 92, 246, 0.1)' : 'rgba(56, 189, 248, 0.07)';
        ctx.lineWidth = 1;
        for (let gx = 0; gx < w; gx += 32) {
          ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke();
        }
        for (let gy = 0; gy < h; gy += 32) {
          ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
        }
        for (const r of caseFile.rooms) {
          const rx = (r.x / 100) * w;
          const ry = (r.y / 100) * h;
          const rw = (r.w / 100) * w;
          const rh = (r.h / 100) * h;
          ctx.fillStyle = r.id === 'r1' ? 'rgba(127, 29, 29, 0.14)' : 'rgba(15, 23, 42, 0.45)';
          ctx.fillRect(rx, ry, rw, rh);
          ctx.strokeStyle = r.id === 'r1' ? 'rgba(239, 68, 68, 0.65)' : 'rgba(148, 163, 184, 0.38)';
          ctx.lineWidth = 2;
          ctx.strokeRect(rx, ry, rw, rh);
          ctx.fillStyle = r.id === 'r1' ? '#FCA5A5' : '#94A3B8';
          ctx.font = '600 10px "JetBrains Mono", monospace';
          ctx.fillText(r.name.toUpperCase(), rx + 10, ry + 18);
        }
      }

      // Draw interactive forensic hotspots & UV traces
      caseFile.hotspots.forEach((hs, idx) => {
        const hx = (hs.x / 100) * w;
        const hy = (hs.y / 100) * h;
        const dist = Math.hypot(mx - hx, my - hy);
        const found = unlockedRef.current.has(hs.evidence_id);
        const inBeam = dist < beamRadius;

        if (hs.uv_only && !found) {
          if (!uvModeRef.current || !inBeam) return;
          const alpha = Math.max(0.2, 1 - dist / beamRadius);
          ctx.save();
          ctx.shadowColor = '#A855F7';
          ctx.shadowBlur = 24;
          ctx.fillStyle = `rgba(216, 180, 254, ${alpha * 0.9})`;
          [
            [-14, -6, 4],
            [-6, 9, 5.5],
            [9, -11, 3],
            [15, 6, 4.5],
            [0, 0, 7],
            [-19, 8, 2.5],
          ].forEach(([ox, oy, rad]) => {
            ctx.beginPath();
            ctx.ellipse(hx + ox, hy + oy, rad, rad * 0.72, 0.4, 0, Math.PI * 2);
            ctx.fill();
          });
          ctx.strokeStyle = `rgba(233, 213, 255, ${alpha})`;
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.arc(hx, hy, 22 + Math.sin(tick * 4) * 3, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '700 10px "JetBrains Mono", monospace';
          ctx.fillText(`UV İZİ [0${idx + 1}] — TIKLA`, hx - 48, hy - 28);
          ctx.restore();
        } else {
          ctx.save();
          const pulse = 1 + Math.sin(tick * 3 + idx) * 0.1;
          ctx.translate(hx, hy);
          ctx.scale(pulse, pulse);
          ctx.shadowColor = found ? '#10B981' : '#F59E0B';
          ctx.shadowBlur = 14;
          ctx.fillStyle = found ? 'rgba(16, 185, 129, 0.35)' : 'rgba(245, 158, 11, 0.38)';
          ctx.strokeStyle = found ? '#34D399' : hs.uv_only ? '#C084FC' : '#FBBF24';
          ctx.lineWidth = 2;

          ctx.beginPath();
          ctx.moveTo(0, -16);
          ctx.lineTo(15, 11);
          ctx.lineTo(-15, 11);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.shadowBlur = 0;
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '700 10px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`0${idx + 1}`, 0, 7);
          ctx.restore();
        }
      });

      // Dust motes inside beam
      ctx.save();
      for (const m of motes) {
        m.x = (m.x + m.vx + 1) % 1;
        m.y = (m.y + m.vy + 1) % 1;
        const px = m.x * w;
        const py = m.y * h;
        const d = Math.hypot(px - mx, py - my);
        if (d < beamRadius * 0.92) {
          const a = (1 - d / (beamRadius * 0.92)) * 0.5;
          ctx.fillStyle = uvModeRef.current ? `rgba(216, 180, 254, ${a})` : `rgba(254, 243, 199, ${a})`;
          ctx.beginPath();
          ctx.arc(px, py, m.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();

      // Atmospheric flashlight / UV cutout veil
      const grad = ctx.createRadialGradient(mx, my, 12, mx, my, beamRadius * 1.25);
      if (uvModeRef.current) {
        grad.addColorStop(0, 'rgba(168, 85, 247, 0.12)');
        grad.addColorStop(0.55, 'rgba(59, 7, 100, 0.32)');
        grad.addColorStop(1, 'rgba(3, 4, 8, 0.80)');
      } else {
        grad.addColorStop(0, 'rgba(255, 250, 230, 0.02)');
        grad.addColorStop(0.62, 'rgba(5, 7, 11, 0.25)');
        grad.addColorStop(1, 'rgba(3, 4, 8, 0.68)');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Optical 2.2x Zoom Magnifier Lens when [Z] is active
      if (zoomRef.current && viewModeRef.current === 'photo' && bgImgRef.current) {
        const img = bgImgRef.current;
        const scale = Math.max(w / img.width, h / img.height);
        const dw = img.width * scale;
        const dh = img.height * scale;
        const dx = (w - dw) / 2;
        const dy = (h - dh) / 2;
        const lensR = 88;
        const mag = 2.2;
        ctx.save();
        ctx.beginPath();
        ctx.arc(mx, my, lensR, 0, Math.PI * 2);
        ctx.clip();
        ctx.fillStyle = '#05070B';
        ctx.fillRect(mx - lensR, my - lensR, lensR * 2, lensR * 2);
        ctx.drawImage(
          img,
          mx - (mx - dx) * mag,
          my - (my - dy) * mag,
          dw * mag,
          dh * mag
        );
        if (uvModeRef.current) {
          ctx.fillStyle = 'rgba(88, 28, 135, 0.25)';
          ctx.fillRect(mx - lensR, my - lensR, lensR * 2, lensR * 2);
        }
        ctx.restore();
        ctx.strokeStyle = uvModeRef.current ? '#C084FC' : '#38BDF8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(mx, my, lensR, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Reticle
      ctx.strokeStyle = uvModeRef.current ? 'rgba(192, 132, 252, 0.85)' : 'rgba(251, 191, 36, 0.6)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(mx, my, zoomRef.current ? 12 : 20, 0, Math.PI * 2);
      ctx.stroke();

      // REC HUD
      ctx.fillStyle = Math.sin(tick * 3) > 0 ? '#EF4444' : 'rgba(239,68,68,0.35)';
      ctx.beginPath();
      ctx.arc(w - 135, 26, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(241, 245, 249, 0.85)';
      ctx.font = '600 10px "JetBrains Mono", monospace';
      ctx.fillText(`ADLİ KAMERA // ${caseFile.case_code}`, w - 125, 29.5);

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [caseFile]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = ((e.clientX - rect.left) / rect.width) * 100;
    const cy = ((e.clientY - rect.top) / rect.height) * 100;

    for (const hs of caseFile.hotspots) {
      if (Math.hypot(cx - hs.x, cy - hs.y) < 6.5) {
        if (hs.uv_only && !uvMode && !unlockedEvidence.has(hs.evidence_id)) return;
        setSelectedHotspot(hs);
        setInspectModalHotspot(hs);
        const requiresAction = hs.inspect_kind === 'frame_flip' || hs.inspect_kind === 'torn_note';
        if (!unlockedEvidence.has(hs.evidence_id) && !requiresAction) {
          sfx.discover();
          setDiscoveryCard(hs);
          setTimeout(() => setDiscoveryCard(null), 3200);
          onDiscoverEvidence(hs.evidence_id, hs.inspect_text);
        } else {
          sfx.click();
        }
        return;
      }
    }
  };

  const discoveredCount = caseFile.hotspots.filter((h) => unlockedEvidence.has(h.evidence_id)).length;

  return (
    <div className="h-full grid grid-cols-12 gap-4 p-4">
      <div className="col-span-8 noir-panel flex flex-col overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-800/80 flex items-center justify-between bg-[#0B0E14]">
          <div>
            <div className="text-[10px] font-mono-tech text-red-400 tracking-[0.2em] uppercase">
              {caseFile.crime_badge} // {discoveredCount}/{caseFile.hotspots.length} SAHA İZİ TOPLANDI
            </div>
            <div className="text-sm font-bold text-slate-100">{caseFile.venue_name}</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sfx.click();
                setViewMode((v) => (v === 'photo' ? 'blueprint' : 'photo'));
              }}
              className="px-2.5 py-1.5 text-[11px] font-mono-tech uppercase bg-slate-900 border border-slate-700 text-slate-300 hover:border-slate-500 flex items-center gap-1.5 cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              {viewMode === 'photo' ? 'KROKİYE GEÇ' : 'SAHNEYE GEÇ'}
            </button>
            <button
              onClick={() => {
                sfx.click();
                setZoomLens((v) => !v);
              }}
              className={`px-2.5 py-1.5 text-[11px] font-mono-tech uppercase border flex items-center gap-1.5 transition cursor-pointer ${
                zoomLens
                  ? 'bg-sky-600/20 border-sky-400 text-sky-200'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <ZoomIn className="w-3.5 h-3.5" /> [Z]
            </button>
            <button
              onClick={() => {
                sfx.click();
                setUvMode((v) => !v);
              }}
              className={`px-3 py-1.5 text-[11px] font-mono-tech uppercase tracking-wider flex items-center gap-2 border transition cursor-pointer ${
                uvMode
                  ? 'bg-purple-600/25 border-purple-400 text-purple-200 shadow-[0_0_20px_rgba(168,85,247,0.45)]'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
              }`}
            >
              {uvMode ? <Sparkles className="w-3.5 h-3.5 text-purple-300" /> : <Flashlight className="w-3.5 h-3.5 text-amber-300" />}
              {uvMode ? 'UV 365nm AÇIK [U]' : 'NORMAL FENER [U]'}
            </button>
          </div>
        </div>

        <div className="relative flex-1 bg-[#05070B]">
          <canvas
            ref={canvasRef}
            onMouseMove={handleMouseMove}
            onClick={handleClick}
            className="w-full h-full block cursor-crosshair"
          />

          {/* Cinematic Evidence Discovery Pop Card */}
          {discoveryCard && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 px-5 py-3 bg-[#090C12]/95 border-2 border-amber-500 shadow-[0_0_40px_rgba(245,158,11,0.35)] animate-slam-stamp pointer-events-none text-center">
              <div className="text-[10px] font-mono-tech text-amber-400 tracking-[0.25em] uppercase">
                YENİ ADLI KANIT TAHTAYA İĞNELENDİ
              </div>
              <div className="text-sm font-bold text-white mt-0.5">{discoveryCard.label}</div>
            </div>
          )}

          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
            <div className="px-2.5 py-1 bg-black/80 border border-slate-800 text-[10px] font-mono-tech text-slate-300">
              Sarı üçgen işaretlere tıkla • Gizli kan/kimyasal izi için <span className="text-purple-400 font-bold">[U] UV 365nm</span> aç ve odayı tara
            </div>
            <div className="px-2.5 py-1 bg-black/80 border border-slate-800 text-[10px] font-mono-tech text-slate-400">
              X:{mousePos.x.toFixed(1)} Y:{mousePos.y.toFixed(1)}
            </div>
          </div>
        </div>
      </div>

      {/* Right: Briefing & Discovered List */}
      <div className="col-span-4 flex flex-col gap-4 overflow-y-auto pr-1">
        <div className="noir-panel p-4">
          <div className="flex items-center gap-2 text-[11px] font-mono-tech text-red-400 uppercase tracking-widest mb-2">
            <ShieldAlert className="w-4 h-4" />
            OLAY YERİ BRİFİNGİ
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">{caseFile.briefing}</p>
          <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-2 gap-2 text-xs font-mono-tech">
            <div className="bg-[#0B0E14] p-2.5 border border-slate-800">
              <span className="text-[10px] text-slate-500 block">KURBAN</span>
              <span className="text-slate-100 font-bold">{caseFile.victim_name}</span>
            </div>
            <div className="bg-[#0B0E14] p-2.5 border border-slate-800">
              <span className="text-[10px] text-slate-500 block">UNVAN / YAŞ</span>
              <span className="text-slate-100">{caseFile.victim_role} ({caseFile.victim_age})</span>
            </div>
          </div>
        </div>

        <div className="noir-panel p-4 flex-1 flex flex-col">
          <div className="flex items-center gap-2 text-[11px] font-mono-tech text-sky-400 uppercase tracking-widest mb-3">
            <Eye className="w-4 h-4" />
            SAHA İNCELEME KAYDI
          </div>

          {selectedHotspot ? (
            <div className="bg-[#0A0D13] border-l-2 border-l-red-500 border border-slate-700/80 p-3.5 mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono-tech text-amber-400 uppercase">
                  {selectedHotspot.uv_only ? 'UV 365nm ADLİ BULGU' : 'FİZİKSEL / DİJİTAL NOKTA'}
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-sm font-bold text-white mb-1">{selectedHotspot.label}</div>
              <p className="text-xs text-slate-300 leading-relaxed mb-2.5">{selectedHotspot.inspect_text}</p>
              <button
                onClick={() => setInspectModalHotspot(selectedHotspot)}
                className="px-2.5 py-1 bg-amber-600/20 border border-amber-500/70 text-[10px] font-mono-tech text-amber-200 uppercase cursor-pointer hover:bg-amber-600/35"
              >
                YAKINDAN İNCELE / ETKİLEŞ
              </button>
            </div>
          ) : (
            <div className="text-xs text-slate-500 font-mono-tech border border-dashed border-slate-800 p-4 mb-3 leading-relaxed">
              Olay yeri fotoğrafı üzerinde feneri gezdirip sarı delil çadırlarına tıkla. UV 365nm ile gizli adli kalıntıyı bul.
            </div>
          )}

          <div className="text-[10px] font-mono-tech text-slate-400 uppercase tracking-wider mb-2">
            SAHADA TOPLANAN DELİLLER
          </div>
          <div className="space-y-2 overflow-y-auto flex-1">
            {caseFile.hotspots.map((hs, i) => {
              const found = unlockedEvidence.has(hs.evidence_id);
              return (
                <div
                  key={hs.id}
                  onClick={() => found && setSelectedHotspot(hs)}
                  className={`p-2.5 border text-xs flex items-center justify-between transition ${
                    found
                      ? 'bg-emerald-950/20 border-emerald-800/50 text-slate-200 cursor-pointer hover:border-emerald-500/70'
                      : 'bg-[#0B0E14] border-slate-800/80 text-slate-500'
                  }`}
                >
                  <span className="font-mono-tech">
                    [0{i + 1}] {found ? hs.label : hs.uv_only ? '??? (UV TARAMA GEREKLİ)' : '??? (İNCELENMEDİ)'}
                  </span>
                  <span className={`text-[10px] font-mono-tech px-1.5 py-0.5 ${found ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-500'}`}>
                    {found ? 'TAHTADA' : 'KİLİTLİ'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {inspectModalHotspot && (
        <ObjectInspectModal
          caseFile={caseFile}
          hotspot={inspectModalHotspot}
          alreadyUnlocked={unlockedEvidence.has(inspectModalHotspot.evidence_id)}
          onCompleteInspect={(hs) => {
            if (!unlockedEvidence.has(hs.evidence_id)) {
              sfx.discover();
              setDiscoveryCard(hs);
              setTimeout(() => setDiscoveryCard(null), 3200);
              onDiscoverEvidence(hs.evidence_id, hs.inspect_text);
            }
          }}
          onClose={() => setInspectModalHotspot(null)}
        />
      )}
    </div>
  );
};
