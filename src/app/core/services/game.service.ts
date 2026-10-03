import { Injectable, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Subject } from 'rxjs';
import { SignalRService } from './signalr.service';
import {
  GameState, createEmptyGameState,
  GameCreatedEvent, GameJoinedEvent, PlayerJoinedEvent,
  SetupStartedEvent, SetupPieceMovedEvent,
  BoardRevealedEvent, MoveMadeEvent, LegalMovesEvent,
  GameFinishedEvent, GameStateRestoredEvent,
  ChessPiece, PieceColor, PieceType, GameMode
} from '../../models/game.model';

import { SoundService } from './sound.service';

@Injectable({ providedIn: 'root' })
export class GameService implements OnDestroy {

  // ── State ────────────────────────────────────────────────────────────────
  private readonly _state$ = new BehaviorSubject<GameState>(createEmptyGameState());
  readonly state$ = this._state$.asObservable();

  private readonly _error$ = new Subject<string>();
  readonly error$ = this._error$.asObservable();

  // Store playerId in localStorage for reconnection
  private readonly PLAYER_KEY = 'hc_player';

  get state(): GameState { return this._state$.value; }

  constructor(
    private signalr: SignalRService,
    private router: Router,
    private sound: SoundService
  ) {
    this.registerEventHandlers();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  Connection
  // ════════════════════════════════════════════════════════════════════════

  async connect(): Promise<void> {
    await this.signalr.connect();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  Client → Server calls
  // ════════════════════════════════════════════════════════════════════════

  async createGame(playerName: string, gameMode: GameMode = 'HiddenFormation'): Promise<void> {
    await this.connect();
    await this.signalr.invoke('CreateGame', { playerName, gameMode });
  }

  async joinGame(gameId: string, playerName: string): Promise<void> {
    await this.connect();
    const cleanId = gameId.trim().toUpperCase();
    await this.signalr.invoke('JoinGame', { gameId: cleanId, playerName });
  }

  async moveSetupPiece(fromRow: number, fromCol: number, toRow: number, toCol: number): Promise<void> {
    const { gameId } = this.state;
    this.sound.playMove();
    await this.signalr.invoke('MoveSetupPiece', { gameId, fromRow, fromCol, toRow, toCol });
  }

  async setReady(): Promise<void> {
    this.sound.playReady();
    await this.signalr.invoke('SetReady', this.state.gameId);
  }

  async makeMove(from: string, to: string, promotion?: string): Promise<void> {
    this.patch({ selectedSquare: null, legalMoves: [] });
    await this.signalr.invoke('MakeMove', {
      gameId: this.state.gameId, from, to, promotion: promotion ?? null
    });
  }

  async getLegalMoves(from: string): Promise<void> {
    if (this.state.currentTurn !== this.state.yourColor || this.state.phase !== 'Playing') return;
    this.patch({ selectedSquare: from });
    await this.signalr.invoke('GetLegalMoves', this.state.gameId, from);
  }

  async resign(): Promise<void> {
    await this.signalr.invoke('Resign', this.state.gameId);
  }

  async offerDraw(): Promise<void> {
    await this.signalr.invoke('OfferDraw', this.state.gameId);
  }

  async acceptDraw(): Promise<void> {
    this.patch({ drawOfferedToMe: false });
    await this.signalr.invoke('AcceptDraw', this.state.gameId);
  }

  async declineDraw(): Promise<void> {
    this.patch({ drawOfferedToMe: false });
    await this.signalr.invoke('DeclineDraw', this.state.gameId);
  }

  async reconnect(gameId: string, playerId: string): Promise<void> {
    await this.connect();
    await this.signalr.invoke('Reconnect', { gameId, playerId });
  }

  async startMatch(): Promise<void> {
    this.sound.playReady();
    await this.signalr.invoke('StartMatch', this.state.gameId);
  }

  // ════════════════════════════════════════════════════════════════════════
  //  Event handlers (Server → Client)
  // ════════════════════════════════════════════════════════════════════════

  private registerEventHandlers(): void {
    this.signalr.on<GameCreatedEvent>('GameCreated', e => {
      this.patch({
        gameId: e.gameId,
        playerId: e.playerId,
        yourColor: e.yourColor,
        yourName: e.yourName,
        gameMode: e.gameMode || 'HiddenFormation',
        phase: 'WaitingForPlayers',
      });
      this.saveSession(e.gameId, e.playerId);
      this.router.navigate(['/game', e.gameId]);
    });

    this.signalr.on<GameJoinedEvent>('GameJoined', e => {
      this.patch({
        gameId: e.gameId,
        playerId: e.playerId,
        yourColor: e.yourColor,
        yourName: e.yourName,
        opponentName: e.opponentName,
        gameMode: e.gameMode || 'HiddenFormation',
        phase: 'WaitingForPlayers',
      });
      this.saveSession(e.gameId, e.playerId);
    });

    this.signalr.on<PlayerJoinedEvent>('PlayerJoined', e => {
      this.patch({
        opponentName: e.opponentName,
        gameMode: e.gameMode || this.state.gameMode
      });
    });

    this.signalr.on<{ seconds: number }>('MatchStarting', e => {
      let count = e.seconds || 3;
      this.patch({ isStartingMatch: true, countdownSeconds: count });
      this.sound.playCountdownBeep(false);

      const timer = setInterval(() => {
        count--;
        if (count > 0) {
          this.patch({ countdownSeconds: count });
          this.sound.playCountdownBeep(false);
        } else {
          clearInterval(timer);
          this.patch({ isStartingMatch: false, countdownSeconds: 0 });
          this.sound.playCountdownBeep(true);
        }
      }, 1000);
    });

    this.signalr.on<SetupStartedEvent>('SetupStarted', e => {
      this.patch({
        phase: 'Setup',
        isStartingMatch: false,
        opponentName: e.opponentName,
        setupEndsAt: new Date(e.setupEndsAt),
        yourPieces: [...e.yourPieces],
        isReady: false,
        opponentReady: false,
      });
    });

    this.signalr.on<SetupPieceMovedEvent>('SetupPieceMoved', e => {
      const pieces = [...this.state.yourPieces];
      const idx = pieces.findIndex(p => p.row === e.fromRow && p.col === e.fromCol);
      if (idx !== -1) {
        pieces[idx] = { ...pieces[idx], row: e.toRow, col: e.toCol };
      }
      this.patch({ yourPieces: pieces });
    });

    this.signalr.on('SetupLocked', () => {
      this.patch({ isReady: true });
    });

    this.signalr.on('OpponentReady', () => {
      this.patch({ opponentReady: true });
    });

    this.signalr.on<BoardRevealedEvent>('BoardRevealed', e => {
      this.sound.playGameStart();
      this.patch({
        phase: 'Playing',
        allPieces: [...e.pieces],
        currentTurn: e.currentTurn,
        yourPieces: [],
        capturedByWhite: [],
        capturedByBlack: [],
        moveHistory: [],
        sanMoveHistory: [],
        selectedSquare: null,
        legalMoves: [],
        isCheck: false,
      });
    });

    this.signalr.on<MoveMadeEvent>('MoveMade', e => {
      const history = [...this.state.moveHistory, e.moveNotation];
      const sanHistory = [...this.state.sanMoveHistory, e.sanMoveNotation];
      const captured = this.state.capturedByWhite.slice();
      const capturedB = this.state.capturedByBlack.slice();

      if (e.capturedPiece) {
        if (e.capturedPiece.color === 'Black') {
          captured.push({ type: e.capturedPiece.type });
        } else {
          capturedB.push({ type: e.capturedPiece.type });
        }
        this.sound.playCapture();
      } else if (e.isCheck) {
        this.sound.playCheck();
      } else {
        this.sound.playMove();
      }

      this.patch({
        allPieces: [...e.pieces],
        currentTurn: e.currentTurn,
        isCheck: e.isCheck,
        moveHistory: history,
        sanMoveHistory: sanHistory,
        capturedByWhite: captured,
        capturedByBlack: capturedB,
        selectedSquare: null,
        legalMoves: [],
        enPassantTarget: e.enPassantTarget,
        drawOfferedToMe: false,
      });
    });

    this.signalr.on<LegalMovesEvent>('LegalMoves', e => {
      if (
        this.state.phase === 'Playing' &&
        this.state.currentTurn === this.state.yourColor &&
        this.state.selectedSquare === e.from
      ) {
        this.patch({ legalMoves: e.moves });
      }
    });

    this.signalr.on('DrawOffered', () => {
      this.sound.playCheck();
      this.patch({ drawOfferedToMe: true });
    });

    this.signalr.on('DrawDeclined', () => {
      this.patch({ drawOfferedToMe: false });
    });

    this.signalr.on('OpponentDisconnected', () => {
      // Could show a toast
    });

    this.signalr.on('OpponentReconnected', () => {
      // Could hide the toast
    });

    this.signalr.on<GameFinishedEvent>('GameFinished', e => {
      if (e.winner === this.state.yourColor) {
        this.sound.playVictory();
      } else if (e.winner) {
        this.sound.playDefeat();
      } else {
        this.sound.playMove();
      }
      this.patch({ phase: 'Finished', result: e });
    });

    this.signalr.on<GameStateRestoredEvent>('GameStateRestored', e => {
      if (e.phase === 'Setup') {
        this.patch({
          phase: 'Setup',
          setupEndsAt: e.setupEndsAt ? new Date(e.setupEndsAt) : null,
          yourPieces: e.yourPieces ?? [],
          isReady: e.isReady ?? false,
          opponentReady: e.opponentReady ?? false,
        });
      } else if (e.phase === 'Playing') {
        this.patch({
          phase: 'Playing',
          allPieces: e.pieces ?? [],
          currentTurn: e.currentTurn ?? 'White',
          isCheck: e.isCheck ?? false,
          moveHistory: e.moveHistory ?? [],
          sanMoveHistory: e.sanMoveHistory ?? [],
          enPassantTarget: e.enPassantTarget ?? null,
        });
      } else if (e.phase === 'Finished') {
        this.patch({
          phase: 'Finished',
          result: { result: e.result as any, winner: e.winner ?? null, reason: '' }
        });
      }
    });

    this.signalr.on<{ message: string }>('Error', e => {
      this._error$.next(e.message);
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  //  Board helpers
  // ════════════════════════════════════════════════════════════════════════

  getPieceAt(pieces: ChessPiece[], row: number, col: number): ChessPiece | undefined {
    return pieces.find(p => p.row === row && p.col === col);
  }

  toAlgebraic(row: number, col: number): string {
    return String.fromCharCode(97 + col) + (row + 1);
  }

  fromAlgebraic(pos: string): { row: number; col: number } {
    return { col: pos.charCodeAt(0) - 97, row: parseInt(pos[1]) - 1 };
  }

  // ════════════════════════════════════════════════════════════════════════
  //  Session persistence (for reconnection)
  // ════════════════════════════════════════════════════════════════════════

  saveSession(gameId: string, playerId: string): void {
    sessionStorage.setItem(this.PLAYER_KEY, JSON.stringify({ gameId, playerId }));
  }

  loadSession(): { gameId: string; playerId: string } | null {
    const raw = sessionStorage.getItem(this.PLAYER_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  resetState(): void {
    sessionStorage.removeItem(this.PLAYER_KEY);
    this._state$.next(createEmptyGameState());
  }

  clearSession(): void {
    this.resetState();
    this.disconnect();
  }

  disconnect(): void {
    this.signalr.disconnect();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  Private
  // ════════════════════════════════════════════════════════════════════════

  private patch(partial: Partial<GameState>): void {
    this._state$.next({ ...this._state$.value, ...partial });
  }

  ngOnDestroy(): void {
    this.signalr.disconnect();
  }
}
