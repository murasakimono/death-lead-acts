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
    map[s.id] = { id: s.id, x: 26 + i * 232, y: 24 };
  });
  cf.evidence.forEach((ev, i) => {
    const col = i % 5;
    const row = Math.floor(i / 5);
    map[ev.id] = { id: ev.id, x: 26 + col * 232, y: 175 + row * 128 };
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
    <div className="h-screen w-screen flex flex-col bg-[#07090C] text-[#E6E8EC] overflow-hidden noir-grain noir-vignette">
      {/* Thin Top Case Strip */}
      <header className="h-14 px-3 border-b border-slate-800/90 bg-[#0B0E14] flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { sfx.click(); setScreen('menu'); }}
            className="p-1.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
            title="Ana Menü"
          >
            <Home className="w-4 h-4" />
          </button>

          <div>
            <div className="text-[11px] font-bold tracking-[0.2em] text-white uppercase flex items-center gap-2">
              <span className="w-2 h-2 bg-red-600 inline-block shadow-[0_0_10px_#DC2626]" />
              DEATH LEAD ACTS
            </div>
            <div className="text-[10px] font-mono-tech text-slate-400">
              {caseFile.case_code} • {caseFile.crime_type}
            </div>
          </div>

          <div className="h-6 w-px bg-slate-800" />

          <div className="flex items-center gap-1">
            {[
              { id: 'scene', label: 'OLAY YERİ', icon: Map },
              { id: 'forensics', label: 'ADLİ & LAB', icon: Microscope },
              { id: 'board', label: 'TAHTA', icon: Network },
              { id: 'timeline', label: 'KRONOLOJİ', icon: Clock },
              { id: 'interrogation', label: 'SORGU', icon: Users },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => { sfx.click(); setActiveTab(tab.id as DeskTab); }}
                  className={`px-2.5 py-1.5 text-[11px] font-mono-tech uppercase tracking-wider border flex items-center gap-1.5 transition cursor-pointer ${
                    active
                      ? 'bg-red-600/20 border-red-500 text-white'
                      : 'bg-transparent border-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {remainingSec !== null && (
            <div className={`px-2.5 py-1 border font-mono-tech text-xs font-bold ${remainingSec < 120 ? 'bg-red-950/60 border-red-500 text-red-300 animate-pulse' : 'bg-slate-900 border-amber-700 text-amber-300'}`}>
              ⏱ {fmtTimer(remainingSec)}
            </div>
          )}

          <div className="px-2 py-1 bg-slate-900 border border-slate-700 text-[10px] font-mono-tech text-amber-300">
            ACT {currentAct === 1 ? 'I' : currentAct === 2 ? 'II' : 'III'}
          </div>

          {/* Prosecutor Reputation */}
          <div title="Savcılık İtibarı" className="flex items-center gap-1 px-2 py-1 bg-slate-900 border border-slate-800">
            <Shield className="w-3.5 h-3.5 text-sky-400 mr-0.5" />
            {Array.from({ length: caseFile.max_reputation }).map((_, idx) => (
              <span key={idx} className={`w-1.5 h-2.5 ${idx < reputation ? 'bg-sky-400' : 'bg-slate-700'}`} />
            ))}
          </div>

          {/* Limited Case Hints */}
          <button
            onClick={handleUseHint}
            title="Vaka İpucu (Sınırlı Hak)"
            className="px-2 py-1.5 bg-slate-900 border border-slate-800 hover:border-amber-500 text-[10px] font-mono-tech text-amber-300 flex items-center gap-1 cursor-pointer"
          >
            <Lightbulb className="w-3.5 h-3.5" /> {caseFile.max_hints - hintsUsed}/{caseFile.max_hints}
          </button>

          {/* Personal Detective Notebook */}
          <button
            onClick={() => { sfx.click(); setShowNotebook((v) => !v); }}
            title="Kişisel Dedektif Not Defteri"
            className={`px-2 py-1.5 border text-[10px] font-mono-tech flex items-center gap-1 cursor-pointer ${
              showNotebook ? 'bg-amber-600/25 border-amber-400 text-amber-200' : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" /> NOT
          </button>

          {/* Ambient Rain & Noir Music Toggles */}
          <button
            onClick={handleToggleAmbient}
            title="Yağmur & Gece Atmosferi"
            className={`p-1.5 border cursor-pointer ${ambientOn ? 'bg-sky-900/40 border-sky-400 text-sky-300' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'}`}
          >
            <CloudRain className="w-4 h-4" />
          </button>
          <button
            onClick={handleToggleMusic}
            title="Karanlık Noir Müzik"
            className={`p-1.5 border cursor-pointer ${musicOn ? 'bg-purple-900/40 border-purple-400 text-purple-300' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'}`}
          >
            <Music className="w-4 h-4" />
          </button>

          {/* SFX Toggle */}
          <button
            onClick={() => { const next = !soundOn; setSoundOn(next); sfx.enabled = next; }}
            className="p-1.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
            title="Ses Efektleri"
          >
            {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={() => { sfx.click(); setShowAccusation(true); }}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-[11px] font-mono-tech font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer animate-pulse-crimson"
          >
            <Gavel className="w-3.5 h-3.5" /> SUÇLA
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
