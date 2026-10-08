import { Injectable, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Subject } from 'rxjs';
import * as signalR from '@microsoft/signalr';
import { AppConfigService } from './app-config.service';
import { SoundService } from './sound.service';
import {
  BattleshipGameState, createEmptyBattleshipState,
  PlaceShipDTO, Coordinate, CellState, ShipInstance, getShipRelativeCells
} from '../../models/battleship.model';

@Injectable({ providedIn: 'root' })
export class BattleshipService implements OnDestroy {

  private hubConnection: signalR.HubConnection | null = null;
  private readonly _state$ = new BehaviorSubject<BattleshipGameState>(createEmptyBattleshipState());
  readonly state$ = this._state$.asObservable();

  private readonly _error$ = new Subject<string>();
  readonly error$ = this._error$.asObservable();

  private readonly BATTLESHIP_KEY = 'hc_battleship_player';

  get state(): BattleshipGameState { return this._state$.value; }

  constructor(
    private configService: AppConfigService,
    private router: Router,
    private sound: SoundService
  ) {}

  async connect(): Promise<void> {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) return;

    await this.configService.loadConfig();
    const chessUrl = this.configService.apiUrl; // e.g. https://.../gamehub
    const battleshipUrl = chessUrl.replace(/\/gamehub\/?$/i, '/battleshiphub');

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(battleshipUrl, {
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.registerEventHandlers();

    try {
      await this.hubConnection.start();
    } catch (err: any) {
      console.error('Battleship SignalR Connection Error:', err);
      throw new Error(`Could not connect to Battleship server at (${battleshipUrl}).`);
    }
  }

  // ── Client -> Server Calls ───────────────────────────────────────────────

  async createGame(playerName: string): Promise<void> {
    await this.connect();
    await this.hubConnection?.invoke('CreateBattleshipGame', { playerName });
  }

  async createBotGame(playerName: string, difficulty: string = 'Medium'): Promise<void> {
    await this.connect();
    await this.hubConnection?.invoke('CreateBattleshipBotGame', { playerName, difficulty });
  }

  async joinGame(gameId: string, playerName: string): Promise<void> {
    await this.connect();
    const cleanId = gameId.trim().toUpperCase();
    await this.hubConnection?.invoke('JoinBattleshipGame', { gameId: cleanId, playerName });
  }

  async placeFleet(ships: PlaceShipDTO[]): Promise<void> {
    if (!this.state.gameId) return;
    await this.hubConnection?.invoke('PlaceFleet', { gameId: this.state.gameId, ships });
  }

  async randomizeFleet(): Promise<void> {
    if (!this.state.gameId) return;
    await this.hubConnection?.invoke('RandomizeFleet', this.state.gameId);
  }

  async setReady(): Promise<void> {
    if (!this.state.gameId) return;
    this.sound.playReady();
    await this.hubConnection?.invoke('SetFleetReady', this.state.gameId);
  }

  async fireShot(row: number, col: number): Promise<void> {
    if (!this.state.gameId || this.state.phase !== 'Playing') return;
    await this.hubConnection?.invoke('FireShot', { gameId: this.state.gameId, targetRow: row, targetCol: col });
  }

  async resign(): Promise<void> {
    if (!this.state.gameId) return;
    await this.hubConnection?.invoke('ResignBattleship', this.state.gameId);
  }

  async reconnect(gameId: string, playerId: string): Promise<void> {
    await this.connect();
    this.patch({ gameId, playerId });
    await this.hubConnection?.invoke('ReconnectBattleship', gameId, playerId);
  }

  // ── Event Handlers (Server -> Client) ───────────────────────────────────

  private registerEventHandlers(): void {
    if (!this.hubConnection) return;

    this.hubConnection.on('BattleshipGameCreated', (e: any) => {
      this.patch({
        gameId: e.gameId,
        playerId: e.playerId,
        yourName: e.yourName,
        opponentName: e.opponentName || '',
        isHost: true,
        isBotGame: !!e.isBotGame,
        phase: e.isBotGame ? 'Setup' : 'WaitingForPlayers'
      });
      this.saveSession(e.gameId, e.playerId);
      this.router.navigate(['/battleship/game', e.gameId]);
    });

    this.hubConnection.on('BattleshipGameJoined', (e: any) => {
      this.patch({
        gameId: e.gameId,
        playerId: e.playerId,
        yourName: e.yourName,
        opponentName: e.opponentName,
        isHost: false,
        phase: 'Setup'
      });
      this.saveSession(e.gameId, e.playerId);
    });

    this.hubConnection.on('BattleshipPlayerJoined', (e: any) => {
      this.patch({
        opponentName: e.opponentName,
        phase: 'Setup'
      });
    });

    this.hubConnection.on('BattleshipFleetRandomized', (e: any) => {
      if (e.ships) {
        this.updateLocalFleetFromDTOs(e.ships);
      }
    });

    this.hubConnection.on('BattleshipMatchStarted', (e: any) => {
      this.sound.playGameStart();
      this.patch({
        phase: 'Playing',
        currentTurnPlayerId: e.firstTurnPlayerId,
        yourName: this.state.yourName || e.hostName,
        opponentName: this.state.opponentName || e.guestName
      });
    });

    this.hubConnection.on('BattleshipShotFired', (e: any) => {
      const isMyShot = e.shooterPlayerId === this.state.playerId;
      const targetGrid = isMyShot ? this.cloneGrid(this.state.targetRadar) : this.cloneGrid(this.state.yourGrid);
      const hitState: CellState = e.isSunk ? 'Sunk' : (e.isHit ? 'Hit' : 'Miss');

      if (e.isSunk && e.sunkShipCells) {
        e.sunkShipCells.forEach((c: Coordinate) => {
          targetGrid[c.row][c.col] = 'Sunk';
        });
        if (isMyShot) this.sound.playVictory();
        else this.sound.playDefeat();
      } else {
        targetGrid[e.row][e.col] = hitState;
        if (e.isHit) this.sound.playCapture();
        else this.sound.playMove();
      }

      const updatedYourShips = [...(this.state.yourShips || [])];
      if (!isMyShot && e.isHit) {
        // Track hit on your local fleet ships
        const ship = updatedYourShips.find(s => s.occupiedCells.some(c => c.row === e.row && c.col === e.col));
        if (ship) {
          ship.hits = (ship.hits || 0) + 1;
          if (e.isSunk) ship.isSunk = true;
        }
      }

      const patchObj: Partial<BattleshipGameState> = {
        currentTurnPlayerId: e.nextTurnPlayerId,
        lastShotDetails: e,
        yourShips: updatedYourShips
      };

      if (isMyShot) {
        patchObj.targetRadar = targetGrid;
      } else {
        patchObj.yourGrid = targetGrid;
      }

      this.patch(patchObj);
    });

    this.hubConnection.on('BattleshipFinished', (e: any) => {
      if (e.winnerPlayerId === this.state.playerId) {
        this.sound.playVictory();
      } else {
        this.sound.playDefeat();
      }

      setTimeout(() => {
        this.patch({
          phase: 'Finished',
          winnerPlayerId: e.winnerPlayerId,
          winnerName: e.winnerName,
          finishReason: e.reason
        });
      }, 1200);
    });

    this.hubConnection.on('Error', (e: any) => {
      this._error$.next(e.message || 'Battleship error');
    });
  }

  // ── Local Fleet Helper ──────────────────────────────────────────────────

  updateLocalFleetFromDTOs(dtos: PlaceShipDTO[]): void {
    const grid = Array(10).fill(null).map(() => Array(10).fill('Empty'));
    const instances: ShipInstance[] = dtos.map(d => {
      const rel = getShipRelativeCells(d.Type, d.IsVertical);
      const occupied: Coordinate[] = [];
      for (const rCell of rel) {
        const r = d.StartRow + rCell.row;
        const c = d.StartCol + rCell.col;
        grid[r][c] = 'Ship';
        occupied.push({ row: r, col: c });
      }
      return {
        id: d.Type,
        type: d.Type,
        length: occupied.length,
        startRow: d.StartRow,
        startCol: d.StartCol,
        isVertical: d.IsVertical,
        occupiedCells: occupied,
        hits: 0,
        isSunk: false
      };
    });

    this.patch({ yourShips: instances, yourGrid: grid });
  }

  saveSession(gameId: string, playerId: string): void {
    sessionStorage.setItem(this.BATTLESHIP_KEY, JSON.stringify({ gameId, playerId }));
  }

  loadSession(): { gameId: string; playerId: string } | null {
    const raw = sessionStorage.getItem(this.BATTLESHIP_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  clearSession(): void {
    sessionStorage.removeItem(this.BATTLESHIP_KEY);
    this._state$.next(createEmptyBattleshipState());
  }

  private cloneGrid(grid: CellState[][]): CellState[][] {
    return grid.map(row => [...row]);
  }

  private patch(partial: Partial<BattleshipGameState>): void {
    this._state$.next({ ...this._state$.value, ...partial });
  }

  ngOnDestroy(): void {
    this.hubConnection?.stop();
  }
}
