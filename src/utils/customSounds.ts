export type VoiceEventCategory =
  | 'game_start'
  | 'puzzle_won'
  | 'puzzle_lost'
  | 'good_move_step1'
  | 'wrong_move'
  | 'blunder_charity'
  | 'player_gives_check'
  | 'ai_threat_check'
  | 'passive_move'
  | 'decent_move'
  | 'hesitation_5s'
  | 'hesitation_12s'
  | 'time_warning_15s'
  | 'time_critical_8s';

export type CustomSfxKey =
  | 'move'
  | 'aiMove'
  | 'capture'
  | 'check'
  | 'victory'
  | 'wrong'
  | 'tick'
  | 'urgentTick'
  | 'laugh'
  | 'yawn'
  | 'hype';

export interface VoiceClipEntry {
  id: string;
  src: string;
  transcript: string;
  category: VoiceEventCategory;
}

export const CUSTOM_SFX_PATHS: Record<CustomSfxKey, string> = {
  move: '/sounds/move.mp3',
  aiMove: '/sounds/ai-move.mp3',
  capture: '/sounds/capture.mp3',
  check: '/sounds/check.mp3',
  victory: '/sounds/victory.mp3',
  wrong: '/sounds/wrong.mp3',
  tick: '/sounds/tick.mp3',
  urgentTick: '/sounds/urgent-tick.mp3',
  laugh: '/sounds/laugh.mp3',
  yawn: '/sounds/yawn.mp3',
  hype: '/sounds/hype.mp3',
};

/**
 * Complete library of all 26 custom multi-speaker Hinglish voice lines
 * mapped to their exact gameplay event categories.
 */
export const VOICE_CLIP_LIBRARY: Record<VoiceEventCategory, VoiceClipEntry[]> = {
  game_start: [
    {
      id: 'ms-0',
      src: '/assets/aistudio/multi-speaker_82862256.mp3',
      transcript: 'Aaja bhai, aaj teri class lagegi!',
      category: 'game_start',
    },
    {
      id: 'ms-1',
      src: '/assets/aistudio/multi-speaker__1__fb8b78d6.mp3',
      transcript: 'Shuru karein ya abhi dar lag raha hai?',
      category: 'game_start',
    },
  ],
  hesitation_5s: [
    {
      id: 'ms-1-hesitate',
      src: '/assets/aistudio/multi-speaker__1__fb8b78d6.mp3',
      transcript: 'Shuru karein ya abhi dar lag raha hai?',
      category: 'hesitation_5s',
    },
  ],
  good_move_step1: [
    {
      id: 'ms-2',
      src: '/assets/aistudio/multi-speaker__2__3e3d981c.mp3',
      transcript: 'Badaam kha ke aaya hai kya aaj?',
      category: 'good_move_step1',
    },
    {
      id: 'ms-3',
      src: '/assets/aistudio/multi-speaker__3__2554acad.mp3',
      transcript: 'Shuruaat achhi hai, aage dekhte hain.',
      category: 'good_move_step1',
    },
  ],
  passive_move: [
    {
      id: 'ms-4',
      src: '/assets/aistudio/multi-speaker__4__3fc698bd.mp3',
      transcript: 'Kuch naya try kar, bore mat kar!',
      category: 'passive_move',
    },
  ],
  decent_move: [
    {
      id: 'ms-5',
      src: '/assets/aistudio/multi-speaker__5__ffce7184.mp3',
      transcript: 'Yeh move thoda theek-thaak tha, chalo aage badho.',
      category: 'decent_move',
    },
  ],
  wrong_move: [
    {
      id: 'ms-6',
      src: '/assets/aistudio/multi-speaker__6__6a2927c7.mp3',
      transcript: 'Haha! Chal doosri chaal chal, chhod diya tujhe.',
      category: 'wrong_move',
    },
    {
      id: 'ms-7',
      src: '/assets/aistudio/multi-speaker__7__055aba27.mp3',
      transcript: 'Bhai yeh move tha ya mazaak?',
      category: 'wrong_move',
    },
    {
      id: 'ms-8',
      src: '/assets/aistudio/multi-speaker__8__fecbb296.mp3',
      transcript: 'Aankhein khol ke khel mere bhai!',
      category: 'wrong_move',
    },
    {
      id: 'ms-9',
      src: '/assets/aistudio/multi-speaker__9__d3824ce4.mp3',
      transcript: 'Dimaag ghar pe bhool aaya kya?',
      category: 'wrong_move',
    },
    {
      id: 'ms-10',
      src: '/assets/aistudio/multi-speaker__10__b8dab0cb.mp3',
      transcript: 'Bhai chashma laga ke khel le!',
      category: 'wrong_move',
    },
  ],
  blunder_charity: [
    {
      id: 'ms-11',
      src: '/assets/aistudio/multi-speaker__11__31dba9b8.mp3',
      transcript: 'Aise daan karoge toh lut jaoge!',
      category: 'blunder_charity',
    },
    {
      id: 'ms-7-blunder',
      src: '/assets/aistudio/multi-speaker__7__055aba27.mp3',
      transcript: 'Bhai yeh move tha ya mazaak?',
      category: 'blunder_charity',
    },
  ],
  player_gives_check: [
    {
      id: 'ms-12',
      src: '/assets/aistudio/multi-speaker__12__e08e636e.mp3',
      transcript: 'Oho! Ek check de ke khush mat ho.',
      category: 'player_gives_check',
    },
    {
      id: 'ms-13',
      src: '/assets/aistudio/multi-speaker__13__f53c928e.mp3',
      transcript: 'Galti se check lag gaya kya?',
      category: 'player_gives_check',
    },
  ],
  ai_threat_check: [
    {
      id: 'ms-14',
      src: '/assets/aistudio/multi-speaker__14__e573a373.mp3',
      transcript: 'Dekh bhai, khatra tere sar pe khada hai!',
      category: 'ai_threat_check',
    },
    {
      id: 'ms-15',
      src: '/assets/aistudio/multi-speaker__15__89ab54e6.mp3',
      transcript: 'Ab kahan chhupayega apne Raja ko?',
      category: 'ai_threat_check',
    },
  ],
  time_warning_15s: [
    {
      id: 'ms-16',
      src: '/assets/aistudio/multi-speaker__16__a28d1f06.mp3',
      transcript: 'Ghadi bhaag rahi hai, tu so raha hai!',
      category: 'time_warning_15s',
    },
  ],
  hesitation_12s: [
    {
      id: 'ms-17',
      src: '/assets/aistudio/multi-speaker__17__53e57985.mp3',
      transcript: 'Agle janam mein move chalega kya?',
      category: 'hesitation_12s',
    },
  ],
  time_critical_8s: [
    {
      id: 'ms-18',
      src: '/assets/aistudio/multi-speaker__18__1956fc44.mp3',
      transcript: 'Time khatam ho raha hai, jaldi chal!',
      category: 'time_critical_8s',
    },
  ],
  puzzle_lost: [
    {
      id: 'ms-19',
      src: '/assets/aistudio/multi-speaker__19__44a10d27.mp3',
      transcript: 'Rehne de bhai, tujhse na ho payega.',
      category: 'puzzle_lost',
    },
    {
      id: 'ms-20',
      src: '/assets/aistudio/multi-speaker__20__14d6a5bd.mp3',
      transcript: 'Rehne de bhai, tujhse na ho payega!',
      category: 'puzzle_lost',
    },
    {
      id: 'ms-21',
      src: '/assets/aistudio/multi-speaker__21__2c18ce57.mp3',
      transcript: 'Agli baar thoda seekh ke aana.',
      category: 'puzzle_lost',
    },
    {
      id: 'ms-22',
      src: '/assets/aistudio/multi-speaker__22__e1833976.mp3',
      transcript: 'Chalo, kam se kam koshish toh ki.',
      category: 'puzzle_lost',
    },
  ],
  puzzle_won: [
    {
      id: 'ms-23',
      src: '/assets/aistudio/multi-speaker__23__9b281076.mp3',
      transcript: 'Itna dimaag kahan chhupa ke rakha tha bhai?',
      category: 'puzzle_won',
    },
    {
      id: 'ms-24',
      src: '/assets/aistudio/multi-speaker__24__3345f8f8.mp3',
      transcript: 'Galti se jeet gaya kya?',
      category: 'puzzle_won',
    },
    {
      id: 'ms-25',
      src: '/assets/aistudio/multi-speaker__25__f44582bf.mp3',
      transcript: 'Jeet gaya? Ab party kab de raha hai?',
      category: 'puzzle_won',
    },
  ],
};

export const VOICE_EVENT_LINES: Record<VoiceEventCategory, string[]> = {
  game_start: VOICE_CLIP_LIBRARY.game_start.map((c) => c.transcript),
  puzzle_won: VOICE_CLIP_LIBRARY.puzzle_won.map((c) => c.transcript),
  puzzle_lost: VOICE_CLIP_LIBRARY.puzzle_lost.map((c) => c.transcript),
  good_move_step1: VOICE_CLIP_LIBRARY.good_move_step1.map((c) => c.transcript),
  wrong_move: VOICE_CLIP_LIBRARY.wrong_move.map((c) => c.transcript),
  blunder_charity: VOICE_CLIP_LIBRARY.blunder_charity.map((c) => c.transcript),
  player_gives_check: VOICE_CLIP_LIBRARY.player_gives_check.map((c) => c.transcript),
  ai_threat_check: VOICE_CLIP_LIBRARY.ai_threat_check.map((c) => c.transcript),
  passive_move: VOICE_CLIP_LIBRARY.passive_move.map((c) => c.transcript),
  decent_move: VOICE_CLIP_LIBRARY.decent_move.map((c) => c.transcript),
  hesitation_5s: VOICE_CLIP_LIBRARY.hesitation_5s.map((c) => c.transcript),
  hesitation_12s: VOICE_CLIP_LIBRARY.hesitation_12s.map((c) => c.transcript),
  time_warning_15s: VOICE_CLIP_LIBRARY.time_warning_15s.map((c) => c.transcript),
  time_critical_8s: VOICE_CLIP_LIBRARY.time_critical_8s.map((c) => c.transcript),
};

const TIMER_NUDGE_CATEGORIES = new Set<VoiceEventCategory>([
  'hesitation_5s',
  'hesitation_12s',
  'time_warning_15s',
  'time_critical_8s',
]);

const FOLLOWUP_AI_CATEGORIES = new Set<VoiceEventCategory>([
  'ai_threat_check',
  'passive_move',
  'decent_move',
]);

class CustomSoundManager {
  private isMuted = false;
  private useCustomSfxFiles = false;
  private bgmAudio: HTMLAudioElement | null = null;
  private activeVoiceAudio: HTMLAudioElement | null = null;
  private activeVoiceCategory: VoiceEventCategory | null = null;
  private activeVoiceStartedAt = 0;
  private isVoiceCurrentlyPlaying = false;
  private lastPlayedClip: VoiceClipEntry | null = null;
  private queuedVoiceTimeout: number | null = null;
  private audioCache: Map<string, HTMLAudioElement> = new Map();
  private lineCounters: Partial<Record<VoiceEventCategory, number>> = {};
  private onDuckingChange?: (ducked: boolean) => void;

  public setDuckingCallback(cb: (ducked: boolean) => void): void {
    this.onDuckingChange = cb;
  }

  public preloadAllVoiceClips(): void {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') return;
    const seen = new Set<string>();
    Object.values(VOICE_CLIP_LIBRARY).forEach((clips) => {
      clips.forEach((clip) => {
        if (!seen.has(clip.src)) {
          seen.add(clip.src);
          try {
            const audio = new Audio(clip.src);
            audio.preload = 'auto';
            audio.volume = 1.0;
            this.audioCache.set(clip.src, audio);
          } catch {
            // Ignore preload errors in headless/non-browser environments
          }
        }
      });
    });
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.bgmAudio) {
      this.bgmAudio.muted = muted;
    }
    if (muted) {
      this.stopActiveVoice();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public stopActiveVoice(): void {
    if (this.queuedVoiceTimeout !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.queuedVoiceTimeout);
      this.queuedVoiceTimeout = null;
    }
    if (this.activeVoiceAudio) {
      try {
        this.activeVoiceAudio.pause();
        this.activeVoiceAudio.currentTime = 0;
      } catch {
        // Ignore
      }
      this.activeVoiceAudio = null;
    }
    this.isVoiceCurrentlyPlaying = false;
    this.activeVoiceCategory = null;
    this.onDuckingChange?.(false);
  }

  public startCustomBgm(fallbackSynthesizer: () => void): void {
    if (!this.useCustomSfxFiles || typeof window === 'undefined') {
      fallbackSynthesizer();
      return;
    }
    try {
      if (!this.bgmAudio) {
        this.bgmAudio = new Audio('/sounds/bgm.mp3');
        this.bgmAudio.loop = true;
        this.bgmAudio.volume = 0.22;
        this.bgmAudio.muted = this.isMuted;
      }
      this.bgmAudio.play().catch(() => {
        fallbackSynthesizer();
      });
    } catch {
      fallbackSynthesizer();
    }
  }

  public stopCustomBgm(): void {
    if (this.bgmAudio) {
      try {
        this.bgmAudio.pause();
        this.bgmAudio.currentTime = 0;
      } catch {
        // Ignore
      }
    }
  }

  public playCustomSfx(
    key: CustomSfxKey | string,
    fallbackSynthesizer: () => void
  ): void {
    if (this.isMuted) return;
    if (!this.useCustomSfxFiles || typeof window === 'undefined') {
      fallbackSynthesizer();
      return;
    }
    const path =
      CUSTOM_SFX_PATHS[key as CustomSfxKey] || `/sounds/${key}.mp3`;
    try {
      const audio = new Audio(path);
      audio.volume = 0.5;
      audio.play().catch(() => {
        fallbackSynthesizer();
      });
    } catch {
      fallbackSynthesizer();
    }
  }

  private pickNextClip(category: VoiceEventCategory): VoiceClipEntry {
    const clips =
      VOICE_CLIP_LIBRARY[category] || VOICE_CLIP_LIBRARY.game_start;
    const count = this.lineCounters[category] || 0;
    const chosen = clips[count % clips.length];
    this.lineCounters[category] = count + 1;
    return chosen;
  }

  public hasLastVoiceClip(): boolean {
    return this.lastPlayedClip !== null;
  }

  public replayLastVoiceClip(
    onTranscript?: (transcript: string) => void,
    onFallbackTts?: (ttsFallback: string) => void,
    onSpeakingStateChange?: (speaking: boolean) => void
  ): boolean {
    const clipToPlay =
      this.lastPlayedClip || VOICE_CLIP_LIBRARY.game_start[0];
    this.playClipObject(
      clipToPlay,
      onTranscript,
      onFallbackTts,
      onSpeakingStateChange
    );
    return true;
  }

  public playVoiceForEvent(
    category: VoiceEventCategory,
    onTranscript?: (transcript: string) => void,
    onFallbackTts?: (ttsFallback: string) => void,
    onSpeakingStateChange?: (speaking: boolean) => void
  ): void {
    const now = Date.now();
    const elapsedSinceStart = now - this.activeVoiceStartedAt;

    // 1. Balance rule: Do not let passive timer nudges interrupt an active move/intro voice clip
    if (
      TIMER_NUDGE_CATEGORIES.has(category) &&
      (this.isVoiceCurrentlyPlaying || elapsedSinceStart < 2500)
    ) {
      return;
    }

    // 1b. Balance rule: Do not let auto-advance game_start cut off an active victory/defeat clip
    if (
      category === 'game_start' &&
      this.isVoiceCurrentlyPlaying &&
      (this.activeVoiceCategory === 'puzzle_won' ||
        this.activeVoiceCategory === 'puzzle_lost')
    ) {
      return;
    }

    const chosenClip = this.pickNextClip(category);

    // 2. In Node unit test environments (no window/Audio), invoke callbacks synchronously
    if (typeof window === 'undefined' || typeof Audio === 'undefined') {
      onTranscript?.(chosenClip.transcript);
      onFallbackTts?.(chosenClip.transcript);
      return;
    }

    // 3. Balance rule: If an AI reply event fires right after a player move clip (< 950ms),
    // queue it smoothly after the player move reaction instead of cutting it off after 320ms
    if (
      FOLLOWUP_AI_CATEGORIES.has(category) &&
      this.isVoiceCurrentlyPlaying &&
      elapsedSinceStart < 950 &&
      this.activeVoiceCategory &&
      !TIMER_NUDGE_CATEGORIES.has(this.activeVoiceCategory)
    ) {
      if (this.queuedVoiceTimeout !== null) {
        window.clearTimeout(this.queuedVoiceTimeout);
      }
      const remainingDelay = Math.max(450, 1650 - elapsedSinceStart);
      this.queuedVoiceTimeout = window.setTimeout(() => {
        this.queuedVoiceTimeout = null;
        this.playClipObject(
          chosenClip,
          onTranscript,
          undefined,
          onSpeakingStateChange
        );
      }, remainingDelay);
      return;
    }

    this.playClipObject(
      chosenClip,
      onTranscript,
      undefined,
      onSpeakingStateChange
    );
  }

  private playClipObject(
    clip: VoiceClipEntry,
    onTranscript?: (transcript: string) => void,
    _onFallbackTts?: (ttsFallback: string) => void,
    onSpeakingStateChange?: (speaking: boolean) => void
  ): void {
    this.lastPlayedClip = clip;
    onTranscript?.(clip.transcript);

    if (this.isMuted) {
      this.stopActiveVoice();
      onSpeakingStateChange?.(false);
      return;
    }

    this.stopActiveVoice();

    try {
      const audio = new Audio(clip.src);
      audio.preload = 'auto';
      audio.volume = 1.0;
      audio.muted = this.isMuted;

      this.activeVoiceAudio = audio;
      this.activeVoiceCategory = clip.category;
      this.activeVoiceStartedAt = Date.now();
      this.isVoiceCurrentlyPlaying = true;

      audio.onplay = () => {
        if (this.activeVoiceAudio === audio) {
          this.isVoiceCurrentlyPlaying = true;
          this.onDuckingChange?.(true);
          onSpeakingStateChange?.(true);
        }
      };

      audio.onended = () => {
        if (this.activeVoiceAudio === audio) {
          this.isVoiceCurrentlyPlaying = false;
          this.activeVoiceAudio = null;
          this.activeVoiceCategory = null;
          this.onDuckingChange?.(false);
          onSpeakingStateChange?.(false);
        }
      };

      audio.onerror = () => {
        if (this.activeVoiceAudio === audio) {
          this.isVoiceCurrentlyPlaying = false;
          this.activeVoiceAudio = null;
          this.activeVoiceCategory = null;
          this.onDuckingChange?.(false);
          onSpeakingStateChange?.(false);
        }
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          if (this.activeVoiceAudio === audio) {
            this.isVoiceCurrentlyPlaying = false;
            this.activeVoiceAudio = null;
            this.activeVoiceCategory = null;
            this.onDuckingChange?.(false);
            onSpeakingStateChange?.(false);
          }
        });
      }
    } catch {
      this.isVoiceCurrentlyPlaying = false;
      this.onDuckingChange?.(false);
      onSpeakingStateChange?.(false);
    }
  }
}

export const customSoundManager = new CustomSoundManager();
