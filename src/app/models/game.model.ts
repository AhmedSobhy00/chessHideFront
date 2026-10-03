// ── Piece types and colors ───────────────────────────────────────────────────

export type PieceType = 'King' | 'Queen' | 'Rook' | 'Bishop' | 'Knight' | 'Pawn';
export type PieceColor = 'White' | 'Black';
export type GamePhase = 'WaitingForPlayers' | 'Setup' | 'Reveal' | 'Playing' | 'Finished' | 'Abandoned';
export type GameMode = 'HiddenFormation' | 'Classic';

export interface ChessPiece {
  type: PieceType;
  color: PieceColor;
  row: number;   // 0 = rank 1 (White back rank), 7 = rank 8
  col: number;   // 0 = file a, 7 = file h
}

// ── Events received from the server via SignalR ──────────────────────────────

export interface GameCreatedEvent {
  gameId: string;
  playerId: string;
  yourColor: PieceColor;
  yourName: string;
  gameMode: GameMode;
}

export interface GameJoinedEvent {
  gameId: string;
  playerId: string;
  yourColor: PieceColor;
  yourName: string;
  opponentName: string;
  gameMode: GameMode;
}

export interface PlayerJoinedEvent {
  opponentName: string;
  color: PieceColor;
  gameMode: GameMode;
}

export interface MatchStartingEvent {
  seconds: number;
}

export interface SetupStartedEvent {
  gameId: string;
  yourColor: PieceColor;
  yourName: string;
  opponentName: string;
  setupEndsAt: string;     // ISO 8601 UTC
  yourPieces: ChessPiece[];
}

export interface SetupPieceMovedEvent {
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
}

export interface BoardRevealedEvent {
  pieces: ChessPiece[];
  currentTurn: PieceColor;
}

export interface MoveMadeEvent {
  from: string;
  to: string;
  promotion: string | null;
  pieces: ChessPiece[];
  isCheck: boolean;
  isCheckmate: boolean;
  isDraw: boolean;
  drawReason: string | null;
  currentTurn: PieceColor;
  capturedPiece: { type: PieceType; color: PieceColor } | null;
  enPassantTarget: string | null;
  isEnPassant: boolean;
  moveNotation: string;
  sanMoveNotation: string;
  moveNumber: number;
}

export interface LegalMovesEvent {
  from: string;
  moves: string[];     // algebraic notation squares, e.g. ["e4", "e3"]
}

export interface GameFinishedEvent {
  result: 'WhiteWins' | 'BlackWins' | 'Draw' | 'Abandoned';
  winner: PieceColor | null;
  reason: string;
}

export interface GameStateRestoredEvent {
  phase: GamePhase;
  gameMode?: GameMode;
  yourColor?: PieceColor;
  setupEndsAt?: string;
  yourPieces?: ChessPiece[];
  isReady?: boolean;
  opponentReady?: boolean;
  pieces?: ChessPiece[];
  currentTurn?: PieceColor;
  isCheck?: boolean;
  moveHistory?: string[];
  sanMoveHistory?: string[];
  enPassantTarget?: string | null;
  result?: string;
  winner?: PieceColor | null;
}

// ── Client-side game state ────────────────────────────────────────────────────

export interface GameState {
  gameId: string;
  playerId: string;
  yourColor: PieceColor;
  yourName: string;
  opponentName: string;
  gameMode: GameMode;
  phase: GamePhase;
  isStartingMatch: boolean;
  countdownSeconds: number;

  // Setup
  setupEndsAt: Date | null;
  yourPieces: ChessPiece[];    // only your pieces during setup
  opponentReady: boolean;
  isReady: boolean;

  // Playing
  allPieces: ChessPiece[];     // full board after reveal
  currentTurn: PieceColor;
  isCheck: boolean;
  selectedSquare: string | null;
  legalMoves: string[];
  enPassantTarget: string | null;
  moveHistory: string[];
  sanMoveHistory: string[];
  capturedByWhite: { type: PieceType }[];
  capturedByBlack: { type: PieceType }[];

  // Draw
  drawOfferedToMe: boolean;

  // Result
  result: GameFinishedEvent | null;
}

export function createEmptyGameState(): GameState {
  return {
    gameId: '',
    playerId: '',
    yourColor: 'White',
    yourName: '',
    opponentName: '',
    gameMode: 'HiddenFormation',
    phase: 'WaitingForPlayers',
    isStartingMatch: false,
    countdownSeconds: 0,
    setupEndsAt: null,
    yourPieces: [],
    opponentReady: false,
    isReady: false,
    allPieces: [],
    currentTurn: 'White',
    isCheck: false,
    selectedSquare: null,
    legalMoves: [],
    enPassantTarget: null,
    moveHistory: [],
    sanMoveHistory: [],
    capturedByWhite: [],
    capturedByBlack: [],
    drawOfferedToMe: false,
    result: null,
  };
}
