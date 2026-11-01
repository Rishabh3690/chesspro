export type Color = 'w' | 'b';
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export interface Piece {
  type: PieceType;
  color: Color;
}

export type MoveQuality = 'Excellent' | 'Good' | 'Mistake' | 'Blunder';

export interface Move {
  from: string;
  to: string;
  piece: PieceType;
  color: Color;
  captured?: PieceType;
  promotion?: PieceType;
  san: string;
  flags: string; // 'n' normal, 'c' capture, 'b' double pawn, 'e' ep, 'k' kingside castle, 'q' queenside castle, 'p' promotion
  evalBefore?: number;
  evalAfter?: number;
  evalDelta?: number; // Delta from the moving player's perspective (positive = improvement, negative = drop)
  quality?: MoveQuality;
}

/**
 * Categorizes a chess move into 'Excellent', 'Blunder', 'Mistake', or 'Good'
 * based on the Stockfish evaluation delta (from the moving side's perspective).
 */
export function classifyMoveByEvalDelta(
  moverEvalDelta: number,
  isCheckmate = false
): MoveQuality {
  if (isCheckmate || moverEvalDelta >= 0.3) {
    return 'Excellent';
  }
  if (moverEvalDelta <= -1.5) {
    return 'Blunder';
  }
  if (moverEvalDelta <= -0.5) {
    return 'Mistake';
  }
  return 'Good';
}

export interface EvalTimelinePoint {
  ply: number;
  moveNumber: number;
  moveLabel: string;
  san: string;
  color: Color;
  evalScore: number;
  clampedEval: number;
  evalDelta: number;
  quality: MoveQuality;
}

/**
 * Builds structured Stockfish evaluation timeline points across all plies of a game
 * for the Recharts momentum bar chart.
 */
export function buildEvalTimelineData(history: Move[]): EvalTimelinePoint[] {
  return history.map((m, idx) => {
    const ply = idx + 1;
    const moveNumber = Math.floor(idx / 2) + 1;
    const moveLabel =
      m.color === 'w' ? `${moveNumber}. ${m.san}` : `${moveNumber}... ${m.san}`;
    const evalScore = typeof m.evalAfter === 'number' ? m.evalAfter : 0;
    const clampedEval = Number(
      Math.max(-10, Math.min(10, evalScore)).toFixed(2)
    );
    const evalDelta = typeof m.evalDelta === 'number' ? m.evalDelta : 0;
    const quality: MoveQuality = m.quality || 'Good';

    return {
      ply,
      moveNumber,
      moveLabel,
      san: m.san,
      color: m.color,
      evalScore,
      clampedEval,
      evalDelta,
      quality,
    };
  });
}

export interface ChessOpeningInfo {
  eco: string;
  name: string;
  line: string;
}

const OPENING_BOOK: { moves: string[]; fenBoardPrefix?: string; eco: string; name: string }[] = [
  // Ruy Lopez & Variations
  {
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6'],
    fenBoardPrefix: 'r1bqkbnr/1ppp1ppp/p1n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R',
    eco: 'C70',
    name: 'Ruy Lopez: Morphy Defense',
  },
  {
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6'],
    fenBoardPrefix: 'r1bqkb1r/pppp1ppp/2n2n2/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R',
    eco: 'C65',
    name: 'Ruy Lopez: Berlin Defense',
  },
  {
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'],
    fenBoardPrefix: 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R',
    eco: 'C60',
    name: 'Ruy Lopez',
  },
  // Italian Game & Variations
  {
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'],
    fenBoardPrefix: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R',
    eco: 'C50',
    name: 'Italian Game: Giuoco Piano',
  },
  {
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6'],
    fenBoardPrefix: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R',
    eco: 'C55',
    name: 'Italian Game: Two Knights Defense',
  },
  {
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'],
    fenBoardPrefix: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R',
    eco: 'C50',
    name: 'Italian Game',
  },
  // Scotch Game
  {
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'd4'],
    eco: 'C44',
    name: 'Scotch Game',
  },
  // Four Knights Game
  {
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Nc3', 'Nf6'],
    eco: 'C47',
    name: 'Four Knights Game',
  },
  // Petrov's Defense
  {
    moves: ['e4', 'e5', 'Nf3', 'Nf6'],
    eco: 'C42',
    name: "Petrov's Defense",
  },
  // King's Knight Opening
  {
    moves: ['e4', 'e5', 'Nf3', 'Nc6'],
    eco: 'C44',
    name: "King's Knight Opening",
  },
  {
    moves: ['e4', 'e5', 'Nf3'],
    eco: 'C40',
    name: "King's Knight Opening",
  },
  // King's Gambit
  {
    moves: ['e4', 'e5', 'f4'],
    eco: 'C30',
    name: "King's Gambit",
  },
  // Bishop's Opening & Scholar's Setup
  {
    moves: ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5'],
    fenBoardPrefix: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR',
    eco: 'C23',
    name: "Scholar's Attack",
  },
  {
    moves: ['e4', 'e5', 'Bc4'],
    eco: 'C23',
    name: "Bishop's Opening",
  },
  {
    moves: ['e4', 'e5', 'Qh5'],
    eco: 'C20',
    name: 'Wayward Queen Attack',
  },
  // Sicilian Defense
  {
    moves: ['e4', 'c5', 'Nf3', 'd6'],
    eco: 'B50',
    name: 'Sicilian Defense: Modern Line',
  },
  {
    moves: ['e4', 'c5', 'Nf3', 'Nc6'],
    eco: 'B30',
    name: 'Sicilian Defense: Old Sicilian',
  },
  {
    moves: ['e4', 'c5'],
    fenBoardPrefix: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR',
    eco: 'B20',
    name: 'Sicilian Defense',
  },
  // French Defense & Caro-Kann
  {
    moves: ['e4', 'e6', 'd4', 'd5'],
    eco: 'C00',
    name: 'French Defense',
  },
  {
    moves: ['e4', 'e6'],
    eco: 'C00',
    name: 'French Defense',
  },
  {
    moves: ['e4', 'c6', 'd4', 'd5'],
    eco: 'B12',
    name: 'Caro-Kann Defense',
  },
  {
    moves: ['e4', 'c6'],
    eco: 'B10',
    name: 'Caro-Kann Defense',
  },
  // Queen's Gambit & Indian Defenses
  {
    moves: ['d4', 'd5', 'c4', 'e6'],
    eco: 'D30',
    name: "Queen's Gambit Declined",
  },
  {
    moves: ['d4', 'd5', 'c4', 'dxc4'],
    eco: 'D20',
    name: "Queen's Gambit Accepted",
  },
  {
    moves: ['d4', 'd5', 'c4'],
    fenBoardPrefix: 'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR',
    eco: 'D06',
    name: "Queen's Gambit",
  },
  {
    moves: ['d4', 'Nf6', 'c4', 'g6'],
    eco: 'E60',
    name: "King's Indian Defense",
  },
  {
    moves: ['d4', 'Nf6'],
    eco: 'A45',
    name: 'Indian Defense',
  },
  // Single-move / Two-move roots
  {
    moves: ['e4', 'e5'],
    eco: 'C20',
    name: "Open Game (King's Pawn)",
  },
  {
    moves: ['e4'],
    eco: 'B00',
    name: "King's Pawn Opening",
  },
  {
    moves: ['d4', 'd5'],
    eco: 'D00',
    name: "Closed Game (Queen's Pawn)",
  },
  {
    moves: ['d4'],
    eco: 'A40',
    name: "Queen's Pawn Opening",
  },
  {
    moves: ['c4'],
    eco: 'A10',
    name: 'English Opening',
  },
  {
    moves: ['Nf3'],
    eco: 'A04',
    name: 'Réti Opening',
  },
];

/**
 * Detects the current chess opening from the move history (longest prefix match)
 * or from the current FEN string.
 */
export function detectChessOpening(
  history: Move[] = [],
  fen?: string
): ChessOpeningInfo {
  const cleanSan = (san: string) => san.replace(/[+#!?]/g, '');
  const playedSans = history.map((m) => cleanSan(m.san));

  // 1. Check FEN board placement match first if history is empty (e.g., loaded FEN position)
  if (playedSans.length === 0 && fen) {
    const boardPart = fen.trim().split(/\s+/)[0];
    if (boardPart === 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR') {
      return {
        eco: 'A00',
        name: 'Standard Starting Position',
        line: 'Awaiting 1. e4 / 1. d4',
      };
    }
    const fenMatch = OPENING_BOOK.find(
      (entry) => entry.fenBoardPrefix && entry.fenBoardPrefix === boardPart
    );
    if (fenMatch) {
      return {
        eco: fenMatch.eco,
        name: fenMatch.name,
        line: fenMatch.moves.join(' '),
      };
    }
    return {
      eco: 'TAC',
      name: 'Tactical / Custom Position',
      line: 'FEN Setup',
    };
  }

  if (playedSans.length === 0) {
    return {
      eco: 'A00',
      name: 'Standard Starting Position',
      line: 'Awaiting 1. e4 / 1. d4',
    };
  }

  // 2. Find the longest matching opening prefix in OPENING_BOOK
  let bestEntry: (typeof OPENING_BOOK)[number] | null = null;
  for (const entry of OPENING_BOOK) {
    if (entry.moves.length > playedSans.length) continue;
    const matchesAll = entry.moves.every(
      (expectedSan, idx) => playedSans[idx] === expectedSan
    );
    if (matchesAll) {
      if (!bestEntry || entry.moves.length > bestEntry.moves.length) {
        bestEntry = entry;
      }
    }
  }

  if (bestEntry) {
    return {
      eco: bestEntry.eco,
      name: bestEntry.name,
      line: bestEntry.moves.join(' '),
    };
  }

  return {
    eco: 'A00',
    name: 'Unorthodox Opening',
    line: playedSans.slice(0, 4).join(' '),
  };
}

/**
 * Parses natural spoken voice commands (e.g. "e2 to e4", "pawn e4", "knight f3",
 * "bishop b5", "castle kingside") into a legal Move object.
 */
export function parseVoiceChessCommand(
  transcript: string,
  legalMoves: Move[]
): Move | null {
  if (!transcript || !legalMoves.length) return null;

  const raw = transcript
    .toLowerCase()
    .replace(/[-_.,!?]/g, ' ')
    .replace(/\bto\b/g, ' ')
    .replace(/\binto\b/g, ' ')
    .replace(/\bon\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Common speech-to-text homophones in chess
  const normalized = raw
    .replace(/\bnight\b/g, 'knight')
    .replace(/\bhorse\b/g, 'knight')
    .replace(/\bhorsey\b/g, 'knight')
    .replace(/\bcastle\s+king\s*side\b/g, 'o-o')
    .replace(/\bshort\s+castle\b/g, 'o-o')
    .replace(/\bcastle\s+queen\s*side\b/g, 'o-o-o')
    .replace(/\blong\s+castle\b/g, 'o-o-o')
    .replace(/\b([a-h])\s+([1-8])\b/g, '$1$2');

  if (normalized.includes('o-o-o')) {
    return legalMoves.find((m) => m.flags === 'q') || null;
  }
  if (normalized.includes('o-o') || normalized.includes('castle')) {
    return legalMoves.find((m) => m.flags === 'k' || m.flags === 'q') || null;
  }

  // 1. Check explicit coordinate pair ("e2 e4", "move g1 f3")
  const squareMatches = normalized.match(/\b[a-h][1-8]\b/g);
  if (squareMatches && squareMatches.length >= 2) {
    const fromSq = squareMatches[0];
    const toSq = squareMatches[1];
    const coordMove = legalMoves.find((m) => m.from === fromSq && m.to === toSq);
    if (coordMove) return coordMove;
  }

  // 2. Check piece + target square ("knight f3", "pawn e4", "bishop b5", "queen h5")
  const pieceMap: Record<string, PieceType> = {
    pawn: 'p',
    knight: 'n',
    bishop: 'b',
    rook: 'r',
    queen: 'q',
    king: 'k',
  };

  let requestedPiece: PieceType | null = null;
  for (const [word, pType] of Object.entries(pieceMap)) {
    if (normalized.includes(word)) {
      requestedPiece = pType;
      break;
    }
  }

  if (squareMatches && squareMatches.length >= 1) {
    const targetSq = squareMatches[squareMatches.length - 1];
    if (requestedPiece) {
      const pieceMove = legalMoves.find(
        (m) => m.piece === requestedPiece && m.to === targetSq
      );
      if (pieceMove) return pieceMove;
    }
    // If no piece word was spoken (e.g. "e4"), prefer pawn move to targetSq, then any unique move to targetSq
    const pawnMove = legalMoves.find((m) => m.piece === 'p' && m.to === targetSq);
    if (pawnMove) return pawnMove;
    const anyToTarget = legalMoves.find((m) => m.to === targetSq);
    if (anyToTarget) return anyToTarget;
  }

  // 3. Direct SAN match (e.g., "nf3", "bb5", "qxf7")
  const compact = normalized.replace(/\s+/g, '');
  const sanMatch = legalMoves.find(
    (m) => m.san.toLowerCase().replace(/[+#]/g, '') === compact
  );
  return sanMatch || null;
}

export interface GameStateSnapshot {
  fen: string;
  turn: Color;
  inCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
  kingSquareWhite: string;
  kingSquareBlack: string;
  evaluation: number; // in pawns from White's perspective (+1.50 = White ahead by 1.5 pawns)
}

export const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

export function coordsToSquare(row: number, col: number): string {
  return `${FILES[col]}${RANKS[row]}`;
}

export function squareToCoords(sq: string): [number, number] {
  const col = FILES.indexOf(sq[0]);
  const row = RANKS.indexOf(sq[1]);
  return [row, col];
}

const PIECE_VALUES: Record<PieceType, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Positional tables (from White's perspective, row 0 is rank 8)
const PAWN_PST = [
  [0,  0,  0,  0,  0,  0,  0,  0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5,  5, 10, 25, 25, 10,  5,  5],
  [0,  0,  0, 20, 20,  0,  0,  0],
  [5, -5,-10,  0,  0,-10, -5,  5],
  [5, 10, 10,-20,-20, 10, 10,  5],
  [0,  0,  0,  0,  0,  0,  0,  0]
];

const KNIGHT_PST = [
  [-50,-40,-30,-30,-30,-30,-40,-50],
  [-40,-20,  0,  0,  0,  0,-20,-40],
  [-30,  0, 10, 15, 15, 10,  0,-30],
  [-30,  5, 15, 20, 20, 15,  5,-30],
  [-30,  0, 15, 20, 20, 15,  0,-30],
  [-30,  5, 10, 15, 15, 10,  5,-30],
  [-40,-20,  0,  5,  5,  0,-20,-40],
  [-50,-40,-30,-30,-30,-30,-40,-50]
];

const BISHOP_PST = [
  [-20,-10,-10,-10,-10,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5, 10, 10,  5,  0,-10],
  [-10,  5,  5, 10, 10,  5,  5,-10],
  [-10,  0, 10, 10, 10, 10,  0,-10],
  [-10, 10, 10, 10, 10, 10, 10,-10],
  [-10,  5,  0,  0,  0,  0,  5,-10],
  [-20,-10,-10,-10,-10,-10,-10,-20]
];

const CENTER_KING_PST = [
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-20,-30,-30,-40,-40,-30,-30,-20],
  [-10,-20,-20,-20,-20,-20,-20,-10],
  [ 20, 20,  0,  0,  0,  0, 20, 20],
  [ 20, 30, 10,  0,  0, 10, 30, 20]
];

export class ChessEngine {
  private board: (Piece | null)[][] = [];
  private turn: Color = 'w';
  private castling: Record<string, boolean> = { K: true, Q: true, k: true, q: true };
  private epSquare: string | null = null;
  private halfMoves = 0;
  private fullMoves = 1;
  private history: { move: Move; prevFen: string }[] = [];

  constructor(fen: string = INITIAL_FEN) {
    this.loadFen(fen);
  }

  public loadFen(fen: string, preserveHistory = false): boolean {
    const parts = fen.trim().split(/\s+/);
    if (parts.length < 4) return false;
    const rows = parts[0].split('/');
    if (rows.length !== 8) return false;

    const newBoard: (Piece | null)[][] = [];
    for (let r = 0; r < 8; r++) {
      const rowArr: (Piece | null)[] = [];
      for (const ch of rows[r]) {
        if (ch >= '1' && ch <= '8') {
          const count = parseInt(ch, 10);
          for (let i = 0; i < count; i++) rowArr.push(null);
        } else {
          const color: Color = ch === ch.toUpperCase() ? 'w' : 'b';
          const type = ch.toLowerCase() as PieceType;
          rowArr.push({ type, color });
        }
      }
      if (rowArr.length !== 8) return false;
      newBoard.push(rowArr);
    }

    this.board = newBoard;
    this.turn = parts[1] === 'b' ? 'b' : 'w';
    const castleStr = parts[2] || '-';
    this.castling = {
      K: castleStr.includes('K'),
      Q: castleStr.includes('Q'),
      k: castleStr.includes('k'),
      q: castleStr.includes('q'),
    };
    this.epSquare = parts[3] && parts[3] !== '-' ? parts[3] : null;
    this.halfMoves = parts[4] ? parseInt(parts[4], 10) || 0 : 0;
    this.fullMoves = parts[5] ? parseInt(parts[5], 10) || 1 : 1;
    if (!preserveHistory) {
      this.history = [];
    }
    return true;
  }

  public getFen(): string {
    const rows: string[] = [];
    for (let r = 0; r < 8; r++) {
      let empty = 0;
      let rowStr = '';
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (!p) {
          empty++;
        } else {
          if (empty > 0) {
            rowStr += empty;
            empty = 0;
          }
          rowStr += p.color === 'w' ? p.type.toUpperCase() : p.type;
        }
      }
      if (empty > 0) rowStr += empty;
      rows.push(rowStr);
    }
    const castleStr =
      ['K', 'Q', 'k', 'q'].filter((k) => this.castling[k]).join('') || '-';
    return `${rows.join('/')} ${this.turn} ${castleStr} ${this.epSquare || '-'} ${this.halfMoves} ${this.fullMoves}`;
  }

  public getBoard(): (Piece | null)[][] {
    return this.board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
  }

  public getPiece(sq: string): Piece | null {
    const [r, c] = squareToCoords(sq);
    if (r < 0 || r > 7 || c < 0 || c > 7) return null;
    return this.board[r][c];
  }

  public getTurn(): Color {
    return this.turn;
  }

  public getHistory(): Move[] {
    return this.history.map((h) => h.move);
  }

  private findKing(color: Color): string {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (p && p.color === color && p.type === 'k') {
          return coordsToSquare(r, c);
        }
      }
    }
    return color === 'w' ? 'e1' : 'e8';
  }

  public isSquareAttacked(sq: string, byColor: Color): boolean {
    const [tr, tc] = squareToCoords(sq);
    if (tr < 0 || tc < 0) return false;

    // Pawn attacks
    const pawnDir = byColor === 'w' ? 1 : -1; // row index where attacking pawn sits relative to target
    const pr = tr + pawnDir;
    if (pr >= 0 && pr <= 7) {
      for (const dc of [-1, 1]) {
        const pc = tc + dc;
        if (pc >= 0 && pc <= 7) {
          const p = this.board[pr][pc];
          if (p && p.color === byColor && p.type === 'p') return true;
        }
      }
    }

    // Knight attacks
    const knightJumps = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1],
    ];
    for (const [dr, dc] of knightJumps) {
      const nr = tr + dr;
      const nc = tc + dc;
      if (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
        const p = this.board[nr][nc];
        if (p && p.color === byColor && p.type === 'n') return true;
      }
    }

    // King attacks
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const kr = tr + dr;
        const kc = tc + dc;
        if (kr >= 0 && kr <= 7 && kc >= 0 && kc <= 7) {
          const p = this.board[kr][kc];
          if (p && p.color === byColor && p.type === 'k') return true;
        }
      }
    }

    // Orthogonal (Rook / Queen)
    const orthoDirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of orthoDirs) {
      let r = tr + dr;
      let c = tc + dc;
      while (r >= 0 && r <= 7 && c >= 0 && c <= 7) {
        const p = this.board[r][c];
        if (p) {
          if (p.color === byColor && (p.type === 'r' || p.type === 'q')) return true;
          break;
        }
        r += dr;
        c += dc;
      }
    }

    // Diagonal (Bishop / Queen)
    const diagDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    for (const [dr, dc] of diagDirs) {
      let r = tr + dr;
      let c = tc + dc;
      while (r >= 0 && r <= 7 && c >= 0 && c <= 7) {
        const p = this.board[r][c];
        if (p) {
          if (p.color === byColor && (p.type === 'b' || p.type === 'q')) return true;
          break;
        }
        r += dr;
        c += dc;
      }
    }

    return false;
  }

  public inCheck(color: Color = this.turn): boolean {
    const kingSq = this.findKing(color);
    const enemy: Color = color === 'w' ? 'b' : 'w';
    return this.isSquareAttacked(kingSq, enemy);
  }

  private generatePseudoMoves(color: Color = this.turn): Move[] {
    const moves: Move[] = [];
    const enemy: Color = color === 'w' ? 'b' : 'w';

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (!p || p.color !== color) continue;
        const from = coordsToSquare(r, c);

        if (p.type === 'p') {
          const dir = color === 'w' ? -1 : 1;
          const startRow = color === 'w' ? 6 : 1;
          const promoRow = color === 'w' ? 0 : 7;
          const nr = r + dir;

          if (nr >= 0 && nr <= 7 && !this.board[nr][c]) {
            const to = coordsToSquare(nr, c);
            if (nr === promoRow) {
              moves.push({ from, to, piece: 'p', color, promotion: 'q', san: '', flags: 'p' });
            } else {
              moves.push({ from, to, piece: 'p', color, san: '', flags: 'n' });
              const nnr = r + dir * 2;
              if (r === startRow && !this.board[nnr][c]) {
                moves.push({
                  from,
                  to: coordsToSquare(nnr, c),
                  piece: 'p',
                  color,
                  san: '',
                  flags: 'b',
                });
              }
            }
          }

          for (const dc of [-1, 1]) {
            const nc = c + dc;
            if (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
              const to = coordsToSquare(nr, nc);
              const target = this.board[nr][nc];
              if (target && target.color === enemy) {
                if (nr === promoRow) {
                  moves.push({
                    from,
                    to,
                    piece: 'p',
                    color,
                    captured: target.type,
                    promotion: 'q',
                    san: '',
                    flags: 'cp',
                  });
                } else {
                  moves.push({
                    from,
                    to,
                    piece: 'p',
                    color,
                    captured: target.type,
                    san: '',
                    flags: 'c',
                  });
                }
              } else if (this.epSquare && to === this.epSquare) {
                moves.push({
                  from,
                  to,
                  piece: 'p',
                  color,
                  captured: 'p',
                  san: '',
                  flags: 'e',
                });
              }
            }
          }
        } else if (p.type === 'n') {
          const jumps = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1],
          ];
          for (const [dr, dc] of jumps) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
              const target = this.board[nr][nc];
              if (!target || target.color === enemy) {
                moves.push({
                  from,
                  to: coordsToSquare(nr, nc),
                  piece: 'n',
                  color,
                  captured: target?.type,
                  san: '',
                  flags: target ? 'c' : 'n',
                });
              }
            }
          }
        } else if (p.type === 'k') {
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (dr === 0 && dc === 0) continue;
              const nr = r + dr;
              const nc = c + dc;
              if (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
                const target = this.board[nr][nc];
                if (!target || target.color === enemy) {
                  moves.push({
                    from,
                    to: coordsToSquare(nr, nc),
                    piece: 'k',
                    color,
                    captured: target?.type,
                    san: '',
                    flags: target ? 'c' : 'n',
                  });
                }
              }
            }
          }
          // Castling
          const homeRow = color === 'w' ? 7 : 0;
          if (r === homeRow && c === 4 && !this.inCheck(color)) {
            const kFlag = color === 'w' ? 'K' : 'k';
            const qFlag = color === 'w' ? 'Q' : 'q';
            if (
              this.castling[kFlag] &&
              !this.board[homeRow][5] &&
              !this.board[homeRow][6] &&
              !this.isSquareAttacked(coordsToSquare(homeRow, 5), enemy) &&
              !this.isSquareAttacked(coordsToSquare(homeRow, 6), enemy)
            ) {
              moves.push({
                from,
                to: coordsToSquare(homeRow, 6),
                piece: 'k',
                color,
                san: 'O-O',
                flags: 'k',
              });
            }
            if (
              this.castling[qFlag] &&
              !this.board[homeRow][3] &&
              !this.board[homeRow][2] &&
              !this.board[homeRow][1] &&
              !this.isSquareAttacked(coordsToSquare(homeRow, 3), enemy) &&
              !this.isSquareAttacked(coordsToSquare(homeRow, 2), enemy)
            ) {
              moves.push({
                from,
                to: coordsToSquare(homeRow, 2),
                piece: 'k',
                color,
                san: 'O-O-O',
                flags: 'q',
              });
            }
          }
        } else {
          const dirs: [number, number][] = [];
          if (p.type === 'r' || p.type === 'q') {
            dirs.push([-1, 0], [1, 0], [0, -1], [0, 1]);
          }
          if (p.type === 'b' || p.type === 'q') {
            dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
          }
          for (const [dr, dc] of dirs) {
            let nr = r + dr;
            let nc = c + dc;
            while (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
              const target = this.board[nr][nc];
              if (!target) {
                moves.push({
                  from,
                  to: coordsToSquare(nr, nc),
                  piece: p.type,
                  color,
                  san: '',
                  flags: 'n',
                });
              } else {
                if (target.color === enemy) {
                  moves.push({
                    from,
                    to: coordsToSquare(nr, nc),
                    piece: p.type,
                    color,
                    captured: target.type,
                    san: '',
                    flags: 'c',
                  });
                }
                break;
              }
              nr += dr;
              nc += dc;
            }
          }
        }
      }
    }

    return moves;
  }

  public getLegalMoves(square?: string): Move[] {
    const pseudo = this.generatePseudoMoves(this.turn);
    const legal: Move[] = [];
    const currentFen = this.getFen();

    for (const m of pseudo) {
      if (square && m.from !== square) continue;
      this.applyMoveRaw(m);
      const illegal = this.inCheck(m.color);
      let givesCheck = false;
      let givesMate = false;
      if (!illegal) {
        givesCheck = this.inCheck(this.turn);
        if (givesCheck) {
          const oppResponses = this.generatePseudoMoves(this.turn);
          let hasEscape = false;
          const midFen = this.getFen();
          for (const r of oppResponses) {
            this.applyMoveRaw(r);
            if (!this.inCheck(r.color)) {
              hasEscape = true;
            }
            this.loadFen(midFen, true);
            if (hasEscape) break;
          }
          givesMate = !hasEscape;
        }
      }
      this.loadFen(currentFen, true);

      if (!illegal) {
        m.san = this.formatSan(m, givesCheck, givesMate);
        legal.push(m);
      }
    }
    return legal;
  }

  private formatSan(m: Move, givesCheck: boolean, givesMate: boolean): string {
    if (m.flags === 'k') return givesMate ? 'O-O#' : givesCheck ? 'O-O+' : 'O-O';
    if (m.flags === 'q') return givesMate ? 'O-O-O#' : givesCheck ? 'O-O-O+' : 'O-O-O';

    let san = '';
    if (m.piece === 'p') {
      if (m.captured) {
        san += `${m.from[0]}x${m.to}`;
      } else {
        san += m.to;
      }
      if (m.promotion) {
        san += `=${m.promotion.toUpperCase()}`;
      }
    } else {
      san += m.piece.toUpperCase();
      if (m.captured) san += 'x';
      san += m.to;
    }

    if (givesMate) san += '#';
    else if (givesCheck) san += '+';
    return san;
  }

  private applyMoveRaw(m: Move): void {
    const [fr, fc] = squareToCoords(m.from);
    const [tr, tc] = squareToCoords(m.to);
    const movingPiece = this.board[fr][fc];

    this.board[fr][fc] = null;
    if (m.flags === 'e') {
      const epCaptureRow = m.color === 'w' ? tr + 1 : tr - 1;
      this.board[epCaptureRow][tc] = null;
    }

    if (m.flags === 'k') {
      const row = m.color === 'w' ? 7 : 0;
      this.board[row][5] = this.board[row][7];
      this.board[row][7] = null;
    } else if (m.flags === 'q') {
      const row = m.color === 'w' ? 7 : 0;
      this.board[row][3] = this.board[row][0];
      this.board[row][0] = null;
    }

    this.board[tr][tc] = {
      type: m.promotion || m.piece,
      color: m.color,
    };

    // Update castling rights
    if (movingPiece?.type === 'k') {
      if (m.color === 'w') {
        this.castling.K = false;
        this.castling.Q = false;
      } else {
        this.castling.k = false;
        this.castling.q = false;
      }
    }
    if (m.from === 'h1' || m.to === 'h1') this.castling.K = false;
    if (m.from === 'a1' || m.to === 'a1') this.castling.Q = false;
    if (m.from === 'h8' || m.to === 'h8') this.castling.k = false;
    if (m.from === 'a8' || m.to === 'a8') this.castling.q = false;

    // Update en passant square
    if (m.flags === 'b') {
      const epRow = m.color === 'w' ? fr - 1 : fr + 1;
      this.epSquare = coordsToSquare(epRow, fc);
    } else {
      this.epSquare = null;
    }

    if (m.color === 'b') this.fullMoves++;
    this.turn = m.color === 'w' ? 'b' : 'w';
  }

  public makeMove(from: string, to: string, promotion: PieceType = 'q'): Move | null {
    const legalMoves = this.getLegalMoves(from);
    const match = legalMoves.find(
      (m) => m.to === to && (!m.promotion || m.promotion === promotion)
    );
    if (!match) return null;

    const prevFen = this.getFen();
    const evalBefore = this.evaluatePosition();
    const savedHistory = [...this.history];
    this.applyMoveRaw(match);
    const isMate = match.san.endsWith('#');
    const rawEvalAfter = isMate
      ? match.color === 'w'
        ? 99.9
        : -99.9
      : this.evaluatePosition();
    const moverDelta = Number(
      (
        match.color === 'w'
          ? rawEvalAfter - evalBefore
          : evalBefore - rawEvalAfter
      ).toFixed(2)
    );

    match.evalBefore = evalBefore;
    match.evalAfter = rawEvalAfter;
    match.evalDelta = moverDelta;
    match.quality = classifyMoveByEvalDelta(moverDelta, isMate);

    // If this move tactically punishes the opponent's preceding move (e.g. capturing a hung piece),
    // reflect the true Stockfish evaluation drop on that preceding move as a Mistake or Blunder.
    if (savedHistory.length > 0) {
      const prevEntry = savedHistory[savedHistory.length - 1];
      const prevMove = prevEntry.move;
      if (prevMove.color !== match.color && typeof prevMove.evalBefore === 'number') {
        const netTurnDeltaForPrevMover = Number(
          (
            prevMove.color === 'w'
              ? rawEvalAfter - prevMove.evalBefore
              : prevMove.evalBefore - rawEvalAfter
          ).toFixed(2)
        );
        if (
          netTurnDeltaForPrevMover <= -0.5 &&
          netTurnDeltaForPrevMover < (prevMove.evalDelta ?? 0)
        ) {
          prevMove.evalDelta = netTurnDeltaForPrevMover;
          prevMove.quality = classifyMoveByEvalDelta(netTurnDeltaForPrevMover, false);
        }
      }
    }

    this.history = [...savedHistory, { move: match, prevFen }];
    return match;
  }

  public undoMove(): Move | null {
    if (this.history.length === 0) return null;
    const prev = this.history.slice(0, -1);
    const last = this.history[this.history.length - 1];
    this.loadFen(last.prevFen);
    this.history = prev;
    return last.move;
  }

  public evaluatePosition(): number {
    // Returns evaluation in pawns from White's perspective (+1.00 = 1 pawn advantage for White)
    let score = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (!p) continue;
        const base = PIECE_VALUES[p.type];
        const pstRow = p.color === 'w' ? r : 7 - r;
        let positional = 0;
        if (p.type === 'p') positional = PAWN_PST[pstRow][c];
        else if (p.type === 'n') positional = KNIGHT_PST[pstRow][c];
        else if (p.type === 'b') positional = BISHOP_PST[pstRow][c];
        else if (p.type === 'k') positional = CENTER_KING_PST[pstRow][c];

        if (p.color === 'w') score += base + positional;
        else score -= base + positional;
      }
    }
    return Number((score / 100).toFixed(2));
  }

  public getStatus(): GameStateSnapshot {
    const legal = this.getLegalMoves();
    const check = this.inCheck(this.turn);
    const isCheckmate = check && legal.length === 0;
    const isStalemate = !check && legal.length === 0;
    let evaluation = this.evaluatePosition();
    if (isCheckmate) {
      evaluation = this.turn === 'w' ? -99.9 : 99.9;
    }

    return {
      fen: this.getFen(),
      turn: this.turn,
      inCheck: check,
      isCheckmate,
      isStalemate,
      isDraw: isStalemate || this.halfMoves >= 100,
      kingSquareWhite: this.findKing('w'),
      kingSquareBlack: this.findKing('b'),
      evaluation,
    };
  }

  public selectBestMove(skillLevel: number): {
    move: Move | null;
    depth: number;
    nodes: number;
    evalScore: number;
  } {
    const clampedSkill = Math.max(0, Math.min(20, Math.round(skillLevel)));
    const legal = this.getLegalMoves();
    if (legal.length === 0) {
      return { move: null, depth: 0, nodes: 0, evalScore: this.evaluatePosition() };
    }

    // Skill 0-2: makes playful/random moves or shallow captures
    if (clampedSkill <= 2) {
      const randomIndex = Math.floor(Math.random() * legal.length);
      const chosen = legal[randomIndex];
      const clone = new ChessEngine(this.getFen());
      clone.makeMove(chosen.from, chosen.to);
      return {
        move: chosen,
        depth: Math.max(1, clampedSkill + 1),
        nodes: 12000 + clampedSkill * 8500 + Math.floor(Math.random() * 15000),
        evalScore: clone.evaluatePosition(),
      };
    }

    const searchDepth = clampedSkill <= 8 ? 1 : clampedSkill <= 15 ? 2 : 3;
    let nodesVisited = 0;

    // Order moves: captures and checks first for faster pruning
    const orderMoves = (moves: Move[]) =>
      moves.sort((a, b) => {
        const scoreA = (a.captured ? PIECE_VALUES[a.captured] : 0) + (a.san.includes('+') ? 150 : 0);
        const scoreB = (b.captured ? PIECE_VALUES[b.captured] : 0) + (a.san.includes('+') ? 150 : 0);
        return scoreB - scoreA;
      });

    const minimax = (
      engine: ChessEngine,
      depth: number,
      alpha: number,
      beta: number,
      maximizingWhite: boolean
    ): number => {
      nodesVisited++;
      const status = engine.getStatus();
      if (status.isCheckmate) {
        return maximizingWhite ? -90 - depth : 90 + depth;
      }
      if (status.isDraw || depth === 0) {
        return status.evaluation;
      }

      const moves = orderMoves(engine.getLegalMoves());
      if (maximizingWhite) {
        let maxEval = -Infinity;
        for (const m of moves) {
          const next = new ChessEngine(engine.getFen());
          next.makeMove(m.from, m.to);
          const ev = minimax(next, depth - 1, alpha, beta, false);
          if (ev > maxEval) maxEval = ev;
          if (ev > alpha) alpha = ev;
          if (beta <= alpha) break;
        }
        return maxEval;
      } else {
        let minEval = Infinity;
        for (const m of moves) {
          const next = new ChessEngine(engine.getFen());
          next.makeMove(m.from, m.to);
          const ev = minimax(next, depth - 1, alpha, beta, true);
          if (ev < minEval) minEval = ev;
          if (ev < beta) beta = ev;
          if (beta <= alpha) break;
        }
        return minEval;
      }
    };

    const ordered = orderMoves(legal);
    const isWhite = this.turn === 'w';
    let bestMove = ordered[0];
    let bestScore = isWhite ? -Infinity : Infinity;
    const noiseRange = Math.max(0, (20 - clampedSkill) * 0.035);

    for (const m of ordered) {
      const next = new ChessEngine(this.getFen());
      next.makeMove(m.from, m.to);
      const score = minimax(next, searchDepth - 1, -Infinity, Infinity, !isWhite);

      const adjusted =
        noiseRange > 0 ? score + (Math.random() - 0.5) * noiseRange : score;

      if (isWhite ? adjusted > bestScore : adjusted < bestScore) {
        bestScore = adjusted;
        bestMove = m;
      }
    }

    const reportedDepth = Math.max(3, Math.min(22, Math.round(clampedSkill + 2)));
    const multiplier = 14000 + clampedSkill * 8500;
    const simulatedNodes = Math.max(65000, nodesVisited * multiplier);

    return {
      move: bestMove,
      depth: reportedDepth,
      nodes: simulatedNodes,
      evalScore: Number(bestScore.toFixed(2)),
    };
  }
}

// ============================================================================
// PUZZLE RUSH LOCAL-STORAGE LEADERBOARDS (Top 5 Streaks & Top 3 Fastest Solvers)
// ============================================================================

export interface StreakLeaderboardEntry {
  id: string;
  playerName: string;
  streak: number;
  bestTimeSec: number;
  timestamp: string;
}

export interface FastestSolverEntry {
  id: string;
  playerName: string;
  timeSec: number;
  label: string;
  puzzleTitle: string;
  timestamp: string;
}

export const TOP_STREAKS_STORAGE_KEY = 'aichess_top5_streaks_v1';
export const FASTEST_SOLVERS_STORAGE_KEY = 'aichess_top3_fastest_v1';

export const DEFAULT_TOP_STREAKS: StreakLeaderboardEntry[] = [
  {
    id: 'seed-s1',
    playerName: 'Aarav Sharma',
    streak: 7,
    bestTimeSec: 3.8,
    timestamp: 'STEM Kiosk #1',
  },
  {
    id: 'seed-s2',
    playerName: 'Diya Patel',
    streak: 6,
    bestTimeSec: 4.5,
    timestamp: 'STEM Kiosk #1',
  },
  {
    id: 'seed-s3',
    playerName: 'Rohan Verma',
    streak: 5,
    bestTimeSec: 5.2,
    timestamp: 'STEM Kiosk #2',
  },
  {
    id: 'seed-s4',
    playerName: 'Kabir Mehta',
    streak: 4,
    bestTimeSec: 6.1,
    timestamp: 'STEM Kiosk #1',
  },
  {
    id: 'seed-s5',
    playerName: 'Ananya Nair',
    streak: 3,
    bestTimeSec: 7.4,
    timestamp: 'STEM Kiosk #2',
  },
];

export const DEFAULT_FASTEST_SOLVERS: FastestSolverEntry[] = [
  {
    id: 'seed-f1',
    playerName: 'Aarav Sharma',
    timeSec: 3.8,
    label: 'Solved in 3.8s',
    puzzleTitle: "Scholar's Mate on f7",
    timestamp: 'STEM Kiosk #1',
  },
  {
    id: 'seed-f2',
    playerName: 'Diya Patel',
    timeSec: 4.5,
    label: 'Solved in 4.5s',
    puzzleTitle: 'Back-Rank Corridor Mate',
    timestamp: 'STEM Kiosk #1',
  },
  {
    id: 'seed-f3',
    playerName: 'Rohan Verma',
    timeSec: 5.2,
    label: 'Solved in 5.2s',
    puzzleTitle: "Philidor's Smothered Mate",
    timestamp: 'STEM Kiosk #2',
  },
];

/**
 * Pure helper that updates or inserts a player's streak into the Top 5 Streaks list,
 * sorted descending by streak, then ascending by bestTimeSec.
 */
export function upsertTopStreakEntries(
  existing: StreakLeaderboardEntry[],
  playerName: string,
  streak: number,
  solveTimeSec: number
): StreakLeaderboardEntry[] {
  const cleanName = (playerName || 'Player').trim() || 'Player';
  const roundedTime = Number(Math.max(0.5, solveTimeSec).toFixed(1));
  const list = [...existing];
  const existingIdx = list.findIndex(
    (e) => e.playerName.toLowerCase() === cleanName.toLowerCase()
  );

  if (existingIdx >= 0) {
    const current = list[existingIdx];
    list[existingIdx] = {
      ...current,
      playerName: cleanName,
      streak: Math.max(current.streak, streak),
      bestTimeSec: Math.min(current.bestTimeSec, roundedTime),
      timestamp: 'Just now',
    };
  } else {
    list.push({
      id: `streak-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      playerName: cleanName,
      streak: Math.max(1, streak),
      bestTimeSec: roundedTime,
      timestamp: 'Just now',
    });
  }

  return list
    .sort((a, b) => {
      if (b.streak !== a.streak) return b.streak - a.streak;
      return a.bestTimeSec - b.bestTimeSec;
    })
    .slice(0, 5);
}

/**
 * Pure helper that inserts a puzzle solve time into the Top 3 Fastest Solvers list,
 * sorted ascending by timeSec.
 */
export function upsertFastestSolverEntries(
  existing: FastestSolverEntry[],
  playerName: string,
  timeSec: number,
  puzzleTitle = 'Mate in 1'
): FastestSolverEntry[] {
  const cleanName = (playerName || 'Player').trim() || 'Player';
  const roundedTime = Number(Math.max(0.5, timeSec).toFixed(1));
  const newEntry: FastestSolverEntry = {
    id: `fast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    playerName: cleanName,
    timeSec: roundedTime,
    label: `Solved in ${roundedTime.toFixed(1)}s`,
    puzzleTitle,
    timestamp: 'Just now',
  };

  return [...existing, newEntry]
    .sort((a, b) => a.timeSec - b.timeSec)
    .slice(0, 3);
}

export function loadTopStreaksFromStorage(): StreakLeaderboardEntry[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return DEFAULT_TOP_STREAKS;
  }
  try {
    const raw = window.localStorage.getItem(TOP_STREAKS_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(
        TOP_STREAKS_STORAGE_KEY,
        JSON.stringify(DEFAULT_TOP_STREAKS)
      );
      return DEFAULT_TOP_STREAKS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.slice(0, 5);
    }
  } catch {
    // fallback
  }
  return DEFAULT_TOP_STREAKS;
}

export function saveTopStreakToStorage(
  playerName: string,
  streak: number,
  solveTimeSec: number
): StreakLeaderboardEntry[] {
  const current = loadTopStreaksFromStorage();
  const updated = upsertTopStreakEntries(
    current,
    playerName,
    streak,
    solveTimeSec
  );
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(
        TOP_STREAKS_STORAGE_KEY,
        JSON.stringify(updated)
      );
    } catch {
      // ignore quota errors
    }
  }
  return updated;
}

export function loadFastestSolversFromStorage(): FastestSolverEntry[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return DEFAULT_FASTEST_SOLVERS;
  }
  try {
    const raw = window.localStorage.getItem(FASTEST_SOLVERS_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(
        FASTEST_SOLVERS_STORAGE_KEY,
        JSON.stringify(DEFAULT_FASTEST_SOLVERS)
      );
      return DEFAULT_FASTEST_SOLVERS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.slice(0, 3);
    }
  } catch {
    // fallback
  }
  return DEFAULT_FASTEST_SOLVERS;
}

export function saveFastestSolverToStorage(
  playerName: string,
  timeSec: number,
  puzzleTitle = 'Mate in 1'
): FastestSolverEntry[] {
  const current = loadFastestSolversFromStorage();
  const updated = upsertFastestSolverEntries(
    current,
    playerName,
    timeSec,
    puzzleTitle
  );
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(
        FASTEST_SOLVERS_STORAGE_KEY,
        JSON.stringify(updated)
      );
    } catch {
      // ignore quota errors
    }
  }
  return updated;
}

export type BoardColorScheme =
  | 'midnight-blue'
  | 'forest-green'
  | 'classic-wood'
  | 'monochrome-bw';

export interface BoardThemeConfig {
  id: BoardColorScheme;
  label: string;
  frameClass: string;
  lightSquareClass: string;
  darkSquareClass: string;
  coordLightTextClass: string;
  coordDarkTextClass: string;
  selectedSquareClass: string;
  lastMoveLightClass: string;
  lastMoveDarkClass: string;
}

export const BOARD_COLOR_SCHEMES: Record<BoardColorScheme, BoardThemeConfig> = {
  'midnight-blue': {
    id: 'midnight-blue',
    label: 'Midnight Blue',
    frameClass: 'bg-[#0b1528] border-slate-500/60',
    lightSquareClass: 'bg-[#d8e2ef]',
    darkSquareClass: 'bg-[#1e3a5f]',
    coordLightTextClass: 'text-[#1e3a5f]',
    coordDarkTextClass: 'text-[#d8e2ef]',
    selectedSquareClass: 'bg-white/90 ring-2 ring-black',
    lastMoveLightClass: 'bg-[#b8cce4]',
    lastMoveDarkClass: 'bg-[#2c5282]',
  },
  'forest-green': {
    id: 'forest-green',
    label: 'Forest Green',
    frameClass: 'bg-[#0d1f17] border-emerald-700/60',
    lightSquareClass: 'bg-[#ebecd0]',
    darkSquareClass: 'bg-[#2d5a3c]',
    coordLightTextClass: 'text-[#2d5a3c]',
    coordDarkTextClass: 'text-[#ebecd0]',
    selectedSquareClass: 'bg-emerald-200 ring-2 ring-emerald-950',
    lastMoveLightClass: 'bg-[#d4e09b]',
    lastMoveDarkClass: 'bg-[#3e7cb1]',
  },
  'classic-wood': {
    id: 'classic-wood',
    label: 'Classic Wood',
    frameClass: 'bg-[#2c1a10] border-amber-700/60',
    lightSquareClass: 'bg-[#f0d9b5]',
    darkSquareClass: 'bg-[#b58863]',
    coordLightTextClass: 'text-[#6f4726]',
    coordDarkTextClass: 'text-[#f0d9b5]',
    selectedSquareClass: 'bg-[#f7ec6e] ring-2 ring-[#5c3a1e]',
    lastMoveLightClass: 'bg-[#cdd26a]',
    lastMoveDarkClass: 'bg-[#aaa23a]',
  },
  'monochrome-bw': {
    id: 'monochrome-bw',
    label: 'Monochrome B&W',
    frameClass: 'bg-black border-white/80',
    lightSquareClass: 'bg-[#f4f4f5]',
    darkSquareClass: 'bg-[#27272a]',
    coordLightTextClass: 'text-[#18181b]',
    coordDarkTextClass: 'text-[#f4f4f5]',
    selectedSquareClass: 'bg-zinc-300 ring-2 ring-black',
    lastMoveLightClass: 'bg-zinc-200',
    lastMoveDarkClass: 'bg-zinc-600',
  },
};

export interface PgnExportMetadata {
  event?: string;
  site?: string;
  date?: string;
  white?: string;
  black?: string;
  result?: '*' | '1-0' | '0-1' | '1/2-1/2';
  eco?: string;
  opening?: string;
}

/**
 * Exports the entire game move history into standard Portable Game Notation (PGN) format.
 */
export function exportGameToPGN(
  history: Move[],
  metadata: PgnExportMetadata = {}
): string {
  const now = new Date();
  const defaultDate = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
  const detected = detectChessOpening(history);

  const event = metadata.event || 'AI Chess Coach Exhibition Match';
  const site = metadata.site || 'CareerPathO & AI Chess Blueprint';
  const date = metadata.date || defaultDate;
  const white = metadata.white || 'Challenger (Human)';
  const black = metadata.black || 'Stockfish AI Coach';
  const result = metadata.result || '*';
  const eco = metadata.eco || detected.eco;
  const opening = metadata.opening || detected.name;

  const headers = [
    `[Event "${event}"]`,
    `[Site "${site}"]`,
    `[Date "${date}"]`,
    `[White "${white}"]`,
    `[Black "${black}"]`,
    `[Result "${result}"]`,
    `[ECO "${eco}"]`,
    `[Opening "${opening}"]`,
  ];

  if (history.length === 0) {
    return `${headers.join('\n')}\n\n${result}`;
  }

  const moveTokens: string[] = [];
  for (let i = 0; i < history.length; i += 2) {
    const moveNumber = Math.floor(i / 2) + 1;
    const whiteMove = history[i];
    const blackMove = history[i + 1];
    if (blackMove) {
      moveTokens.push(`${moveNumber}. ${whiteMove.san} ${blackMove.san}`);
    } else {
      moveTokens.push(`${moveNumber}. ${whiteMove.san}`);
    }
  }

  return `${headers.join('\n')}\n\n${moveTokens.join(' ')} ${result}`.trim();
}


