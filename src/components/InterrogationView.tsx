import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  Bot,
  Cpu,
  MessageSquare,
  Send,
  ShieldAlert,
  Sparkles,
  Swords,
  CheckCircle2,
  RefreshCw,
  Users,
  Pin,
} from 'lucide-react';
import { apiAiInterrogate, apiApplyTactic, apiConfrontSuspects, apiGetOllamaStatus, apiPresentEvidence, sfx } from '../api';
import { getPortraitUrl, type AiChatMessage, type CaseFile, type ConfrontationResult, type OllamaStatus, type Statement } from '../types';

interface InterrogationViewProps {
  caseFile: CaseFile;
  currentAct: number;
  unlockedEvidence: Set<string>;
  brokenStatements: Set<string>;
  revealedSecrets: Record<string, string[]>;
  aiChats: Record<string, AiChatMessage[]>;
  aiPresented: Record<string, string[]>;
  usedTactics: Record<string, string[]>;
  onUpdateAiChats: React.Dispatch<React.SetStateAction<Record<string, AiChatMessage[]>>>;
  onUpdateAiPresented: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  onMarkTacticUsed: (suspectId: string, tactic: string) => void;
  onContradictionHit: (suspectId: string, statementId: string, secret: string | null) => void;
  onReputationChange: (delta: number) => void;
  onPinQuote?: (suspectName: string, text: string) => void;
  onConfrontUnlock?: (secret: string | null, evidenceId: string | null, suspectId?: string) => void;
}

export const InterrogationView: React.FC<InterrogationViewProps> = ({
  caseFile,
  currentAct,
  unlockedEvidence,
  brokenStatements,
  revealedSecrets,
  aiChats,
  aiPresented,
  usedTactics,
  onUpdateAiChats,
  onUpdateAiPresented,
  onMarkTacticUsed,
  onContradictionHit,
  onReputationChange,
  onPinQuote,
  onConfrontUnlock,
}) => {
  const [selectedSuspectId, setSelectedSuspectId] = useState(caseFile.suspects[0]?.id ?? 's1');
  const [mode, setMode] = useState<'tactical' | 'ai' | 'confront'>('tactical');
  const [confrontOtherId, setConfrontOtherId] = useState(caseFile.suspects[1]?.id ?? 's2');
  const [confrontRes, setConfrontRes] = useState<ConfrontationResult | null>(null);
  const [selectedStatement, setSelectedStatement] = useState<Statement | null>(null);
  const [pressLog, setPressLog] = useState<string | null>(null);
  const [hitFlash, setHitFlash] = useState(false);
  const [pulseBoost, setPulseBoost] = useState(0);

  // AI Mode State (chats & presented evidence are lifted to App so tab switch never wipes them!)
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null);
  const [endpointUrl, setEndpointUrl] = useState('http://127.0.0.1:11434');
  const [modelName, setModelName] = useState('qwen2.5vl:7b');
  const [apiKey, setApiKey] = useState('');
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const ecgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const suspect = caseFile.suspects.find((s) => s.id === selectedSuspectId) ?? caseFile.suspects[0];
  const currentBpm = (suspect?.base_pulse ?? 74) + pulseBoost;
  const bpmRef = useRef(currentBpm);

  useEffect(() => {
    bpmRef.current = currentBpm;
  }, [currentBpm]);

  // Slowly decay pulse boost
  useEffect(() => {
    if (pulseBoost <= 0) return;
    const t = setInterval(() => {
      setPulseBoost((p) => Math.max(0, p - 2));
    }, 900);
    return () => clearInterval(t);
  }, [pulseBoost]);

  // 60 FPS Live ECG Polygraph Waveform
  useEffect(() => {
    const canvas = ecgCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    const samples: number[] = new Array(220).fill(0);
    let phase = 0;

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr)) {
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
      }
      const w = rect.width;
      const h = rect.height;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const bpm = bpmRef.current;
      const freq = (bpm / 60) * 0.045;
      phase = (phase + freq) % 1;

      // Synthetic QRS complex
      let val = (Math.random() - 0.5) * 0.04;
      if (phase > 0.12 && phase < 0.17) val = 0.18;
      else if (phase >= 0.22 && phase < 0.24) val = -0.22;
      else if (phase >= 0.24 && phase < 0.27) val = bpm > 105 ? 0.95 : 0.78;
      else if (phase >= 0.27 && phase < 0.30) val = -0.35;
      else if (phase >= 0.38 && phase < 0.46) val = 0.22;

      samples.push(val);
      if (samples.length > 220) samples.shift();

      ctx.fillStyle = '#07090D';
      ctx.fillRect(0, 0, w, h);

      // Grid
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 24) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      // Waveform
      const stressed = bpm > 105;
      ctx.strokeStyle = stressed ? '#EF4444' : '#38BDF8';
      ctx.shadowColor = stressed ? '#EF4444' : '#38BDF8';
      ctx.shadowBlur = 10;
      ctx.lineWidth = 2;
      ctx.beginPath();
      samples.forEach((s, i) => {
        const px = (i / (samples.length - 1)) * w;
        const py = h * 0.55 - s * (h * 0.42);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
      ctx.shadowBlur = 0;

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const refreshOllama = async () => {
    const status = await apiGetOllamaStatus(endpointUrl);
    setOllamaStatus(status);
    if (status.online && status.models.length > 0 && !status.models.includes(modelName)) {
      setModelName(status.models[0]);
    }
  };

  useEffect(() => {
    if (mode === 'ai' && !ollamaStatus) {
      refreshOllama();
    }
  }, [mode]);

  const handleSelectSuspect = (id: string) => {
    sfx.click();
    setSelectedSuspectId(id);
    setSelectedStatement(null);
    setPressLog(null);
    setPulseBoost(0);
  };

  const handlePress = (st: Statement) => {
    sfx.click();
    setSelectedStatement(st);
    setPressLog(`SORGULAMA YANITI — ${suspect.name}: "${st.press_reply}"`);
    setPulseBoost((p) => Math.min(25, p + 8));
  };

  const handlePresentEvidence = async (evidenceId: string) => {
    if (!selectedStatement) return;
    const res = await apiPresentEvidence(caseFile.seed, suspect.id, selectedStatement.id, evidenceId);
    setPressLog(res.reply);
    if (res.hit) {
      // Contradiction hit heartbeat & shake
      sfx.contradictionHit();
      setTimeout(() => sfx.heartbeat(), 320);
      setHitFlash(true);
      setTimeout(() => setHitFlash(false), 950);
      setPulseBoost(res.pulse_delta);
      onContradictionHit(suspect.id, selectedStatement.id, res.revealed_secret);
    } else {
      sfx.error();
      onReputationChange(res.reputation_delta);
    }
  };

  const handleSendAi = async (overrideMsg?: string) => {
    const raw = overrideMsg ?? aiInput;
    if (!raw.trim() || aiLoading) return;
    const msg = raw.trim();
    if (!overrideMsg) setAiInput('');
    setAiError(null);
    setAiLoading(true);
    sfx.click();

    const prevHistory = aiChats[suspect.id] ?? [];
    const nextHistory: AiChatMessage[] = [...prevHistory, { role: 'user', content: msg }];
    onUpdateAiChats((c) => ({ ...c, [suspect.id]: nextHistory }));

    try {
      const resp = await apiAiInterrogate({
        seed: caseFile.seed,
        suspect_id: suspect.id,
        user_message: msg,
        history: prevHistory,
        presented_evidence_ids: aiPresented[suspect.id] ?? [],
        broken_statement_ids: Array.from(brokenStatements),
        endpoint_url: endpointUrl,
        model_name: modelName,
        api_key: apiKey.trim() || null,
      });
      onUpdateAiChats((c) => ({
        ...c,
        [suspect.id]: [...nextHistory, { role: 'assistant', content: resp.reply }],
      }));
      setPulseBoost((p) => Math.min(60, p + resp.pulse_hint));
    } catch (err) {
      setAiError(String(err));
    } finally {
      setAiLoading(false);
    }
  };

  const toggleAiEvidence = (eid: string) => {
    sfx.click();
    onUpdateAiPresented((prev) => {
      const list = prev[suspect.id] ?? [];
      const next = list.includes(eid) ? list.filter((x) => x !== eid) : [...list, eid];
      return { ...prev, [suspect.id]: next };
    });
  };

  const visibleStatements = suspect.statements.filter((st) => st.act <= currentAct);
  const discoveredEvidence = caseFile.evidence.filter((e) => unlockedEvidence.has(e.id));

  return (
    <div
      className={`h-full grid grid-cols-12 gap-4 p-4 overflow-hidden transition-colors duration-300 ${
        hitFlash ? 'bg-red-950/35' : ''
      }`}
    >
      {/* Left: Suspect Selector + Biometric Card + Live ECG */}
      <div className="col-span-4 flex flex-col gap-3 overflow-hidden">
        <div className="noir-panel p-3 space-y-1.5">
          <div className="text-[10px] font-mono-tech text-slate-400 uppercase tracking-widest mb-1.5">
            ŞÜPHELİ SEÇİMİ (5 KİŞİ)
          </div>
          {caseFile.suspects.map((s) => {
            const active = s.id === suspect.id;
            const brokenCount = s.statements.filter((st) => brokenStatements.has(st.id)).length;
            return (
              <button
                key={s.id}
                onClick={() => handleSelectSuspect(s.id)}
                className={`w-full p-2.5 border text-left flex items-center justify-between transition cursor-pointer ${
                  active
                    ? 'bg-red-950/25 border-red-500 text-white'
                    : 'bg-[#0C0F15] border-slate-800 text-slate-300 hover:border-slate-600'
                }`}
              >
                <div>
                  <div className="text-xs font-bold">{s.name}</div>
                  <div className="text-[10px] font-mono-tech text-slate-400">
                    {s.role} • {s.handedness}
                  </div>
                </div>
                {brokenCount > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-mono-tech bg-red-600/30 border border-red-500/70 text-red-200">
                    {brokenCount} YALAN KIRILDI
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Biometric Profile & ECG */}
        <div className="noir-panel p-4 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-12 h-14 mugshot-bg border border-slate-700 overflow-hidden shrink-0">
                  <img
                    src={getPortraitUrl(suspect.portrait_index)}
                    alt={suspect.name}
                    className="w-full h-full object-cover contrast-115"
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white truncate">{suspect.name}</div>
                  <div className="text-[11px] font-mono-tech text-sky-400 truncate">{suspect.archetype_tag}</div>
                </div>
              </div>
              <div className="text-right font-mono-tech shrink-0">
                <div className={`text-xl font-bold ${currentBpm > 105 ? 'text-red-400 animate-pulse' : 'text-sky-300'}`}>
                  {currentBpm} <span className="text-[10px]">BPM</span>
                </div>
                <div className="text-[10px] text-slate-500">POLİGRAF</div>
              </div>
            </div>

            <div className="h-24 border border-slate-800 mb-3 overflow-hidden">
              <canvas ref={ecgCanvasRef} className="w-full h-full block" />
            </div>

            <div className="grid grid-cols-3 gap-2 text-[10px] font-mono-tech mb-3">
              <div className="bg-slate-900/70 p-2 border border-slate-800">
                <span className="text-slate-500 block">EL</span>
                <span className="text-slate-100 font-semibold">{suspect.handedness}</span>
              </div>
              <div className="bg-slate-900/70 p-2 border border-slate-800">
                <span className="text-slate-500 block">KAN</span>
                <span className="text-slate-100 font-semibold">{suspect.blood_type}</span>
              </div>
              <div className="bg-slate-900/70 p-2 border border-slate-800">
                <span className="text-slate-500 block">YAŞ</span>
                <span className="text-slate-100 font-semibold">{suspect.age}</span>
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-400 bg-[#0B0E14] p-2.5 border border-slate-800">
            <span className="text-[10px] font-mono-tech text-amber-400 block mb-0.5">ALİBİ ÖZETİ</span>
            {suspect.alibi_summary}
          </div>

          {(revealedSecrets[suspect.id]?.length ?? 0) > 0 && (
            <div className="mt-2 p-2.5 bg-red-950/25 border border-red-800/60 text-xs text-red-200 space-y-1">
              <div className="text-[10px] font-mono-tech text-red-400 uppercase">ÇÖZÜLEN SIRLAR</div>
              {revealedSecrets[suspect.id].map((sec, idx) => (
                <div key={idx}>• {sec}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Tactical vs Live AI Interrogation Panel */}
      <div className="col-span-8 noir-panel interrogation-lamp flex flex-col overflow-hidden relative">
        {hitFlash && (
          <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center bg-red-950/35">
            <div className="px-6 py-3 bg-[#090B0E]/95 noir-stamp text-2xl font-mono-tech font-bold animate-slam-stamp">
              ÇELİŞKİ YAKALANDI!
            </div>
          </div>
        )}
        {/* Mode Switch Header */}
        <div className="px-4 py-2.5 border-b border-slate-800 bg-[#0D1016] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sfx.click();
                setMode('tactical');
              }}
              className={`px-3 py-1.5 text-xs font-mono-tech uppercase border flex items-center gap-1.5 cursor-pointer ${
                mode === 'tactical'
                  ? 'bg-red-600/25 border-red-500 text-white'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
            >
              <Swords className="w-3.5 h-3.5" /> TAKTİKSEL SORGU (SIFIR AI)
            </button>
            <button
              onClick={() => {
                sfx.click();
                setMode('ai');
              }}
              className={`px-3 py-1.5 text-xs font-mono-tech uppercase border flex items-center gap-1.5 cursor-pointer ${
                mode === 'ai'
                  ? 'bg-sky-600/25 border-sky-400 text-white'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
            >
              <Bot className="w-3.5 h-3.5" /> CANLI AI
            </button>
            <button
              onClick={() => {
                sfx.click();
                setMode('confront');
                setConfrontRes(null);
              }}
              className={`px-3 py-1.5 text-xs font-mono-tech uppercase border flex items-center gap-1.5 cursor-pointer ${
                mode === 'confront'
                  ? 'bg-amber-600/25 border-amber-400 text-white'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> YÜZLEŞTİRME
            </button>
          </div>
          <div className="text-[11px] font-mono-tech text-slate-500 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-red-400" />
            ACT {currentAct} İFADELERİ
          </div>
        </div>

        {mode === 'tactical' ? (
          <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto">
            {/* Statements List */}
            <div className="space-y-3">
              {visibleStatements.map((st) => {
                const broken = brokenStatements.has(st.id);
                const selected = selectedStatement?.id === st.id;
                return (
                  <div
                    key={st.id}
                    onClick={() => {
                      sfx.click();
                      setSelectedStatement(st);
                    }}
                    className={`p-4 border transition cursor-pointer ${
                      broken
                        ? 'bg-emerald-950/20 border-emerald-700/70'
                        : selected
                        ? 'bg-red-950/20 border-red-500'
                        : 'bg-[#0C1017] border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-mono-tech uppercase text-slate-400">
                        ACT {st.act} İFADESİ
                      </span>
                      {broken ? (
                        <span className="text-[10px] font-mono-tech text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> ÇELİŞKİ KIRILDI
                        </span>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePress(st);
                          }}
                          className="px-2.5 py-1 text-[10px] font-mono-tech uppercase bg-sky-600/20 border border-sky-500/60 text-sky-200 hover:bg-sky-600/35 cursor-pointer"
                        >
                          SORGULA (PRESS)
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-slate-100 leading-relaxed">&ldquo;{st.text}&rdquo;</p>
                  </div>
                );
              })}
            </div>

            {/* Psychological Interrogation Tactics: Aggressive / Empathy / Bluff */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'aggressive' as const, label: 'SERT BASKI', sub: 'Gergin tipleri sarsar', style: 'border-[#5E2A2A] bg-[#1E1313] text-[#E6A1A1] hover:border-[#C42B2B]' },
                { id: 'sympathetic' as const, label: 'EMPATİ KUR', sub: 'Savunmayı indirir', style: 'border-[#2E424A] bg-[#131A1D] text-[#A9CBD9] hover:border-[#7AA2B8]' },
                { id: 'bluff' as const, label: 'BLÖF YAP [RİSKLİ]', sub: 'Yerse itiraf, yemezse -1 itibar', style: 'border-[#5E4A22] bg-[#1E1910] text-[#E6C78A] hover:border-[#C49A52]' },
              ].map((tac) => {
                const alreadyUsed = (usedTactics[suspect.id] ?? []).includes(tac.id);
                return (
                <button
                  key={tac.id}
                  disabled={alreadyUsed}
                  onClick={async () => {
                    onMarkTacticUsed(suspect.id, tac.id);
                    const res = await apiApplyTactic(caseFile.seed, suspect.id, tac.id);
                    setPressLog(res.reply);
                    if (res.success) {
                      sfx.heartbeat();
                      setPulseBoost((p) => Math.max(0, Math.min(60, p + res.pulse_delta)));
                      if (res.revealed_secret) {
                        onConfrontUnlock?.(res.revealed_secret, null, suspect.id);
                      }
                    } else {
                      sfx.error();
                      if (res.reputation_delta !== 0) onReputationChange(res.reputation_delta);
                    }
                  }}
                  className={`p-2 border text-left transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${tac.style}`}
                >
                  <div className="text-[10px] font-mono-tech font-bold uppercase">
                    {tac.label} {alreadyUsed && '✓'}
                  </div>
                  <div className="text-[9px] opacity-75 mt-0.5">{alreadyUsed ? 'Bu şüphelide kullanıldı' : tac.sub}</div>
                </button>
                );
              })}
            </div>

            {/* Branching Cross-Examination Follow-Up Questions */}
            {suspect.follow_ups.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] font-mono-tech text-sky-400 uppercase tracking-wider">
                  ÇAPRAZ SORGU — EK SORULAR
                </div>
                <div className="flex flex-wrap gap-2">
                  {suspect.follow_ups.map((fq) => (
                    <button
                      key={fq.id}
                      onClick={() => {
                        sfx.click();
                        setPressLog(`${suspect.name}: "${fq.answer}"`);
                        setPulseBoost((p) => Math.min(40, p + fq.pulse_bump));
                      }}
                      className="px-2.5 py-1.5 text-[11px] bg-[#0B0E14] border border-slate-700 hover:border-sky-400 text-slate-200 cursor-pointer transition"
                    >
                      ? {fq.question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Active Response Box (Physical Typewriter Transcript Slip) */}
            {pressLog && (
              <div className="p-4 paper-slip border-l-4 !border-l-[#9E1B1B] font-typewriter text-sm leading-relaxed">
                {pressLog}
              </div>
            )}

            {/* Present Evidence Drawer */}
            <div className="mt-auto pt-3 border-t border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono-tech text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  {selectedStatement
                    ? 'SEÇİLİ İFADEYE KANIT VUR (YANLIŞ KANIT İTİBAR DÜŞÜRÜR)'
                    : 'KANIT VURMAK İÇİN YUKARIDAN BİR İFADE SEÇ'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                {discoveredEvidence.map((ev) => (
                  <button
                    key={ev.id}
                    disabled={!selectedStatement || brokenStatements.has(selectedStatement.id)}
                    onClick={() => handlePresentEvidence(ev.id)}
                    className="p-2.5 text-left bg-[#0C1017] border border-slate-800 hover:border-red-500 disabled:opacity-40 transition cursor-pointer"
                  >
                    <div className="text-[10px] font-mono-tech text-amber-400 font-bold">{ev.code}</div>
                    <div className="text-xs font-semibold text-slate-200 truncate">{ev.title}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : mode === 'ai' ? (
          /* Live AI Interrogation Mode */
          <div className="flex-1 flex flex-col p-4 gap-3 overflow-hidden">
            {/* Ollama / API Config Bar */}
            <div className="p-2.5 bg-[#0A0D12] border border-slate-800 flex flex-wrap items-center gap-2 text-xs font-mono-tech">
              <Cpu className="w-4 h-4 text-sky-400 shrink-0" />
              <input
                value={endpointUrl}
                onChange={(e) => setEndpointUrl(e.target.value)}
                placeholder="http://127.0.0.1:11434"
                className="bg-slate-900 border border-slate-700 px-2 py-1 text-slate-200 w-48 focus:outline-none focus:border-sky-400"
              />
              {ollamaStatus?.models && ollamaStatus.models.length > 0 ? (
                <select
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  className="bg-slate-900 border border-slate-700 px-2 py-1 text-slate-200"
                >
                  {ollamaStatus.models.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder="Model (örn: qwen2.5:3b)"
                  className="bg-slate-900 border border-slate-700 px-2 py-1 text-slate-200 w-36"
                />
              )}
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="API Key (opsiyonel)"
                className="bg-slate-900 border border-slate-700 px-2 py-1 text-slate-200 w-36"
              />
              <button
                onClick={refreshOllama}
                className="px-2 py-1 bg-slate-800 border border-slate-700 text-slate-200 hover:border-sky-400 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> KONTROL
              </button>
              <span className={`ml-auto text-[10px] ${ollamaStatus?.online ? 'text-emerald-400' : 'text-amber-400'}`}>
                {ollamaStatus?.online ? 'OLLAMA ÇEVRİMİÇİ' : 'OLLAMA KAPALI / API MODU'}
              </span>
            </div>

            {/* Present Evidence Pills to Rust Truth Lock */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-mono-tech text-slate-400 uppercase mr-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" /> MASAYA KOYDUĞUN KANITLAR:
              </span>
              {discoveredEvidence.map((ev) => {
                const active = (aiPresented[suspect.id] ?? []).includes(ev.id);
                return (
                  <button
                    key={ev.id}
                    onClick={() => toggleAiEvidence(ev.id)}
                    className={`px-2 py-0.5 text-[10px] font-mono-tech border cursor-pointer transition ${
                      active
                        ? 'bg-red-600/30 border-red-500 text-red-100'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {ev.code}
                  </button>
                );
              })}
            </div>

            {/* Chat Feed */}
            <div className="flex-1 bg-[#080B10] border border-slate-800 p-4 overflow-y-auto space-y-3">
              {(aiChats[suspect.id] ?? []).length === 0 && (
                <div className="text-xs font-mono-tech text-slate-500 text-center py-8">
                  <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  {suspect.name} karşında oturuyor. Rust gerçeklik motoru şüphelinin yalan ve sırlarını kilitledi. Sorunu yaz — elindeki kanıtı yukarıdan masaya koymadan kolay kolay çözülmez.
                </div>
              )}
              {(aiChats[suspect.id] ?? []).map((m, idx) => (
                <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] p-3 text-sm leading-relaxed border ${
                      m.role === 'user'
                        ? 'bg-sky-950/35 border-sky-800/70 text-sky-100'
                        : 'bg-[#12161F] border-slate-700 text-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[10px] font-mono-tech text-slate-400 mb-1 uppercase">
                      <span>{m.role === 'user' ? 'DEDEKTİF' : suspect.name}</span>
                      {m.role === 'assistant' && onPinQuote && (
                        <button
                          onClick={() => {
                            sfx.click();
                            onPinQuote(suspect.name, m.content);
                          }}
                          className="text-[9px] text-amber-400 hover:text-amber-200 flex items-center gap-1 cursor-pointer"
                        >
                          <Pin className="w-2.5 h-2.5" /> TAHTAYA PİNLE
                        </button>
                      )}
                    </div>
                    {m.content}
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div className="text-xs font-mono-tech text-sky-400 animate-pulse">
                  {suspect.name} düşünüyor...
                </div>
              )}
              {aiError && (
                <div className="p-2.5 bg-red-950/40 border border-red-700 text-xs font-mono-tech text-red-300">
                  {aiError} — Ollama çalışmıyorsa terminalde <code>ollama serve</code> başlatabilir veya Taktiksel Sorgu modunda sıfır AI ile oynayabilirsin.
                </div>
              )}
            </div>

            {/* Quick Interrogation Pressure Prompts */}
            <div className="flex flex-wrap gap-1.5">
              {[
                'Olay saatinde tam olarak neredeydin? Saat ver.',
                'Masaya koyduğum bu kanıtı bana nasıl açıklıyorsun?',
                'Kurbanla son görüşmende ne konuştunuz, kimi koruyorsun?',
              ].map((qp) => (
                <button
                  key={qp}
                  disabled={aiLoading}
                  onClick={() => handleSendAi(qp)}
                  className="px-2 py-1 text-[10px] font-mono-tech bg-[#0D1119] border border-slate-800 hover:border-amber-400/70 text-slate-300 cursor-pointer disabled:opacity-40"
                >
                  ⚡ {qp}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="flex gap-2">
              <input
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendAi()}
                placeholder={`${suspect.name} için soruyu yaz...`}
                className="flex-1 bg-[#0C1017] border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
              />
              <button
                onClick={() => handleSendAi()}
                disabled={aiLoading}
                className="px-4 py-2 bg-red-600/25 border border-red-500 text-red-100 font-mono-tech text-xs uppercase hover:bg-red-600/40 disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" /> SOR
              </button>
            </div>
          </div>
        ) : null}

        {mode === 'confront' && (
          <div className="flex-1 flex flex-col p-5 gap-4 overflow-y-auto">
            <div className="text-xs font-mono-tech text-amber-400 uppercase tracking-widest">
              İKİ ŞÜPHELİYİ AYNI ODADA YÜZLEŞTİR — ORTAK ALİBİ VE ÇATIŞMA TESTİ
            </div>

            <div className="grid grid-cols-11 items-center gap-3">
              <div className="col-span-5 p-3 bg-[#0B0E14] border border-slate-700 flex items-center gap-3">
                <img src={getPortraitUrl(suspect.portrait_index)} alt={suspect.name} className="w-14 h-16 object-cover border border-slate-600" />
                <div>
                  <div className="text-xs font-bold text-white">{suspect.name}</div>
                  <div className="text-[10px] font-mono-tech text-slate-400">{suspect.role}</div>
                </div>
              </div>
              <div className="col-span-1 text-center font-mono-tech text-red-500 font-bold">VS</div>
              <div className="col-span-5 p-3 bg-[#0B0E14] border border-slate-700 space-y-2">
                <select
                  value={confrontOtherId}
                  onChange={(e) => setConfrontOtherId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 p-1.5 text-xs font-mono-tech text-white"
                >
                  {caseFile.suspects
                    .filter((s) => s.id !== suspect.id)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.role})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <button
              onClick={async () => {
                const otherId = confrontOtherId === suspect.id
                  ? caseFile.suspects.find((s) => s.id !== suspect.id)?.id ?? ''
                  : confrontOtherId;
                const res = await apiConfrontSuspects(caseFile.seed, suspect.id, otherId);
                setConfrontRes(res);
                if (res.dramatic_hit) {
                  sfx.contradictionHit();
                  setTimeout(() => sfx.heartbeat(), 300);
                  setHitFlash(true);
                  setTimeout(() => setHitFlash(false), 950);
                  setPulseBoost(res.pulse_spike);
                  onConfrontUnlock?.(res.revealed_secret, res.unlocked_evidence_id, suspect.id);
                } else {
                  sfx.click();
                }
              }}
              className="py-2.5 bg-amber-600/25 border border-amber-400 text-amber-100 font-mono-tech text-xs uppercase font-bold tracking-wider hover:bg-amber-600/40 cursor-pointer"
            >
              İKİSİNİ AYNI ODADA YÜZLEŞTİR
            </button>

            {confrontRes && (
              <div className={`p-4 border space-y-2.5 ${confrontRes.dramatic_hit ? 'bg-red-950/25 border-red-600' : 'bg-[#0B0E14] border-slate-800'}`}>
                {confrontRes.dialogue.map((line, i) => (
                  <p key={i} className="text-sm text-slate-100 leading-relaxed">
                    {line}
                  </p>
                ))}
                {confrontRes.revealed_secret && (
                  <div className="pt-2 border-t border-red-800/60 text-xs font-mono-tech text-amber-300">
                    ★ {confrontRes.revealed_secret}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
