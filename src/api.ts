import { invoke } from '@tauri-apps/api/core';
import type {
  AccusationResult,
  AccusationSubmission,
  AiInterrogateRequest,
  AiInterrogateResponse,
  CampaignChapter,
  CareerRecord,
  CareerStats,
  CaseFile,
  ConfrontationResult,
  DifficultyMode,
  OllamaStatus,
  PinVerifyResult,
  PresentResult,
} from './types';

export async function apiGetCampaign(): Promise<CampaignChapter[]> {
  return invoke<CampaignChapter[]>('get_campaign');
}

export async function apiNewCase(seed: string, difficulty: DifficultyMode = 'detective'): Promise<CaseFile> {
  return invoke<CaseFile>('new_case', { seed, difficulty });
}

export async function apiConfrontSuspects(
  seed: string,
  suspectAId: string,
  suspectBId: string
): Promise<ConfrontationResult> {
  return invoke<ConfrontationResult>('confront_suspects', { seed, suspectAId, suspectBId });
}

export async function apiPresentEvidence(
  seed: string,
  suspectId: string,
  statementId: string,
  evidenceId: string
): Promise<PresentResult> {
  return invoke<PresentResult>('present_evidence', {
    seed,
    suspectId,
    statementId,
    evidenceId,
  });
}

export async function apiVerifyPin(seed: string, pin: string): Promise<PinVerifyResult> {
  return invoke<PinVerifyResult>('verify_pin', { seed, pin });
}

export async function apiVerifySafe(seed: string, c1: number, c2: number, c3: number): Promise<PinVerifyResult> {
  return invoke<PinVerifyResult>('verify_safe', { seed, c1, c2, c3 });
}

export async function apiSubmitAccusation(submission: AccusationSubmission): Promise<AccusationResult> {
  return invoke<AccusationResult>('submit_accusation', { submission });
}

export async function apiGetOllamaStatus(endpointUrl: string): Promise<OllamaStatus> {
  return invoke<OllamaStatus>('get_ollama_status', { endpointUrl });
}

export async function apiAiInterrogate(request: AiInterrogateRequest): Promise<AiInterrogateResponse> {
  return invoke<AiInterrogateResponse>('ai_interrogate', { request });
}

// Local Detective Career & Campaign Persistence
const CAREER_KEY = 'dla_career_v1';
const CAMPAIGN_KEY = 'dla_campaign_solved_v2';

export function loadSolvedChapters(): number[] {
  try {
    const raw = localStorage.getItem(CAMPAIGN_KEY);
    if (raw) return JSON.parse(raw) as number[];
  } catch {}
  return [];
}

export function markChapterSolved(chapter: number): number[] {
  const cur = loadSolvedChapters();
  if (!cur.includes(chapter)) {
    const next = [...cur, chapter].sort((a, b) => a - b);
    try {
      localStorage.setItem(CAMPAIGN_KEY, JSON.stringify(next));
    } catch {}
    return next;
  }
  return cur;
}

export function loadCareer(): CareerStats {
  try {
    const raw = localStorage.getItem(CAREER_KEY);
    if (raw) return JSON.parse(raw) as CareerStats;
  } catch {}
  return { xp: 0, solvedCount: 0, attemptedCount: 0, perfectCount: 0, history: [] };
}

export function recordCareerCase(rec: CareerRecord): CareerStats {
  const stats = loadCareer();
  stats.attemptedCount += 1;
  if (rec.solved) {
    stats.solvedCount += 1;
    stats.perfectCount += rec.score === 4 ? 1 : 0;
    const bonus = rec.difficulty === 'homicide' ? 180 : rec.difficulty === 'timed' ? 150 : 100;
    stats.xp += bonus;
  } else {
    stats.xp += rec.score * 15;
  }
  stats.history = [rec, ...stats.history].slice(0, 30);
  try {
    localStorage.setItem(CAREER_KEY, JSON.stringify(stats));
  } catch {}
  return stats;
}

export function getDetectiveRank(xp: number): { title: string; nextXp: number } {
  if (xp >= 1200) return { title: 'CİNAYET BÜRO AMİRİ', nextXp: 2000 };
  if (xp >= 700) return { title: 'BAŞKOMİSER', nextXp: 1200 };
  if (xp >= 350) return { title: 'KOMİSER', nextXp: 700 };
  if (xp >= 120) return { title: 'KOMİSER YARDIMCISI', nextXp: 350 };
  return { title: 'STAJYER DEDEKTİF', nextXp: 120 };
}

// Procedural Noir Audio + Rain Ambience + Heartbeat Engine
class NoirSoundEngine {
  private ctx: AudioContext | null = null;
  private rainNode: AudioNode | null = null;
  private rainGain: GainNode | null = null;
  private droneTimer: number | null = null;
  public enabled = true;
  public ambientEnabled = false;
  public musicEnabled = false;

  public toggleNoirMusic(on: boolean) {
    this.musicEnabled = on;
    if (!on) {
      if (this.droneTimer !== null) {
        clearInterval(this.droneTimer);
        this.droneTimer = null;
      }
      return;
    }
    const ctx = this.ensure();
    if (!ctx || this.droneTimer !== null) return;
    // Dark minor Neo-Noir piano/pad chord cycle (Dm9 -> Bbmaj7 -> Gm7 -> A7)
    const chords = [
      [146.83, 220.0, 261.63, 329.63],
      [116.54, 174.61, 220.0, 293.66],
      [98.0, 146.83, 174.61, 233.08],
      [110.0, 164.81, 207.65, 261.63],
    ];
    let step = 0;
    const playChord = () => {
      if (!this.musicEnabled || !this.enabled) return;
      const c = this.ensure();
      if (!c) return;
      const notes = chords[step % chords.length];
      step++;
      const now = c.currentTime;
      notes.forEach((freq) => {
        const osc = c.createOscillator();
        const filter = c.createBiquadFilter();
        const gain = c.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        filter.type = 'lowpass';
        filter.frequency.value = 520;
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.018, now + 1.4);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 5.6);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(c.destination);
        osc.start(now);
        osc.stop(now + 5.8);
      });
    };
    playChord();
    this.droneTimer = window.setInterval(playChord, 5800);
  }

  private ensure(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public toggleAmbient(on: boolean) {
    this.ambientEnabled = on;
    if (!on) {
      if (this.rainGain && this.ctx) {
        this.rainGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.4);
      }
      setTimeout(() => {
        try {
          if (this.rainNode && 'stop' in this.rainNode) (this.rainNode as AudioBufferSourceNode).stop();
        } catch {}
        this.rainNode = null;
        this.rainGain = null;
      }, 450);
      return;
    }

    const ctx = this.ensure();
    if (!ctx || this.rainNode) return;
    // Generate smooth filtered pink-ish rain & night-city hum
    const bufferSize = ctx.sampleRate * 3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.029;
      b1 = 0.985 * b1 + white * 0.032;
      b2 = 0.950 * b2 + white * 0.048;
      data[i] = (b0 + b1 + b2) * 0.35;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 680;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.055, ctx.currentTime + 1.2);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start();
    this.rainNode = src;
    this.rainGain = gain;
  }

  public click() {
    const ctx = this.ensure();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(640, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(190, ctx.currentTime + 0.035);
    gain.gain.setValueAtTime(0.055, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.045);
  }

  public heartbeat() {
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    [0, 0.16].forEach((offset, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(idx === 0 ? 68 : 54, now + offset);
      osc.frequency.exponentialRampToValueAtTime(28, now + offset + 0.12);
      gain.gain.setValueAtTime(idx === 0 ? 0.12 : 0.08, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.15);
    });
  }

  public discover() {
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    [440, 660, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.06);
      gain.gain.setValueAtTime(0.065, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.24);
    });
  }

  public contradictionHit() {
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(170, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.36);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.42);
  }

  public error() {
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.setValueAtTime(108, now + 0.09);
    gain.gain.setValueAtTime(0.055, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.24);
  }
}

export const sfx = new NoirSoundEngine();
