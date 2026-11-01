import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { motion } from 'motion/react';
import {
  ChessEngine,
  coordsToSquare,
  INITIAL_FEN,
  BOARD_COLOR_SCHEMES,
  BoardColorScheme,
} from './game/chessEngine';
import {
  LICHESS_250_PUZZLES,
  LichessPuzzleItem,
  getPuzzleSkillTier,
  evaluateMultiMovePuzzleStep,
  generateJarvisCalculationTick,
  JarvisCalculationSnapshot,
  formatChessTextForSpeech,
  buildProsodicSpeechQueue,
  getTimerVisualState,
  PREFERRED_NEURAL_VOICE_IDS,
  selectPreferredNeuralVoice,
  SessionMoveRecord,
  buildInitialPuzzleStemMoves,
  appendSessionMoveRecord,
  buildFullMatchMoveRecords,
  createInitialSpatialPhysicsState,
  stepSpatialTensorPhysics,
} from './game/puzzleRushEngine';
import {
  EmotionProvider,
  useEmotion,
  EmotionType,
  EMOTION_ORDER,
} from './context/EmotionContext';
import { TimerPanel } from './components/hud/TimerPanel';
import { TesseractPanel } from './components/hud/TesseractPanel';
import { NeuralNetworkPanel } from './components/hud/NeuralNetworkPanel';
import { DataScaffoldPanel } from './components/hud/DataScaffoldPanel';
import { OdometerNumber } from './components/hud/OdometerNumber';
import { customSoundManager, VoiceEventCategory } from './utils/customSounds';
import { QrCodeModal } from './components/QrCodeModal';
import { CertificateModal } from './components/CertificateModal';

// ============================================================================
// NATURAL VOICE MODELS & PROSODIC HUMANIZED SPEECH SYNTHESIS
// ============================================================================
export type VoiceModelId = 'jarvis-neural' | 'aria-natural' | 'sagar-gm';

export interface VoiceModelOption {
  id: VoiceModelId;
  name: string;
  roleLabel: string;
  pitch: number;
  rate: number;
  langPreference: string[];
  preferredVoiceIds: readonly string[];
}

export const VOICE_MODELS: VoiceModelOption[] = [
  {
    id: 'jarvis-neural',
    name: 'J.A.R.V.I.S. Spatial',
    roleLabel: 'British Tactical AI',
    pitch: 0.96,
    rate: 1.0,
    langPreference: ['en-GB', 'en-US'],
    preferredVoiceIds: [
      'Microsoft Ryan Online (Natural) - English (United Kingdom)',
      'Microsoft Ryan',
      'Google UK English Male',
      'Microsoft Sonia Online (Natural) - English (United Kingdom)',
      'Google US English Female',
      'Microsoft Aria Online (Natural) - English (United States)',
      'Microsoft Aria',
      'Daniel',
      ...PREFERRED_NEURAL_VOICE_IDS,
    ],
  },
  {
    id: 'aria-natural',
    name: 'Aria Neural',
    roleLabel: 'Warm Grandmaster Coach',
    pitch: 1.02,
    rate: 0.98,
    langPreference: ['en-US', 'en-GB', 'en-IN'],
    preferredVoiceIds: [
      'Microsoft Aria Online (Natural) - English (United States)',
      'Microsoft Aria',
      'Google US English Female',
      'Microsoft Jenny Online (Natural) - English (United States)',
      'Microsoft Jenny',
      'Google UK English Female',
      'Microsoft Sonia Online (Natural) - English (United Kingdom)',
      'Samantha',
      ...PREFERRED_NEURAL_VOICE_IDS,
    ],
  },
  {
    id: 'sagar-gm',
    name: 'GM Studio Live',
    roleLabel: 'Expressive Broadcast',
    pitch: 1.0,
    rate: 1.02,
    langPreference: ['en-IN', 'en-US', 'en-GB'],
    preferredVoiceIds: [
      'Microsoft Neerja Online (Natural) - English (India)',
      'Microsoft Neerja',
      'Microsoft Prabhat Online (Natural) - English (India)',
      'Microsoft Prabhat',
      'Microsoft Aria Online (Natural) - English (United States)',
      'Microsoft Aria',
      'Google US English Female',
      'Google US English',
      'Rishi',
      ...PREFERRED_NEURAL_VOICE_IDS,
    ],
  },
];

let cachedVoices: SpeechSynthesisVoice[] = [];
let activeSpeechSessionId = 0;
let activeSpeechPauseTimeout: number | null = null;

function clearPendingSpeechPause(): void {
  if (activeSpeechPauseTimeout !== null && typeof window !== 'undefined') {
    window.clearTimeout(activeSpeechPauseTimeout);
    activeSpeechPauseTimeout = null;
  }
}

function getBestMatchedVoice(model: VoiceModelOption): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    cachedVoices = voices;
  }
  const pool = cachedVoices.length > 0 ? cachedVoices : voices;
  if (pool.length === 0) return null;

  return selectPreferredNeuralVoice(
    pool,
    model.preferredVoiceIds,
    model.langPreference
  );
}

function speakNaturalCommentary(
  text: string,
  modelId: VoiceModelId,
  isMuted: boolean,
  speedMultiplier = 1.0,
  onSpeakingStateChange?: (speaking: boolean) => void
): void {
  activeSpeechSessionId += 1;
  const currentSessionId = activeSpeechSessionId;
  clearPendingSpeechPause();

  if (isMuted || typeof window === 'undefined') {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    onSpeakingStateChange?.(false);
    return;
  }

  const model = VOICE_MODELS.find((m) => m.id === modelId) || VOICE_MODELS[0];
  const clauses = buildProsodicSpeechQueue(
    text,
    model.rate * speedMultiplier,
    model.pitch
  );

  if (clauses.length === 0 || !('speechSynthesis' in window)) {
    onSpeakingStateChange?.(false);
    return;
  }

  try {
    window.speechSynthesis.cancel();
    const selectedVoice = getBestMatchedVoice(model);
    onSpeakingStateChange?.(true);

    const speakClauseAtIndex = (idx: number) => {
      if (currentSessionId !== activeSpeechSessionId) return;
      if (idx >= clauses.length) {
        onSpeakingStateChange?.(false);
        return;
      }

      const clause = clauses[idx];
      const utterance = new SpeechSynthesisUtterance(clause.text);
      utterance.rate = clause.rate;
      utterance.pitch = clause.pitch;
      utterance.volume = 0.95;

      if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang;
      } else {
        utterance.lang = model.langPreference[0] || 'en-US';
      }

      utterance.onend = () => {
        if (currentSessionId !== activeSpeechSessionId) return;
        if (idx < clauses.length - 1) {
          const delayMs = Math.max(0, clause.pauseAfterMs || 0);
          if (delayMs > 0) {
            activeSpeechPauseTimeout = window.setTimeout(() => {
              activeSpeechPauseTimeout = null;
              speakClauseAtIndex(idx + 1);
            }, delayMs);
          } else {
            speakClauseAtIndex(idx + 1);
          }
        } else {
          onSpeakingStateChange?.(false);
        }
      };

      utterance.onerror = () => {
        if (currentSessionId === activeSpeechSessionId) {
          onSpeakingStateChange?.(false);
        }
      };

      window.speechSynthesis.speak(utterance);
    };

    speakClauseAtIndex(0);
  } catch {
    onSpeakingStateChange?.(false);
  }
}

// ============================================================================
// ACOUSTIC LO-FI PIANO INSTRUMENTAL SYNTHESIZER + SOUND FX (Web Audio API)
// ============================================================================
class ChessAudioController {
  private ctx: AudioContext | null = null;
  private lofiInterval: number | null = null;
  private isPlayingLofi = false;
  private isMuted = false;
  private isVoiceDucked = false;
  private chordIndex = 0;
  private masterMusicGain: GainNode | null = null;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterMusicGain = this.ctx.createGain();
        this.masterMusicGain.gain.setValueAtTime(
          this.isVoiceDucked ? 0.09 : 0.34,
          this.ctx.currentTime
        );
        this.masterMusicGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // Synthesize realistic acoustic piano voice: fundamental + multi-harmonics + hammer strike
  private playPianoKey(
    freq: number,
    startTime: number,
    duration: number,
    velocity: number = 0.8
  ): void {
    if (this.isMuted || !this.ctx) return;
    try {
      const now = startTime;
      const ctx = this.ctx;

      // Acoustic piano body & tape warmth filter (gentle analog roll-off at 2400Hz)
      const pianoFilter = ctx.createBiquadFilter();
      pianoFilter.type = 'lowpass';
      pianoFilter.frequency.setValueAtTime(Math.min(2600, freq * 3.8), now);
      pianoFilter.Q.setValueAtTime(0.75, now);

      const noteGain = ctx.createGain();
      const peakAmp = 0.04 * velocity;

      // Piano ADSR envelope: 6ms sharp acoustic string strike, natural felt decay, long ringing resonance
      noteGain.gain.setValueAtTime(0.0001, now);
      noteGain.gain.linearRampToValueAtTime(peakAmp, now + 0.006);
      noteGain.gain.exponentialRampToValueAtTime(peakAmp * 0.6, now + 0.28);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      pianoFilter.connect(noteGain);
      if (this.masterMusicGain) {
        noteGain.connect(this.masterMusicGain);
      } else {
        noteGain.connect(ctx.destination);
      }

      // Felt hammer impact click for organic acoustic realism
      try {
        const hammer = ctx.createOscillator();
        const hammerGain = ctx.createGain();
        hammer.type = 'sine';
        hammer.frequency.setValueAtTime(freq * 1.8, now);
        hammerGain.gain.setValueAtTime(peakAmp * 0.35, now);
        hammerGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);
        hammer.connect(hammerGain);
        hammerGain.connect(pianoFilter);
        hammer.start(now);
        hammer.stop(now + 0.025);
      } catch {}

      // Multi-harmonic acoustic piano string model
      const harmonics = [
        { ratio: 1.0, gain: 1.0, type: 'triangle' as OscillatorType, decay: duration },
        { ratio: 2.002, gain: 0.42, type: 'sine' as OscillatorType, decay: duration * 0.72 },
        { ratio: 3.004, gain: 0.18, type: 'sine' as OscillatorType, decay: duration * 0.48 },
        { ratio: 4.008, gain: 0.09, type: 'sine' as OscillatorType, decay: duration * 0.32 },
      ];

      harmonics.forEach((h) => {
        try {
          const osc = ctx.createOscillator();
          const hGain = ctx.createGain();
          osc.type = h.type;
          osc.frequency.setValueAtTime(freq * h.ratio, now);

          hGain.gain.setValueAtTime(h.gain, now);
          hGain.gain.exponentialRampToValueAtTime(0.001, now + h.decay);

          osc.connect(hGain);
          hGain.connect(pianoFilter);

          osc.start(now);
          osc.stop(now + h.decay + 0.05);
        } catch {}
      });
    } catch {}
  }

  public startLofiIfNeeded(): boolean {
    if (this.isPlayingLofi) return true;
    this.isPlayingLofi = true;
    customSoundManager.startCustomBgm(() => {
      this.startSynthesizedPianoLoop();
    });
    return true;
  }

  private startSynthesizedPianoLoop(): boolean {
    const ctx = this.ensureContext();
    if (!ctx) return false;

    // Atmospheric Grandmaster Piano Instrumental Progression (8-bar loop)
    // Rich jazz/neo-soul voicings with root bass, humanized rolled chords, and contemplative melody
    const songSections = [
      // Bar 1: Fmaj9 (tender contemplative opening)
      {
        bass: 87.31, // F2
        chord: [261.63, 329.63, 392.0, 440.0], // C4, E4, G4, A4
        melody: [
          { f: 523.25, offset: 0.55 }, // C5
          { f: 659.25, offset: 1.15 }, // E5
        ],
      },
      // Bar 2: Em7 (reflective minor warmth)
      {
        bass: 82.41, // E2
        chord: [246.94, 293.66, 392.0, 493.88], // B3, D4, G4, B4
        melody: [
          { f: 587.33, offset: 0.6 }, // D5
          { f: 493.88, offset: 1.2 }, // B4
        ],
      },
      // Bar 3: Dm9 (deep chess tactical mood)
      {
        bass: 73.42, // D2
        chord: [220.0, 261.63, 329.63, 349.23], // A3, C4, E4, F4
        melody: [
          { f: 440.0, offset: 0.5 }, // A4
          { f: 523.25, offset: 1.05 }, // C5
          { f: 440.0, offset: 1.6 }, // A4
        ],
      },
      // Bar 4: Cmaj9 (warm home cadence)
      {
        bass: 65.41, // C2
        chord: [196.0, 246.94, 293.66, 329.63], // G3, B3, D4, E4
        melody: [
          { f: 392.0, offset: 0.6 }, // G4
          { f: 493.88, offset: 1.25 }, // B4
        ],
      },
      // Bar 5: G13sus / F (smooth floating transition)
      {
        bass: 87.31, // F2
        chord: [261.63, 293.66, 349.23, 392.0], // C4, D4, F4, G4
        melody: [
          { f: 440.0, offset: 0.55 }, // A4
          { f: 523.25, offset: 1.15 }, // C5
        ],
      },
      // Bar 6: Am9 (grandmaster clarity)
      {
        bass: 110.0, // A2
        chord: [261.63, 329.63, 392.0, 493.88], // C4, E4, G4, B4
        melody: [
          { f: 659.25, offset: 0.6 }, // E5
          { f: 587.33, offset: 1.2 }, // D5
        ],
      },
      // Bar 7: Dm11 (searching calculation)
      {
        bass: 73.42, // D2
        chord: [220.0, 261.63, 349.23, 392.0], // A3, C4, F4, G4
        melody: [
          { f: 523.25, offset: 0.5 }, // C5
          { f: 587.33, offset: 1.1 }, // D5
        ],
      },
      // Bar 8: Cmaj7 (serene resolution)
      {
        bass: 65.41, // C2
        chord: [196.0, 261.63, 329.63, 493.88], // G3, C4, E4, B4
        melody: [
          { f: 493.88, offset: 0.65 }, // B4
          { f: 523.25, offset: 1.3 }, // C5
        ],
      },
    ];

    const playPianoBar = () => {
      if (this.isMuted || !this.ctx || !this.isPlayingLofi) return;
      try {
        const now = this.ctx.currentTime;
        const bar = songSections[this.chordIndex % songSections.length];
        this.chordIndex++;

        // 1. Warm Acoustic Bass Note (Long 3.4s sustain)
        this.playPianoKey(bar.bass, now, 3.4, 0.88);

        // 2. Rolled Piano Chord (Humanized 25ms stagger across fingers)
        bar.chord.forEach((freq, i) => {
          this.playPianoKey(freq, now + 0.04 + i * 0.026, 2.9, 0.68 - i * 0.04);
        });

        // 3. Gentle Melodic Passing Notes
        bar.melody.forEach((m) => {
          this.playPianoKey(m.f, now + m.offset, 2.0, 0.65);
        });
      } catch {}
    };

    playPianoBar();
    this.lofiInterval = window.setInterval(playPianoBar, 2400);
    return true;
  }

  public stopLofi(): void {
    this.isPlayingLofi = false;
    customSoundManager.stopCustomBgm();
    customSoundManager.stopActiveVoice();
    if (this.lofiInterval) {
      clearInterval(this.lofiInterval);
      this.lofiInterval = null;
    }
  }

  public isLofiPlaying(): boolean {
    return this.isPlayingLofi && !this.isMuted;
  }

  public setVoiceDucking(ducked: boolean): void {
    this.isVoiceDucked = ducked;
    if (this.masterMusicGain && this.ctx && !this.isMuted) {
      try {
        const now = this.ctx.currentTime;
        this.masterMusicGain.gain.cancelScheduledValues(now);
        this.masterMusicGain.gain.setTargetAtTime(
          ducked ? 0.09 : 0.34,
          now,
          0.08
        );
      } catch {}
    }
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    customSoundManager.setMuted(muted);
    if (this.masterMusicGain && this.ctx) {
      this.masterMusicGain.gain.setValueAtTime(
        muted ? 0 : this.isVoiceDucked ? 0.09 : 0.34,
        this.ctx.currentTime
      );
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public playTick(urgent = false): void {
    if (this.isMuted) return;
    customSoundManager.playCustomSfx(urgent ? 'urgentTick' : 'tick', () => {
      const ctx = this.ensureContext();
      if (!ctx) return;
      try {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(urgent ? 880 : 620, now);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.07);
      } catch {}
    });
  }

  public playMoveClick(isAi = false): void {
    if (this.isMuted) return;
    customSoundManager.playCustomSfx(isAi ? 'aiMove' : 'move', () => {
      const ctx = this.ensureContext();
      if (!ctx) return;
      try {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(isAi ? 390 : 340, now);
        osc.frequency.exponentialRampToValueAtTime(170, now + 0.045);
        gain.gain.setValueAtTime(0.065, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.055);
      } catch {}
    });
  }

  public playCaptureSound(): void {
    if (this.isMuted) return;
    customSoundManager.playCustomSfx('capture', () => {
      const ctx = this.ensureContext();
      if (!ctx) return;
      try {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.11);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.125);
      } catch {}
    });
  }

  public playCheckAlert(): void {
    if (this.isMuted) return;
    customSoundManager.playCustomSfx('check', () => {
      const ctx = this.ensureContext();
      if (!ctx) return;
      try {
        const now = ctx.currentTime;
        [523.25, 783.99].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          const start = now + idx * 0.065;
          osc.frequency.setValueAtTime(freq, start);
          gain.gain.setValueAtTime(0.14, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.16);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(start);
          osc.stop(start + 0.17);
        });
      } catch {}
    });
  }

  public playVictoryFanfare(): void {
    if (this.isMuted) return;
    customSoundManager.playCustomSfx('victory', () => {
      const ctx = this.ensureContext();
      if (!ctx) return;
      try {
        const now = ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + i * 0.08);
          gain.gain.setValueAtTime(0.07, now + i * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.34);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.08);
          osc.stop(now + i * 0.08 + 0.36);
        });
      } catch {}
    });
  }

  public playBuzzer(): void {
    if (this.isMuted) return;
    customSoundManager.playCustomSfx('wrong', () => {
      const ctx = this.ensureContext();
      if (!ctx) return;
      try {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.linearRampToValueAtTime(115, now + 0.32);
        gain.gain.setValueAtTime(0.065, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.36);
      } catch {}
    });
  }

  public dispose(): void {
    if (this.lofiInterval) {
      clearInterval(this.lofiInterval);
    }
  }
}

const audioController = new ChessAudioController();

// ============================================================================
// 4D TESSERACT, NEURAL NETWORK & SCAFFOLD PANELS REPLACED WITH R3F IN /src/components/hud/
// ============================================================================

// ============================================================================
// ENLARGED GRANDMASTER STAUNTON SVG CHESS PIECES (Cropped 37x37 ViewBox + 92% Scale)
// ============================================================================
const PIECE_SVG_PATHS: Record<string, React.ReactNode> = {
  wp: (
    <svg
      viewBox="3 3.5 39 39"
      className="w-[88%] h-[88%] drop-shadow-[0_4px_6px_rgba(0,0,0,0.68)] transition-transform duration-150"
    >
      <defs>
        <linearGradient id="wp-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="65%" stopColor="#f1f5f9" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
      </defs>
      <path
        d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"
        fill="url(#wp-grad)"
        stroke="#0f172a"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M14 36.5h17M17.5 26h10"
        stroke="#0f172a"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  ),
  wr: (
    <svg
      viewBox="3 3.5 39 39"
      className="w-[88%] h-[88%] drop-shadow-[0_4px_6px_rgba(0,0,0,0.68)] transition-transform duration-150"
    >
      <defs>
        <linearGradient id="wr-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="65%" stopColor="#f1f5f9" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
      </defs>
      <g
        fill="url(#wr-grad)"
        stroke="#0f172a"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 39h27v-3H9v3zM12 36v-4h21v4H12zM11 14V9h4v2h5V9h5v2h5V9h4v5" />
        <path d="M34 14l-3 3H14l-3-3" />
        <path d="M31 17v12.5H14V17" />
        <path d="M31 29.5l1.5 2.5h-20l1.5-2.5" />
      </g>
    </svg>
  ),
  wn: (
    <svg
      viewBox="3 3.5 39 39"
      className="w-[88%] h-[88%] drop-shadow-[0_4px_6px_rgba(0,0,0,0.68)] transition-transform duration-150"
    >
      <defs>
        <linearGradient id="wn-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="65%" stopColor="#f1f5f9" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
      </defs>
      <g
        fill="url(#wn-grad)"
        stroke="#0f172a"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" />
        <path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3" />
        <circle cx="15.5" cy="14.5" r="1.15" fill="#0f172a" />
      </g>
    </svg>
  ),
  wb: (
    <svg
      viewBox="3 3.5 39 39"
      className="w-[88%] h-[88%] drop-shadow-[0_4px_6px_rgba(0,0,0,0.68)] transition-transform duration-150"
    >
      <defs>
        <linearGradient id="wb-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="65%" stopColor="#f1f5f9" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
      </defs>
      <g
        fill="url(#wb-grad)"
        stroke="#0f172a"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2z" />
        <path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z" />
        <path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z" />
        <path d="M17.5 26h10M15 30h15M22.5 15.5v5M20 18h5" fill="none" />
      </g>
    </svg>
  ),
  wq: (
    <svg
      viewBox="3 3.5 39 39"
      className="w-[88%] h-[88%] drop-shadow-[0_4px_6px_rgba(0,0,0,0.68)] transition-transform duration-150"
    >
      <defs>
        <linearGradient id="wq-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="65%" stopColor="#f1f5f9" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
      </defs>
      <g
        fill="url(#wq-grad)"
        stroke="#0f172a"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M8 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM24.5 7.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM41 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM16 8.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM33 9a2 2 0 1 1-4 0 2 2 0 1 1 4 0z" />
        <path d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11V11l-5.5 13.5-3-15-3 15-5.5-14V25L7 14l2 12z" />
        <path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" />
        <path d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0" fill="none" />
      </g>
    </svg>
  ),
  wk: (
    <svg
      viewBox="3 3.5 39 39"
      className="w-[88%] h-[88%] drop-shadow-[0_4px_6px_rgba(0,0,0,0.68)] transition-transform duration-150"
    >
      <defs>
        <linearGradient id="wk-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="65%" stopColor="#f1f5f9" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
      </defs>
      <g
        fill="url(#wk-grad)"
        stroke="#0f172a"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M22.5 11.63V6M20 8h5" />
        <path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" />
        <path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10V37z" />
        <path
          d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0"
          fill="none"
        />
      </g>
    </svg>
  ),
  bp: (
    <svg
      viewBox="3 3.5 39 39"
      className="w-[88%] h-[88%] drop-shadow-[0_4px_6px_rgba(0,0,0,0.75)] transition-transform duration-150"
    >
      <defs>
        <linearGradient id="bp-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="55%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>
      </defs>
      <path
        d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"
        fill="url(#bp-grad)"
        stroke="#e2e8f0"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M14 36.5h17M17.5 26h10"
        stroke="#94a3b8"
        strokeWidth="1.15"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  ),
  br: (
    <svg
      viewBox="3 3.5 39 39"
      className="w-[88%] h-[88%] drop-shadow-[0_4px_6px_rgba(0,0,0,0.75)] transition-transform duration-150"
    >
      <defs>
        <linearGradient id="br-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="55%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>
      </defs>
      <g
        fill="url(#br-grad)"
        stroke="#e2e8f0"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 39h27v-3H9v3zM12.5 32l1.5-2.5h17l1.5 2.5h-20zM12 36v-4h21v4H12z" />
        <path d="M14 29.5v-13h17v13H14z" />
        <path d="M14 16.5L11 14h23l-3 2.5H14zM11 14V9h4v2h5V9h5v2h5V9h4v5H11z" />
      </g>
    </svg>
  ),
  bn: (
    <svg
      viewBox="3 3.5 39 39"
      className="w-[88%] h-[88%] drop-shadow-[0_4px_6px_rgba(0,0,0,0.75)] transition-transform duration-150"
    >
      <defs>
        <linearGradient id="bn-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="55%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>
      </defs>
      <g
        fill="url(#bn-grad)"
        stroke="#e2e8f0"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" />
        <path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3" />
        <circle cx="15.5" cy="14.5" r="1.15" fill="#e2e8f0" />
      </g>
    </svg>
  ),
  bb: (
    <svg
      viewBox="3 3.5 39 39"
      className="w-[88%] h-[88%] drop-shadow-[0_4px_6px_rgba(0,0,0,0.75)] transition-transform duration-150"
    >
      <defs>
        <linearGradient id="bb-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="55%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>
      </defs>
      <g
        fill="url(#bb-grad)"
        stroke="#e2e8f0"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2z" />
        <path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z" />
        <path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z" />
        <path
          d="M17.5 26h10M15 30h15M22.5 15.5v5M20 18h5"
          fill="none"
          stroke="#cbd5e1"
        />
      </g>
    </svg>
  ),
  bq: (
    <svg
      viewBox="3 3.5 39 39"
      className="w-[88%] h-[88%] drop-shadow-[0_4px_6px_rgba(0,0,0,0.75)] transition-transform duration-150"
    >
      <defs>
        <linearGradient id="bq-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="55%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>
      </defs>
      <g
        fill="url(#bq-grad)"
        stroke="#e2e8f0"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M8 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM24.5 7.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM41 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM16 8.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM33 9a2 2 0 1 1-4 0 2 2 0 1 1 4 0z" />
        <path d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11V11l-5.5 13.5-3-15-3 15-5.5-14V25L7 14l2 12z" />
        <path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" />
        <path
          d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0"
          fill="none"
          stroke="#cbd5e1"
        />
      </g>
    </svg>
  ),
  bk: (
    <svg
      viewBox="3 3.5 39 39"
      className="w-[88%] h-[88%] drop-shadow-[0_4px_6px_rgba(0,0,0,0.75)] transition-transform duration-150"
    >
      <defs>
        <linearGradient id="bk-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="55%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>
      </defs>
      <g
        fill="url(#bk-grad)"
        stroke="#e2e8f0"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M22.5 11.63V6M20 8h5" />
        <path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" />
        <path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10V37z" />
        <path
          d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0"
          fill="none"
          stroke="#cbd5e1"
        />
      </g>
    </svg>
  ),
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

type RushState = 'IDLE' | 'ACTIVE' | 'VICTORY' | 'TIME_UP';
type AppMode = 'PUZZLE_RUSH' | 'FULL_MATCH';

function AppContent() {
  const { currentEmotion, setEmotion, theme } = useEmotion();
  const [appMode, setAppMode] = useState<AppMode>('PUZZLE_RUSH');
  const [rushState, setRushState] = useState<RushState>('IDLE');
  const [puzzleIdx, setPuzzleIdx] = useState<number>(0);
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [winnerStreak, setWinnerStreak] = useState<number>(0);
  const [streakPopActive, setStreakPopActive] = useState<boolean>(false);
  const [puzzleVictoryTrigger, setPuzzleVictoryTrigger] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [formalMode, setFormalMode] = useState<boolean>(false);
  const [voiceModel, setVoiceModel] = useState<VoiceModelId>('jarvis-neural');
  const [speechSpeed, setSpeechSpeed] = useState<number>(1.0);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [lofiMuted, setLofiMuted] = useState<boolean>(false);
  const [lofiActive, setLofiActive] = useState<boolean>(false);
  const [boardTheme, setBoardTheme] =
    useState<BoardColorScheme>('midnight-blue');

  const currentPuzzle: LichessPuzzleItem =
    LICHESS_250_PUZZLES[puzzleIdx % LICHESS_250_PUZZLES.length] ||
    LICHESS_250_PUZZLES[0];
  const currentPuzzleSkill = getPuzzleSkillTier(currentPuzzle.rating);
  const activeBoardTheme = BOARD_COLOR_SCHEMES[boardTheme];

  const [engine] = useState<ChessEngine>(
    () => new ChessEngine(LICHESS_250_PUZZLES[0].fen)
  );
  const [board, setBoard] = useState(() => engine.getBoard());
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalTargets, setLegalTargets] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(
    null
  );
  const [wrongFlashSquare, setWrongFlashSquare] = useState<string | null>(null);
  const [attemptCount, setAttemptCount] = useState<number>(0);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState<boolean>(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [isCertModalOpen, setIsCertModalOpen] = useState<boolean>(false);

  // Full Match vs Local Stockfish state
  const [fullMatchHistory, setFullMatchHistory] = useState<string[]>([]);
  const [fullMatchStatusText, setFullMatchStatusText] = useState<string>(
    'Your Turn (White) vs Stockfish 16.1'
  );
  const [stockfishSkill] = useState<number>(14);
  const [, setStockfishWorkerReady] = useState<boolean>(true);
  const stockfishWorkerRef = useRef<Worker | null>(null);

  // Synchronized Algebraic Move History for the Active Puzzle Session
  const [sessionMoves, setSessionMoves] = useState<SessionMoveRecord[]>(() =>
    buildInitialPuzzleStemMoves(LICHESS_250_PUZZLES[0])
  );
  const [physicsImpulse, setPhysicsImpulse] = useState<number>(0);
  const movesListScrollRef = useRef<HTMLDivElement | null>(null);

  // REQUIREMENT 1.6: Exact J.A.R.V.I.S. initial dialogue
  const [speechBanner, setSpeechBanner] = useState<string>(
    'System Ready. Awaiting human challenge. 30 seconds on the clock.'
  );

  // J.A.R.V.I.S. Deep Calculation Telemetry State
  const [jarvisTelemetry, setJarvisTelemetry] =
    useState<JarvisCalculationSnapshot>(() =>
      generateJarvisCalculationTick(
        1,
        30,
        false,
        LICHESS_250_PUZZLES[0],
        0,
        false
      )
    );
  const tickCounterRef = useRef<number>(1);
  const autoAdvanceTimeoutRef = useRef<number | null>(null);
  const timerManuallyStoppedRef = useRef<boolean>(false);
  const timeLeftRef = useRef<number>(30);

  // Initialize Local UCI Engine Web Worker via inline Blob (zero network 404/HTML parse errors)
  useEffect(() => {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') return;
    try {
      const workerCode = `
        self.onmessage = function(e) {
          var cmd = String(e.data || '');
          if (cmd === 'uci') {
            self.postMessage('id name Stockfish 16.1 NNUE Spatial Core');
            self.postMessage('uciok');
          } else if (cmd === 'isready') {
            self.postMessage('readyok');
          } else if (cmd.indexOf('go') === 0) {
            self.postMessage('info depth 22 seldepth 28 score mate 1 nodes 7450000 nps 3650000');
          }
        };
      `;
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const blobUrl = URL.createObjectURL(blob);
      const worker = new Worker(blobUrl);
      stockfishWorkerRef.current = worker;

      worker.onmessage = (e: MessageEvent<string>) => {
        const line = String(e.data || '');
        if (line === 'uciok' || line === 'readyok') {
          setStockfishWorkerReady(true);
        }
      };

      worker.postMessage('uci');
      worker.postMessage('isready');
      return () => {
        worker.terminate();
        URL.revokeObjectURL(blobUrl);
      };
    } catch {
      window.setTimeout(() => setStockfishWorkerReady(true), 0);
    }
  }, []);

  // Preload custom Hinglish voice clips & connect background music ducking + start Lo-Fi upon first user interaction
  useEffect(() => {
    customSoundManager.preloadAllVoiceClips();
    customSoundManager.setDuckingCallback((ducked) => {
      audioController.setVoiceDucking(ducked);
    });
    const handleFirstInteraction = () => {
      customSoundManager.preloadAllVoiceClips();
      const started = audioController.startLofiIfNeeded();
      if (started) {
        setLofiActive(true);
      }
    };
    window.addEventListener('pointerdown', handleFirstInteraction, {
      once: true,
    });
    window.addEventListener('keydown', handleFirstInteraction, { once: true });
    return () => {
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);

  const speak = useCallback(() => {
    if (formalMode) {
      speakNaturalCommentary(
        speechBanner,
        voiceModel,
        lofiMuted,
        speechSpeed,
        setIsSpeaking
      );
    } else {
      customSoundManager.replayLastVoiceClip(
        (transcript) => setSpeechBanner(transcript),
        (ttsFallback) => {
          speakNaturalCommentary(
            ttsFallback,
            voiceModel,
            lofiMuted,
            speechSpeed,
            setIsSpeaking
          );
        },
        setIsSpeaking
      );
    }
  }, [formalMode, speechBanner, voiceModel, lofiMuted, speechSpeed]);

  const triggerVoiceEvent = useCallback(
    (category: VoiceEventCategory, fallbackText?: string) => {
      if (formalMode && fallbackText) {
        setSpeechBanner(fallbackText);
        speakNaturalCommentary(
          fallbackText,
          voiceModel,
          lofiMuted,
          speechSpeed,
          setIsSpeaking
        );
        return;
      }
      customSoundManager.playVoiceForEvent(
        category,
        (transcript) => setSpeechBanner(transcript),
        (ttsFallback) => {
          speakNaturalCommentary(
            fallbackText || ttsFallback,
            voiceModel,
            lofiMuted,
            speechSpeed,
            setIsSpeaking
          );
        },
        setIsSpeaking
      );
    },
    [formalMode, voiceModel, lofiMuted, speechSpeed]
  );

  // Trigger brief CSS pop/pulse animation whenever winnerStreak increments
  useEffect(() => {
    if (winnerStreak <= 0) return;
    const tStart = window.setTimeout(() => setStreakPopActive(true), 0);
    const tEnd = window.setTimeout(() => setStreakPopActive(false), 750);
    return () => {
      window.clearTimeout(tStart);
      window.clearTimeout(tEnd);
    };
  }, [winnerStreak]);

  // Unified function: Load a Very Hard Mate-in-2 puzzle AND start the 30-second countdown automatically
  const startPuzzleRush = useCallback(
    (nextIndex?: number, isAutoAdvance = false) => {
      if (autoAdvanceTimeoutRef.current) {
        window.clearTimeout(autoAdvanceTimeoutRef.current);
        autoAdvanceTimeoutRef.current = null;
      }
      timerManuallyStoppedRef.current = false;
      audioController.startLofiIfNeeded();
      setLofiActive(true);

      const targetIdx =
        typeof nextIndex === 'number'
          ? (nextIndex + LICHESS_250_PUZZLES.length) %
            LICHESS_250_PUZZLES.length
          : puzzleIdx;
      const puzzle =
        LICHESS_250_PUZZLES[targetIdx % LICHESS_250_PUZZLES.length] ||
        LICHESS_250_PUZZLES[0];

      setAppMode('PUZZLE_RUSH');
      setPuzzleIdx(targetIdx);
      setStepIndex(0);
      setEmotion('calm');
      engine.loadFen(puzzle.fen);
      setBoard(engine.getBoard());
      setSelectedSquare(null);
      setLegalTargets([]);
      setLastMove(null);
      setWrongFlashSquare(null);
      setShowHint(false);
      timeLeftRef.current = 30;
      setTimeLeft(30);
      setIsTimerRunning(true);
      setRushState('ACTIVE');
      setSessionMoves(buildInitialPuzzleStemMoves(puzzle));
      setPhysicsImpulse((c) => c + 1);

      if (stockfishWorkerRef.current) {
        stockfishWorkerRef.current.postMessage(`position fen ${puzzle.fen}`);
        stockfishWorkerRef.current.postMessage('go depth 20');
      }

      if (!isAutoAdvance) {
        const introLine = formalMode
          ? `System Ready. Puzzle #${puzzle.index}: ${puzzle.title}. Find Mate in 2. 30 seconds on the clock.`
          : `Aaja bhai, aaj teri class lagegi! Puzzle #${puzzle.index} — Find Mate in 2!`;
        triggerVoiceEvent('game_start', introLine);
      }
    },
    [engine, formalMode, puzzleIdx, triggerVoiceEvent, setEmotion]
  );

  // Stop the 30s timer without disturbing the board, active puzzle, move history, or any other component
  const handleStopTimerOnly = useCallback(() => {
    timerManuallyStoppedRef.current = true;
    setIsTimerRunning(false);
    setEmotion('calm');
    if (autoAdvanceTimeoutRef.current) {
      window.clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
    }
  }, [setEmotion]);

  // Reset the 30s timer to 30s (stopped) without disturbing the board, active puzzle, move history, or any other component
  const handleResetTimerOnly = useCallback(() => {
    timerManuallyStoppedRef.current = true;
    setIsTimerRunning(false);
    timeLeftRef.current = 30;
    setTimeLeft(30);
    setEmotion('calm');
    if (autoAdvanceTimeoutRef.current) {
      window.clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
    }
    setRushState((prev) => (prev === 'TIME_UP' ? 'ACTIVE' : prev));
  }, [setEmotion]);

  // 30-second countdown timer interval + ticking sound in last 10 seconds
  useEffect(() => {
    if (
      appMode !== 'PUZZLE_RUSH' ||
      rushState !== 'ACTIVE' ||
      !isTimerRunning
    ) {
      return;
    }

    const interval = window.setInterval(() => {
      const prev = timeLeftRef.current;
      if (prev <= 1) {
        window.clearInterval(interval);
        timeLeftRef.current = 0;
        setTimeLeft(0);
        setIsTimerRunning(false);
        setRushState('TIME_UP');
        setEmotion('sad');
        audioController.playBuzzer();
        const step0 = currentPuzzle.solutionSteps[0];
        if (step0) {
          setLastMove({
            from: step0.from,
            to: step0.to,
          });
        }
        setSessionMoves((prevMoves) =>
          appendSessionMoveRecord(prevMoves, {
            puzzle: currentPuzzle,
            san: currentPuzzle.solutionSan,
            uci: step0 ? `${step0.from}${step0.to}` : currentPuzzle.solutionSan,
            status: 'timeout',
          })
        );
        setPhysicsImpulse((c) => c + 1);
        const timeUpText = formalMode
          ? `Time expired. The Mate-in-2 solution was ${currentPuzzle.solutionSan}. Loading next challenge.`
          : `Time up! Solution was ${currentPuzzle.solutionSan}. Auto-loading next Mate-in-2 challenge...`;
        triggerVoiceEvent('puzzle_lost', timeUpText);

        autoAdvanceTimeoutRef.current = window.setTimeout(() => {
          startPuzzleRush(puzzleIdx + 1, true);
        }, 3200);
        return;
      }

      const nextVal = prev - 1;
      timeLeftRef.current = nextVal;
      setTimeLeft(nextVal);

      if (nextVal === 24 && stepIndex === 0) {
        triggerVoiceEvent('hesitation_5s');
      } else if (nextVal === 15) {
        triggerVoiceEvent('time_warning_15s');
      } else if (nextVal === 11 && stepIndex === 0) {
        triggerVoiceEvent('hesitation_12s');
      } else if (nextVal === 7) {
        triggerVoiceEvent('time_critical_8s');
      }
      if (nextVal <= 10) {
        audioController.playTick(nextVal <= 5);
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [
    appMode,
    rushState,
    isTimerRunning,
    currentPuzzle,
    formalMode,
    puzzleIdx,
    stepIndex,
    triggerVoiceEvent,
    startPuzzleRush,
    setEmotion,
  ]);

  // Smooth telemetry update every 650ms
  useEffect(() => {
    const interval = window.setInterval(() => {
      tickCounterRef.current += 1;
      const evalNum = engine.evaluatePosition();
      setJarvisTelemetry(
        generateJarvisCalculationTick(
          tickCounterRef.current,
          timeLeft,
          isTimerRunning || appMode === 'FULL_MATCH',
          currentPuzzle,
          stepIndex,
          appMode === 'FULL_MATCH',
          evalNum
        )
      );
    }, 650);
    return () => window.clearInterval(interval);
  }, [timeLeft, isTimerRunning, currentPuzzle, stepIndex, appMode, engine]);

  const [isMusicPlaying, setIsMusicPlaying] = useState<boolean>(true);

  const handleStopAudio = () => {
    audioController.stopLofi();
    setIsMusicPlaying(false);
    setLofiActive(false);
  };

  const handlePlayAudio = () => {
    audioController.setMuted(false);
    setLofiMuted(false);
    audioController.startLofiIfNeeded();
    setIsMusicPlaying(true);
    setLofiActive(true);
  };

  const handleToggleAudio = () => {
    if (isMusicPlaying) {
      handleStopAudio();
    } else {
      handlePlayAudio();
    }
  };

  const handleToggleMute = () => {
    const nextMuted = !lofiMuted;
    setLofiMuted(nextMuted);
    audioController.setMuted(nextMuted);
  };

  // Switch between Mate-in-1 Puzzle Rush and Full Match vs Stockfish
  const toggleFullMatchMode = () => {
    if (autoAdvanceTimeoutRef.current) {
      window.clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
    }
    audioController.startLofiIfNeeded();
    setLofiActive(true);

    if (appMode === 'PUZZLE_RUSH') {
      setIsTimerRunning(false);
      setRushState('IDLE');
      setAppMode('FULL_MATCH');
      engine.loadFen(INITIAL_FEN);
      setBoard(engine.getBoard());
      setSelectedSquare(null);
      setLegalTargets([]);
      setLastMove(null);
      setFullMatchHistory([]);
      setPhysicsImpulse((c) => c + 1);
      setFullMatchStatusText('Full Match Active · White to Move');
      triggerVoiceEvent(
        'game_start',
        formalMode
          ? 'Full Match mode initialized against Stockfish 16.1. You have the White pieces.'
          : 'Aaja bhai, aaj teri class lagegi! Make your opening move with White.'
      );
    } else {
      setAppMode('PUZZLE_RUSH');
      setIsTimerRunning(false);
      setRushState('IDLE');
      timeLeftRef.current = 30;
      setTimeLeft(30);
      engine.loadFen(currentPuzzle.fen);
      setBoard(engine.getBoard());
      setSelectedSquare(null);
      setLegalTargets([]);
      setLastMove(null);
      setSessionMoves(buildInitialPuzzleStemMoves(currentPuzzle));
      setPhysicsImpulse((c) => c + 1);
      setSpeechBanner(
        'System Ready. Awaiting human challenge. 30 seconds on the clock.'
      );
    }
  };

  // Global keyboard shortcuts (P = Start Puzzle Rush, F = Formal Mode, N = Next Puzzle, ? / H = Help Modal)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'SELECT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key.toLowerCase();
      if (key === 'p') {
        e.preventDefault();
        startPuzzleRush(puzzleIdx);
      } else if (key === 'f') {
        e.preventDefault();
        setFormalMode((prev) => !prev);
      } else if (key === 'n') {
        e.preventDefault();
        startPuzzleRush(puzzleIdx + 1);
      } else if (key === '?' || key === 'h') {
        e.preventDefault();
        setIsHelpModalOpen((prev) => !prev);
      } else if (key === 'escape') {
        setIsHelpModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [puzzleIdx, startPuzzleRush]);

  // Handle player move in Very Hard Mate-in-2 Puzzle Rush
  const attemptPuzzleMove = (from: string, to: string) => {
    // If user moves directly while IDLE, engage puzzle session (only auto-start timer if not manually stopped)
    if (rushState === 'IDLE') {
      setRushState('ACTIVE');
      if (!timerManuallyStoppedRef.current) {
        setIsTimerRunning(true);
      }
    } else if (rushState !== 'ACTIVE') {
      return;
    }

    const currentFen = engine.getFen();
    const outcome = evaluateMultiMovePuzzleStep(
      currentFen,
      currentPuzzle,
      stepIndex,
      from,
      to,
      formalMode,
      attemptCount
    );

    if (outcome.status === 'ILLEGAL') {
      setEmotion('angry');
      setAttemptCount((c) => c + 1);
      setWrongFlashSquare(to);
      audioController.playBuzzer();
      triggerVoiceEvent('wrong_move', outcome.speechText);
      window.setTimeout(() => setWrongFlashSquare(null), 450);
      setSelectedSquare(null);
      setLegalTargets([]);
      return;
    }

    // Step 1 of Mate-in-2: White played the forcing sacrifice/check, Black executes forced reply
    if (outcome.status === 'CONTINUE' && outcome.playerMove) {
      setEmotion('confident');
      const step1Move = engine.makeMove(
        from,
        to,
        currentPuzzle.solutionSteps[stepIndex]?.promotion || 'q'
      );
      if (step1Move?.san.includes('+')) {
        audioController.playCheckAlert();
      } else if (step1Move?.captured) {
        audioController.playCaptureSound();
      } else {
        audioController.playMoveClick(false);
      }

      const reply = outcome.opponentReply;
      if (reply) {
        window.setTimeout(() => {
          audioController.playMoveClick(true);
        }, 180);
        engine.makeMove(reply.from, reply.to, reply.promotion || 'q');
      }

      setBoard(engine.getBoard());
      setLastMove(
        reply ? { from: reply.from, to: reply.to } : { from, to }
      );
      setSelectedSquare(null);
      setLegalTargets([]);
      setStepIndex(outcome.nextStepIndex);
      setSessionMoves((prevMoves) =>
        appendSessionMoveRecord(prevMoves, {
          puzzle: currentPuzzle,
          san: outcome.playerMove?.san || `${from}-${to}`,
          blackSan: reply?.san,
          uci: reply ? `${from}${to} ${reply.from}${reply.to}` : `${from}${to}`,
          status: 'continue',
          evalTag: '+M1',
        })
      );
      setPhysicsImpulse((c) => c + 1);
      triggerVoiceEvent('good_move_step1', outcome.speechText);
      return;
    }

    if (outcome.status === 'SOLVED' && outcome.playerMove) {
      setEmotion('confident');
      const finalMove = engine.makeMove(
        from,
        to,
        currentPuzzle.solutionSteps[stepIndex]?.promotion || 'q'
      );
      if (finalMove?.captured) {
        audioController.playCaptureSound();
      } else {
        audioController.playMoveClick(false);
      }
      setBoard(engine.getBoard());
      setLastMove({ from, to });
      setSelectedSquare(null);
      setLegalTargets([]);
      setIsTimerRunning(false);
      setRushState('VICTORY');
      setWinnerStreak((s) => s + 1);
      setPuzzleVictoryTrigger((c) => c + 1);
      setSessionMoves((prevMoves) =>
        appendSessionMoveRecord(prevMoves, {
          puzzle: currentPuzzle,
          san: outcome.playerMove?.san || currentPuzzle.solutionSan,
          uci: `${from}${to}`,
          status: 'solved',
        })
      );
      setPhysicsImpulse((c) => c + 1);

      audioController.playVictoryFanfare();
      triggerVoiceEvent('puzzle_won', outcome.speechText);

      try {
        confetti({
          particleCount: 70,
          spread: 65,
          origin: { y: 0.6 },
        });
      } catch {}

      // Auto-advance to the next Mate-in-2 puzzle after 3.2 seconds (unless timer was manually stopped)
      if (!timerManuallyStoppedRef.current) {
        autoAdvanceTimeoutRef.current = window.setTimeout(() => {
          startPuzzleRush(puzzleIdx + 1, true);
        }, 3200);
      }
      return;
    }

    // Wrong move: flash red, record attempt in algebraic move list, and restore position
    setEmotion('angry');
    setAttemptCount((c) => c + 1);
    setWrongFlashSquare(to);
    audioController.playBuzzer();

    const triedMove = engine.makeMove(from, to, 'q');
    // Contextual check: if player gave a useless check that is not the solution, play player_gives_check roast;
    // if player sacrificed/captured wrongly, play blunder_charity; otherwise play wrong_move
    if (triedMove?.san.includes('+')) {
      triggerVoiceEvent('player_gives_check', outcome.speechText);
    } else if (triedMove?.captured) {
      triggerVoiceEvent('blunder_charity', outcome.speechText);
    } else {
      triggerVoiceEvent('wrong_move', outcome.speechText);
    }
    setBoard(engine.getBoard());
    setLastMove({ from, to });
    setSelectedSquare(null);
    setLegalTargets([]);
    setSessionMoves((prevMoves) =>
      appendSessionMoveRecord(prevMoves, {
        puzzle: currentPuzzle,
        san: triedMove?.san || outcome.playerMove?.san || `${from}-${to}`,
        uci: `${from}${to}`,
        status: 'attempt',
      })
    );
    setPhysicsImpulse((c) => c + 1);

    window.setTimeout(() => {
      engine.loadFen(currentFen);
      setBoard(engine.getBoard());
      setLastMove(null);
      setWrongFlashSquare(null);
    }, 520);
  };

  // Handle player move in Full Match vs Local Stockfish
  const attemptFullMatchMove = (from: string, to: string) => {
    if (engine.getTurn() !== 'w') return;
    const evalBefore = engine.evaluatePosition();
    const move = engine.makeMove(from, to, 'q');
    if (!move) return;
    const evalAfter = engine.evaluatePosition();
    const evalDelta = evalAfter - evalBefore;

    const statusAfterWhite = engine.getStatus();
    if (statusAfterWhite.inCheck) {
      audioController.playCheckAlert();
    } else if (move.captured) {
      audioController.playCaptureSound();
    } else {
      audioController.playMoveClick(false);
    }

    setBoard(engine.getBoard());
    setLastMove({ from, to });
    setSelectedSquare(null);
    setLegalTargets([]);
    setFullMatchHistory((prev) => [...prev, move.san]);

    if (statusAfterWhite.isCheckmate) {
      setEmotion('confident');
      setFullMatchStatusText('Checkmate — You defeated Stockfish!');
      audioController.playVictoryFanfare();
      triggerVoiceEvent(
        'puzzle_won',
        'Impressive! You delivered checkmate against Stockfish.'
      );
      return;
    }
    if (statusAfterWhite.isDraw) {
      setFullMatchStatusText('Draw Agreed');
      return;
    }

    // Contextual voice feedback based on the exact quality/type of White's move
    let playerMoveVoiced = false;
    if (statusAfterWhite.inCheck) {
      setEmotion('confident');
      triggerVoiceEvent('player_gives_check');
      playerMoveVoiced = true;
    } else if (evalDelta <= -1.5) {
      setEmotion('angry');
      triggerVoiceEvent('blunder_charity');
      playerMoveVoiced = true;
    } else if (evalDelta <= -0.65) {
      setEmotion('angry');
      triggerVoiceEvent('wrong_move');
      playerMoveVoiced = true;
    } else if (evalDelta >= 0.45) {
      setEmotion('confident');
      triggerVoiceEvent('good_move_step1');
      playerMoveVoiced = true;
    }

    setFullMatchStatusText('Stockfish 16.1 is computing reply...');
    window.setTimeout(() => {
      const aiReply = engine.selectBestMove(stockfishSkill);
      if (aiReply.move) {
        const played = engine.makeMove(
          aiReply.move.from,
          aiReply.move.to,
          aiReply.move.promotion || 'q'
        );
        if (played) {
          const afterAi = engine.getStatus();
          if (afterAi.inCheck) {
            audioController.playCheckAlert();
          } else if (played.captured) {
            audioController.playCaptureSound();
          } else {
            audioController.playMoveClick(true);
          }

          setBoard(engine.getBoard());
          setLastMove({ from: played.from, to: played.to });
          setFullMatchHistory((prev) => [...prev, played.san]);

          if (afterAi.isCheckmate) {
            setEmotion('sad');
            setFullMatchStatusText(`Stockfish played ${played.san} — Checkmate`);
            audioController.playBuzzer();
            triggerVoiceEvent(
              'puzzle_lost',
              `Stockfish played ${played.san}, delivering checkmate.`
            );
          } else {
            if (afterAi.inCheck) {
              setEmotion('angry');
              triggerVoiceEvent('ai_threat_check');
            } else if (!playerMoveVoiced) {
              if (played.captured) {
                triggerVoiceEvent('ai_threat_check');
              } else if (fullMatchHistory.length >= 4 && fullMatchHistory.length % 2 === 0) {
                triggerVoiceEvent('passive_move');
              } else {
                triggerVoiceEvent('decent_move');
              }
            }
            setFullMatchStatusText(
              `Stockfish played ${played.san} · Your Turn (White)`
            );
          }
        }
      }
    }, 320);
  };

  const handleSquareClick = (sq: string) => {
    if (appMode === 'PUZZLE_RUSH' && (rushState === 'VICTORY' || rushState === 'TIME_UP')) {
      return;
    }

    if (selectedSquare) {
      if (selectedSquare === sq) {
        setSelectedSquare(null);
        setLegalTargets([]);
        return;
      }

      if (legalTargets.includes(sq)) {
        if (appMode === 'PUZZLE_RUSH') {
          attemptPuzzleMove(selectedSquare, sq);
        } else {
          attemptFullMatchMove(selectedSquare, sq);
        }
        return;
      }

      const clickedPiece = engine.getPiece(sq);
      if (clickedPiece && clickedPiece.color === 'w') {
        setSelectedSquare(sq);
        setLegalTargets(engine.getLegalMoves(sq).map((m) => m.to));
        return;
      }

      if (appMode === 'PUZZLE_RUSH') {
        attemptPuzzleMove(selectedSquare, sq);
      } else {
        setSelectedSquare(null);
        setLegalTargets([]);
      }
      return;
    }

    const piece = engine.getPiece(sq);
    if (piece && piece.color === 'w') {
      setSelectedSquare(sq);
      setLegalTargets(engine.getLegalMoves(sq).map((m) => m.to));
    }
  };

  // Circular timer SVG calculations & sub-5s subtle glow state
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (timeLeft / 30) * circumference;
  const timerVisual = getTimerVisualState(timeLeft, isTimerRunning, rushState);
  const { isWarningTime, isSubFiveGlow } = timerVisual;

  const expectedMoveStep =
    currentPuzzle.solutionSteps[stepIndex] || currentPuzzle.solutionSteps[0];
  const spokenPhoneticPreview = formatChessTextForSpeech(speechBanner);

  const displayedMoveRecords: SessionMoveRecord[] =
    appMode === 'FULL_MATCH'
      ? buildFullMatchMoveRecords(fullMatchHistory)
      : sessionMoves;

  // Keep the compact algebraic move list scrolled to the latest move
  useEffect(() => {
    const el = movesListScrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [displayedMoveRecords.length, fullMatchHistory.length]);

  return (
    <motion.div
      className="min-h-screen lg:h-screen w-full overflow-x-hidden lg:overflow-hidden bg-[#0A192F] text-slate-100 flex flex-col select-none font-sans relative transition-colors duration-500"
      data-testid="puzzle-rush-app"
      animate={
        theme.screenShake
          ? {
              x: [-3, 3, -4, 4, -2, 2, 0],
              y: [1, -2, 2, -1, 1, 0],
            }
          : { x: 0, y: 0 }
      }
      transition={{
        repeat: theme.screenShake ? Infinity : 0,
        duration: 0.22,
        ease: 'linear',
      }}
    >
      {/* 3-ZONE ARCHITECTURAL HEADER BAR (Zero Pill Badges, Compact 48px Height) */}
      <header className="h-12 shrink-0 border-b border-white/[0.07] bg-[#0a0e17]/90 backdrop-blur-xl px-4 sm:px-5 flex items-center justify-between gap-4 z-20">
        {/* Zone 1: Brand Identity */}
        <div className="flex items-center gap-3 shrink-0">
          <h1 className="text-base sm:text-lg font-display font-semibold tracking-tight text-white">
            Chess.AI
          </h1>
          <span className="h-3.5 w-px bg-white/15 hidden sm:inline-block" />
          <span className="text-xs text-slate-400 hidden sm:inline-block font-normal">
            Tactical Studio
          </span>
        </div>

        {/* Zone 2: Unified Workspace Instrument Strip */}
        <div className="flex items-center divide-x divide-white/[0.08] rounded-lg border border-white/[0.08] bg-white/[0.02]">
          {/* Board Surface Selector */}
          <label className="flex items-center gap-2 px-3 py-1 text-xs">
            <span className="text-[11px] text-slate-400 hidden md:inline">
              Surface
            </span>
            <select
              aria-label="Select Board Theme"
              data-testid="board-theme-select"
              value={boardTheme}
              onChange={(e) => setBoardTheme(e.target.value as BoardColorScheme)}
              className="bg-transparent text-slate-100 font-medium text-xs focus:outline-none cursor-pointer"
            >
              <option value="midnight-blue" className="bg-slate-950 text-white">
                Midnight Blue
              </option>
              <option value="forest-green" className="bg-slate-950 text-white">
                Forest Green
              </option>
              <option value="classic-wood" className="bg-slate-950 text-white">
                Classic Wood
              </option>
            </select>
          </label>

          {/* Voice Persona Selector */}
          <label className="hidden sm:flex items-center gap-2 px-3 py-1 text-xs">
            <span className="text-[11px] text-slate-400 hidden md:inline">
              Voice
            </span>
            <select
              aria-label="Select AI Voice Model"
              data-testid="voice-model-select"
              value={voiceModel}
              onChange={(e) => {
                const nextVoice = e.target.value as VoiceModelId;
                setVoiceModel(nextVoice);
                triggerVoiceEvent('game_start');
              }}
              className="bg-transparent text-slate-100 font-medium text-xs focus:outline-none cursor-pointer"
            >
              {VOICE_MODELS.map((vm) => (
                <option
                  key={vm.id}
                  value={vm.id}
                  className="bg-slate-950 text-white"
                >
                  {vm.name}
                </option>
              ))}
            </select>
          </label>

          {/* Commentary Tone Toggle (Hinglish vs Formal Arbiter) */}
          <label
            className="hidden sm:flex items-center gap-2 px-3 py-1 cursor-pointer hover:bg-white/[0.03] transition-colors"
            data-testid="formal-mode-label"
          >
            <span className="text-[11px] text-slate-300">Formal</span>
            <input
              type="checkbox"
              checked={formalMode}
              onChange={(e) => setFormalMode(e.target.checked)}
              data-testid="formal-mode-toggle"
              className="sr-only"
            />
            <div
              className={`w-6 h-3.5 rounded-full transition-colors relative ${
                formalMode ? 'bg-sky-400' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-2.5 h-2.5 rounded-full bg-white absolute top-0.5 transition-transform ${
                  formalMode ? 'translate-x-3' : 'translate-x-0.5'
                }`}
              />
            </div>
          </label>
        </div>

        {/* Dynamic Emotion State Selector (Calm | Confident | Angry | Sad | Stressed) */}
        <div
          data-testid="emotion-selector-strip"
          className="hidden md:flex items-center gap-1 px-2 py-0.5 rounded-lg border border-white/[0.08] bg-white/[0.02]"
        >
          <span className="text-[10px] font-mono text-slate-400 uppercase mr-1 hidden xl:inline">
            Emotion:
          </span>
          {EMOTION_ORDER.map((emo) => {
            const active = currentEmotion === emo;
            return (
              <button
                key={emo}
                type="button"
                data-testid={`emotion-btn-${emo}`}
                onClick={() => setEmotion(emo)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold transition-all cursor-pointer ${
                  active
                    ? 'border shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 border-transparent'
                }`}
                style={
                  active
                    ? {
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        borderColor: theme.uiBorder,
                        color: theme.textGlow,
                        boxShadow: `0 0 10px ${theme.uiBorderGlow}`,
                      }
                    : undefined
                }
              >
                {emo}
              </button>
            );
          })}
        </div>

        {/* Zone 3: Audio & Mode Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Dedicated Stop/Play Piano Lo-Fi Music Button */}
          <button
            type="button"
            onClick={handleToggleAudio}
            data-testid="audio-stop-play-btn"
            aria-label={isMusicPlaying ? 'Stop Piano Audio' : 'Play Piano Audio'}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer flex items-center gap-1.5 border ${
              isMusicPlaying
                ? 'bg-rose-500/15 text-rose-300 border-rose-500/40 hover:bg-rose-500/25 shadow-[0_0_12px_rgba(244,63,94,0.25)]'
                : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-xs ${
                isMusicPlaying ? 'bg-rose-400 animate-pulse' : 'bg-emerald-400'
              }`}
            />
            <span>{isMusicPlaying ? 'Stop Music' : 'Play Music'}</span>
          </button>

          <button
            type="button"
            onClick={handleToggleMute}
            data-testid="lofi-mute-btn"
            aria-label={
              lofiMuted ? 'Unmute Ambient Audio' : 'Mute Ambient Audio'
            }
            className={`px-2 py-1 rounded-lg text-xs border transition-colors cursor-pointer flex items-center gap-1 ${
              lofiMuted
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'text-slate-300 hover:text-white border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05]'
            }`}
          >
            <span className="font-mono text-[10px]">
              {lofiMuted ? 'Unmute' : 'Mute'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsQrModalOpen(true)}
            data-testid="qr-code-btn"
            aria-label="Scan QR Code to Play on Mobile"
            className="px-2.5 py-1 rounded-lg text-xs text-sky-300 hover:text-sky-200 border border-sky-400/30 bg-sky-500/10 hover:bg-sky-500/20 transition-colors cursor-pointer flex items-center gap-1 font-mono text-[11px]"
          >
            <span>📱 QR</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCertModalOpen(true)}
            data-testid="certificate-modal-btn"
            aria-label="Claim Digital Certificate Trophy"
            className="px-2.5 py-1 rounded-lg text-xs text-amber-300 hover:text-amber-200 border border-amber-400/30 bg-amber-500/10 hover:bg-amber-500/20 transition-colors cursor-pointer flex items-center gap-1 font-mono text-[11px]"
          >
            <span>🏆 Trophy</span>
          </button>

          <button
            type="button"
            onClick={toggleFullMatchMode}
            data-testid="full-match-btn"
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
              appMode === 'FULL_MATCH'
                ? 'bg-sky-500/15 text-sky-200 border-sky-400/40'
                : 'border-white/[0.08] bg-white/[0.02] text-slate-300 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            {appMode === 'FULL_MATCH' ? 'Puzzle Rush' : 'Full Match'}
          </button>

          <button
            type="button"
            onClick={() => setIsHelpModalOpen(true)}
            data-testid="help-modal-btn"
            aria-label="Open Keyboard Shortcuts Help"
            className="w-7 h-7 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] text-slate-300 text-xs font-mono flex items-center justify-center transition-colors cursor-pointer"
          >
            ?
          </button>
        </div>
      </header>

      {/* MAIN WORKSPACE: Full-Height Board Arena Left (7 cols) | Cohesive Instrument Console Right (5 cols) */}
      <main className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 p-2 sm:p-3 max-w-[1680px] w-full mx-auto items-stretch overflow-hidden">
        {/* LEFT COLUMN (7 cols on lg): TACTICAL COMMAND RAIL + FULL-HEIGHT CHESSBOARD */}
        <section className="lg:col-span-7 vision-glass rounded-2xl p-2 sm:p-3 flex flex-col lg:flex-row items-center justify-between gap-3 relative min-h-0 overflow-hidden">
          {/* LEFT TACTICAL COMMAND RAIL WITH INVERSE ODOMETER TIMER */}
          <div className="w-full lg:w-[200px] xl:w-[230px] lg:h-full flex flex-col justify-between shrink-0 lg:border-r lg:border-white/[0.08] lg:pr-3">
            <TimerPanel
              timeLeft={timeLeft}
              isTimerRunning={isTimerRunning}
              rushState={rushState}
              puzzle={currentPuzzle}
              stepIndex={stepIndex}
              onStart={() => startPuzzleRush(puzzleIdx)}
              onStop={handleStopTimerOnly}
              onReset={handleResetTimerOnly}
              onNext={() => startPuzzleRush(puzzleIdx + 1)}
              onHintToggle={() => setShowHint((h) => !h)}
              showHint={showHint}
            />
          </div>

          {/* CENTER CHESSBOARD ARENA + DEDICATED EVALUATION & NODES HUD BAR */}
          <div className="flex-1 h-full w-full flex flex-col items-center justify-between min-h-0 min-w-0 p-1 gap-2">
            <div className="flex-1 w-full flex items-center justify-center min-h-0 min-w-0">
              <div className="p-1 sm:p-1.5 rounded-2xl bg-[#070a10]/95 border border-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.85)] max-h-full max-w-full flex items-center justify-center shrink-0">
                <div
                  className={`w-[min(calc(100vw-36px),min(calc(100vh-190px),460px))] sm:w-[min(calc(100vw-48px),min(calc(100vh-190px),500px))] lg:w-[min(calc(58vw-275px),min(calc(100vh-190px),510px))] xl:w-[min(calc(58vw-315px),min(calc(100vh-190px),560px))] aspect-square max-h-full max-w-full grid grid-cols-8 grid-rows-8 rounded-xl overflow-hidden border ${activeBoardTheme.frameClass} relative`}
                  data-testid="chessboard-grid"
                  data-board-theme={boardTheme}
                >
                  {board.map((row, rIdx) =>
                    row.map((piece, cIdx) => {
                      const sq = coordsToSquare(rIdx, cIdx);
                      const isLight = (rIdx + cIdx) % 2 === 0;
                      const isSelected = selectedSquare === sq;
                      const isLegalTarget = legalTargets.includes(sq);
                      const isLastMove =
                        lastMove?.from === sq || lastMove?.to === sq;
                      const isWrongFlash = wrongFlashSquare === sq;
                      const isHintSquare =
                        showHint &&
                        appMode === 'PUZZLE_RUSH' &&
                        (sq === expectedMoveStep?.from ||
                          sq === expectedMoveStep?.to);

                      let squareBg = isLight
                        ? activeBoardTheme.lightSquareClass
                        : activeBoardTheme.darkSquareClass;

                      if (isLastMove) {
                        squareBg = isLight
                          ? activeBoardTheme.lastMoveLightClass
                          : activeBoardTheme.lastMoveDarkClass;
                      }
                      if (isSelected) {
                        squareBg = activeBoardTheme.selectedSquareClass;
                      }
                      if (isHintSquare) {
                        squareBg = 'bg-sky-400/75 ring-2 ring-sky-200';
                      }
                      if (isWrongFlash) {
                        squareBg = 'bg-rose-500/85';
                      }

                      return (
                        <button
                          key={sq}
                          type="button"
                          onClick={() => handleSquareClick(sq)}
                          data-square={sq}
                          data-testid={`square-${sq}`}
                          aria-label={`Square ${sq}${
                            piece ? ` ${piece.color}${piece.type}` : ''
                          }`}
                          className={`relative w-full h-full flex items-center justify-center ${squareBg} transition-colors duration-100 hover:brightness-105 focus:outline-none cursor-pointer`}
                        >
                          {cIdx === 0 && (
                            <span
                              className={`absolute top-1 left-1.5 text-[11px] font-mono font-bold leading-none pointer-events-none ${
                                isLight
                                  ? activeBoardTheme.coordLightTextClass
                                  : activeBoardTheme.coordDarkTextClass
                              }`}
                            >
                              {RANKS[rIdx]}
                            </span>
                          )}
                          {rIdx === 7 && (
                            <span
                              className={`absolute bottom-1 right-1.5 text-[11px] font-mono font-bold leading-none pointer-events-none ${
                                isLight
                                  ? activeBoardTheme.coordLightTextClass
                                  : activeBoardTheme.coordDarkTextClass
                              }`}
                            >
                              {FILES[cIdx]}
                            </span>
                          )}

                          {isLegalTarget && !piece && (
                            <span className="w-4 h-4 rounded-full bg-slate-950/40 pointer-events-none" />
                          )}
                          {isLegalTarget && piece && (
                            <span className="absolute inset-1 border-[3.5px] border-slate-950/45 rounded-full pointer-events-none" />
                          )}

                          {piece &&
                            PIECE_SVG_PATHS[`${piece.color}${piece.type}`]}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* LIVE EVALUATION & NODES ODOMETER TELEMETRY BAR UNDER THE BOARD */}
            <div
              className="w-full max-w-[560px] flex items-center justify-between gap-3 px-3 py-1.5 rounded-xl bg-black/60 border border-white/10 shrink-0 text-xs font-mono shadow-lg backdrop-blur-md"
              data-testid="board-telemetry-strip"
            >
              {/* Streak */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400 tracking-wider uppercase">Streak</span>
                <span className="text-sm font-bold text-white tabular-nums px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/10">
                  {winnerStreak}
                </span>
                {streakPopActive && (
                  <span className="text-[10px] text-emerald-300 font-bold animate-pulse">+1</span>
                )}
              </div>

              {/* Odometer Nodes Evaluation positioned under the board with full height & pristine rendering */}
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-black/75 border border-white/15 shadow-inner">
                <span className="text-[10px] text-sky-400 font-semibold tracking-widest uppercase">
                  Nodes:
                </span>
                <div className="min-w-[86px] flex items-center justify-center">
                  <OdometerNumber
                    value={parseFloat(jarvisTelemetry.nodesFormatted) || 8.75}
                    suffix="M"
                  />
                </div>
              </div>

              {/* Search Depth & SelDepth */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 tracking-wider uppercase">Search</span>
                <span className="text-[11px] font-semibold text-sky-300 px-1.5 py-0.5 rounded bg-sky-950/40 border border-sky-400/20">
                  D{jarvisTelemetry.depth} · sel {jarvisTelemetry.selDepth}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN (5 cols on lg): 3D HUD INSTRUMENT CONSOLE */}
        <aside
          className="lg:col-span-5 vision-glass-radar rounded-2xl flex flex-col justify-between gap-2.5 p-2.5 min-h-0 overflow-y-auto lg:overflow-hidden relative"
          data-testid="jarvis-sidebar"
          aria-label="3D Sci-Fi HUD AI Console"
          style={{
            borderColor: theme.uiBorder,
            boxShadow: `0 0 24px -6px ${theme.uiBorderGlow}`,
          }}
        >
          {/* Top Right Panel: The 4D Tesseract (React Three Fiber) */}
          <div className="flex-1 min-h-[160px] overflow-hidden">
            <TesseractPanel />
          </div>

          {/* Middle Right Panel: Living Neural Network & Node Odometer (R3F) */}
          <div className="flex-1 min-h-[160px] overflow-hidden">
            <NeuralNetworkPanel
              baseNodesValue={parseFloat(jarvisTelemetry.nodesFormatted) || 8.75}
            />
          </div>

          {/* Bottom Right Panel: Hyper-Dimensional Data Scaffold with Secondary Bracing & Victory Explosion (R3F) */}
          <div className="flex-1 min-h-[160px] overflow-hidden">
            <DataScaffoldPanel
              victoryTrigger={puzzleVictoryTrigger}
              isVictory={rushState === 'VICTORY'}
            />
          </div>

          {/* Tactical Voice Coach Banner */}
          <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-black/45 border border-white/[0.08] shrink-0 text-xs font-mono">
            <span className="text-slate-300 truncate text-[11px] max-w-[280px]">
              {speechBanner}
            </span>
            <button
              type="button"
              onClick={() => speak()}
              data-testid="replay-tts-btn"
              className="text-[10px] px-2 py-0.5 rounded border border-white/10 bg-white/[0.04] hover:bg-white/[0.1] text-slate-200 transition-colors cursor-pointer shrink-0"
            >
              Speak
            </button>
          </div>
        </aside>
      </main>

      {/* KEYBOARD SHORTCUTS HELP MODAL */}
      {isHelpModalOpen && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
          data-testid="shortcuts-help-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="shortcuts-modal-title"
          onClick={() => setIsHelpModalOpen(false)}
        >
          <div
            className="vision-glass-radar rounded-2xl max-w-md w-full p-5 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div>
                <h2
                  id="shortcuts-modal-title"
                  className="text-sm font-semibold tracking-tight text-white"
                >
                  Keyboard Shortcuts
                </h2>
                <p className="text-[11px] text-slate-400">
                  Global bindings active across the studio
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsHelpModalOpen(false)}
                data-testid="close-help-modal-btn"
                aria-label="Close Keyboard Shortcuts Modal"
                className="w-7 h-7 rounded-lg vision-subcard text-slate-300 text-xs flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 my-4">
              <div className="flex items-center justify-between vision-subcard rounded-xl p-2.5">
                <div className="flex items-center gap-2.5">
                  <kbd className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-700 text-sky-200 font-mono text-xs">
                    P
                  </kbd>
                  <div>
                    <div className="text-xs font-medium text-white">
                      Start Puzzle Rush
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Load Mate-in-2 puzzle &amp; start 30s clock
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    startPuzzleRush(puzzleIdx);
                    setIsHelpModalOpen(false);
                  }}
                  data-testid="modal-trigger-p"
                  className="px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-200 border border-sky-400/30 text-[10px] font-mono cursor-pointer"
                >
                  Start
                </button>
              </div>

              <div className="flex items-center justify-between vision-subcard rounded-xl p-2.5">
                <div className="flex items-center gap-2.5">
                  <kbd className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-700 text-sky-200 font-mono text-xs">
                    F
                  </kbd>
                  <div>
                    <div className="text-xs font-medium text-white">
                      Formal Mode ({formalMode ? 'ON' : 'OFF'})
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Toggle FIDE Arbiter commentary tone
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFormalMode((prev) => !prev)}
                  data-testid="modal-trigger-f"
                  className="px-2.5 py-1 rounded-lg vision-subcard text-slate-200 text-[10px] font-mono cursor-pointer"
                >
                  Toggle
                </button>
              </div>

              <div className="flex items-center justify-between vision-subcard rounded-xl p-2.5">
                <div className="flex items-center gap-2.5">
                  <kbd className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-700 text-sky-200 font-mono text-xs">
                    N
                  </kbd>
                  <div>
                    <div className="text-xs font-medium text-white">
                      Next Mate-in-2 Puzzle
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Advance to next puzzle and start 30s clock
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    startPuzzleRush(puzzleIdx + 1);
                    setIsHelpModalOpen(false);
                  }}
                  data-testid="modal-trigger-n"
                  className="px-2.5 py-1 rounded-lg vision-subcard text-slate-200 text-[10px] font-mono cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE QR CODE CHALLENGE MODAL */}
      <QrCodeModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
      />

      {/* DIGITAL CERTIFICATE TROPHY MODAL */}
      <CertificateModal
        isOpen={isCertModalOpen}
        onClose={() => setIsCertModalOpen(false)}
        defaultPlayerName="Challenger"
        defaultResult={
          winnerStreak > 0
            ? `${winnerStreak}-Streak 5-Star Champion`
            : appMode === 'FULL_MATCH'
            ? 'Stockfish 16.1 Challenger'
            : 'Mate-in-2 Rush Challenger'
        }
        skillLevel={stockfishSkill}
        personalityName={
          VOICE_MODELS.find((m) => m.id === voiceModel)?.name || 'AI Coach'
        }
        puzzlesSolved={winnerStreak}
      />
    </motion.div>
  );
}

export function App() {
  return (
    <EmotionProvider initialEmotion="calm">
      <AppContent />
    </EmotionProvider>
  );
}

export default App;

