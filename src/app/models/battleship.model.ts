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
  enemyShips?: any[];
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

export function getShipRelativeCells(type: ShipType, isVertical: boolean): Coordinate[] {
  const cells: Coordinate[] = [];
  switch (type) {
    case 'Carrier': // 6 cells (staggered 2x3 shape: row 0 cols 0..2, row 1 cols 1..3)
      if (!isVertical) {
        cells.push({ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 1, col: 3 });
      } else {
        cells.push({ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 2, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 1 }, { row: 3, col: 1 });
      }
      break;

    case 'Cruiser': // 4 cells (3 hull + 1 turret protrusion)
      if (!isVertical) {
        cells.push({ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 1 });
      } else {
        cells.push({ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 2, col: 0 }, { row: 1, col: 1 });
      }
      break;

    case 'Battleship': // 4 cells straight
      if (!isVertical) {
        for (let i = 0; i < 4; i++) cells.push({ row: 0, col: i });
      } else {
        for (let i = 0; i < 4; i++) cells.push({ row: i, col: 0 });
      }
      break;

    case 'Submarine': // 3 cells straight
      if (!isVertical) {
        for (let i = 0; i < 3; i++) cells.push({ row: 0, col: i });
      } else {
        for (let i = 0; i < 3; i++) cells.push({ row: i, col: 0 });
      }
      break;

    case 'Destroyer': // 2 cells straight
    default:
      if (!isVertical) {
        for (let i = 0; i < 2; i++) cells.push({ row: 0, col: i });
      } else {
        for (let i = 0; i < 2; i++) cells.push({ row: i, col: 0 });
      }
      break;
  }
  return cells;
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
