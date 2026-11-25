import React, { useState } from 'react';
import {
  Smartphone,
  Radio,
  Activity,
  Lock,
  Unlock,
  CheckCircle2,
  FileText,
  Crosshair,
  AlertTriangle,
  AudioWaveform,
  Video,
  FlaskConical,
  KeyRound,
  UserCheck,
  Columns2,
} from 'lucide-react';
import { apiVerifyPin, apiVerifySafe, sfx } from '../api';
import { formatMinutesFrom19, type CaseFile } from '../types';

interface ForensicsViewProps {
  caseFile: CaseFile;
  unlockedEvidence: Set<string>;
  phoneUnlocked: boolean;
  triangulationSolved: boolean;
  autopsyLockedWindow: [number, number] | null;
  onUnlockEvidence: (ids: string[], toastMsg: string) => void;
  onPhoneUnlocked: () => void;
  onTriangulationSolved: () => void;
  onAutopsyLocked: (window: [number, number]) => void;
}

type ForensicTab =
  | 'phone'
  | 'hts'
  | 'autopsy'
  | 'audio'
  | 'cctv'
  | 'chem'
  | 'safe'
  | 'bodymap'
  | 'compare'
  | 'archive';

export const ForensicsView: React.FC<ForensicsViewProps> = ({
  caseFile,
  unlockedEvidence,
  phoneUnlocked,
  triangulationSolved,
  autopsyLockedWindow,
  onUnlockEvidence,
  onPhoneUnlocked,
  onTriangulationSolved,
  onAutopsyLocked,
}) => {
  const [subTab, setSubTab] = useState<ForensicTab>('phone');

  // Phone PIN
  const [pinInput, setPinInput] = useState('');
  const [pinMsg, setPinMsg] = useState<string | null>(null);
  const [pinErr, setPinErr] = useState(false);

  // Triangulation
  const [marker, setMarker] = useState({ x: 50, y: 50 });
  const [htsMsg, setHtsMsg] = useState<string | null>(null);

  // Autopsy Estimator
  const [estStart, setEstStart] = useState(150);
  const [autopsyMsg, setAutopsyMsg] = useState<string | null>(null);
  const [easyHint, setEasyHint] = useState(false);

  // Audio Cleaning
  const [audioFreq, setAudioFreq] = useState(50);
  const [audioThresh, setAudioThresh] = useState(50);
  const [audioSolved, setAudioSolved] = useState(false);

  // CCTV Scrubber
  const [cctvFrame, setCctvFrame] = useState(10);
  const [cctvSolved, setCctvSolved] = useState(false);

  // Chem Spectrum
  const [chemSolved, setChemSolved] = useState(false);
  const [chemErr, setChemErr] = useState<string | null>(null);

  // Safe Combo
  const [d1, setD1] = useState(20);
  const [d2, setD2] = useState(60);
  const [d3, setD3] = useState(20);
  const [safeSolved, setSafeSolved] = useState(false);
  const [safeMsg, setSafeMsg] = useState<string | null>(null);

  // Body Map
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [inspectedZones, setInspectedZones] = useState<Set<string>>(new Set());

  // Evidence Compare Desk
  const [compareA, setCompareA] = useState('');
  const [compareB, setCompareB] = useState('');

  const handlePinKey = (d: string) => {
    if (phoneUnlocked) return;
    sfx.click();
    if (d === 'CLR') { setPinInput(''); setPinMsg(null); return; }
    if (d === 'OK') { submitPin(); return; }
    if (pinInput.length < 4) setPinInput((p) => p + d);
  };

  const submitPin = async () => {
    if (pinInput.length !== 4) return;
    const res = await apiVerifyPin(caseFile.seed, pinInput);
    setPinMsg(res.message);
    if (res.unlocked) {
      setPinErr(false);
      sfx.discover();
      onPhoneUnlocked();
      onUnlockEvidence(res.unlocked_evidence_ids, 'Kurbanın telefonu kırıldı: TEL-07 ve TEL-08 eklendi!');
    } else {
      setPinErr(true);
      sfx.error();
      setPinInput('');
    }
  };

  const handleRadarClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (triangulationSolved) return;
    const rect = e.currentTarget.getBoundingClientRect();
    sfx.click();
    setMarker({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  const verifyTriangulation = () => {
    const p = caseFile.triangulation_puzzle;
    const dist = Math.hypot(marker.x - p.target_x, marker.y - p.target_y);
    if (dist <= p.tolerance) {
      sfx.discover();
      onTriangulationSolved();
      setHtsMsg(`KESİŞİM DOĞRULANDI — Sinyal ${p.location_name} üzerinde kilitlendi!`);
      onUnlockEvidence([p.unlocked_evidence_id], `HTS Üçgenleme tamamlandı: ${p.target_suspect_name} konumu kilitlendi!`);
    } else {
      sfx.error();
      setHtsMsg(`Sapma fazla (${dist.toFixed(1)} birim). 3 baz istasyonu çemberinin tam kesişimine tıkla.`);
    }
  };

  const verifyAutopsy = () => {
    const a = caseFile.autopsy_puzzle;
    const estEnd = estStart + 30;
    const overlap = Math.min(estEnd, a.true_death_end_min) - Math.max(estStart, a.true_death_start_min);
    if (overlap >= 15) {
      sfx.discover();
      onAutopsyLocked([a.true_death_start_min, a.true_death_end_min]);
      setAutopsyMsg(
        `DOĞRULANDI — Ölüm penceresi ${formatMinutesFrom19(a.true_death_start_min)} - ${formatMinutesFrom19(a.true_death_end_min)} olarak Zaman Çizelgesi'ne işlendi.`
      );
    } else {
      sfx.error();
      setAutopsyMsg('Hatalı pencere! Bulunma saatinden (37.2 - vücut ısısı) / 0.95 saat geriye git.');
    }
  };

  // Audio clarity score 0..100
  const audioClarity = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        100 -
          (Math.abs(audioFreq - caseFile.audio_puzzle.target_freq) * 1.4 +
            Math.abs(audioThresh - caseFile.audio_puzzle.target_threshold) * 1.4)
      )
    )
  );

  const lockAudio = () => {
    if (audioClarity >= 86) {
      sfx.discover();
      setAudioSolved(true);
      onUnlockEvidence([caseFile.audio_puzzle.unlocked_evidence_id], 'Telsiz kaydı temizlendi: SES-10 Delil Tahtası\'na eklendi!');
    } else {
      sfx.error();
    }
  };

  const cctvDiff = Math.abs(cctvFrame - caseFile.cctv_puzzle.target_frame);
  const lockCctv = () => {
    if (cctvDiff <= 5) {
      sfx.discover();
      setCctvSolved(true);
      onUnlockEvidence([caseFile.cctv_puzzle.unlocked_evidence_id], 'CCTV anomali karesi yakalandı ve doğrulandı!');
    } else {
      sfx.error();
    }
  };

  const checkChem = (cid: string) => {
    if (cid === caseFile.chem_puzzle.correct_compound_id) {
      sfx.discover();
      setChemSolved(true);
      setChemErr(null);
      onUnlockEvidence([caseFile.chem_puzzle.unlocked_evidence_id], 'Adli kimya spektrumu eşleşti: KİM-11 açıldı!');
    } else {
      sfx.error();
      setChemErr('Spektrum çubukları uyuşmuyor — pik değerlerini tekrar kıyasla.');
    }
  };

  const checkSafe = async () => {
    const res = await apiVerifySafe(caseFile.seed, d1, d2, d3);
    setSafeMsg(res.message);
    if (res.unlocked) {
      sfx.discover();
      setSafeSolved(true);
      onUnlockEvidence(res.unlocked_evidence_ids, 'Duvar kasası açıldı: KAS-12 gizli dosyası eklendi!');
    } else {
      sfx.error();
    }
  };

  const discoveredList = caseFile.evidence.filter((e) => unlockedEvidence.has(e.id));
  const evA = discoveredList.find((e) => e.id === compareA);
  const evB = discoveredList.find((e) => e.id === compareB);

  const tabs: { id: ForensicTab; label: string; icon: React.ComponentType<{ className?: string }>; done?: boolean }[] = [
    { id: 'phone', label: 'TELEFON', icon: Smartphone, done: phoneUnlocked },
    { id: 'hts', label: 'HTS RADAR', icon: Radio, done: triangulationSolved },
    { id: 'autopsy', label: 'ÖLÜM SAATİ', icon: Activity, done: !!autopsyLockedWindow },
    { id: 'audio', label: 'SES TEMİZLE', icon: AudioWaveform, done: audioSolved },
    { id: 'cctv', label: 'CCTV KARE', icon: Video, done: cctvSolved },
    { id: 'chem', label: 'ADLİ KİMYA', icon: FlaskConical, done: chemSolved },
    { id: 'safe', label: 'KASA', icon: KeyRound, done: safeSolved },
    { id: 'bodymap', label: 'VÜCUT', icon: UserCheck, done: inspectedZones.size >= 3 },
    { id: 'compare', label: 'KARŞILAŞTIR', icon: Columns2 },
    { id: 'archive', label: `ARŞİV (${discoveredList.length}/${caseFile.evidence.length})`, icon: FileText },
  ];

  return (
    <div className="h-full flex flex-col p-4 gap-3 overflow-hidden">
      <div className="flex items-center gap-1.5 flex-wrap">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = subTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => { sfx.click(); setSubTab(t.id); }}
              className={`px-2.5 py-1.5 text-[10px] font-mono-tech uppercase tracking-wider border flex items-center gap-1.5 transition cursor-pointer ${
                active
                  ? 'bg-red-600/20 border-red-500 text-white'
                  : 'bg-[#0D1016] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
              {t.done && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto">
        {subTab === 'phone' && (
          <div className="grid grid-cols-12 gap-6 h-full">
            <div className="col-span-5 flex items-center justify-center">
              <div className="w-[310px] bg-[#0B0E14] border-2 border-slate-700/80 rounded-2xl p-5 shadow-2xl">
                <div className="flex items-center justify-between text-[10px] font-mono-tech text-slate-500 mb-4">
                  <span>LTE • ŞİFRELİ CİHAZ</span>
                  <span className="flex items-center gap-1">
                    {phoneUnlocked ? <Unlock className="w-3 h-3 text-emerald-400" /> : <Lock className="w-3 h-3 text-red-400" />}
                    {phoneUnlocked ? 'AÇIK' : 'KİLİTLİ'}
                  </span>
                </div>
                {!phoneUnlocked ? (
                  <>
                    <div className="text-center mb-4">
                      <div className="text-xs font-mono-tech text-slate-400 uppercase">{caseFile.phone_puzzle.owner_name}</div>
                      <div className="text-base font-semibold text-white mt-1">PIN KODU GİRİN</div>
                      <div className="flex justify-center gap-3 mt-3">
                        {[0, 1, 2, 3].map((idx) => (
                          <div key={idx} className={`w-10 h-11 border flex items-center justify-center font-mono-tech text-lg font-bold ${pinInput[idx] ? 'border-red-500 bg-red-500/15 text-white' : 'border-slate-700 bg-slate-900/70 text-slate-600'}`}>
                            {pinInput[idx] || '•'}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLR', '0', 'OK'].map((k) => (
                        <button key={k} onClick={() => handlePinKey(k)} className={`h-11 font-mono-tech text-sm font-semibold border cursor-pointer ${k === 'OK' ? 'bg-red-600/25 border-red-500 text-red-200' : 'bg-slate-900/80 border-slate-800 text-slate-100 hover:border-slate-500'}`}>
                          {k}
                        </button>
                      ))}
                    </div>
                    {pinMsg && (
                      <div className={`mt-3 p-2.5 text-xs font-mono-tech border ${pinErr ? 'bg-red-950/40 border-red-700 text-red-300' : 'bg-emerald-950/40 border-emerald-700 text-emerald-300'}`}>
                        {pinMsg}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-2.5 max-h-[340px] overflow-y-auto">
                    <div className="text-xs font-mono-tech text-emerald-400 uppercase pb-2 border-b border-slate-800">KURTARILAN MESAJLAR</div>
                    {caseFile.phone_puzzle.messages.map((m, i) => (
                      <div key={i} className={`p-3 border text-xs ${m.deleted ? 'bg-red-950/25 border-red-800/60 text-red-100' : 'bg-slate-900/70 border-slate-800 text-slate-200'}`}>
                        <div className="flex justify-between font-mono-tech text-[10px] mb-1">
                          <span className="font-bold">{m.sender}</span>
                          <span>{m.time} {m.deleted && '[SİLİNMİŞ]'}</span>
                        </div>
                        <p>{m.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="col-span-7 noir-panel p-6 flex flex-col justify-center gap-4">
              <div className="text-xs font-mono-tech text-amber-400 uppercase tracking-widest">DİJİTAL ADLİ BİLİŞİM</div>
              <h3 className="text-xl font-bold text-white">Kurbanın Şifreli Telefonu</h3>
              <p className="text-sm text-slate-300">{caseFile.phone_puzzle.hint_text}</p>
            </div>
          </div>
        )}

        {subTab === 'hts' && (
          <div className="grid grid-cols-12 gap-5 h-full">
            <div className="col-span-7 noir-panel p-4 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-white">
                  Hedef: {caseFile.triangulation_puzzle.target_suspect_name} ({caseFile.triangulation_puzzle.signal_time})
                </div>
                <button onClick={verifyTriangulation} disabled={triangulationSolved} className="px-3 py-1.5 text-xs font-mono-tech uppercase bg-sky-600/25 border border-sky-400 text-sky-100 cursor-pointer flex items-center gap-1.5 disabled:opacity-40">
                  <Crosshair className="w-3.5 h-3.5" /> {triangulationSolved ? 'KİLİTLENDİ' : 'KONUMU KİLİTLE'}
                </button>
              </div>
              <div className="flex-1 bg-[#06090F] border border-slate-800 min-h-[340px]">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" onClick={handleRadarClick} className="w-full h-full cursor-crosshair">
                  {caseFile.triangulation_puzzle.towers.map((t, idx) => {
                    const col = ['#38BDF8', '#F59E0B', '#A855F7'][idx % 3];
                    return (
                      <g key={t.id}>
                        <circle cx={t.x} cy={t.y} r={t.radius} fill="none" stroke={col} strokeOpacity="0.6" strokeWidth="0.6" strokeDasharray="1.8 1.2" />
                        <circle cx={t.x} cy={t.y} r="1.4" fill={col} />
                        <text x={t.x + 2} y={t.y - 1.5} fill={col} fontSize="2.8" fontFamily="JetBrains Mono">{t.name}</text>
                      </g>
                    );
                  })}
                  <line x1={marker.x - 3} y1={marker.y} x2={marker.x + 3} y2={marker.y} stroke="#EF4444" strokeWidth="0.6" />
                  <line x1={marker.x} y1={marker.y - 3} x2={marker.x} y2={marker.y + 3} stroke="#EF4444" strokeWidth="0.6" />
                </svg>
              </div>
            </div>
            <div className="col-span-5 noir-panel p-5 space-y-4">
              <div className="text-xs font-mono-tech text-sky-400 uppercase">HTS BAZ ÜÇGENLEME</div>
              <p className="text-sm text-slate-300">3 çemberin tam kesiştiği noktaya tıkla ve konumu kilitle.</p>
              {htsMsg && <div className="p-3 border border-slate-700 bg-slate-900/70 text-xs font-mono-tech text-sky-200">{htsMsg}</div>}
            </div>
          </div>
        )}

        {subTab === 'autopsy' && (
          <div className="grid grid-cols-12 gap-5 h-full">
            <div className="col-span-7 noir-panel p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono-tech text-red-400 uppercase">ADLİ TIP ÖLÜM SAATİ</span>
                <button onClick={() => setEasyHint((v) => !v)} className="text-[11px] font-mono-tech text-amber-300 underline cursor-pointer">
                  {easyHint ? 'Formülü Gizle' : 'Formül İpucu'}
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs font-mono-tech">
                <div className="bg-slate-900 p-3 border border-slate-800"><span className="text-slate-500 block">BULUNMA</span><strong className="text-lg text-white">{caseFile.autopsy_puzzle.found_time_str}</strong></div>
                <div className="bg-slate-900 p-3 border border-slate-800"><span className="text-slate-500 block">ÇEKİRDEK ISI</span><strong className="text-lg text-sky-300">{caseFile.autopsy_puzzle.body_temp_c} °C</strong></div>
                <div className="bg-slate-900 p-3 border border-slate-800"><span className="text-slate-500 block">GECİKME</span><strong className="text-lg text-amber-300">+{caseFile.autopsy_puzzle.onset_delay_min} dk</strong></div>
              </div>
              <p className="text-xs text-slate-300 bg-[#0B0E14] p-4 border border-slate-800 leading-relaxed">{caseFile.autopsy_puzzle.forensic_notes}</p>
              {easyHint && (
                <div className="p-3 bg-amber-950/25 border border-amber-700/60 text-xs font-mono-tech text-amber-200 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  (37.2 - {caseFile.autopsy_puzzle.body_temp_c}) / 0.95 ≈ {((37.2 - caseFile.autopsy_puzzle.body_temp_c) / 0.95).toFixed(1)} saat önce ölüm.
                </div>
              )}
            </div>
            <div className="col-span-5 noir-panel p-5 space-y-4">
              <div className="p-4 bg-[#0B0E14] border border-slate-700 text-center">
                <div className="text-[10px] font-mono-tech text-slate-500">SEÇİLİ 30 DK PENCERE</div>
                <div className="text-2xl font-mono-tech font-bold text-red-400 mt-1">{formatMinutesFrom19(estStart)} — {formatMinutesFrom19(estStart + 30)}</div>
              </div>
              <input type="range" min={60} max={300} step={15} value={estStart} onChange={(e) => setEstStart(Number(e.target.value))} className="w-full accent-red-500 cursor-pointer" />
              <button onClick={verifyAutopsy} className="w-full py-2.5 bg-red-600/25 border border-red-500 text-red-100 font-mono-tech text-xs uppercase cursor-pointer">
                ÖLÜM PENCERESİNİ DOĞRULA
              </button>
              {autopsyMsg && <div className="p-3 border border-slate-700 bg-slate-900/70 text-xs font-mono-tech text-emerald-300">{autopsyMsg}</div>}
            </div>
          </div>
        )}

        {subTab === 'audio' && (
          <div className="grid grid-cols-12 gap-5 h-full">
            <div className="col-span-7 noir-panel p-5 space-y-4">
              <div className="flex justify-between text-xs font-mono-tech">
                <span className="text-sky-400">{caseFile.audio_puzzle.channel_name}</span>
                <span className={audioClarity >= 86 ? 'text-emerald-400 font-bold' : 'text-amber-300'}>NETLİK: %{audioClarity}</span>
              </div>
              {/* Simulated Live Waveform Visualizer */}
              <div className="h-32 bg-[#06090F] border border-slate-800 flex items-center justify-center gap-1 px-4">
                {Array.from({ length: 42 }).map((_, i) => {
                  const noise = (100 - audioClarity) * 0.65;
                  const clean = Math.abs(Math.sin(i * 0.45)) * 75;
                  const hPct = Math.min(95, Math.max(8, clean * (audioClarity / 100) + ((i * 37) % 100) * (noise / 100)));
                  return (
                    <div
                      key={i}
                      style={{ height: `${hPct}%` }}
                      className={`w-1.5 transition-all duration-150 ${audioClarity >= 86 ? 'bg-emerald-400' : 'bg-sky-500/60'}`}
                    />
                  );
                })}
              </div>

              <div className="space-y-3 text-xs font-mono-tech">
                <div>
                  <div className="flex justify-between mb-1"><span>BANDPASS FREKANS</span><span>{audioFreq * 40} Hz</span></div>
                  <input type="range" min={10} max={95} value={audioFreq} onChange={(e) => setAudioFreq(Number(e.target.value))} className="w-full accent-sky-400 cursor-pointer" />
                </div>
                <div>
                  <div className="flex justify-between mb-1"><span>PARAZİT EŞİĞİ (NOISE GATE)</span><span>-{audioThresh} dB</span></div>
                  <input type="range" min={10} max={95} value={audioThresh} onChange={(e) => setAudioThresh(Number(e.target.value))} className="w-full accent-purple-400 cursor-pointer" />
                </div>
              </div>

              <button onClick={lockAudio} disabled={audioSolved} className="w-full py-2.5 bg-sky-600/25 border border-sky-400 text-sky-100 font-mono-tech text-xs uppercase cursor-pointer disabled:opacity-40">
                {audioSolved ? 'SES KAYDI DEŞİFRE EDİLDİ' : 'NETLİK %86+ OLUNCA DEŞİFRE ET'}
              </button>
            </div>
            <div className="col-span-5 noir-panel p-5 space-y-3">
              <div className="text-xs font-mono-tech text-amber-400 uppercase">DEŞİFRE ÇIKTISI</div>
              {audioSolved ? (
                <div className="p-4 bg-emerald-950/25 border border-emerald-700 text-sm text-emerald-100 leading-relaxed">
                  {caseFile.audio_puzzle.clean_transcript}
                </div>
              ) : (
                <div className="p-4 bg-[#0A0D12] border border-slate-800 text-xs font-mono-tech text-slate-500">
                  {audioClarity > 60
                    ? '"...bu dos*** sabah vereme***... [PARAZİT] ..."'
                    : '[AĞIR STATİK PARAZİT — FREKANS VE EŞİK KAYDIRICILARINI AYARLA]'}
                </div>
              )}
            </div>
          </div>
        )}

        {subTab === 'cctv' && (
          <div className="grid grid-cols-12 gap-5 h-full">
            <div className="col-span-7 noir-panel p-5 space-y-4">
              <div className="flex justify-between text-xs font-mono-tech">
                <span className="text-red-400">{caseFile.cctv_puzzle.camera_label}</span>
                <span className="text-slate-300">KARE #{cctvFrame} / 100</span>
              </div>
              <div className="h-52 bg-[#05070B] border border-slate-800 relative flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `url('/assets/scenes/venue_${caseFile.venue_index}.jpg')`, backgroundSize: 'cover', filter: 'grayscale(100%) contrast(140%)' }} />
                {cctvDiff <= 5 ? (
                  <div className="relative z-10 px-4 py-2 border-2 border-red-500 bg-red-950/60 text-xs font-mono-tech text-red-200 animate-pulse">
                    HAREKET ANOMALİSİ TESPİT EDİLDİ ({caseFile.cctv_puzzle.anomaly_time})
                  </div>
                ) : (
                  <div className="relative z-10 text-xs font-mono-tech text-slate-500">
                    SİNYAL TEMİZ • HAREKET YOK ({cctvDiff < 15 ? 'YAKLAŞTIN...' : 'BOŞ KORİDOR'})
                  </div>
                )}
              </div>
              <input type="range" min={1} max={100} value={cctvFrame} onChange={(e) => setCctvFrame(Number(e.target.value))} className="w-full accent-red-500 cursor-pointer" />
              <button onClick={lockCctv} disabled={cctvSolved} className="w-full py-2.5 bg-red-600/25 border border-red-500 text-red-100 font-mono-tech text-xs uppercase cursor-pointer disabled:opacity-40">
                {cctvSolved ? 'ANOMALİ KARESİ KAYDEDİLDİ' : 'BU KAREYİ YAKALA VE DOĞRULA'}
              </button>
            </div>
            <div className="col-span-5 noir-panel p-5 space-y-3">
              <div className="text-xs font-mono-tech text-sky-400 uppercase">CCTV KARE RAPORU</div>
              {cctvSolved ? (
                <p className="text-sm text-emerald-200 bg-emerald-950/25 border border-emerald-700 p-4">{caseFile.cctv_puzzle.anomaly_desc}</p>
              ) : (
                <p className="text-xs text-slate-400 leading-relaxed">Zaman çubuğunu ileri-geri sararak koridorda hareket anomalisinin yakalandığı tam kareyi bul ve kilitle.</p>
              )}
            </div>
          </div>
        )}

        {subTab === 'chem' && (
          <div className="grid grid-cols-12 gap-5 h-full">
            <div className="col-span-5 noir-panel p-5 space-y-4">
              <div className="text-xs font-mono-tech text-purple-400 uppercase">BİLİNMEYEN NUMUNE SPEKTRUMU</div>
              <div className="text-xs text-slate-400 font-mono-tech">{caseFile.chem_puzzle.sample_label}</div>
              <div className="h-44 bg-[#06090F] border border-slate-800 p-4 flex items-end justify-around gap-2">
                {caseFile.chem_puzzle.unknown_bars.map((val, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <span className="text-[10px] font-mono-tech text-purple-300">{val}</span>
                    <div style={{ height: `${val}%` }} className="w-full bg-purple-500/70 border border-purple-300" />
                  </div>
                ))}
              </div>
              {chemErr && <div className="p-2.5 bg-red-950/40 border border-red-700 text-xs font-mono-tech text-red-300">{chemErr}</div>}
              {chemSolved && <div className="p-2.5 bg-emerald-950/30 border border-emerald-700 text-xs font-mono-tech text-emerald-300">SPEKTRUM EŞLEŞTİ — KİM-11 TAHTAYA EKLENDİ!</div>}
            </div>
            <div className="col-span-7 grid grid-cols-2 gap-3">
              {caseFile.chem_puzzle.compounds.map((c) => (
                <button
                  key={c.id}
                  onClick={() => checkChem(c.id)}
                  disabled={chemSolved}
                  className="noir-panel p-4 text-left hover:border-purple-400 transition cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-white mb-1">{c.name}</div>
                    <div className="text-[10px] font-mono-tech text-slate-400 mb-3">{c.effect}</div>
                  </div>
                  <div className="h-20 bg-[#06090F] border border-slate-800 p-2 flex items-end gap-1.5">
                    {c.bars.map((b, idx) => (
                      <div key={idx} style={{ height: `${b}%` }} className="flex-1 bg-sky-500/60" />
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {subTab === 'safe' && (
          <div className="grid grid-cols-12 gap-5 h-full">
            <div className="col-span-6 noir-panel p-6 flex flex-col items-center justify-center gap-5">
              <div className="text-xs font-mono-tech text-amber-400 uppercase tracking-widest">{caseFile.safe_puzzle.label}</div>
              <div className="grid grid-cols-3 gap-4 w-full max-w-sm">
                {[
                  { label: 'KADRAN 1', val: d1, set: setD1 },
                  { label: 'KADRAN 2', val: d2, set: setD2 },
                  { label: 'KADRAN 3', val: d3, set: setD3 },
                ].map((dial, i) => (
                  <div key={i} className="bg-[#080B10] border border-slate-700 p-3 text-center space-y-2">
                    <div className="text-[10px] font-mono-tech text-slate-400">{dial.label}</div>
                    <div className="text-2xl font-mono-tech font-bold text-amber-300">{String(dial.val).padStart(2, '0')}</div>
                    <input type="range" min={1} max={99} value={dial.val} onChange={(e) => dial.set(Number(e.target.value))} className="w-full accent-amber-400 cursor-pointer" />
                  </div>
                ))}
              </div>
              <button onClick={checkSafe} disabled={safeSolved} className="px-6 py-2.5 bg-amber-600/25 border border-amber-400 text-amber-100 font-mono-tech text-xs uppercase cursor-pointer disabled:opacity-40">
                {safeSolved ? 'KASA AÇILDI' : 'KASAYI AÇ'}
              </button>
              {safeMsg && <div className="p-3 bg-slate-900 border border-slate-700 text-xs font-mono-tech text-slate-200">{safeMsg}</div>}
            </div>
            <div className="col-span-6 noir-panel p-6 flex flex-col justify-center gap-3">
              <div className="text-xs font-mono-tech text-slate-400 uppercase">KASA KOMBİNASYON İPUCU</div>
              <p className="text-sm text-slate-300 leading-relaxed">{caseFile.safe_puzzle.hint_text}</p>
            </div>
          </div>
        )}

        {subTab === 'bodymap' && (
          <div className="grid grid-cols-12 gap-5 h-full">
            <div className="col-span-5 noir-panel p-5 flex flex-col items-center justify-center relative">
              <div className="text-xs font-mono-tech text-red-400 uppercase mb-3">{caseFile.body_map_puzzle.subject_label}</div>
              <div className="relative w-56 h-80 bg-[#06090F] border border-slate-800">
                <svg viewBox="0 0 100 140" className="w-full h-full">
                  <circle cx="50" cy="20" r="10" fill="none" stroke="#475569" strokeWidth="1.5" />
                  <path d="M35 34 L65 34 L68 78 L58 78 L58 130 L42 130 L42 78 L32 78 Z" fill="none" stroke="#475569" strokeWidth="1.5" />
                  <line x1="35" y1="36" x2="20" y2="75" stroke="#475569" strokeWidth="4" strokeLinecap="round" />
                  <line x1="65" y1="36" x2="80" y2="75" stroke="#475569" strokeWidth="4" strokeLinecap="round" />
                </svg>
                {caseFile.body_map_puzzle.zones.map((z) => {
                  const done = inspectedZones.has(z.id);
                  return (
                    <button
                      key={z.id}
                      onClick={() => {
                        sfx.click();
                        setSelectedZoneId(z.id);
                        setInspectedZones((prev) => new Set(prev).add(z.id));
                      }}
                      style={{ left: `${z.x}%`, top: `${z.y}%` }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 cursor-pointer transition ${
                        done ? 'bg-emerald-500/40 border-emerald-400' : 'bg-red-600/40 border-red-400 animate-pulse'
                      }`}
                      title={z.label}
                    />
                  );
                })}
              </div>
            </div>
            <div className="col-span-7 noir-panel p-6 space-y-4">
              <div className="text-xs font-mono-tech text-sky-400 uppercase">OTOPSİ BÖLGESEL MUAYENE BULGUSU</div>
              {selectedZoneId ? (
                (() => {
                  const z = caseFile.body_map_puzzle.zones.find((x) => x.id === selectedZoneId)!;
                  return (
                    <div className="p-4 bg-[#0A0D13] border-l-4 border-red-500 space-y-2">
                      <div className="text-sm font-bold text-white">{z.label}</div>
                      <p className="text-sm text-slate-300 leading-relaxed">{z.finding}</p>
                    </div>
                  );
                })()
              ) : (
                <p className="text-xs font-mono-tech text-slate-500">Diyagram üzerindeki kırmızı tarama noktalarına tıklayarak adli tıp bulgularını tek tek çıkar.</p>
              )}
            </div>
          </div>
        )}

        {subTab === 'compare' && (
          <div className="grid grid-cols-2 gap-5 h-full">
            {[
              { label: 'KANIT A', val: compareA, set: setCompareA, ev: evA },
              { label: 'KANIT B', val: compareB, set: setCompareB, ev: evB },
            ].map((slot, idx) => (
              <div key={idx} className="noir-panel p-5 flex flex-col gap-4">
                <div className="text-xs font-mono-tech text-amber-400 uppercase">{slot.label} — YAN YANA KIYASLAMA</div>
                <select
                  value={slot.val}
                  onChange={(e) => slot.set(e.target.value)}
                  className="bg-[#0A0D12] border border-slate-700 p-2.5 text-xs font-mono-tech text-white"
                >
                  <option value="">Delil seç...</option>
                  {discoveredList.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.code} — {e.title}
                    </option>
                  ))}
                </select>
                {slot.ev ? (
                  <div className="p-4 bg-[#0B0E14] border border-slate-800 space-y-2 flex-1">
                    <div className="flex justify-between text-[11px] font-mono-tech">
                      <span className="text-red-400 font-bold">{slot.ev.code}</span>
                      <span className="text-sky-300">{slot.ev.timestamp || 'ZAMAN BELİRSİZ'}</span>
                    </div>
                    <div className="text-sm font-bold text-white">{slot.ev.title}</div>
                    <p className="text-xs text-slate-300 leading-relaxed">{slot.ev.detail}</p>
                  </div>
                ) : (
                  <div className="flex-1 border border-dashed border-slate-800 flex items-center justify-center text-xs font-mono-tech text-slate-500">
                    Karşılaştırmak için yukarıdan delil seç
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {subTab === 'archive' && (
          <div className="grid grid-cols-3 gap-4">
            {caseFile.evidence.map((ev) => {
              const open = unlockedEvidence.has(ev.id);
              return (
                <div key={ev.id} className={`noir-panel p-4 border transition ${open ? 'border-slate-700/90' : 'border-slate-800/60 opacity-45'}`}>
                  <div className="flex items-center justify-between text-[11px] font-mono-tech mb-2">
                    <span className={open ? 'text-red-400 font-bold' : 'text-slate-500'}>{ev.code}</span>
                    <span className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 text-slate-400 uppercase text-[10px]">{open ? ev.category : 'KİLİTLİ'}</span>
                  </div>
                  <div className="text-sm font-semibold text-white mb-1">{open ? ev.title : 'Keşfedilmemiş Delil'}</div>
                  <p className="text-xs text-slate-300 leading-relaxed">{open ? ev.detail : `Kaynak: ${ev.unlock_source.toUpperCase()} üzerinden açılır.`}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
