export type ShipType = 'Carrier' | 'Battleship' | 'Cruiser' | 'Submarine' | 'Destroyer';

export type CellState = 'Empty' | 'Ship' | 'Hit' | 'Miss' | 'Sunk';

export interface Coordinate {
  row: number;
  col: number;
}

export interface ShipInstance {
  id: string;
  type: ShipType;
  length: number;
  startRow: number;
  startCol: number;
  isVertical: boolean;
  occupiedCells: Coordinate[];
  hits: number;
  isSunk: boolean;
}

export interface PlaceShipDTO {
  Type: ShipType;
  StartRow: number;
  StartCol: number;
  IsVertical: boolean;
}

export interface BattleshipPlayer {
  playerId: string;
  name: string;
  isBot: boolean;
  botDifficulty?: string;
  isReady: boolean;
  ships: ShipInstance[];
  grid: CellState[][];
  targetRadar: CellState[][];
}

export type BattleshipPhase = 'WaitingForPlayers' | 'Setup' | 'Playing' | 'Finished' | 'Abandoned';

export interface BattleshipGameState {
  gameId: string | null;
  playerId: string | null;
  phase: BattleshipPhase;
  yourName: string;
  opponentName: string;
  isHost: boolean;
  isBotGame: boolean;
  isReady: boolean;
  opponentReady: boolean;
  currentTurnPlayerId: string | null;
  yourShips: ShipInstance[];
  yourGrid: CellState[][];
  targetRadar: CellState[][];
  hitsOnOpponent: Coordinate[];
  missesOnOpponent: Coordinate[];
  winnerPlayerId?: string | null;
  winnerName?: string | null;
  finishReason?: string | null;
  lastShotDetails?: {
    shooterPlayerId: string;
    row: number;
    col: number;
    isHit: boolean;
    isSunk: boolean;
    sunkShipType?: ShipType | null;
    sunkShipCells?: Coordinate[] | null;
  } | null;
}

export function createEmptyBattleshipState(): BattleshipGameState {
  const emptyGrid = () => Array(10).fill(null).map(() => Array(10).fill('Empty'));
  return {
    gameId: null,
    playerId: null,
    phase: 'WaitingForPlayers',
    yourName: '',
    opponentName: '',
    isHost: true,
    isBotGame: false,
    isReady: false,
    opponentReady: false,
    currentTurnPlayerId: null,
    yourShips: [],
    yourGrid: emptyGrid(),
    targetRadar: emptyGrid(),
    hitsOnOpponent: [],
    missesOnOpponent: [],
    winnerPlayerId: null,
    winnerName: null,
    finishReason: null,
    lastShotDetails: null,
  };
}
