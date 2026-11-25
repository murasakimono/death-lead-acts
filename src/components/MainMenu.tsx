import React, { useState } from 'react';
import {
  Play,
  Shield,
  Clock,
  Flame,
  Award,
  Hash,
  CloudRain,
  ChevronRight,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { getDetectiveRank, sfx } from '../api';
import type { CareerStats, DifficultyMode } from '../types';

interface MainMenuProps {
  career: CareerStats;
  ambientOn: boolean;
  onToggleAmbient: () => void;
  onStartCase: (seed: string, difficulty: DifficultyMode) => void;
}

function randomSeed(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = 'DLA-';
  for (let i = 0; i < 5; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  career,
  ambientOn,
  onToggleAmbient,
  onStartCase,
}) => {
  const [difficulty, setDifficulty] = useState<DifficultyMode>('detective');
  const [customSeed, setCustomSeed] = useState('');
  const [view, setView] = useState<'play' | 'archive'>('play');

  const rank = getDetectiveRank(career.xp);
  const progressPct = Math.min(100, Math.round((career.xp / rank.nextXp) * 100));

  return (
    <div className="h-screen w-screen relative overflow-hidden bg-[#06080B] text-[#E6E8EC] noir-grain noir-vignette flex flex-col">
      {/* Full-bleed atmospheric Neo-Noir backdrop */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-28 scale-105 transition-transform duration-1000"
        style={{ backgroundImage: `url('/assets/scenes/venue_1.jpg')` }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#06080B] via-[#06080B]/88 to-[#06080B]/55" />

      {/* Top Bar */}
      <div className="relative z-10 px-8 py-5 flex items-center justify-between border-b border-slate-800/70">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-red-600 shadow-[0_0_16px_#DC2626]" />
          <span className="text-xs font-mono-tech tracking-[0.28em] text-slate-300 uppercase">
            CİNAYET & ADLİ SORUŞTURMA BÜROSU // v1.1
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              sfx.click();
              onToggleAmbient();
            }}
            className={`px-3 py-1.5 text-[11px] font-mono-tech uppercase border flex items-center gap-2 cursor-pointer transition ${
              ambientOn
                ? 'bg-sky-600/20 border-sky-400 text-sky-200'
                : 'bg-black/60 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <CloudRain className="w-3.5 h-3.5" />
            {ambientOn ? 'YAĞMUR ATMOSFERİ AÇIK' : 'YAĞMUR ATMOSFERİ KAPALI'}
          </button>

          <button
            onClick={() => {
              sfx.click();
              setView(view === 'play' ? 'archive' : 'play');
            }}
            className="px-3 py-1.5 text-[11px] font-mono-tech uppercase bg-black/60 border border-slate-700 text-amber-300 hover:border-amber-400 flex items-center gap-2 cursor-pointer"
          >
            <Award className="w-3.5 h-3.5" />
            {view === 'play' ? `KARİYER ARŞİVİ (${career.solvedCount})` : 'ANA MENÜYE DÖN'}
          </button>
        </div>
      </div>

      {/* Center Content */}
      <div className="relative z-10 flex-1 grid grid-cols-12 gap-8 px-10 py-8 overflow-y-auto items-center">
        {/* Left Hero Branding & Rank Card */}
        <div className="col-span-5 space-y-6">
          <div>
            <div className="inline-block px-2.5 py-1 bg-red-600/20 border border-red-500/60 text-[10px] font-mono-tech text-red-300 tracking-[0.24em] uppercase mb-3">
              PROSEDÜREL ADLİ DEDEKTİF SİMÜLATÖRÜ
            </div>
            <h1 className="text-5xl font-bold tracking-tight text-white leading-[1.05]">
              DEATH LEAD
              <span className="block text-red-500">ACTS</span>
            </h1>
            <p className="text-sm text-slate-300 mt-4 leading-relaxed max-w-md">
              Olay yerini UV ışıkla tara, kilitli cihazları ve telsiz kayıtlarını çöz, kırmızı iplerle çelişkileri bağla. Herkesin sakladığı bir sır var — ama gerçek faili 4 somut kanıtla kilitlemek zorundasın.
            </p>
          </div>

          {/* Detective Career Rank Box */}
          <div className="noir-panel p-4 max-w-md space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-mono-tech text-slate-400 uppercase">AKTİF RÜTBE</div>
                <div className="text-sm font-bold text-amber-300 tracking-wider">{rank.title}</div>
              </div>
              <div className="text-right font-mono-tech">
                <div className="text-sm font-bold text-white">{career.xp} XP</div>
                <div className="text-[10px] text-slate-400">{career.solvedCount}/{career.attemptedCount} VAKA ÇÖZÜLDÜ</div>
              </div>
            </div>
            <div className="h-1.5 bg-slate-900 border border-slate-800 overflow-hidden">
              <div className="h-full bg-red-600 transition-all" style={{ width: `${progressPct}%` }} />
            </div>
            <div className="flex gap-2 text-[10px] font-mono-tech text-slate-400">
              {career.solvedCount >= 1 && <span className="px-2 py-0.5 bg-emerald-950/50 border border-emerald-700/60 text-emerald-300">İLK DOSYA</span>}
              {career.perfectCount >= 1 && <span className="px-2 py-0.5 bg-amber-950/50 border border-amber-700/60 text-amber-300">S-RANK KUSURSUZ</span>}
              {career.solvedCount >= 3 && <span className="px-2 py-0.5 bg-red-950/50 border border-red-700/60 text-red-300">SOĞUKKANLI</span>}
            </div>
          </div>
        </div>

        {/* Right: Mission Launch Panel or Career Archive */}
        <div className="col-span-7">
          {view === 'play' ? (
            <div className="noir-panel p-6 space-y-5 max-w-2xl ml-auto">
              <div className="text-xs font-mono-tech text-red-400 uppercase tracking-[0.2em]">
                YENİ SORUŞTURMA BAŞLAT // ZORLUK SEÇİMİ
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    id: 'detective' as DifficultyMode,
                    title: 'DEDEKTİF',
                    sub: '5 İtibar • 3 İpucu • Süresiz',
                    icon: Shield,
                    accent: 'border-sky-500 bg-sky-950/25 text-sky-200',
                  },
                  {
                    id: 'homicide' as DifficultyMode,
                    title: 'CİNAYET BÜRO',
                    sub: '3 İtibar • 0 İpucu • Affetmez',
                    icon: Flame,
                    accent: 'border-red-500 bg-red-950/30 text-red-200',
                  },
                  {
                    id: 'timed' as DifficultyMode,
                    title: 'SÜRE BASKISI',
                    sub: '4 İtibar • 15 Dakika Savcılık Süresi',
                    icon: Clock,
                    accent: 'border-amber-500 bg-amber-950/25 text-amber-200',
                  },
                ].map((d) => {
                  const Icon = d.icon;
                  const active = difficulty === d.id;
                  return (
                    <button
                      key={d.id}
                      onClick={() => {
                        sfx.click();
                        setDifficulty(d.id);
                      }}
                      className={`p-3.5 border text-left transition cursor-pointer ${
                        active
                          ? d.accent
                          : 'bg-[#0B0E14] border-slate-800 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <Icon className="w-4 h-4 mb-2" />
                      <div className="text-xs font-mono-tech font-bold">{d.title}</div>
                      <div className="text-[10px] mt-1 opacity-80 leading-snug">{d.sub}</div>
                    </button>
                  );
                })}
              </div>

              {/* Optional Seed Input */}
              <div className="flex items-center gap-2 pt-1">
                <div className="relative flex-1">
                  <Hash className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={customSeed}
                    onChange={(e) => setCustomSeed(e.target.value.toUpperCase())}
                    placeholder="Özel Vaka Seed'i (Boş bırakırsan rastgele üretilir)"
                    className="w-full bg-[#0A0D12] border border-slate-700 pl-8 pr-3 py-2.5 text-xs font-mono-tech text-white uppercase focus:outline-none focus:border-red-500"
                  />
                </div>
                <button
                  onClick={() => {
                    sfx.discover();
                    onStartCase(customSeed.trim() || randomSeed(), difficulty);
                  }}
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-mono-tech text-xs font-bold uppercase tracking-widest flex items-center gap-2 cursor-pointer animate-pulse-crimson"
                >
                  <Play className="w-4 h-4 fill-current" /> DOSYAYI AÇ
                </button>
              </div>

              <div className="pt-3 border-t border-slate-800/80 grid grid-cols-3 gap-3 text-[11px] font-mono-tech text-slate-400">
                <div>• 6 Özel Neo-Noir Mekân</div>
                <div>• 8 Adli & Dijital Bulmaca</div>
                <div>• Taktiksel + Canlı AI Sorgu</div>
              </div>
            </div>
          ) : (
            <div className="noir-panel p-6 space-y-4 max-w-2xl ml-auto max-h-[500px] overflow-y-auto">
              <div className="text-xs font-mono-tech text-amber-400 uppercase tracking-[0.2em]">
                ÇÖZÜLEN & KAYDEDİLEN DOSYA ARŞİVİ
              </div>
              {career.history.length === 0 ? (
                <div className="p-8 border border-dashed border-slate-800 text-center text-xs font-mono-tech text-slate-500">
                  Henüz kapatılmış bir dosya yok. İlk soruşturmanı başlat!
                </div>
              ) : (
                <div className="space-y-2">
                  {career.history.map((h, i) => (
                    <div
                      key={`${h.seed}-${i}`}
                      onClick={() => onStartCase(h.seed, (h.difficulty as DifficultyMode) || 'detective')}
                      className="p-3 bg-[#0B0E14] border border-slate-800 hover:border-red-500/70 flex items-center justify-between cursor-pointer transition"
                    >
                      <div className="flex items-center gap-3">
                        {h.solved ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400" />
                        )}
                        <div>
                          <div className="text-xs font-bold text-white">
                            {h.seed} — {h.title}
                          </div>
                          <div className="text-[10px] font-mono-tech text-slate-400">
                            {h.crime_type} • {h.difficulty.toUpperCase()} • {h.score}/4 Kilit • {Math.floor(h.elapsed_sec / 60)} dk
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
