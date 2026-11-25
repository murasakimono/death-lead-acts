import React, { useEffect, useState } from 'react';
import {
  Map,
  Microscope,
  Network,
  Clock,
  Users,
  Gavel,
  Volume2,
  VolumeX,
  CloudRain,
  Music,
  Shield,
  Sparkles,
  BookOpen,
  Lightbulb,
  Home,
  X,
} from 'lucide-react';
import { apiNewCase, loadCareer, loadSolvedChapters, markChapterSolved, recordCareerCase, sfx } from './api';
import type {
  AccusationResult,
  BoardLink,
  BoardNodePos,
  CampaignChapter,
  CareerStats,
  CaseFile,
  DeskTab,
  DifficultyMode,
  PinnedQuote,
} from './types';
import { MainMenu } from './components/MainMenu';
import { SceneView } from './components/SceneView';
import { ForensicsView } from './components/ForensicsView';
import { BoardView } from './components/BoardView';
import { TimelineView } from './components/TimelineView';
import { InterrogationView } from './components/InterrogationView';
import { AccusationModal } from './components/AccusationModal';

function randomSeed(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = 'DLA-';
  for (let i = 0; i < 5; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function defaultBoardLayout(cf: CaseFile): Record<string, BoardNodePos> {
  const map: Record<string, BoardNodePos> = {};
  cf.suspects.forEach((s, i) => {
    // Organic staggered Polaroid pinning rather than a rigid Excel row
    map[s.id] = { id: s.id, x: 46 + i * 212, y: 26 + (i % 2 === 0 ? 0 : 18) };
  });
  cf.evidence.forEach((ev, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    map[ev.id] = { id: ev.id, x: 54 + col * 255 + (row % 2) * 28, y: 255 + row * 140 + (col % 2) * 14 };
  });
  return map;
}

export function App() {
  const [screen, setScreen] = useState<'menu' | 'desk'>('menu');
  const [career, setCareer] = useState<CareerStats>(() => loadCareer());
  const [solvedChapters, setSolvedChapters] = useState<number[]>(() => loadSolvedChapters());
  const [activeChapter, setActiveChapter] = useState<CampaignChapter | null>(null);
  const [caseFile, setCaseFile] = useState<CaseFile | null>(null);
  const [activeTab, setActiveTab] = useState<DeskTab>('scene');
  const [currentAct, setCurrentAct] = useState<number>(1);
  const [reputation, setReputation] = useState<number>(5);
  const [hintsUsed, setHintsUsed] = useState<number>(0);
  const [revealedHints, setRevealedHints] = useState<string[]>([]);
  const [unlockedEvidence, setUnlockedEvidence] = useState<Set<string>>(new Set());
  const [brokenStatements, setBrokenStatements] = useState<Set<string>>(new Set());
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, string[]>>({});
  const [phoneUnlocked, setPhoneUnlocked] = useState(false);
  const [triangulationSolved, setTriangulationSolved] = useState(false);
  const [autopsyLockedWindow, setAutopsyLockedWindow] = useState<[number, number] | null>(null);

  const [boardNodes, setBoardNodes] = useState<Record<string, BoardNodePos>>({});
  const [boardLinks, setBoardLinks] = useState<BoardLink[]>([]);
  const [pinnedQuotes, setPinnedQuotes] = useState<PinnedQuote[]>([]);

  const [toast, setToast] = useState<string | null>(null);
  const [act2Banner, setAct2Banner] = useState(false);
  const [showAccusation, setShowAccusation] = useState(false);
  const [showNotebook, setShowNotebook] = useState(false);
  const [notebookText, setNotebookText] = useState('');
  const [soundOn, setSoundOn] = useState(true);
  const [ambientOn, setAmbientOn] = useState(false);
  const [musicOn, setMusicOn] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [remainingSec, setRemainingSec] = useState<number | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((curr) => (curr === msg ? null : curr));
    }, 4500);
  };

  const startCase = async (
    seed: string,
    difficulty: DifficultyMode = 'detective',
    chapter: CampaignChapter | null = null
  ) => {
    const cf = await apiNewCase(seed, difficulty);
    setActiveChapter(chapter);
    setCaseFile(cf);
    setScreen('desk');
    setActiveTab('scene');
    setCurrentAct(1);
    setReputation(cf.max_reputation);
    setHintsUsed(0);
    setRevealedHints([]);
    setUnlockedEvidence(new Set(cf.evidence.filter((e) => e.unlocked_by_default).map((e) => e.id)));
    setBrokenStatements(new Set());
    setRevealedSecrets({});
    setPhoneUnlocked(false);
    setTriangulationSolved(false);
    setAutopsyLockedWindow(null);
    setBoardNodes(defaultBoardLayout(cf));
    setBoardLinks([]);
    setPinnedQuotes([]);
    setAct2Banner(false);
    setShowAccusation(false);
    setElapsedSec(0);
    setRemainingSec(cf.time_limit_sec);
    setNotebookText(localStorage.getItem(`dla_note_${cf.seed}`) || '');
    showToast(`Dosya açıldı: ${cf.case_code} — ${cf.crime_type}`);
  };

  // Timer tick
  useEffect(() => {
    if (screen !== 'desk' || !caseFile) return;
    const t = setInterval(() => {
      setElapsedSec((s) => s + 1);
      setRemainingSec((r) => (r !== null && r > 0 ? r - 1 : r));
    }, 1000);
    return () => clearInterval(t);
  }, [screen, caseFile]);

  // Auto-trigger ACT II
  useEffect(() => {
    if (!caseFile || currentAct >= 2) return;
    if (brokenStatements.size >= 2 || (phoneUnlocked && brokenStatements.size >= 1)) {
      setCurrentAct(2);
      setAct2Banner(true);
      sfx.discover();
      setUnlockedEvidence((prev) => new Set(prev).add('ev_act2_lab'));
    }
  }, [brokenStatements.size, phoneUnlocked, currentAct, caseFile]);

  const handleToggleAmbient = () => {
    const next = !ambientOn;
    setAmbientOn(next);
    sfx.toggleAmbient(next);
  };

  const handleToggleMusic = () => {
    const next = !musicOn;
    setMusicOn(next);
    sfx.toggleNoirMusic(next);
  };

  const handleUseHint = () => {
    if (!caseFile) return;
    if (hintsUsed >= caseFile.max_hints) {
      sfx.error();
      showToast('Bu vaka için ipucu hakkın kalmadı.');
      return;
    }
    const nextHint = caseFile.hints[hintsUsed];
    if (!nextHint) return;
    sfx.click();
    setHintsUsed((h) => h + 1);
    setRevealedHints((prev) => [...prev, nextHint]);
    showToast(nextHint);
  };

  const handleCaseFinished = (res: AccusationResult) => {
    if (!caseFile) return;
    const updated = recordCareerCase({
      seed: caseFile.seed,
      title: caseFile.title,
      crime_type: caseFile.crime_type,
      difficulty: caseFile.difficulty,
      solved: res.solved,
      score: res.score,
      rank: res.rank,
      elapsed_sec: elapsedSec,
      date_iso: new Date().toISOString(),
    });
    setCareer(updated);
    if (res.solved && activeChapter) {
      const nextSolved = markChapterSolved(activeChapter.chapter);
      setSolvedChapters(nextSolved);
      showToast(`İMZA DELİLİ AÇILDI: ${activeChapter.signature_clue_title}`);
    }
  };

  const handleNotebookChange = (val: string) => {
    setNotebookText(val);
    if (caseFile) localStorage.setItem(`dla_note_${caseFile.seed}`, val);
  };

  if (screen === 'menu' || !caseFile) {
    return (
      <MainMenu
        career={career}
        solvedChapters={solvedChapters}
        ambientOn={ambientOn}
        musicOn={musicOn}
        onToggleAmbient={handleToggleAmbient}
        onToggleMusic={handleToggleMusic}
        onStartCase={startCase}
      />
    );
  }

  const fmtTimer = (sec: number) =>
    `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0D0C0B] text-[#E6E0D4] overflow-hidden noir-grain noir-vignette">
      {/* Editorial Matte Noir Desk Header (Zero generic SaaS pill clutter) */}
      <header className="h-14 px-4 border-b border-[#2A251E] bg-[#12100E] flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-4">
          <button
            onClick={() => { sfx.click(); setScreen('menu'); }}
            className="p-1.5 text-[#8E8473] hover:text-[#E6E0D4] transition cursor-pointer"
            title="Ana Menü"
          >
            <Home className="w-4 h-4" />
          </button>

          <div className="leading-tight">
            <div className="font-editorial text-sm font-bold tracking-[0.14em] text-[#EAE2CF] uppercase">
              DEATH LEAD ACTS
            </div>
            <div className="text-[10px] font-mono-tech text-[#9A8F7D]">
              {caseFile.case_code} • {caseFile.crime_type}
            </div>
          </div>

          <div className="h-5 w-px bg-[#2C261F]" />

          <nav className="flex items-center gap-1">
            {[
              { id: 'scene', label: 'Olay Yeri', icon: Map },
              { id: 'forensics', label: 'Adli Lab', icon: Microscope },
              { id: 'board', label: 'Pano', icon: Network },
              { id: 'timeline', label: 'Kronoloji', icon: Clock },
              { id: 'interrogation', label: 'Sorgu', icon: Users },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => { sfx.click(); setActiveTab(tab.id as DeskTab); }}
                  className={`px-3 py-1.5 text-[11px] font-mono-tech uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer border-b-2 ${
                    active
                      ? 'border-[#B91C1C] text-[#F5EFE2] bg-[#1C1915]'
                      : 'border-transparent text-[#8F8575] hover:text-[#E6E0D4]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {remainingSec !== null && (
            <span className={`font-mono-tech text-xs font-bold ${remainingSec < 120 ? 'text-[#E04F4F] animate-pulse' : 'text-[#D6B06C]'}`}>
              {fmtTimer(remainingSec)}
            </span>
          )}

          <span className="text-[10px] font-mono-tech text-[#C49A52] tracking-widest uppercase">
            ACT {currentAct === 1 ? 'I' : currentAct === 2 ? 'II' : 'III'}
          </span>

          <div title="Savcılık İtibarı" className="flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-[#7AA2B8] mr-0.5" />
            {Array.from({ length: caseFile.max_reputation }).map((_, idx) => (
              <span key={idx} className={`w-1.5 h-2.5 ${idx < reputation ? 'bg-[#C49A52]' : 'bg-[#2C261F]'}`} />
            ))}
          </div>

          <div className="h-4 w-px bg-[#2C261F]" />

          <button
            onClick={handleUseHint}
            title="Vaka İpucu"
            className="text-[10px] font-mono-tech text-[#C49A52] hover:text-[#F5EFE2] flex items-center gap-1 cursor-pointer"
          >
            <Lightbulb className="w-3.5 h-3.5" /> {caseFile.max_hints - hintsUsed}
          </button>

          <button
            onClick={() => { sfx.click(); setShowNotebook((v) => !v); }}
            title="Dedektif Not Defteri"
            className={`text-[10px] font-mono-tech flex items-center gap-1 cursor-pointer ${
              showNotebook ? 'text-[#F5EFE2] underline' : 'text-[#9A8F7D] hover:text-[#F5EFE2]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" /> NOT
          </button>

          <button
            onClick={handleToggleAmbient}
            title="Yağmur Atmosferi"
            className={`p-1 cursor-pointer ${ambientOn ? 'text-[#7AA2B8]' : 'text-[#6F6658] hover:text-[#E6E0D4]'}`}
          >
            <CloudRain className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleToggleMusic}
            title="Noir Müzik"
            className={`p-1 cursor-pointer ${musicOn ? 'text-[#C49A52]' : 'text-[#6F6658] hover:text-[#E6E0D4]'}`}
          >
            <Music className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => { const next = !soundOn; setSoundOn(next); sfx.enabled = next; }}
            className="p-1 text-[#6F6658] hover:text-[#E6E0D4] cursor-pointer"
            title="Ses Efektleri"
          >
            {soundOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => { sfx.click(); setShowAccusation(true); }}
            className="px-3.5 py-1.5 bg-[#8C1D1D] hover:bg-[#A62323] border border-[#C42B2B] text-[#F8F3E8] text-[11px] font-mono-tech font-bold uppercase tracking-widest flex items-center gap-1.5 cursor-pointer transition"
          >
            <Gavel className="w-3.5 h-3.5" /> HÜKÜM VER
          </button>
        </div>
      </header>

      {act2Banner && (
        <div className="px-5 py-2 bg-red-950/60 border-b border-red-600/80 flex items-center justify-between text-xs z-20">
          <div className="flex items-center gap-2 text-red-100">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong className="font-mono-tech text-amber-300 mr-2">{caseFile.act2_drop_title}:</strong>
              {caseFile.act2_drop_body}
            </span>
          </div>
          <button onClick={() => setAct2Banner(false)} className="text-[10px] font-mono-tech text-red-300 hover:text-white cursor-pointer ml-4">
            KAPAT
          </button>
        </div>
      )}

      <main className="flex-1 overflow-hidden relative">
        {activeTab === 'scene' && (
          <SceneView
            caseFile={caseFile}
            unlockedEvidence={unlockedEvidence}
            onDiscoverEvidence={(id, msg) => {
              setUnlockedEvidence((prev) => new Set(prev).add(id));
              showToast(msg);
            }}
          />
        )}
        {activeTab === 'forensics' && (
          <ForensicsView
            caseFile={caseFile}
            unlockedEvidence={unlockedEvidence}
            phoneUnlocked={phoneUnlocked}
            triangulationSolved={triangulationSolved}
            autopsyLockedWindow={autopsyLockedWindow}
            onUnlockEvidence={(ids, msg) => {
              setUnlockedEvidence((prev) => {
                const n = new Set(prev);
                ids.forEach((id) => n.add(id));
                return n;
              });
              showToast(msg);
            }}
            onPhoneUnlocked={() => setPhoneUnlocked(true)}
            onTriangulationSolved={() => setTriangulationSolved(true)}
            onAutopsyLocked={(w) => setAutopsyLockedWindow(w)}
          />
        )}
        {activeTab === 'board' && (
          <BoardView
            caseFile={caseFile}
            unlockedEvidence={unlockedEvidence}
            pinnedQuotes={pinnedQuotes}
            nodes={boardNodes}
            links={boardLinks}
            onMoveNode={(id, x, y) => setBoardNodes((p) => ({ ...p, [id]: { id, x, y } }))}
            onAddLink={(from, to, label) => {
              const color = label === 'ÇELİŞKİ' ? '#EF4444' : label === 'BAĞLANTI' ? '#38BDF8' : '#F59E0B';
              setBoardLinks((p) => [...p, { id: `${from}-${to}-${Date.now()}`, from, to, label, color }]);
            }}
            onRemoveLink={(lid) => setBoardLinks((p) => p.filter((x) => x.id !== lid))}
            onResetLayout={() => setBoardNodes(defaultBoardLayout(caseFile))}
          />
        )}
        {activeTab === 'timeline' && (
          <TimelineView
            caseFile={caseFile}
            unlockedEvidence={unlockedEvidence}
            autopsyLockedWindow={autopsyLockedWindow}
          />
        )}
        {activeTab === 'interrogation' && (
          <InterrogationView
            caseFile={caseFile}
            currentAct={currentAct}
            unlockedEvidence={unlockedEvidence}
            brokenStatements={brokenStatements}
            revealedSecrets={revealedSecrets}
            onContradictionHit={(sid, stId, secret) => {
              setBrokenStatements((prev) => new Set(prev).add(stId));
              if (secret) {
                setRevealedSecrets((prev) => {
                  const list = prev[sid] ?? [];
                  return list.includes(secret) ? prev : { ...prev, [sid]: [...list, secret] };
                });
                showToast(`ÇELİŞKİ KIRILDI: ${secret}`);
              } else {
                showToast('ÇELİŞKİ KIRILDI!');
              }
            }}
            onReputationChange={(d) => setReputation((r) => Math.max(0, Math.min(caseFile.max_reputation, r + d)))}
            onPinQuote={(suspectName, text) => {
              const qid = `quote_${Date.now()}`;
              setPinnedQuotes((prev) => [...prev, { id: qid, suspectName, text }]);
              setBoardNodes((p) => ({ ...p, [qid]: { id: qid, x: 40 + (pinnedQuotes.length % 4) * 230, y: 420 } }));
              showToast(`İfade Delil Tahtası'na iğnelendi (${suspectName})`);
            }}
            onConfrontUnlock={(secret, evId) => {
              if (evId) setUnlockedEvidence((prev) => new Set(prev).add(evId));
              if (secret) showToast(secret);
            }}
          />
        )}

        {/* Slide-out Personal Detective Notebook */}
        {showNotebook && (
          <div className="fixed right-4 top-16 bottom-4 w-80 noir-panel z-40 flex flex-col p-4">
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-800">
              <span className="text-xs font-mono-tech text-amber-400 uppercase tracking-widest">
                DEDEKTİF NOT DEFTERİ
              </span>
              <button onClick={() => setShowNotebook(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            {revealedHints.length > 0 && (
              <div className="mb-3 space-y-1.5 max-h-36 overflow-y-auto">
                {revealedHints.map((h, i) => (
                  <div key={i} className="p-2 bg-amber-950/25 border border-amber-800/60 text-[11px] text-amber-200 leading-snug">
                    {h}
                  </div>
                ))}
              </div>
            )}
            <textarea
              value={notebookText}
              onChange={(e) => handleNotebookChange(e.target.value)}
              placeholder="Şüpheli notların, saat çelişkileri, PIN/kasa sayıları..."
              className="flex-1 bg-[#080B10] border border-slate-800 p-3 text-xs font-mono-tech text-slate-200 resize-none focus:outline-none focus:border-amber-500 leading-relaxed"
            />
          </div>
        )}

        {toast && (
          <div className="fixed bottom-5 right-5 z-40 px-4 py-2.5 bg-[#10141D] border-l-4 border-red-500 border border-slate-700 text-xs font-mono-tech text-slate-100 shadow-2xl max-w-md">
            {toast}
          </div>
        )}
      </main>

      {showAccusation && (
        <AccusationModal
          caseFile={caseFile}
          unlockedEvidence={unlockedEvidence}
          onClose={() => setShowAccusation(false)}
          onStartNewRandomCase={() => startCase(randomSeed(), (caseFile.difficulty as DifficultyMode) || 'detective')}
          onCaseFinished={handleCaseFinished}
        />
      )}
    </div>
  );
}

export default App;
