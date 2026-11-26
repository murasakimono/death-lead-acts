import React, { useEffect, useState } from 'react';
import {
  Play,
  Shield,
  Clock,
  Flame,
  Award,
  Hash,
  CloudRain,
  Music,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Lock,
  FolderKanban,
  Sparkles,
} from 'lucide-react';
import { apiGetCampaign, getDetectiveRank, sfx } from '../api';
import type { CampaignChapter, CareerStats, DifficultyMode } from '../types';

interface MainMenuProps {
  career: CareerStats;
  solvedChapters: number[];
  ambientOn: boolean;
  musicOn: boolean;
  onToggleAmbient: () => void;
  onToggleMusic: () => void;
  onStartCase: (seed: string, difficulty: DifficultyMode, campaignChapter?: CampaignChapter | null) => void;
}

function randomSeed(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = 'DLA-';
  for (let i = 0; i < 5; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  career,
  solvedChapters,
  ambientOn,
  musicOn,
  onToggleAmbient,
  onToggleMusic,
  onStartCase,
}) => {
  const [difficulty, setDifficulty] = useState<DifficultyMode>('detective');
  const [customSeed, setCustomSeed] = useState('');
  const [view, setView] = useState<'campaign' | 'endless' | 'archive'>('campaign');
  const [chapters, setChapters] = useState<CampaignChapter[]>([]);

  useEffect(() => {
    apiGetCampaign().then(setChapters).catch(() => {});
  }, []);

  const rank = getDetectiveRank(career.xp);
  const progressPct = Math.min(100, Math.round((career.xp / rank.nextXp) * 100));

  return (
    <div className="h-screen w-screen relative overflow-hidden bg-[#06080B] text-[#E6E8EC] noir-grain noir-vignette flex flex-col">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-28 scale-105"
        style={{ backgroundImage: `url('/assets/scenes/venue_1.jpg')` }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#06080B] via-[#06080B]/90 to-[#06080B]/55" />

      {/* Top Bar */}
      <div className="relative z-10 px-8 py-4 flex items-center justify-between border-b border-slate-800/70">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-red-600 shadow-[0_0_16px_#DC2626]" />
          <span className="text-xs font-mono-tech tracking-[0.28em] text-slate-300 uppercase">
            CİNAYET & ADLİ SORUŞTURMA BÜROSU // v2.3 GÖLGE DOSYASI
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { sfx.click(); onToggleAmbient(); }}
            className={`px-2.5 py-1.5 text-[10px] font-mono-tech uppercase border flex items-center gap-1.5 cursor-pointer ${
              ambientOn ? 'bg-sky-600/20 border-sky-400 text-sky-200' : 'bg-black/60 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <CloudRain className="w-3.5 h-3.5" /> YAĞMUR
          </button>
          <button
            onClick={() => { sfx.click(); onToggleMusic(); }}
            className={`px-2.5 py-1.5 text-[10px] font-mono-tech uppercase border flex items-center gap-1.5 cursor-pointer ${
              musicOn ? 'bg-purple-600/20 border-purple-400 text-purple-200' : 'bg-black/60 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Music className="w-3.5 h-3.5" /> NOIR MÜZİK
          </button>
        </div>
      </div>

      {/* Center Layout */}
      <div className="relative z-10 flex-1 grid grid-cols-12 gap-8 px-10 py-6 overflow-y-auto items-center">
        {/* Left Hero Branding & Rank */}
        <div className="col-span-4 space-y-6">
          <div>
            <div className="inline-block px-2.5 py-1 bg-red-600/20 border border-red-500/60 text-[10px] font-mono-tech text-red-300 tracking-[0.22em] uppercase mb-3">
              v2.3 • KAMPANYA + SONSUZ BÜRO
            </div>
            <h1 className="text-5xl font-bold tracking-tight text-white leading-[1.03]">
              DEATH LEAD
              <span className="block text-red-500">ACTS</span>
            </h1>
            <p className="text-xs text-slate-300 mt-4 leading-relaxed">
              5 bölümlük bağlantılı <strong className="text-amber-300">Gölge Dosyası</strong> kampanyasında imza delillerini topla veya Sonsuz Büro&apos;da ikili alibi, işbirlikçi ve sürpriz kaza/intihar dosyalarını çöz.
            </p>
          </div>

          <div className="noir-panel p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-mono-tech text-slate-400 uppercase">AKTİF RÜTBE</div>
                <div className="text-sm font-bold text-amber-300 tracking-wider">{rank.title}</div>
              </div>
              <div className="text-right font-mono-tech">
                <div className="text-sm font-bold text-white">{career.xp} XP</div>
                <div className="text-[10px] text-slate-400">{career.solvedCount}/{career.attemptedCount} DOSYA</div>
              </div>
            </div>
            <div className="h-1.5 bg-slate-900 border border-slate-800 overflow-hidden">
              <div className="h-full bg-red-600 transition-all" style={{ width: `${progressPct}%` }} />
            </div>
            <div className="text-[10px] font-mono-tech text-slate-400">
              KAMPANYA İLERLEMESİ: <strong className="text-amber-300">{solvedChapters.length}/5 BÖLÜM</strong>
            </div>
          </div>

          {/* Mode Selector Tabs */}
          <div className="flex flex-col gap-2">
            {[
              { id: 'campaign', label: 'GÖLGE DOSYASI (5 BÖLÜM KAMPANYA)', icon: FolderKanban },
              { id: 'endless', label: 'SONSUZ BÜRO (PROSEDÜREL VAKA)', icon: Play },
              { id: 'archive', label: `KARİYER ARŞİVİ (${career.solvedCount})`, icon: Award },
            ].map((t) => {
              const Icon = t.icon;
              const active = view === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => { sfx.click(); setView(t.id as typeof view); }}
                  className={`px-4 py-2.5 text-left text-xs font-mono-tech uppercase border flex items-center gap-2.5 cursor-pointer transition ${
                    active ? 'bg-red-600/25 border-red-500 text-white font-bold' : 'bg-[#0B0E14]/90 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Panel */}
        <div className="col-span-8">
          {view === 'campaign' && (
            <div className="noir-panel p-6 space-y-4 max-h-[560px] overflow-y-auto">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono-tech text-red-400 uppercase tracking-[0.22em]">
                    BAĞLANTILI HİKÂYE KAMPANYASI
                  </div>
                  <div className="text-lg font-bold text-white">GÖLGE DOSYASI — PROJE-KÜL AĞI</div>
                </div>
                <span className="text-xs font-mono-tech text-amber-300">{solvedChapters.length}/5 İMZA TOPLANDI</span>
              </div>

              <div className="space-y-2.5">
                {chapters.map((ch) => {
                  const solved = solvedChapters.includes(ch.chapter);
                  const unlocked = ch.chapter === 1 || solvedChapters.includes(ch.chapter - 1) || solved;
                  return (
                    <div
                      key={ch.chapter}
                      className={`p-4 border transition ${
                        solved
                          ? 'bg-emerald-950/15 border-emerald-700/70'
                          : unlocked
                          ? 'bg-[#0C1017] border-slate-700 hover:border-red-500'
                          : 'bg-[#090B10] border-slate-800/60 opacity-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-[10px] font-mono-tech">
                            <span className="text-red-400 font-bold">{ch.code}</span>
                            <span className="text-slate-500">•</span>
                            <span className="text-sky-400">{ch.venue_hint}</span>
                            <span className="text-slate-500">•</span>
                            <span className="text-amber-300 uppercase">{ch.difficulty}</span>
                          </div>
                          <div className="text-sm font-bold text-white">{ch.title}</div>
                          <p className="text-xs text-slate-300 leading-relaxed">{ch.synopsis}</p>
                        </div>

                        <div className="shrink-0">
                          {unlocked ? (
                            <button
                              onClick={() => {
                                sfx.discover();
                                onStartCase(ch.seed, ch.difficulty as DifficultyMode, ch);
                              }}
                              className={`px-4 py-2 text-xs font-mono-tech uppercase font-bold cursor-pointer flex items-center gap-1.5 ${
                                solved
                                  ? 'bg-emerald-900/40 border border-emerald-500 text-emerald-200'
                                  : 'bg-red-600 hover:bg-red-500 text-white'
                              }`}
                            >
                              {solved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                              {solved ? 'TEKRAR OYNA' : 'BAŞLAT'}
                            </button>
                          ) : (
                            <div className="px-3 py-2 bg-slate-900 border border-slate-800 text-[10px] font-mono-tech text-slate-500 flex items-center gap-1.5">
                              <Lock className="w-3 h-3" /> KİLİTLİ
                            </div>
                          )}
                        </div>
                      </div>

                      {solved && (
                        <div className="mt-3 pt-2.5 border-t border-emerald-900/60 text-[11px] font-mono-tech text-amber-300 flex items-start gap-2">
                          <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <div>
                            <strong>{ch.signature_clue_title}:</strong>{' '}
                            <span className="text-slate-300">{ch.signature_clue_detail}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {view === 'endless' && (
            <div className="noir-panel p-6 space-y-5">
              <div className="text-xs font-mono-tech text-red-400 uppercase tracking-[0.2em]">
                SONSUZ BÜRO // PROSEDÜREL SORUŞTURMA
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'detective' as DifficultyMode, title: 'DEDEKTİF', sub: '5 İtibar • 3 İpucu • Süresiz', icon: Shield, accent: 'border-sky-500 bg-sky-950/25 text-sky-200' },
                  { id: 'homicide' as DifficultyMode, title: 'CİNAYET BÜRO', sub: '3 İtibar • 0 İpucu • Affetmez', icon: Flame, accent: 'border-red-500 bg-red-950/30 text-red-200' },
                  { id: 'timed' as DifficultyMode, title: 'SÜRE BASKISI', sub: '4 İtibar • 15 Dk Savcılık Süresi', icon: Clock, accent: 'border-amber-500 bg-amber-950/25 text-amber-200' },
                ].map((d) => {
                  const Icon = d.icon;
                  return (
                    <button
                      key={d.id}
                      onClick={() => { sfx.click(); setDifficulty(d.id); }}
                      className={`p-3.5 border text-left transition cursor-pointer ${difficulty === d.id ? d.accent : 'bg-[#0B0E14] border-slate-800 text-slate-400 hover:border-slate-600'}`}
                    >
                      <Icon className="w-4 h-4 mb-2" />
                      <div className="text-xs font-mono-tech font-bold">{d.title}</div>
                      <div className="text-[10px] mt-1 opacity-80">{d.sub}</div>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Hash className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={customSeed}
                    onChange={(e) => setCustomSeed(e.target.value.toUpperCase())}
                    placeholder="Özel Seed (Boş bırakırsan rastgele)"
                    className="w-full bg-[#0A0D12] border border-slate-700 pl-8 pr-3 py-2.5 text-xs font-mono-tech text-white uppercase focus:outline-none focus:border-red-500"
                  />
                </div>
                <button
                  onClick={() => { sfx.discover(); onStartCase(customSeed.trim() || randomSeed(), difficulty, null); }}
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-mono-tech text-xs font-bold uppercase tracking-widest flex items-center gap-2 cursor-pointer animate-pulse-crimson"
                >
                  <Play className="w-4 h-4 fill-current" /> DOSYAYI AÇ
                </button>
              </div>
            </div>
          )}

          {view === 'archive' && (
            <div className="noir-panel p-6 space-y-4 max-h-[540px] overflow-y-auto">
              <div className="text-xs font-mono-tech text-amber-400 uppercase tracking-[0.2em]">
                ÇÖZÜLEN & KAYDEDİLEN DOSYA ARŞİVİ
              </div>
              {career.history.length === 0 ? (
                <div className="p-8 border border-dashed border-slate-800 text-center text-xs font-mono-tech text-slate-500">
                  Henüz kapatılmış dosya yok.
                </div>
              ) : (
                <div className="space-y-2">
                  {career.history.map((h, i) => (
                    <div
                      key={`${h.seed}-${i}`}
                      onClick={() => onStartCase(h.seed, (h.difficulty as DifficultyMode) || 'detective', null)}
                      className="p-3 bg-[#0B0E14] border border-slate-800 hover:border-red-500/70 flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        {h.solved ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                        <div>
                          <div className="text-xs font-bold text-white">{h.seed} — {h.title}</div>
                          <div className="text-[10px] font-mono-tech text-slate-400">{h.crime_type} • {h.score}/4 Kilit</div>
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
