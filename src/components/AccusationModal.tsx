import React, { useState } from 'react';
import { Gavel, X, CheckCircle2, XCircle, RotateCw } from 'lucide-react';
import { apiSubmitAccusation, sfx } from '../api';
import type { AccusationResult, CaseFile } from '../types';

interface AccusationModalProps {
  caseFile: CaseFile;
  unlockedEvidence: Set<string>;
  onClose: () => void;
  onStartNewRandomCase: () => void;
  onCaseFinished?: (result: AccusationResult) => void;
}

export const AccusationModal: React.FC<AccusationModalProps> = ({
  caseFile,
  unlockedEvidence,
  onClose,
  onStartNewRandomCase,
  onCaseFinished,
}) => {
  const [killerId, setKillerId] = useState(caseFile.suspects[0]?.id ?? '');
  const [methodEvId, setMethodEvId] = useState('');
  const [alibiEvId, setAlibiEvId] = useState('');
  const [motiveEvId, setMotiveEvId] = useState('');
  const [result, setResult] = useState<AccusationResult | null>(null);

  const discovered = caseFile.evidence.filter((e) => unlockedEvidence.has(e.id));

  const handleSubmit = async () => {
    if (!killerId || !methodEvId || !alibiEvId || !motiveEvId) return;
    const res = await apiSubmitAccusation({
      seed: caseFile.seed,
      killer_id: killerId,
      method_evidence_id: methodEvId,
      alibi_evidence_id: alibiEvId,
      motive_evidence_id: motiveEvId,
    });
    setResult(res);
    onCaseFinished?.(res);
    if (res.solved) sfx.discover();
    else sfx.error();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="noir-panel w-full max-w-3xl max-h-[90vh] overflow-y-auto border-red-900/60">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-[#0C0F15]">
          <div className="flex items-center gap-2.5">
            <Gavel className="w-5 h-5 text-red-500" />
            <div>
              <div className="text-[10px] font-mono-tech text-red-400 uppercase tracking-widest">
                ACT III // SAVCILIK İDDİANAMESİ
              </div>
              <div className="text-base font-bold text-white">4 KİLİTLİ SUÇLAMA FİNALİ</div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!result ? (
          <div className="p-6 space-y-5">
            <p className="text-xs text-slate-400 leading-relaxed">
              Rastgele isim seçmek yetmez. Davayı kapatmak için 4 kilidi de elindeki somut kanıtlarla mühürlemelisin.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-mono-tech text-red-400 uppercase mb-1.5">
                  1. KİLİT — GERÇEK FAİL
                </label>
                <select
                  value={killerId}
                  onChange={(e) => setKillerId(e.target.value)}
                  className="w-full bg-[#0A0D12] border border-slate-700 p-2.5 text-sm text-white"
                >
                  {caseFile.suspects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.role} • {s.handedness})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono-tech text-purple-400 uppercase mb-1.5">
                  2. KİLİT — YÖNTEM & ADLİ KANIT
                </label>
                <select
                  value={methodEvId}
                  onChange={(e) => setMethodEvId(e.target.value)}
                  className="w-full bg-[#0A0D12] border border-slate-700 p-2.5 text-sm text-white"
                >
                  <option value="">Kanıt seç...</option>
                  {discovered.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.code} — {e.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono-tech text-sky-400 uppercase mb-1.5">
                  3. KİLİT — ALİBİ ÇÖKERTEN ZAMAN DELİLİ
                </label>
                <select
                  value={alibiEvId}
                  onChange={(e) => setAlibiEvId(e.target.value)}
                  className="w-full bg-[#0A0D12] border border-slate-700 p-2.5 text-sm text-white"
                >
                  <option value="">Kanıt seç...</option>
                  {discovered.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.code} — {e.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono-tech text-amber-400 uppercase mb-1.5">
                  4. KİLİT — MOTİVASYON KANITI
                </label>
                <select
                  value={motiveEvId}
                  onChange={(e) => setMotiveEvId(e.target.value)}
                  className="w-full bg-[#0A0D12] border border-slate-700 p-2.5 text-sm text-white"
                >
                  <option value="">Kanıt seç...</option>
                  {discovered.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.code} — {e.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-900 border border-slate-700 text-xs font-mono-tech text-slate-300 cursor-pointer"
              >
                MASAYA DÖN
              </button>
              <button
                onClick={handleSubmit}
                disabled={!killerId || !methodEvId || !alibiEvId || !motiveEvId}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-xs font-mono-tech uppercase tracking-wider text-white font-bold cursor-pointer"
              >
                İDDİANAMEYİ MÜHÜRLE
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            <div className="flex items-center justify-between p-4 bg-[#0A0D12] border border-slate-800">
              <div>
                <div className="text-xs font-mono-tech text-slate-400">SONUÇ • {result.score}/4 KİLİT</div>
                <div className={`text-xl font-bold mt-1 ${result.solved ? 'text-emerald-400' : 'text-red-400'}`}>
                  {result.rank}
                </div>
              </div>
              <div className={`px-3 py-1.5 text-xs font-mono-tech font-bold noir-stamp ${result.solved ? '!border-emerald-500 !text-emerald-400' : ''}`}>
                {result.solved ? 'DAVA KAPANDI' : 'DAVA DÜŞTÜ'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {result.locks.map((lk, i) => (
                <div
                  key={i}
                  className={`p-3 border text-xs ${
                    lk.correct ? 'bg-emerald-950/20 border-emerald-800/70' : 'bg-red-950/20 border-red-800/70'
                  }`}
                >
                  <div className="flex items-center justify-between font-mono-tech mb-1">
                    <span className="text-slate-300">{lk.label}</span>
                    {lk.correct ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                  <div className="text-slate-400">Doğru Karşılık: <strong className="text-white">{lk.expected_hint}</strong></div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-[#0A0D12] border border-slate-800 space-y-2">
              <div className="text-xs font-mono-tech text-red-400 uppercase tracking-widest">
                O GECENİN GERÇEK KRONOLOJİSİ
              </div>
              <div className="text-xs text-slate-300">
                <strong>Fail:</strong> {result.killer_name} • <strong>Yöntem:</strong> {result.method_summary}
              </div>
              <div className="text-xs text-slate-300 pb-2 border-b border-slate-800">
                <strong>Motivasyon:</strong> {result.motive_summary}
              </div>
              <ul className="space-y-1.5 text-xs text-slate-200 font-mono-tech pt-1">
                {result.chronological_reveal.map((line, i) => (
                  <li key={i} className="leading-relaxed">
                    → {line}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-900 border border-slate-700 text-xs font-mono-tech text-slate-300 cursor-pointer"
              >
                DOSYAYI İNCELE
              </button>
              <button
                onClick={() => {
                  onClose();
                  onStartNewRandomCase();
                }}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 text-xs font-mono-tech uppercase text-white font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" /> YENİ VAKA BAŞLAT
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
