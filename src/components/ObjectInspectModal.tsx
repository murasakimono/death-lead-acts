import React, { useState } from 'react';
import { RotateCw, X, CheckCircle2, Sparkles, FileText } from 'lucide-react';
import type { CaseFile, SceneHotspot } from '../types';
import { sfx } from '../api';

interface ObjectInspectModalProps {
  caseFile: CaseFile;
  hotspot: SceneHotspot;
  onClose: () => void;
}

export const ObjectInspectModal: React.FC<ObjectInspectModalProps> = ({
  caseFile,
  hotspot,
  onClose,
}) => {
  const [flipped, setFlipped] = useState(false);
  const [pickedFragments, setPickedFragments] = useState<number[]>([]);
  const props = caseFile.inspectable_props;

  const noteComplete = pickedFragments.length === props.torn_note_fragments.length;

  const pickFragment = (idx: number) => {
    if (pickedFragments.includes(idx)) return;
    sfx.click();
    setPickedFragments((prev) => [...prev, idx]);
  };

  return (
    <div className="fixed inset-0 bg-black/82 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="noir-panel w-full max-w-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-800 bg-[#0B0E14] flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono-tech text-amber-400 uppercase tracking-[0.22em]">
              YAKINLAŞTIRILMIŞ ADLİ İNCELEME
            </div>
            <div className="text-sm font-bold text-white">{hotspot.label}</div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {hotspot.inspect_kind === 'frame_flip' && (
            <div className="space-y-4">
              <div
                onClick={() => {
                  sfx.click();
                  setFlipped((f) => !f);
                }}
                className={`min-h-[220px] p-6 border-4 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center text-center ${
                  flipped
                    ? 'bg-[#1D1914] border-amber-800/80 text-amber-100 shadow-inner'
                    : 'bg-[#12161E] border-slate-600 text-slate-100'
                }`}
              >
                {!flipped ? (
                  <>
                    <div className="text-[10px] font-mono-tech text-slate-400 tracking-[0.25em] uppercase mb-2">
                      ÇERÇEVE — ÖN YÜZ
                    </div>
                    <div className="text-lg font-bold tracking-wide text-amber-200">
                      {props.frame_front_title}
                    </div>
                    <div className="text-xs font-mono-tech text-slate-300 mt-2">
                      {props.frame_front_subtitle}
                    </div>
                    <div className="mt-6 text-[11px] font-mono-tech text-sky-400 flex items-center gap-1.5">
                      <RotateCw className="w-3.5 h-3.5" /> ARKA YÜZE ÇEVİRMEK İÇİN TIKLA
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-[10px] font-mono-tech text-red-400 tracking-[0.25em] uppercase mb-3">
                      ARKA YÜZ — KURBANIN EL YAZISI NOTU
                    </div>
                    <pre className="font-mono-tech text-sm text-amber-200 whitespace-pre-wrap leading-relaxed">
                      {props.frame_back_handwriting}
                    </pre>
                  </>
                )}
              </div>

              <button
                onClick={() => {
                  sfx.click();
                  setFlipped((f) => !f);
                }}
                className="w-full py-2 bg-slate-900 border border-slate-700 hover:border-amber-400 text-xs font-mono-tech text-amber-200 uppercase flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
                {flipped ? 'ÖN YÜZE DÖN' : 'ÇERÇEVEYİ ARKA YÜZÜNE ÇEVİR'}
              </button>
            </div>
          )}

          {hotspot.inspect_kind === 'torn_note' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-300 flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                3 yırtık kâğıt parçasını sırayla seçip gizli notu birleştir:
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {props.torn_note_fragments.map((frag, idx) => {
                  const picked = pickedFragments.includes(idx);
                  return (
                    <button
                      key={idx}
                      onClick={() => pickFragment(idx)}
                      className={`p-3 border text-left text-xs font-mono-tech transition cursor-pointer ${
                        picked
                          ? 'bg-emerald-950/30 border-emerald-600 text-emerald-200'
                          : 'bg-[#171512] border-amber-800/60 text-amber-100 hover:border-amber-400'
                      }`}
                    >
                      <div className="text-[9px] text-slate-400 mb-1">PARÇA #{idx + 1}</div>
                      &ldquo;{frag}...&rdquo;
                    </button>
                  );
                })}
              </div>

              {noteComplete && (
                <div className="p-4 bg-emerald-950/25 border border-emerald-600 space-y-1.5">
                  <div className="text-[10px] font-mono-tech text-emerald-400 flex items-center gap-1.5 uppercase">
                    <CheckCircle2 className="w-3.5 h-3.5" /> YIRTIK NOT BİRLEŞTİRİLDİ
                  </div>
                  <p className="text-sm text-white leading-relaxed font-mono-tech">{props.torn_note_full}</p>
                </div>
              )}
            </div>
          )}

          {(hotspot.inspect_kind === 'uv_macro' || hotspot.inspect_kind === 'terminal') && (
            <div className="p-5 bg-[#080B10] border border-purple-700/60 space-y-3">
              <div className="text-xs font-mono-tech text-purple-300 flex items-center gap-2 uppercase">
                <Sparkles className="w-4 h-4" />
                {hotspot.uv_only ? 'UV 365nm MAKRO GÖRÜNTÜ' : 'DİJİTAL TERMİNAL DÖKÜMÜ'}
              </div>
              <p className="text-sm text-slate-200 leading-relaxed">{hotspot.inspect_text}</p>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-xs font-mono-tech uppercase text-white font-bold cursor-pointer"
            >
              İNCELEMEYİ KAPAT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
