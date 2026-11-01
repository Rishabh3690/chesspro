import { ChessEngine, Move } from './chessEngine';
import {
  LICHESS_250_PUZZLES,
  LichessPuzzleItem,
  PuzzleMoveStep,
  PuzzleSkillTier,
  PuzzleSkillBadgeInfo,
  getPuzzleSkillTier,
} from './lichessPuzzles250';

export { LICHESS_250_PUZZLES, getPuzzleSkillTier };
export type {
  LichessPuzzleItem,
  PuzzleMoveStep,
  PuzzleSkillTier,
  PuzzleSkillBadgeInfo,
};

export interface PuzzleRushItem {
  id: string;
  title: string;
  theme: string;
  fen: string;
  solutionFrom: string;
  solutionTo: string;
  solutionSan: string;
  hint: string;
  mateIn?: 1 | 2;
  rating?: number;
  lichessId?: string;
  solutionSteps?: PuzzleMoveStep[];
}

// Primary puzzle bank: Strictly verified Very Hard Mate-in-2 tactical positions
export const PUZZLE_RUSH_FEN_BANK: LichessPuzzleItem[] = LICHESS_250_PUZZLES;
export const VERIFIED_MATE_IN_ONE_BANK: LichessPuzzleItem[] = LICHESS_250_PUZZLES;
export const MATE_IN_ONE_PUZZLES: LichessPuzzleItem[] = LICHESS_250_PUZZLES;

export const HINGLISH_WRONG_MOVE_ROASTS: string[] = [
  'Arre nahi yaar, phir try karo! Look closely at the forcing Mate-in-2 sacrifice.',
  'AI hass raha hai... dobara! Find the forcing first check that sets up Mate in 2.',
  'Almost there dost, lekin Black King escape kar jayega—calculate the 2-move checkmate!',
  'Oho! Sahi tactical motif dhoondo yaar, two forcing moves seal the King!',
  'Hmm, nice try, par Stockfish keh raha hai forced Mate in 2 available hai!',
];

export const FORMAL_WRONG_MOVE_LINES: string[] = [
  'A respectable attempt. Kindly examine the forcing Mate-in-2 sacrifice vector.',
  "Better luck next time, Sir/Ma'am. Look for the decisive 2-move checkmate sequence.",
  'An interesting try, respected Judge—however, Black retains a defensive resource.',
  'Not quite the forcing continuation. Inspect the royal deflection sacrifice for Mate in 2.',
  'A commendable effort, Sir/Ma’am. A forced 2-move checkmate is available on the board.',
];

export const HINGLISH_INTERMEDIATE_PRAISE: string[] = [
  'Kya baat hai! Brilliant sacrifice—now deliver the final checkmate move!',
  'Ekdum grandmaster deflection yaar! Black is forced to reply—finish the Mate in 2!',
  'Shabash! Forcing check locked—now seal the King on move two!',
];

export const FORMAL_INTERMEDIATE_PRAISE: string[] = [
  'Brilliant forcing sacrifice, Sir/Ma’am. Now execute the terminal mating move.',
  'Excellent deflection, respected Judge. Black’s reply was forced—deliver checkmate.',
  'Spot-on first move. Complete the 2-move checkmate sequence.',
];

export const HINGLISH_VICTORY_LINES: string[] = [
  'Kya baat hai! Ekdum grandmaster waala Mate-in-2 checkmate! Brilliant calculation!',
  'Shabash! Unstoppable 2-move tactical combination—zero escape squares for the King!',
  'Gazab chaal yaar! Stockfish evaluation locked—Mate in 2 solved!',
];

export const FORMAL_VICTORY_LINES: string[] = [
  'Congratulations, Sir/Ma’am. A masterclass in Very Hard Mate-in-2 calculation.',
  'Splendid execution. You calculated both the sacrifice and the terminal checkmate effortlessly.',
  'Exemplary tactical vision, respected Judge. Checkmate in 2 is confirmed.',
];

export interface MoveEvaluationOutcome {
  isLegal: boolean;
  isMateInOne: boolean;
  san: string | null;
  speechText: string;
  evalDisplay: string;
}

export interface MultiMoveStepOutcome {
  status: 'ILLEGAL' | 'WRONG' | 'CONTINUE' | 'SOLVED';
  playerMove: Move | null;
  opponentReply: PuzzleMoveStep | null;
  nextStepIndex: number;
  speechText: string;
  evalDisplay: string;
  jarvisCommentary: string;
}

/**
 * Evaluates a candidate player move in a multi-step (Mate-in-2) puzzle.
 * Step 0: Validates White's forcing Move 1 and returns status 'CONTINUE' with Black's forced reply.
 * Step 1: Validates White's Move 2 checkmate and returns status 'SOLVED'.
 */
export function evaluateMultiMovePuzzleStep(
  currentFen: string,
  puzzle: LichessPuzzleItem,
  currentStepIndex: number,
  from: string,
  to: string,
  formalMode: boolean,
  attemptIndex = 0
): MultiMoveStepOutcome {
  const engine = new ChessEngine(currentFen);
  const expectedStep = puzzle.solutionSteps[currentStepIndex] || puzzle.solutionSteps[0];
  const move = engine.makeMove(from, to, expectedStep?.promotion || 'q');

  if (!move) {
    const roasts = formalMode
      ? FORMAL_WRONG_MOVE_LINES
      : HINGLISH_WRONG_MOVE_ROASTS;
    return {
      status: 'ILLEGAL',
      playerMove: null,
      opponentReply: null,
      nextStepIndex: currentStepIndex,
      speechText: roasts[attemptIndex % roasts.length],
      evalDisplay: '-3.20 (Illegal)',
      jarvisCommentary: `Vector ${from.toUpperCase()}→${to.toUpperCase()} violates piece geometry. Awaiting legal Mate-in-2 input.`,
    };
  }

  const afterPlayerStatus = engine.getStatus();
  const isExpectedMove =
    Boolean(expectedStep) &&
    from === expectedStep.from &&
    to === expectedStep.to;
  const isFinalStep = currentStepIndex >= puzzle.solutionSteps.length - 1;

  // Step 1 of Mate-in-2: White plays the forcing move, Black has a forced reply
  if (!isFinalStep && isExpectedMove && expectedStep.opponentReply) {
    const praiseLines = formalMode
      ? FORMAL_INTERMEDIATE_PRAISE
      : HINGLISH_INTERMEDIATE_PRAISE;
    return {
      status: 'CONTINUE',
      playerMove: move,
      opponentReply: expectedStep.opponentReply,
      nextStepIndex: currentStepIndex + 1,
      speechText: praiseLines[attemptIndex % praiseLines.length],
      evalDisplay: '+M1',
      jarvisCommentary: `Step 1 verified (${move.san}). Black forced into ${expectedStep.opponentReply.san}. Execute final Mate-in-1 strike.`,
    };
  }

  // Step 2 of Mate-in-2 (or direct checkmate): White delivers checkmate
  if (afterPlayerStatus.isCheckmate || (isFinalStep && isExpectedMove)) {
    const lines = formalMode ? FORMAL_VICTORY_LINES : HINGLISH_VICTORY_LINES;
    return {
      status: 'SOLVED',
      playerMove: move,
      opponentReply: null,
      nextStepIndex: puzzle.solutionSteps.length,
      speechText: lines[attemptIndex % lines.length],
      evalDisplay: '#0 (Checkmate)',
      jarvisCommentary: `Checkmate verified: ${move.san} seals all king flight vectors. Mate-in-2 confirmed at 100.0% confidence.`,
    };
  }

  const roasts = formalMode
    ? FORMAL_WRONG_MOVE_LINES
    : HINGLISH_WRONG_MOVE_ROASTS;
  return {
    status: 'WRONG',
    playerMove: move,
    opponentReply: null,
    nextStepIndex: currentStepIndex,
    speechText: roasts[attemptIndex % roasts.length],
    evalDisplay: currentStepIndex === 0 ? '-1.85 (Missed +M2)' : '-1.85 (Missed +M1)',
    jarvisCommentary: `Sub-optimal vector: ${move.san} permits defensive resource. Re-aligning spatial radar for Mate in 2.`,
  };
}

/**
 * Evaluates a single-move Mate-in-1 attempt.
 */
export function evaluatePuzzleRushAttempt(
  puzzle: PuzzleRushItem,
  from: string,
  to: string,
  formalMode: boolean,
  attemptIndex = 0
): MoveEvaluationOutcome {
  const engine = new ChessEngine(puzzle.fen);
  const move = engine.makeMove(from, to, 'q');

  if (!move) {
    const roasts = formalMode
      ? FORMAL_WRONG_MOVE_LINES
      : HINGLISH_WRONG_MOVE_ROASTS;
    return {
      isLegal: false,
      isMateInOne: false,
      san: null,
      speechText: roasts[attemptIndex % roasts.length],
      evalDisplay: '-2.40 (Illegal)',
    };
  }

  const status = engine.getStatus();
  const isSolutionMatch =
    status.isCheckmate ||
    (from === puzzle.solutionFrom && to === puzzle.solutionTo);

  if (isSolutionMatch) {
    const lines = formalMode ? FORMAL_VICTORY_LINES : HINGLISH_VICTORY_LINES;
    return {
      isLegal: true,
      isMateInOne: true,
      san: move.san,
      speechText: lines[attemptIndex % lines.length],
      evalDisplay: '+M1',
    };
  }

  const roasts = formalMode
    ? FORMAL_WRONG_MOVE_LINES
    : HINGLISH_WRONG_MOVE_ROASTS;
  return {
    isLegal: true,
    isMateInOne: false,
    san: move.san,
    speechText: roasts[attemptIndex % roasts.length],
    evalDisplay: '+0.45 (Missed Mate)',
  };
}

export interface LiveTelemetrySnapshot {
  depth: number;
  nodesFormatted: string;
  nodesPerSecFormatted: string;
  evalFormatted: string;
}

export interface JarvisPvLine {
  multipv: number;
  evalTag: string;
  sanLine: string;
  confidencePct: number;
}

export interface JarvisCalculationSnapshot {
  depth: number;
  selDepth: number;
  nodesFormatted: string;
  nodesPerSecFormatted: string;
  evalFormatted: string;
  hashFullPct: number;
  alphaBetaPruningPct: number;
  wdlWinPct: number;
  multiPvLines: JarvisPvLine[];
  threatVectors: string[];
  jarvisThought: string;
}

/**
 * Generates smooth, high-precision telemetry snapshots for the Minimalist Sci-Fi Dashboard.
 */
export function generateJarvisCalculationTick(
  tickCount: number,
  timeLeft: number,
  isRunning: boolean,
  puzzle?: LichessPuzzleItem,
  stepIndex = 0,
  isFullMatch = false,
  fullMatchEval = 0.25
): JarvisCalculationSnapshot {
  // Smooth, steady progression like a Tesla / Apple Vision Pro instrument
  const baseDepth = isRunning ? 24 + (tickCount % 5) : 22;
  const selDepth = baseDepth + 6;
  const urgencyMultiplier = timeLeft <= 10 && isRunning ? 1.45 : 1.08;
  const rawNodesMillions =
    (6.2 + ((tickCount * 0.35) % 3.8)) * urgencyMultiplier;
  const npsMillions = (3.1 + ((tickCount * 0.14) % 0.9)) * urgencyMultiplier;
  const hashFullPct = Math.min(98, 72 + ((tickCount * 3) % 22));
  const alphaBetaPruningPct = Number(
    (94.2 + ((tickCount * 0.22) % 4.1)).toFixed(1)
  );

  if (isFullMatch) {
    const sign = fullMatchEval >= 0 ? '+' : '';
    const evalFormatted = `${sign}${fullMatchEval.toFixed(2)}`;
    const wdlWinPct = Math.max(
      8,
      Math.min(96, Math.round(50 + fullMatchEval * 9.5))
    );
    const thoughts = [
      'Spatial evaluation balanced across central d4/e5 files.',
      'Projecting king safety geometry and open-file rook vectors.',
      'Neural evaluation pass complete on candidate exchanges.',
      'Endgame pawn structure equilibrium verified.',
    ];
    return {
      depth: baseDepth,
      selDepth,
      nodesFormatted: `${rawNodesMillions.toFixed(2)}M`,
      nodesPerSecFormatted: `${npsMillions.toFixed(2)}M/s`,
      evalFormatted,
      hashFullPct,
      alphaBetaPruningPct,
      wdlWinPct,
      multiPvLines: [
        {
          multipv: 1,
          evalTag: evalFormatted,
          sanLine: 'Primary Vector · Nf3 → Bc4',
          confidencePct: 94,
        },
        {
          multipv: 2,
          evalTag: `${sign}${(fullMatchEval - 0.18).toFixed(2)}`,
          sanLine: 'Central Control · d4 → c4',
          confidencePct: 76,
        },
        {
          multipv: 3,
          evalTag: `${sign}${(fullMatchEval - 0.35).toFixed(2)}`,
          sanLine: 'Positional Reserve · d3 → Nd2',
          confidencePct: 52,
        },
      ],
      threatVectors: [
        'Center Vector: e4/d5',
        'King Geometry: Stable',
        'NNUE Core: Locked',
      ],
      jarvisThought: thoughts[tickCount % thoughts.length],
    };
  }

  const evalFormatted = stepIndex === 0 ? '+M2' : '+M1';
  const stepObj = puzzle?.solutionSteps[stepIndex] || puzzle?.solutionSteps[0];
  const primaryMoveSan = stepObj?.san || 'Qb8+';
  const stepTarget = stepObj?.to.toUpperCase() || 'B8';
  const stepSource = stepObj?.from.toUpperCase() || 'D8';

  const jarvisThoughts = [
    `System Ready. Terminal Mate-in-2 vector locked on ${stepTarget}.`,
    `Precision sweep complete: ${stepSource}→${stepTarget} (${primaryMoveSan}) yields 99.6% confidence.`,
    `Spatial geometry verified: forced 2-move checkmate sequence via ${primaryMoveSan}.`,
    `Pruning ${alphaBetaPruningPct}% of non-terminal branches; focusing on ${stepTarget}.`,
  ];

  return {
    depth: baseDepth,
    selDepth,
    nodesFormatted: `${rawNodesMillions.toFixed(2)}M`,
    nodesPerSecFormatted: `${npsMillions.toFixed(2)}M/s`,
    evalFormatted,
    hashFullPct,
    alphaBetaPruningPct,
    wdlWinPct: 99,
    multiPvLines: [
      {
        multipv: 1,
        evalTag: evalFormatted,
        sanLine: `Terminal Mate Vector (${primaryMoveSan})`,
        confidencePct: 99,
      },
      {
        multipv: 2,
        evalTag: '+2.40',
        sanLine: 'Positional Pressure (Non-Terminal)',
        confidencePct: 42,
      },
      {
        multipv: 3,
        evalTag: '+0.85',
        sanLine: 'Prophylactic Consolidation',
        confidencePct: 19,
      },
    ],
    threatVectors: [
      `Target Square: ${stepTarget}`,
      'Horizon: Mate in 2',
      `Motif: ${puzzle?.theme.split('(')[0].trim() || 'Mate in 2'}`,
    ],
    jarvisThought: jarvisThoughts[tickCount % jarvisThoughts.length],
  };
}

/**
 * Generates realistic Stockfish Live Analysis HUD metrics every 500ms
 */
export function generateTelemetryTick(
  tickCount: number,
  timeLeft: number,
  isRunning: boolean
): LiveTelemetrySnapshot {
  const snap = generateJarvisCalculationTick(tickCount, timeLeft, isRunning);
  return {
    depth: snap.depth,
    nodesFormatted: snap.nodesFormatted,
    nodesPerSecFormatted: snap.nodesPerSecFormatted,
    evalFormatted: snap.evalFormatted,
  };
}

export interface TimerVisualState {
  isWarningTime: boolean;
  isSubFiveGlow: boolean;
  urgencyLevel: 'nominal' | 'warning' | 'sub5-glow';
}

/**
 * Computes the visual state for the 30-second countdown timer.
 * Triggers a subtle, non-intrusive glow pulse when time remaining is below 5 seconds.
 */
export function getTimerVisualState(
  timeLeft: number,
  isTimerRunning: boolean,
  rushState: 'IDLE' | 'ACTIVE' | 'VICTORY' | 'TIME_UP' | string
): TimerVisualState {
  const active = isTimerRunning && rushState === 'ACTIVE';
  const isSubFiveGlow = active && timeLeft > 0 && timeLeft < 5;
  const isWarningTime = active && timeLeft > 0 && timeLeft <= 10;

  let urgencyLevel: 'nominal' | 'warning' | 'sub5-glow' = 'nominal';
  if (isSubFiveGlow) {
    urgencyLevel = 'sub5-glow';
  } else if (isWarningTime) {
    urgencyLevel = 'warning';
  }

  return {
    isWarningTime,
    isSubFiveGlow,
    urgencyLevel,
  };
}

const PIECE_SPEECH_NAMES: Record<string, string> = {
  K: 'King',
  Q: 'Queen',
  R: 'Rook',
  B: 'Bishop',
  N: 'Knight',
};

/**
 * Converts raw chess commentary (SAN moves like Qxf7#, Rg8#, coordinate vectors,
 * abbreviations, and symbols) into natural, human-spoken English/Hinglish phrasing
 * so browser TTS never reads raw symbols like "Q x f 7 hash" or "Sir slash Ma'am".
 */
export function formatChessTextForSpeech(rawText: string): string {
  if (!rawText) return '';

  let text = rawText.trim();

  // Remove stage directions in asterisks like *adjusts glasses*
  text = text.replace(/\*[^*]+\*/g, ' ');

  // Normalize J.A.R.V.I.S. and common abbreviations
  text = text.replace(/J\.A\.R\.V\.I\.S\./gi, 'Jarvis');
  text = text.replace(/Sir\/Ma['’]am/gi, 'Grandmaster');
  text = text.replace(/\+M2\b/g, 'Mate in two');
  text = text.replace(/Mate-in-2/gi, 'Mate in two');
  text = text.replace(/\+M1\b/g, 'Mate in one');
  text = text.replace(/Mate-in-1/gi, 'Mate in one');
  text = text.replace(/#LIC-[A-Z0-9]+/gi, '');
  text = text.replace(/#0\s*\(Checkmate\)/gi, 'Checkmate');

  // Expand coordinate arrows like F3→F7 or f3->f7
  text = text.replace(
    /\b([a-hA-H][1-8])\s*(?:→|->)\s*([a-hA-H][1-8])\b/g,
    (_, fromSq: string, toSq: string) =>
      `${fromSq.toLowerCase()} to ${toSq.toLowerCase()}`
  );

  // Strip move numbers before SAN like "1. Qxf7#" -> "Qxf7#"
  text = text.replace(/\b\d+\.\s*(?=[KQRBNOa-h])/g, '');

  // Expand castling notation
  text = text.replace(/\bO-O-O(#|\+)?/g, (_, suffix: string | undefined) => {
    const end =
      suffix === '#' ? ', checkmate' : suffix === '+' ? ', check' : '';
    return `queenside castles${end}`;
  });
  text = text.replace(/\bO-O(#|\+)?/g, (_, suffix: string | undefined) => {
    const end =
      suffix === '#' ? ', checkmate' : suffix === '+' ? ', check' : '';
    return `kingside castles${end}`;
  });

  // Expand pawn promotions like e8=Q# or f8=N+
  text = text.replace(
    /\b([a-h])(x([a-h]))?([18])=([QRBN])(#|\+)?/g,
    (
      _,
      fromFile: string,
      _capGroup: string | undefined,
      toFile: string | undefined,
      rank: string,
      promoPiece: string,
      suffix: string | undefined
    ) => {
      const pieceName = PIECE_SPEECH_NAMES[promoPiece] || 'Queen';
      const end =
        suffix === '#' ? ', checkmate' : suffix === '+' ? ', check' : '';
      if (toFile) {
        return `${fromFile} takes ${toFile} ${rank}, promotes to ${pieceName}${end}`;
      }
      return `${fromFile} ${rank}, promotes to ${pieceName}${end}`;
    }
  );

  // Expand piece SAN moves like Qxf7#, Rg8#, Nxf7+, Rde8#, Qh7#
  text = text.replace(
    /\b([KQRBN])([a-h1-8])?(x)?([a-h][1-8])(#|\+)?(?=[\s.,!?;:)]|$)/g,
    (
      _,
      pieceCode: string,
      disambig: string | undefined,
      isCapture: string | undefined,
      targetSquare: string,
      suffix: string | undefined
    ) => {
      const pieceName = PIECE_SPEECH_NAMES[pieceCode] || pieceCode;
      const fromPart = disambig ? ` ${disambig}` : '';
      const actionVerb = isCapture ? 'takes' : 'to';
      const spokenSquare = `${targetSquare[0]} ${targetSquare[1]}`;
      const end =
        suffix === '#' ? ', checkmate' : suffix === '+' ? ', check' : '';
      return `${pieceName}${fromPart} ${actionVerb} ${spokenSquare}${end}`;
    }
  );

  // Expand pawn captures like exf7# or dxe5+
  text = text.replace(
    /\b([a-h])x([a-h][1-8])(#|\+)?(?=[\s.,!?;:)]|$)/g,
    (_, fromFile: string, targetSquare: string, suffix: string | undefined) => {
      const spokenSquare = `${targetSquare[0]} ${targetSquare[1]}`;
      const end =
        suffix === '#' ? ', checkmate' : suffix === '+' ? ', check' : '';
      return `${fromFile} takes ${spokenSquare}${end}`;
    }
  );

  // Expand quiet pawn moves with check/mate like g4# or f7+
  text = text.replace(
    /\b([a-h][1-8])(#|\+)(?=[\s.,!?;:)]|$)/g,
    (_, targetSquare: string, suffix: string) => {
      const spokenSquare = `${targetSquare[0]} ${targetSquare[1]}`;
      const end = suffix === '#' ? ', checkmate' : ', check';
      return `pawn to ${spokenSquare}${end}`;
    }
  );

  // Expand puzzle numbers like #1, #12 -> Puzzle 1, Puzzle 12
  text = text.replace(/#(\d+)\b/g, 'Puzzle $1');

  // Expand shorthand seconds like 30s -> 30 seconds
  text = text.replace(/\b(\d+)s\b/g, '$1 seconds');

  // Clean up decorative punctuation that causes awkward TTS pauses
  text = text.replace(/[·•]/g, ', ');
  text = text.replace(/\s*—\s*/g, ', ');
  text = text.replace(/\s{2,}/g, ' ').trim();

  return text;
}

export const PREFERRED_NEURAL_VOICE_IDS: readonly string[] = [
  'Microsoft Aria Online (Natural) - English (United States)',
  'Microsoft Aria',
  'Google US English Female',
  'Google UK English Female',
  'Google UK English Male',
  'Microsoft Jenny Online (Natural) - English (United States)',
  'Microsoft Jenny',
  'Microsoft Sonia Online (Natural) - English (United Kingdom)',
  'Microsoft Sonia',
  'Microsoft Ryan Online (Natural) - English (United Kingdom)',
  'Microsoft Ryan',
  'Microsoft Guy Online (Natural) - English (United States)',
  'Microsoft Guy',
  'Microsoft Neerja Online (Natural) - English (India)',
  'Microsoft Neerja',
  'Microsoft Prabhat Online (Natural) - English (India)',
  'Microsoft Prabhat',
  'Google US English',
  'Samantha',
  'Daniel',
  'Rishi',
];

export interface SpeechVoiceCandidate {
  name: string;
  voiceURI?: string;
  lang: string;
  localService?: boolean;
}

/**
 * Selects the highest-quality neural voice from available browser voices
 * by prioritizing an ordered list of preferred high-quality neural voice identifiers
 * (e.g., 'Microsoft Aria', 'Google US English Female') before falling back
 * to online/natural voice descriptors and language preference.
 */
export function selectPreferredNeuralVoice<T extends SpeechVoiceCandidate>(
  availableVoices: readonly T[],
  modelPreferredIds: readonly string[] = PREFERRED_NEURAL_VOICE_IDS,
  fallbackLangs: readonly string[] = ['en-US', 'en-GB', 'en-IN']
): T | null {
  if (!availableVoices || availableVoices.length === 0) return null;

  const priorityIds: string[] = [];
  for (const id of [...modelPreferredIds, ...PREFERRED_NEURAL_VOICE_IDS]) {
    const trimmed = id.trim();
    if (trimmed && !priorityIds.includes(trimmed)) {
      priorityIds.push(trimmed);
    }
  }

  // Pass 1: Exact name or voiceURI identifier match in priority order
  for (const preferredId of priorityIds) {
    const target = preferredId.toLowerCase();
    const exact = availableVoices.find(
      (v) =>
        v.name.toLowerCase() === target ||
        (v.voiceURI && v.voiceURI.toLowerCase() === target)
    );
    if (exact) return exact;
  }

  // Pass 2: Canonical identifier substring match in priority order
  for (const preferredId of priorityIds) {
    const target = preferredId.toLowerCase();
    const canonicalMatch = availableVoices.find(
      (v) =>
        v.name.toLowerCase().includes(target) ||
        (v.voiceURI && v.voiceURI.toLowerCase().includes(target))
    );
    if (canonicalMatch) return canonicalMatch;
  }

  // Pass 3: Neural / Natural / Online cloud voices matching preferred language
  for (const lang of fallbackLangs) {
    const langLower = lang.toLowerCase();
    const neuralInLang = availableVoices.find((v) => {
      const n = v.name.toLowerCase();
      return (
        v.lang.toLowerCase().includes(langLower) &&
        (n.includes('natural') ||
          n.includes('neural') ||
          n.includes('online') ||
          v.localService === false)
      );
    });
    if (neuralInLang) return neuralInLang;
  }

  // Pass 4: Fallback to first voice matching language preference
  for (const lang of fallbackLangs) {
    const langLower = lang.toLowerCase();
    const langMatch = availableVoices.find((v) =>
      v.lang.toLowerCase().includes(langLower)
    );
    if (langMatch) return langMatch;
  }

  return availableVoices[0];
}

export interface ProsodicSpeechClause {
  text: string;
  rate: number;
  pitch: number;
  contour: 'calm' | 'excited' | 'encouraging' | 'analytical';
  pauseAfterMs: number;
  containsChessMove: boolean;
}

const SPOKEN_CHESS_MOVE_REGEX =
  /\b(?:(?:king|queen|rook|bishop|knight|pawn)\s+(?:[a-h1-8]\s+)?(?:takes|to)\s+[a-h]\s*[1-8]|[a-h]\s+takes\s+[a-h]\s*[1-8]|[a-h][1-8]\s+to\s+[a-h][1-8]|(?:kingside|queenside)\s+castles|promotes\s+to\s+(?:queen|rook|bishop|knight)|checkmate)\b/i;

/**
 * Splits normalized speech text into natural breathing clauses with subtle,
 * human-like pitch and rate modulation and calculated prosodic pauses (delays)
 * between chess moves and commentary sentences.
 */
export function buildProsodicSpeechQueue(
  rawText: string,
  baseRate = 1.0,
  basePitch = 1.0
): ProsodicSpeechClause[] {
  const normalized = formatChessTextForSpeech(rawText);
  if (!normalized) return [];

  const rawClauses = normalized
    .split(/(?<=[.!?])\s+|(?<=[:;])\s+/)
    .map((c) => c.trim())
    .filter(Boolean);

  const safeRate = Math.max(0.75, Math.min(1.35, baseRate));

  return rawClauses.map((clause, idx) => {
    const lower = clause.toLowerCase();
    const isLastClause = idx === rawClauses.length - 1;
    const containsChessMove = SPOKEN_CHESS_MOVE_REGEX.test(clause);

    const isExclamation =
      clause.endsWith('!') ||
      lower.includes('checkmate') ||
      lower.includes('shabash') ||
      lower.includes('kya baat') ||
      lower.includes('brilliant') ||
      lower.includes('masterclass');
    const isQuestionOrTease =
      clause.endsWith('?') ||
      lower.includes('arre') ||
      lower.includes('try karo') ||
      lower.includes('dobara');

    // Calculate natural prosodic pause (ms) between chess moves and commentary sentences
    let pauseAfterMs = 0;
    if (!isLastClause) {
      let basePause = 210;
      if (containsChessMove) {
        // Extra cognitive breathing room after a chess move so listener visualizes the square
        basePause = clause.endsWith('.') || clause.endsWith('!') ? 310 : 240;
      } else if (isExclamation) {
        basePause = 260;
      } else if (isQuestionOrTease) {
        basePause = 275;
      } else if (clause.endsWith(':') || clause.endsWith(';')) {
        basePause = 185;
      }
      // Scale slightly by speech rate and clause word length
      const wordCount = clause.split(/\s+/).length;
      const lengthBonus = Math.min(60, wordCount * 6);
      pauseAfterMs = Math.round((basePause + lengthBonus) / safeRate);
    }

    if (isExclamation) {
      return {
        text: clause,
        rate: Number(Math.min(1.22, baseRate * 1.04).toFixed(2)),
        pitch: Number(Math.min(1.25, basePitch * 1.06).toFixed(2)),
        contour: 'excited',
        pauseAfterMs,
        containsChessMove,
      };
    }

    if (isQuestionOrTease) {
      return {
        text: clause,
        rate: Number(Math.max(0.88, baseRate * 0.98).toFixed(2)),
        pitch: Number(Math.min(1.2, basePitch * 1.03).toFixed(2)),
        contour: 'encouraging',
        pauseAfterMs,
        containsChessMove,
      };
    }

    // Slight natural cadence drop on concluding analytical clauses or move callouts
    const cadenceFactor = containsChessMove ? 0.96 : idx === 0 ? 1.0 : 0.98;
    return {
      text: clause,
      rate: Number((baseRate * cadenceFactor).toFixed(2)),
      pitch: Number((basePitch * (idx === 0 ? 1.01 : 0.99)).toFixed(2)),
      contour: idx === 0 ? 'calm' : 'analytical',
      pauseAfterMs,
      containsChessMove,
    };
  });
}

// ============================================================================
// ALGEBRAIC MOVE LIST SYNCHRONIZATION ENGINE (PUZZLE SESSION & FULL MATCH)
// ============================================================================

export interface SessionMoveRecord {
  id: string;
  moveNumber: number;
  puzzleIndex: number;
  lichessId: string;
  whiteSan: string;
  blackSan?: string;
  uci: string;
  evalTag: string;
  status: 'stem' | 'continue' | 'solved' | 'attempt' | 'timeout' | 'match';
}

const PUZZLE_PRELUDE_STEMS: Record<
  number,
  Array<{ whiteSan: string; blackSan: string; uci: string; evalTag: string }>
> = {
  0: [
    { whiteSan: 'e4', blackSan: 'e5', uci: 'e2e4 e7e5', evalTag: '0.0' },
    { whiteSan: 'Bc4', blackSan: 'Nc6', uci: 'f1c4 b8c6', evalTag: '+0.2' },
    { whiteSan: 'Qb3', blackSan: 'Qe7??', uci: 'd1b3 d8e7', evalTag: '+M2' },
  ],
  1: [
    { whiteSan: 'e4', blackSan: 'e5', uci: 'e2e4 e7e5', evalTag: '0.0' },
    { whiteSan: 'Nf3', blackSan: 'Nc6', uci: 'g1f3 b8c6', evalTag: '+0.2' },
    { whiteSan: 'd4', blackSan: 'exd4', uci: 'd2d4 e5d4', evalTag: '+0.4' },
    { whiteSan: 'Nxd4', blackSan: 'Bc5??', uci: 'f3d4 f8c5', evalTag: '+M2' },
  ],
  2: [
    { whiteSan: 'e4', blackSan: 'e6', uci: 'e2e4 e7e6', evalTag: '+0.3' },
    { whiteSan: 'd4', blackSan: 'c6??', uci: 'd2d4 c7c6', evalTag: '+M2' },
  ],
  3: [
    { whiteSan: 'e4', blackSan: 'c5', uci: 'e2e4 c7c5', evalTag: '+0.2' },
    { whiteSan: 'Nf3', blackSan: 'd6', uci: 'g1f3 d7d6', evalTag: '+0.3' },
    { whiteSan: 'd4', blackSan: 'cxd4', uci: 'd2d4 c5d4', evalTag: '+0.3' },
    { whiteSan: 'Qxd4', blackSan: 'Nc6??', uci: 'd1d4 b8c6', evalTag: '+M2' },
  ],
  4: [
    { whiteSan: 'd4', blackSan: 'Nf6', uci: 'd2d4 g8f6', evalTag: '+0.2' },
    { whiteSan: 'c4', blackSan: 'e6', uci: 'c2c4 e7e6', evalTag: '+0.2' },
    { whiteSan: 'Nc3', blackSan: 'Bb4??', uci: 'b1c3 f8b4', evalTag: '+M2' },
  ],
};

/**
 * Generates the initial synchronized algebraic move list for a loaded puzzle
 * so the right sidebar displays the opening/tactical stem leading into the position.
 */
export function buildInitialPuzzleStemMoves(
  puzzle: LichessPuzzleItem
): SessionMoveRecord[] {
  const stemTemplate =
    PUZZLE_PRELUDE_STEMS[(puzzle.index - 1) % 5] || PUZZLE_PRELUDE_STEMS[0];
  return stemTemplate.map((pair, idx) => ({
    id: `stem-${puzzle.lichessId}-${idx + 1}`,
    moveNumber: idx + 1,
    puzzleIndex: puzzle.index,
    lichessId: puzzle.lichessId,
    whiteSan: pair.whiteSan,
    blackSan: pair.blackSan,
    uci: pair.uci,
    evalTag: pair.evalTag,
    status: 'stem',
  }));
}

/**
 * Appends a live player/engine move to the current puzzle session move history,
 * keeping algebraic notation synchronized with engine state updates.
 */
export function appendSessionMoveRecord(
  existing: SessionMoveRecord[],
  params: {
    puzzle: LichessPuzzleItem;
    san: string;
    blackSan?: string;
    uci: string;
    status: 'continue' | 'solved' | 'attempt' | 'timeout';
    evalTag?: string;
  }
): SessionMoveRecord[] {
  const { puzzle, san, blackSan, uci, status, evalTag } = params;
  const nextMoveNum =
    existing.length > 0 ? existing[existing.length - 1].moveNumber + 1 : 1;

  const formattedSan =
    status === 'solved' && !san.endsWith('#')
      ? `${san}#`
      : status === 'attempt' && !san.endsWith('?')
      ? `${san}?`
      : san;

  const resolvedEval =
    evalTag ||
    (status === 'solved'
      ? '1-0 · Mate'
      : status === 'continue'
      ? '+M1 Forced'
      : status === 'timeout'
      ? '+M2 Missed'
      : '-2.4 Inacc');

  const newRecord: SessionMoveRecord = {
    id: `move-${puzzle.lichessId}-${existing.length + 1}-${san}`,
    moveNumber: nextMoveNum,
    puzzleIndex: puzzle.index,
    lichessId: puzzle.lichessId,
    whiteSan: formattedSan,
    blackSan:
      blackSan ||
      (status === 'solved' ? '1-0' : status === 'timeout' ? '0-1' : '...'),
    uci,
    evalTag: resolvedEval,
    status,
  };

  return [...existing.slice(-29), newRecord];
}

/**
 * Converts a flat array of SAN moves from Full Match engine history into
 * paired White/Black algebraic move rows (`1. e4 e5`, `2. Nf3 Nc6`).
 */
export function buildFullMatchMoveRecords(
  sanHistory: string[]
): SessionMoveRecord[] {
  const records: SessionMoveRecord[] = [];
  for (let i = 0; i < sanHistory.length; i += 2) {
    const moveNumber = Math.floor(i / 2) + 1;
    const whiteSan = sanHistory[i];
    const blackSan = sanHistory[i + 1];
    const isCheckmate =
      whiteSan?.includes('#') || (blackSan && blackSan.includes('#'));
    records.push({
      id: `match-ply-${i}`,
      moveNumber,
      puzzleIndex: 0,
      lichessId: 'MATCH',
      whiteSan,
      blackSan,
      uci: blackSan ? `${whiteSan} ${blackSan}` : whiteSan,
      evalTag: isCheckmate ? 'Mate' : `Ply ${i + (blackSan ? 2 : 1)}`,
      status: 'match',
    });
  }
  return records;
}

// ============================================================================
// HIGH-PHYSICS 3D/4D SPATIAL TENSOR & RUBIK'S SLICE KINEMATICS ENGINE
// ============================================================================

export interface SpatialPhysicsState {
  angleX: number;
  angleY: number;
  angleZ: number;
  angleW: number;
  omegaX: number;
  omegaY: number;
  omegaZ: number;
  omegaW: number;
  /** Radial spring-damper expansion of the 27 Rubik's sub-cubes (0 = compact, >0 = exploded) */
  expansion: number;
  expansionVel: number;
  /** Active Rubik's slice twist angle in radians (0 -> Math.PI / 2) */
  sliceAngle: number;
  sliceVel: number;
  /** Axis of active Rubik's layer twist: 0 = X, 1 = Y, 2 = Z */
  twistAxis: 0 | 1 | 2;
  /** Which layer in {-1, 0, 1} is currently twisting */
  twistLayer: -1 | 0 | 1;
  /** Computed telemetry readouts */
  kineticEnergyJ: number;
  tensorStressGPa: number;
}

export function createInitialSpatialPhysicsState(): SpatialPhysicsState {
  return {
    angleX: 0.48,
    angleY: 0.68,
    angleZ: 0.18,
    angleW: 0.35,
    omegaX: 0.0085,
    omegaY: 0.0125,
    omegaZ: 0.0045,
    omegaW: 0.016,
    expansion: 0.08,
    expansionVel: 0,
    sliceAngle: 0,
    sliceVel: 0.032,
    twistAxis: 1,
    twistLayer: 1,
    kineticEnergyJ: 14.8,
    tensorStressGPa: 3.42,
  };
}

/**
 * Advances the 3D/4D spatial geometry physics state by one frame using:
 * - Underdamped Hooke's Law spring-damper dynamics (F = -k*x - c*v) for radial tensor breathing
 * - Rotational inertia & viscous damping for 4-axis Euler + 4D Hypercube W-plane rotation
 * - Physical Rubik's slice shear twist kinematics with spring snap at 90-degree (pi/2) intervals
 */
export function stepSpatialTensorPhysics(
  prev: SpatialPhysicsState,
  options: {
    isActive: boolean;
    impulse?: number;
    pointerTorqueX?: number;
    pointerTorqueY?: number;
  }
): SpatialPhysicsState {
  const {
    isActive,
    impulse = 0,
    pointerTorqueX = 0,
    pointerTorqueY = 0,
  } = options;

  const targetOmegaX = isActive ? 0.011 : 0.0062;
  const targetOmegaY = isActive ? 0.0165 : 0.0092;
  const targetOmegaZ = isActive ? 0.0065 : 0.0035;
  const targetOmegaW = isActive ? 0.024 : 0.013;

  // Apply rotational inertia & pointer torque perturbation
  const omegaX =
    prev.omegaX * 0.94 +
    targetOmegaX * 0.06 +
    pointerTorqueY * 0.003 +
    impulse * 0.008;
  const omegaY =
    prev.omegaY * 0.94 +
    targetOmegaY * 0.06 +
    pointerTorqueX * 0.003 +
    impulse * 0.011;
  const omegaZ =
    prev.omegaZ * 0.95 + targetOmegaZ * 0.05 + impulse * 0.005;
  const omegaW =
    prev.omegaW * 0.94 + targetOmegaW * 0.06 + impulse * 0.014;

  // Underdamped spring-damper radial expansion (Hooke's law: a = -k*(x - x0) - c*v)
  const targetExpansion = isActive ? 0.16 : 0.06;
  const springK = 0.085;
  const dampingC = 0.86;
  const springForce = -springK * (prev.expansion - targetExpansion);
  const nextExpansionVel =
    (prev.expansionVel + springForce + impulse * 0.095) * dampingC;
  const nextExpansion = Math.max(
    0.0,
    Math.min(0.48, prev.expansion + nextExpansionVel)
  );

  // Physical Rubik's slice twist kinematics (0 -> Math.PI / 2)
  const halfPi = Math.PI / 2;
  const twistTargetVel = isActive ? 0.036 : 0.021;
  let nextSliceVel =
    prev.sliceVel * 0.92 + twistTargetVel * 0.08 + impulse * 0.02;
  let nextSliceAngle = prev.sliceAngle + nextSliceVel;
  let nextTwistAxis = prev.twistAxis;
  let nextTwistLayer = prev.twistLayer;

  if (nextSliceAngle >= halfPi) {
    nextSliceAngle = 0;
    nextSliceVel = twistTargetVel;
    // Cycle to next orthogonal Rubik's axis and slice layer
    nextTwistAxis = ((prev.twistAxis + 1) % 3) as 0 | 1 | 2;
    const layers: Array<-1 | 0 | 1> = [-1, 1, 0];
    const curIdx = layers.indexOf(prev.twistLayer);
    nextTwistLayer = layers[(curIdx + 1) % layers.length];
  }

  const totalOmegaSq =
    omegaX * omegaX + omegaY * omegaY + omegaZ * omegaZ + omegaW * omegaW;
  const kineticEnergyJ = Number(
    (12.4 + totalOmegaSq * 18500 + Math.abs(nextExpansionVel) * 140).toFixed(1)
  );
  const tensorStressGPa = Number(
    (
      2.85 +
      nextExpansion * 6.4 +
      Math.sin(nextSliceAngle * 2) * 0.85
    ).toFixed(2)
  );

  return {
    angleX: (prev.angleX + omegaX) % (Math.PI * 2),
    angleY: (prev.angleY + omegaY) % (Math.PI * 2),
    angleZ: (prev.angleZ + omegaZ) % (Math.PI * 2),
    angleW: (prev.angleW + omegaW) % (Math.PI * 2),
    omegaX,
    omegaY,
    omegaZ,
    omegaW,
    expansion: nextExpansion,
    expansionVel: nextExpansionVel,
    sliceAngle: nextSliceAngle,
    sliceVel: nextSliceVel,
    twistAxis: nextTwistAxis,
    twistLayer: nextTwistLayer,
    kineticEnergyJ,
    tensorStressGPa,
  };
}


