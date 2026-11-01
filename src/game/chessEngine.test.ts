import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BOARD_COLOR_SCHEMES,
  ChessEngine,
  INITIAL_FEN,
  classifyMoveByEvalDelta,
  buildEvalTimelineData,
  detectChessOpening,
  exportGameToPGN,
  parseVoiceChessCommand,
  DEFAULT_TOP_STREAKS,
  DEFAULT_FASTEST_SOLVERS,
  upsertTopStreakEntries,
  upsertFastestSolverEntries,
} from './chessEngine';
import {
  MATE_IN_ONE_PUZZLES,
  evaluateCommentaryAndMood,
  getHumanBanterResponse,
  AI_PERSONALITIES,
} from './personalities';
import {
  LICHESS_250_PUZZLES,
  getPuzzleSkillTier,
  evaluateMultiMovePuzzleStep,
  evaluatePuzzleRushAttempt,
  generateJarvisCalculationTick,
  generateTelemetryTick,
  HINGLISH_WRONG_MOVE_ROASTS,
  FORMAL_WRONG_MOVE_LINES,
  formatChessTextForSpeech,
  buildProsodicSpeechQueue,
  getTimerVisualState,
  PREFERRED_NEURAL_VOICE_IDS,
  selectPreferredNeuralVoice,
  buildInitialPuzzleStemMoves,
  appendSessionMoveRecord,
  buildFullMatchMoveRecords,
  createInitialSpatialPhysicsState,
  stepSpatialTensorPhysics,
} from './puzzleRushEngine';

test('Initial chess position has 20 legal moves for White and balanced evaluation', () => {
  const engine = new ChessEngine(INITIAL_FEN);
  const moves = engine.getLegalMoves();
  assert.equal(moves.length, 20);
  assert.equal(engine.getStatus().evaluation, 0);
  assert.equal(engine.getTurn(), 'w');
});

test('Making e2-e4 and Black reply preserves full move history across getStatus calls', () => {
  const engine = new ChessEngine(INITIAL_FEN);
  const move1 = engine.makeMove('e2', 'e4');
  assert.ok(move1);
  assert.equal(move1.san, 'e4');
  assert.equal(engine.getTurn(), 'b');
  assert.equal(engine.getStatus().inCheck, false);
  assert.equal(engine.getHistory().length, 1);

  const move2 = engine.makeMove('e7', 'e5');
  assert.ok(move2);
  assert.equal(move2.san, 'e5');
  assert.equal(engine.getStatus().turn, 'w');
  assert.equal(engine.getHistory().length, 2);
});

test('All Mate-in-1 puzzles in MATE_IN_ONE_PUZZLES produce immediate checkmate on solution move', () => {
  for (const puzzle of MATE_IN_ONE_PUZZLES) {
    const engine = new ChessEngine(puzzle.fen);
    const move = engine.makeMove(puzzle.solutionFrom, puzzle.solutionTo);
    assert.ok(move, `Puzzle ${puzzle.id} solution move ${puzzle.solutionFrom}->${puzzle.solutionTo} must be legal`);
    const status = engine.getStatus();
    assert.equal(
      status.isCheckmate,
      true,
      `Puzzle ${puzzle.id} (${puzzle.title}) must result in checkmate after ${puzzle.solutionSan}`
    );
  }
});

test('AI selectBestMove works across granular Stockfish difficulty slider levels (0 to 20)', () => {
  const engine = new ChessEngine(INITIAL_FEN);
  engine.makeMove('e2', 'e4');

  for (const skill of [0, 1, 5, 10, 15, 20]) {
    const result = engine.selectBestMove(skill);
    assert.ok(result.move, `Skill ${skill} should return a legal move`);
    assert.ok(result.depth > 0, `Skill ${skill} should report positive depth`);
    assert.ok(result.nodes > 0, `Skill ${skill} should report positive nodes`);
  }
});

test('Commentary and mood evaluator maps blunders to evil and checkmate to happy with human stage directions', () => {
  const blunderResult = evaluateCommentaryAndMood({
    personalityId: 'robot',
    evalBefore: 0.2,
    evalAfter: -2.5,
    isPlayerCheckmate: false,
    isAICheckmate: false,
    aiGaveCheck: false,
  });
  assert.equal(blunderResult.mood, 'evil');
  assert.ok(AI_PERSONALITIES.robot.roastsOnBlunder.includes(blunderResult.text));
  assert.ok(blunderResult.emotionLabel.length > 0);
  assert.ok(blunderResult.stageDirection.startsWith('*'));

  const winResult = evaluateCommentaryAndMood({
    personalityId: 'cat',
    evalBefore: 3.0,
    evalAfter: 99.9,
    isPlayerCheckmate: true,
    isAICheckmate: false,
    aiGaveCheck: false,
  });
  assert.equal(winResult.mood, 'happy');
  assert.equal(winResult.vocalCue, 'hype');

  const banter = getHumanBanterResponse('robot', 'roast');
  assert.equal(banter.mood, 'evil');
  assert.equal(banter.vocalCue, 'laugh');
});

test('Human voice prosody splits Hinglish lines into natural breathing clauses', () => {
  const sample =
    'Stockfish bol raha hai thank you for the free win! Arre bhai, itna bada blunder kaise maar diya yaar?';
  const queue = buildProsodicSpeechQueue(sample, 1.0, 1.0);
  assert.equal(queue.length, 2);
  assert.equal(
    queue[0].text,
    'Stockfish bol raha hai thank you for the free win!'
  );
  assert.equal(
    queue[1].text,
    'Arre bhai, itna bada blunder kaise maar diya yaar?'
  );
});

test('Move history log categorizes moves into Excellent, Mistake, and Blunder based on Stockfish evaluation delta', () => {
  assert.equal(classifyMoveByEvalDelta(0.45), 'Excellent');
  assert.equal(classifyMoveByEvalDelta(-0.65), 'Mistake');
  assert.equal(classifyMoveByEvalDelta(-2.2), 'Blunder');
  assert.equal(classifyMoveByEvalDelta(0.05), 'Good');

  const engine = new ChessEngine(INITIAL_FEN);
  engine.makeMove('e2', 'e4'); // 1. e4 (+0.40 -> Excellent)
  engine.makeMove('e7', 'e5'); // 1... e5 (+0.40 -> Excellent)
  engine.makeMove('g1', 'f3'); // 2. Nf3 (+0.50 -> Excellent)
  engine.makeMove('b8', 'c6'); // 2... Nc6 (+0.50 -> Excellent)
  engine.makeMove('f3', 'g1'); // 3. Ng1 (-0.50 -> Mistake)
  engine.makeMove('f8', 'c5'); // 3... Bc5 (+0.30 -> Excellent)
  engine.makeMove('d1', 'h5'); // 4. Qh5
  engine.makeMove('g8', 'f6'); // 4... Nf6
  engine.makeMove('h5', 'f7'); // 5. Qxf7+ (hangs Queen -> Blunder after Kxf7)
  engine.makeMove('e8', 'f7'); // 5... Kxf7

  const history = engine.getHistory();
  assert.equal(history[0].quality, 'Excellent');
  assert.equal(history[4].quality, 'Mistake');
  assert.equal(history[8].quality, 'Blunder');

  const timeline = buildEvalTimelineData(history);
  assert.equal(timeline.length, 10);
  assert.equal(timeline[0].moveLabel, '1. e4');
  assert.equal(timeline[0].clampedEval, 0.4);
  assert.equal(timeline[8].moveLabel, '5. Qxf7+');
  assert.equal(timeline[8].quality, 'Blunder');
  assert.ok(timeline[9].clampedEval < -5);
});

test('detectChessOpening identifies Ruy Lopez, Italian Game, Sicilian Defense, and FEN positions', () => {
  const engine = new ChessEngine(INITIAL_FEN);
  assert.equal(
    detectChessOpening(engine.getHistory(), engine.getFen()).name,
    'Standard Starting Position'
  );

  engine.makeMove('e2', 'e4');
  assert.equal(
    detectChessOpening(engine.getHistory(), engine.getFen()).name,
    "King's Pawn Opening"
  );

  engine.makeMove('e7', 'e5');
  engine.makeMove('g1', 'f3');
  engine.makeMove('b8', 'c6');
  engine.makeMove('f1', 'b5');

  const ruyLopez = detectChessOpening(engine.getHistory(), engine.getFen());
  assert.equal(ruyLopez.eco, 'C60');
  assert.equal(ruyLopez.name, 'Ruy Lopez');

  // Also test FEN-only detection when move history is empty
  const fenOnlyRuy = detectChessOpening(
    [],
    'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3'
  );
  assert.equal(fenOnlyRuy.name, 'Ruy Lopez');
});

test('parseVoiceChessCommand parses natural voice commands into legal chess moves', () => {
  const engine = new ChessEngine(INITIAL_FEN);
  const legal = engine.getLegalMoves();

  const m1 = parseVoiceChessCommand('e2 to e4', legal);
  assert.ok(m1);
  assert.equal(m1.san, 'e4');

  const m2 = parseVoiceChessCommand('pawn e4', legal);
  assert.ok(m2);
  assert.equal(m2.san, 'e4');

  const m3 = parseVoiceChessCommand('knight f3', legal);
  assert.ok(m3);
  assert.equal(m3.san, 'Nf3');
});

test('Puzzle Rush leaderboard helpers maintain Top 5 Streaks and Top 3 Fastest Solvers', () => {
  const updatedStreaks = upsertTopStreakEntries(
    DEFAULT_TOP_STREAKS,
    'Vikram Champion',
    9,
    2.4
  );
  assert.equal(updatedStreaks.length, 5);
  assert.equal(updatedStreaks[0].playerName, 'Vikram Champion');
  assert.equal(updatedStreaks[0].streak, 9);

  const updatedFastest = upsertFastestSolverEntries(
    DEFAULT_FASTEST_SOLVERS,
    'Vikram Champion',
    2.4,
    "Scholar's Mate on f7"
  );
  assert.equal(updatedFastest.length, 3);
  assert.equal(updatedFastest[0].playerName, 'Vikram Champion');
  assert.equal(updatedFastest[0].label, 'Solved in 2.4s');
});

test('exportGameToPGN formats move history into valid PGN and BOARD_COLOR_SCHEMES defines all themes', () => {
  const engine = new ChessEngine(INITIAL_FEN);
  engine.makeMove('e2', 'e4');
  engine.makeMove('e7', 'e5');
  engine.makeMove('g1', 'f3');
  engine.makeMove('b8', 'c6');
  engine.makeMove('f1', 'b5');

  const pgn = exportGameToPGN(engine.getHistory(), {
    white: 'Aarav',
    black: 'Stockfish AI',
    result: '*',
  });
  assert.ok(pgn.includes('[White "Aarav"]'));
  assert.ok(pgn.includes('[Opening "Ruy Lopez"]'));
  assert.ok(pgn.includes('1. e4 e5 2. Nf3 Nc6 3. Bb5 *'));

  assert.ok(BOARD_COLOR_SCHEMES['midnight-blue']);
  assert.ok(BOARD_COLOR_SCHEMES['forest-green']);
  assert.ok(BOARD_COLOR_SCHEMES['classic-wood']);
  assert.ok(BOARD_COLOR_SCHEMES['monochrome-bw']);
});

test('All 250 puzzles in LICHESS_250_PUZZLES are strictly Very Hard Mate-in-2 and deliver Checkmate on Move 2', () => {
  assert.equal(LICHESS_250_PUZZLES.length, 250);
  const uniqueBoardFens = new Set(
    LICHESS_250_PUZZLES.map((p) => p.fen.split(' ')[0])
  );
  assert.equal(
    uniqueBoardFens.size,
    250,
    'All 250 Mate-in-2 puzzles must have 100% unique board positions'
  );

  for (const puzzle of LICHESS_250_PUZZLES) {
    assert.equal(
      puzzle.mateIn,
      2,
      `Puzzle ${puzzle.id} must be Mate in 2, got ${puzzle.mateIn}`
    );
    assert.equal(
      puzzle.solutionSteps.length,
      2,
      `Puzzle ${puzzle.id} must have 2 solution steps for White`
    );
    assert.ok(
      puzzle.rating >= 2200,
      `Puzzle ${puzzle.id} must be Very Hard (2200+ ELO), got ${puzzle.rating}`
    );

    const engine = new ChessEngine(puzzle.fen);
    const step0 = puzzle.solutionSteps[0];
    const move1 = engine.makeMove(step0.from, step0.to, step0.promotion || 'q');
    assert.ok(
      move1,
      `Puzzle ${puzzle.id} Move 1 (${step0.from}->${step0.to}) must be legal`
    );
    assert.equal(
      engine.getStatus().isCheckmate,
      false,
      `Puzzle ${puzzle.id} Move 1 (${step0.san}) must NOT be Mate in 1`
    );

    assert.ok(
      step0.opponentReply,
      `Puzzle ${puzzle.id} Step 0 must define Black's forced reply`
    );
    const reply = engine.makeMove(
      step0.opponentReply.from,
      step0.opponentReply.to,
      step0.opponentReply.promotion || 'q'
    );
    assert.ok(
      reply,
      `Puzzle ${puzzle.id} Black reply (${step0.opponentReply.from}->${step0.opponentReply.to}) must be legal`
    );

    const step1 = puzzle.solutionSteps[1];
    const move2 = engine.makeMove(step1.from, step1.to, step1.promotion || 'q');
    assert.ok(
      move2,
      `Puzzle ${puzzle.id} Move 2 (${step1.from}->${step1.to}) must be legal`
    );
    const status = engine.getStatus();
    assert.equal(
      status.isCheckmate,
      true,
      `Puzzle ${puzzle.id} Move 2 (${step1.san}) must deliver checkmate`
    );
  }
});

test('Mate-in-2 puzzle evaluator and J.A.R.V.I.S. calculation stream work accurately', () => {
  const puzzle = LICHESS_250_PUZZLES[0]; // Mate in 2: 1. Qb8+ Nxb8 2. Rd8#
  const step1Outcome = evaluateMultiMovePuzzleStep(
    puzzle.fen,
    puzzle,
    0,
    puzzle.solutionSteps[0].from,
    puzzle.solutionSteps[0].to,
    false,
    0
  );
  assert.equal(step1Outcome.status, 'CONTINUE');
  assert.ok(step1Outcome.opponentReply);
  assert.equal(step1Outcome.nextStepIndex, 1);

  // Advance engine through Move 1 and Black's forced reply, then verify Move 2 solves the puzzle
  const engine = new ChessEngine(puzzle.fen);
  engine.makeMove(puzzle.solutionSteps[0].from, puzzle.solutionSteps[0].to);
  engine.makeMove(
    step1Outcome.opponentReply.from,
    step1Outcome.opponentReply.to
  );

  const step2Outcome = evaluateMultiMovePuzzleStep(
    engine.getFen(),
    puzzle,
    1,
    puzzle.solutionSteps[1].from,
    puzzle.solutionSteps[1].to,
    false,
    0
  );
  assert.equal(step2Outcome.status, 'SOLVED');
  assert.equal(step2Outcome.opponentReply, null);

  // Also test wrong move roasts in Hinglish and Formal modes
  const wrongHinglish = evaluateMultiMovePuzzleStep(
    puzzle.fen,
    puzzle,
    0,
    'd1',
    'd2',
    false,
    0
  );
  assert.equal(wrongHinglish.status, 'WRONG');
  assert.ok(HINGLISH_WRONG_MOVE_ROASTS.includes(wrongHinglish.speechText));

  const wrongFormal = evaluateMultiMovePuzzleStep(
    puzzle.fen,
    puzzle,
    0,
    'd1',
    'd2',
    true,
    1
  );
  assert.equal(wrongFormal.status, 'WRONG');
  assert.ok(FORMAL_WRONG_MOVE_LINES.includes(wrongFormal.speechText));

  const jarvis = generateJarvisCalculationTick(4, 8, true, puzzle, 0, false, 9.9);
  assert.ok(jarvis.depth >= 18);
  assert.equal(jarvis.evalFormatted, '+M2');
  assert.equal(jarvis.multiPvLines.length, 3);
  assert.ok(jarvis.jarvisThought.length > 10);

  const telemetry = generateTelemetryTick(4, 8, true);
  assert.ok(telemetry.depth >= 18);
  assert.ok(telemetry.nodesFormatted.endsWith('M'));
});

test('getPuzzleSkillTier categorizes Lichess puzzle ratings into Beginner, Intermediate, and Expert badges', () => {
  const beg = getPuzzleSkillTier(1420);
  assert.equal(beg.tier, 'Beginner');
  assert.equal(beg.rangeLabel, '<1650');

  const mid = getPuzzleSkillTier(1780);
  assert.equal(mid.tier, 'Intermediate');
  assert.equal(mid.rangeLabel, '1650–1999');

  const exp = getPuzzleSkillTier(2180);
  assert.equal(exp.tier, 'Expert');
  assert.equal(exp.rangeLabel, '2000+');

  for (const p of LICHESS_250_PUZZLES) {
    assert.equal(p.skillTier, 'Expert');
    assert.equal(p.skillTier, getPuzzleSkillTier(p.rating).tier);
  }
});

test('formatChessTextForSpeech and buildProsodicSpeechQueue convert SAN moves and notation into natural human speech', () => {
  const spoken1 = formatChessTextForSpeech(
    'Time up! Solution was 1. Qxf7# — moving on to the next puzzle.'
  );
  assert.ok(spoken1.includes('Queen takes f 7, checkmate'));
  assert.ok(!spoken1.includes('Qxf7#'));

  const spoken2 = formatChessTextForSpeech(
    "J.A.R.V.I.S. locked #1 (30s): F3→F7 or Rg8# for Sir/Ma'am!"
  );
  assert.ok(spoken2.includes('Jarvis'));
  assert.ok(spoken2.includes('Puzzle 1'));
  assert.ok(spoken2.includes('30 seconds'));
  assert.ok(spoken2.includes('f3 to f7'));
  assert.ok(spoken2.includes('Rook to g 8, checkmate'));
  assert.ok(spoken2.includes('Grandmaster'));

  const queue = buildProsodicSpeechQueue(
    'Kya baat hai! 1. Qh7# seals the King. Tactical masterclass.',
    1.0,
    1.0
  );
  assert.equal(queue.length, 3);
  assert.equal(queue[0].contour, 'excited');
  assert.ok(queue[0].pauseAfterMs > 200);
  assert.ok(queue[1].text.includes('Queen to h 7, checkmate'));
  assert.equal(queue[1].containsChessMove, true);
  assert.ok(
    queue[1].pauseAfterMs >= 300,
    `Expected move clause pause >= 300ms, got ${queue[1].pauseAfterMs}`
  );
  assert.equal(queue[2].pauseAfterMs, 0);
});

test('selectPreferredNeuralVoice prioritizes preferred neural voice identifiers like Microsoft Aria and Google US English Female', () => {
  assert.ok(PREFERRED_NEURAL_VOICE_IDS.includes('Microsoft Aria'));
  assert.ok(PREFERRED_NEURAL_VOICE_IDS.includes('Google US English Female'));

  const mockBrowserVoices = [
    { name: 'eSpeak Robotic Default', lang: 'en-US', localService: true },
    { name: 'Google US English Female', lang: 'en-US', localService: false },
    {
      name: 'Microsoft Aria Online (Natural) - English (United States)',
      lang: 'en-US',
      localService: false,
    },
  ];

  const selectedDefault = selectPreferredNeuralVoice(mockBrowserVoices);
  assert.ok(selectedDefault);
  assert.equal(
    selectedDefault.name,
    'Microsoft Aria Online (Natural) - English (United States)'
  );

  const selectedGoogle = selectPreferredNeuralVoice(
    [
      { name: 'eSpeak Robotic Default', lang: 'en-US', localService: true },
      { name: 'Google US English Female', lang: 'en-US', localService: false },
    ],
    ['Microsoft Aria', 'Google US English Female']
  );
  assert.ok(selectedGoogle);
  assert.equal(selectedGoogle.name, 'Google US English Female');
});

test('getTimerVisualState activates subtle sub-5-second glow pulse only when timer is running and timeLeft < 5', () => {
  const nominal = getTimerVisualState(18, true, 'ACTIVE');
  assert.equal(nominal.isWarningTime, false);
  assert.equal(nominal.isSubFiveGlow, false);
  assert.equal(nominal.urgencyLevel, 'nominal');

  const warningAt8 = getTimerVisualState(8, true, 'ACTIVE');
  assert.equal(warningAt8.isWarningTime, true);
  assert.equal(warningAt8.isSubFiveGlow, false);
  assert.equal(warningAt8.urgencyLevel, 'warning');

  const sub5At4 = getTimerVisualState(4, true, 'ACTIVE');
  assert.equal(sub5At4.isWarningTime, true);
  assert.equal(sub5At4.isSubFiveGlow, true);
  assert.equal(sub5At4.urgencyLevel, 'sub5-glow');

  const pausedAt3 = getTimerVisualState(3, false, 'ACTIVE');
  assert.equal(pausedAt3.isSubFiveGlow, false);
});

test('buildInitialPuzzleStemMoves, appendSessionMoveRecord, and buildFullMatchMoveRecords synchronize algebraic notation with engine moves', () => {
  const p1 = LICHESS_250_PUZZLES[0];
  const initialMoves = buildInitialPuzzleStemMoves(p1);
  assert.ok(initialMoves.length >= 2);
  assert.equal(initialMoves[0].moveNumber, 1);
  assert.equal(initialMoves[0].whiteSan, 'e4');
  assert.equal(initialMoves[0].status, 'stem');

  const afterAttempt = appendSessionMoveRecord(initialMoves, {
    puzzle: p1,
    san: 'Qd3',
    uci: 'f3d3',
    status: 'attempt',
  });
  assert.equal(afterAttempt.length, initialMoves.length + 1);
  const attemptRow = afterAttempt[afterAttempt.length - 1];
  assert.equal(attemptRow.whiteSan, 'Qd3?');
  assert.equal(attemptRow.status, 'attempt');

  const afterSolved = appendSessionMoveRecord(afterAttempt, {
    puzzle: p1,
    san: 'Qxf7#',
    uci: 'f3f7',
    status: 'solved',
  });
  const solvedRow = afterSolved[afterSolved.length - 1];
  assert.equal(solvedRow.whiteSan, 'Qxf7#');
  assert.equal(solvedRow.blackSan, '1-0');
  assert.equal(solvedRow.status, 'solved');

  const matchPairs = buildFullMatchMoveRecords(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']);
  assert.equal(matchPairs.length, 3);
  assert.equal(matchPairs[0].whiteSan, 'e4');
  assert.equal(matchPairs[0].blackSan, 'e5');
  assert.equal(matchPairs[2].whiteSan, 'Bb5');
  assert.equal(matchPairs[2].blackSan, undefined);
});

test('stepSpatialTensorPhysics advances 3D/4D Euler angles, spring-damper radial expansion, and Rubik slice twist kinematics', () => {
  let state = createInitialSpatialPhysicsState();
  const initialExpansion = state.expansion;

  state = stepSpatialTensorPhysics(state, {
    isActive: true,
    impulse: 1.2,
    pointerTorqueX: 0.4,
    pointerTorqueY: -0.3,
  });

  assert.ok(
    state.expansion > initialExpansion,
    `Expected radial spring expansion to increase after impulse, got ${state.expansion}`
  );
  assert.ok(state.sliceAngle > 0);
  assert.ok(state.kineticEnergyJ > 12);
  assert.ok(state.tensorStressGPa > 2.8);
});

