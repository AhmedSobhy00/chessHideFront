import { Component, OnInit, OnDestroy, HostListener, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { GameService } from '../../core/services/game.service';
import { GameState, ChessPiece, PieceType, PieceColor } from '../../models/game.model';
import { ChessBoardComponent } from '../chess-board/chess-board.component';

@Component({
  selector: 'app-game-phase',
  standalone: true,
  imports: [CommonModule, ChessBoardComponent],
  template: `
    <!-- Ambient moving turn light -->
    <div
      class="turn-ambient-light"
      [class.your-turn]="state && state.currentTurn === state.yourColor && state.phase !== 'Finished'"
      [class.finished]="state && state.phase === 'Finished'"
    ></div>

    <div class="game-layout">

      <!-- LEFT PANEL (Desktop: Move History) -->
      <div class="game-panel left-panel">
        <!-- Move History Card -->
        <div class="panel-card history-card" *ngIf="state">
          <div class="card-header">
            <span class="card-title">📜 Move History</span>
            <span class="move-count" *ngIf="state.moveHistory">{{ state.moveHistory.length }} moves</span>
          </div>
          <div class="move-history-scroll" *ngIf="state.moveHistory && state.moveHistory.length > 0; else noMoves">
            <div class="history-grid">
              <div *ngFor="let mv of pairedMoves; let i = index" class="move-row">
                <span class="move-num">{{ i + 1 }}.</span>
                <span class="move white">{{ mv[0] }}</span>
                <span class="move black" *ngIf="mv[1]">{{ mv[1] }}</span>
              </div>
            </div>
          </div>
          <ng-template #noMoves>
            <div class="no-moves-msg">Match in progress…</div>
          </ng-template>
        </div>
      </div>

      <!-- CENTER PANEL (Opponent Bar -> Status Banner -> Board -> Your Bar) -->
      <div class="game-panel center-panel">
        
        <!-- Opponent Bar (Top of Board) -->
        <div class="player-bar opponent-bar" *ngIf="state">
          <div class="player-info">
            <div class="player-avatar opponent-avatar">{{ initialChar(state.opponentName) }}</div>
            <div class="player-details">
              <span class="player-name">{{ state.opponentName || 'Opponent' }}</span>
              <span class="player-color">{{ opponentColor }}</span>
            </div>
            <div class="turn-indicator" [class.active]="state.phase !== 'Finished' && state.currentTurn !== state.yourColor">
              <div class="turn-pulse" *ngIf="state.phase !== 'Finished' && state.currentTurn !== state.yourColor"></div>
              {{ (state.phase !== 'Finished' && state.currentTurn !== state.yourColor) ? 'Thinking…' : '' }}
            </div>
          </div>
          <div class="captured-pieces">
            <span *ngFor="let p of piecesCapturedByOpponent" class="cap-piece">
              {{ miniPiece(p.type, state.yourColor) }}
            </span>
          </div>
        </div>

        <!-- Check / Checkmate status banner slot -->
        <div class="status-banner-slot">
          <div class="status-banner" *ngIf="state && (state.isCheck || isCheckmate)" [class.checkmate]="isCheckmate">
            {{ isCheckmate ? '♚ Checkmate!' : '♚ Check!' }}
          </div>
        </div>

        <!-- Board -->
        <div class="board-area" *ngIf="state">
          <app-chess-board
            [pieces]="state.allPieces || []"
            [yourColor]="state.yourColor"
            mode="play"
            [selectedSquare]="state.selectedSquare"
            [legalMoves]="state.legalMoves"
            [isCheck]="state.isCheck"
            [currentTurn]="state.currentTurn"
            [lastMove]="lastMove"
            [defeatedColor]="defeatedColor"
            [gameResult]="state.result?.result || null"
            [disabled]="state.phase === 'Finished' || state.currentTurn !== state.yourColor"
            [squareSize]="squareSize"
            (squareClicked)="onSquareClick($event)"
            (pieceDragged)="onPieceDragged($event)"
            (promotionChosen)="onPromotionChosen($event)"
          ></app-chess-board>
        </div>

        <!-- Your Bar (Bottom of Board) -->
        <div class="player-bar your-bar" *ngIf="state">
          <div class="captured-pieces">
            <span *ngFor="let p of piecesCapturedByYou" class="cap-piece">
              {{ miniPiece(p.type, opponentColor) }}
            </span>
          </div>
          <div class="player-info">
            <div class="turn-indicator" [class.active]="state.phase !== 'Finished' && state.currentTurn === state.yourColor">
              <div class="turn-pulse" *ngIf="state.phase !== 'Finished' && state.currentTurn === state.yourColor"></div>
              {{ (state.phase !== 'Finished' && state.currentTurn === state.yourColor) ? 'Your turn' : '' }}
            </div>
            <div class="player-details right">
              <span class="player-name">{{ state.yourName }} (You)</span>
              <span class="player-color">{{ state.yourColor }}</span>
            </div>
            <div class="player-avatar your-avatar">{{ initialChar(state.yourName) }}</div>
          </div>
        </div>
      </div>

      <!-- RIGHT PANEL (Desktop: Action Controls & Draw Offer) -->
      <div class="game-panel right-panel">
        
        <!-- Draw offer banner -->
        <div class="draw-offer-banner" *ngIf="state && state.drawOfferedToMe">
          <span>Opponent offers a draw</span>
          <div class="draw-actions">
            <button class="btn-accept" (click)="acceptDraw()">Accept</button>
            <button class="btn-decline" (click)="declineDraw()">Decline</button>
          </div>
        </div>

        <!-- Action buttons / Controls card -->
        <div class="panel-card actions-card" *ngIf="state">
          <div class="card-header">
            <span class="card-title">⚡ Controls</span>
          </div>
          <div class="action-buttons">
            <button class="btn-action replay" (click)="triggerReplay()" [disabled]="!lastMove" title="Replay the last move made on the board">
              ↺ Replay Move
            </button>
            <button class="btn-action resign" (click)="confirmResign()" *ngIf="state.phase !== 'Finished'">
              🏳 Resign
            </button>
            <button class="btn-action draw" (click)="offerDraw()" [disabled]="state.drawOfferedToMe" *ngIf="state.phase !== 'Finished'">
              ½ Offer Draw
            </button>
          </div>
        </div>

      </div>

      <!-- Resign Confirmation Dialog -->
      <div class="resign-overlay" *ngIf="showResignConfirm">
        <div class="resign-dialog">
          <h3>Are you sure?</h3>
          <p>Do you really want to resign from this match?</p>
          <div class="dialog-actions">
            <button class="btn-cancel-dialog" (click)="showResignConfirm = false">Cancel</button>
            <button class="btn-confirm-resign" (click)="executeResign()">Yes, Resign</button>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .turn-ambient-light {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      pointer-events: none;
      z-index: 0;
      background: radial-gradient(circle at 50% 15%, rgba(64, 130, 255, 0.18) 0%, transparent 65%);
      transition: background 1.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .turn-ambient-light.your-turn {
      background: radial-gradient(circle at 50% 85%, rgba(240, 192, 64, 0.22) 0%, transparent 65%);
    }
    .turn-ambient-light.finished {
      background: transparent;
    }

    .game-layout {
      position: relative;
      z-index: 1;
      width: 100%;
      max-width: 1200px;
      margin: 0 auto;
      box-sizing: border-box;
      height: 100dvh;
      max-height: 100dvh;
      padding: 0.5rem 1rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-evenly;
      overflow: hidden;
    }

    /* DESKTOP 3-COLUMN LAYOUT (>= 900px) */
    @media (min-width: 900px) {
      .game-layout {
        display: grid;
        grid-template-columns: 260px minmax(360px, 580px) 260px;
        align-items: center;
        justify-content: center;
        gap: 1.5rem;
        padding: 0.5rem 1.5rem;
      }

      .game-panel {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        width: 100%;
        height: 100%;
        justify-content: center;
      }

      .left-panel { justify-content: center; }
      .center-panel { justify-content: center; align-items: center; gap: 0.25rem; }
      .right-panel { justify-content: center; }

      .actions-card .action-buttons {
        flex-direction: column;
        width: 100%;
        gap: 0.65rem;
      }
      .btn-action {
        width: 100%;
        padding: 0.65rem 1rem;
        font-size: 0.9rem;
        justify-content: center;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
    }

    /* MOBILE LAYOUT (< 900px) */
    @media (max-width: 899px) {
      .game-layout {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        padding: 0.25rem 0.5rem;
        max-width: 540px;
        justify-content: space-evenly;
      }

      .game-panel { width: 100%; }

      .left-panel { order: 5; } /* Move history at bottom */
      .center-panel { order: 1; display: flex; flex-direction: column; align-items: center; gap: 0.2rem; }
      .right-panel { order: 4; } /* Action buttons above history */

      .actions-card { background: transparent !important; border: none !important; padding: 0 !important; box-shadow: none !important; }
      .actions-card .card-header { display: none !important; }
      .action-buttons { display: flex; gap: 0.5rem; width: 100%; justify-content: center; }
      .btn-action { padding: 0.4rem 0.9rem; font-size: 0.82rem; }
    }

    /* Common Card & Panel Styles */
    .panel-card {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 1.25rem;
      padding: 1rem;
      backdrop-filter: blur(10px);
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .card-header {
      display: flex; align-items: center; justify-content: space-between;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      padding-bottom: 0.5rem; margin-bottom: 0.2rem;
    }
    .card-title {
      font-size: 0.8rem; font-weight: 800; color: #f0c040;
      text-transform: uppercase; letter-spacing: 0.08em;
    }
    .move-count { font-size: 0.75rem; color: #808898; font-weight: 600; }

    .move-history-scroll {
      max-height: 280px;
      overflow-y: auto;
      padding-right: 0.25rem;
    }
    .history-grid { display: flex; flex-direction: column; gap: 0.35rem; }
    .move-row {
      display: grid; grid-template-columns: 2rem 1fr 1fr; align-items: center;
      font-family: monospace; font-size: 0.88rem; padding: 0.2rem 0.4rem;
      border-radius: 0.4rem; background: rgba(0,0,0,0.15);
    }
    .move-num { color: #606878; font-size: 0.78rem; }
    .move.white { color: #e8e8e8; font-weight: 600; }
    .move.black { color: #a0a8b8; }
    .no-moves-msg { color: #606878; font-size: 0.85rem; font-style: italic; text-align: center; padding: 1rem 0; }

    .player-bar { width: 100%; display: flex; flex-direction: column; gap: 0.15rem; }
    .player-info { display: flex; align-items: center; gap: 0.5rem; }
    .player-avatar {
      width: 32px; height: 32px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.9rem; font-weight: 700; flex-shrink: 0;
    }
    .opponent-avatar { background: linear-gradient(135deg,#4060c0,#204080); color: #fff; }
    .your-avatar     { background: linear-gradient(135deg,#c06040,#804020); color: #fff; }
    .player-details { display: flex; flex-direction: column; flex: 1; }
    .player-details.right { align-items: flex-end; }
    .player-name { font-weight: 600; color: #e8e8e8; font-size: 0.88rem; }
    .player-color { font-size: 0.68rem; color: #a0a8b8; text-transform: uppercase; letter-spacing: 0.05em; }
    .turn-indicator { font-size: 0.76rem; color: #a0a8b8; display: flex; align-items: center; gap: 0.35rem; min-width: 70px; }
    .turn-indicator.active { color: #f0c040; }
    .turn-pulse { width: 7px; height: 7px; border-radius: 50%; background: #f0c040; animation: pulse-anim 1s infinite; flex-shrink: 0; }
    @keyframes pulse-anim { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.3)} }

    .captured-pieces { display: flex; flex-wrap: wrap; gap: 0.1rem; min-height: 1rem; }
    .cap-piece { font-size: 0.95rem; line-height: 1; }

    .status-banner-slot {
      height: 1.8rem;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
    }

    .status-banner {
      background: linear-gradient(135deg, #e05050, #901010);
      color: #fff; padding: 0.25rem 1.2rem; border-radius: 2rem;
      font-weight: 700; font-size: 0.85rem; animation: check-blink 0.6s infinite alternate;
      box-shadow: 0 4px 15px rgba(224,80,80,0.4);
    }
    .status-banner.checkmate {
      background: linear-gradient(135deg, #d03030, #600000);
      font-size: 0.92rem; padding: 0.3rem 1.4rem; letter-spacing: 0.05em;
      box-shadow: 0 6px 20px rgba(220,30,30,0.6);
      animation: checkmate-pulse 0.8s infinite alternate ease-in-out;
    }
    @keyframes check-blink { from{opacity:1} to{opacity:0.6} }
    @keyframes checkmate-pulse { from{transform:scale(0.96);opacity:0.9} to{transform:scale(1.04);opacity:1} }

    .board-area { width: 100%; display: flex; justify-content: center; }

    .draw-offer-banner {
      display: flex; align-items: center; gap: 0.75rem;
      background: rgba(60,120,240,0.15); border: 1px solid #3c78f0;
      border-radius: 0.75rem; padding: 0.4rem 0.8rem; font-size: 0.85rem; color: #e8e8e8;
      width: 100%; box-sizing: border-box;
    }
    .draw-offer-banner span { flex: 1; }
    .draw-actions { display: flex; gap: 0.4rem; }
    .btn-accept, .btn-decline {
      padding: 0.3rem 0.75rem; border-radius: 0.5rem; border: none;
      font-size: 0.8rem; font-weight: 600; cursor: pointer; font-family: inherit;
    }
    .btn-accept  { background: #40d060; color: #111; }
    .btn-decline { background: rgba(255,255,255,0.08); color: #e8e8e8; border: 1px solid rgba(255,255,255,0.15); }

    .btn-action {
      padding: 0.4rem 1rem; border-radius: 0.75rem; border: none;
      font-size: 0.82rem; font-weight: 600; cursor: pointer; font-family: inherit;
      transition: all 0.2s;
    }
    .btn-action:disabled { opacity: 0.4; cursor: not-allowed; }
    .btn-action.replay  { background: rgba(96,165,250,0.15); color: #60a5fa; border: 1px solid rgba(96,165,250,0.35); }
    .btn-action.replay:hover:not(:disabled)  { background: rgba(96,165,250,0.28); transform: translateY(-1px); }
    .btn-action.resign  { background: rgba(220,60,60,0.15); color: #e07070; border: 1px solid rgba(220,60,60,0.3); }
    .btn-action.resign:hover:not(:disabled)  { background: rgba(220,60,60,0.25); }
    .btn-action.draw    { background: rgba(100,180,100,0.12); color: #80d080; border: 1px solid rgba(100,180,100,0.25); }
    .btn-action.draw:hover:not(:disabled)    { background: rgba(100,180,100,0.22); }

    /* Resign Dialog */
    .resign-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.75);
      backdrop-filter: blur(4px); z-index: 200;
      display: flex; align-items: center; justify-content: center;
      padding: 1.5rem; animation: fadeIn 0.2s ease-out;
    }
    .resign-dialog {
      background: #1e2538; border: 1px solid rgba(255,255,255,0.1);
      border-radius: 1.25rem; padding: 2rem; max-width: 360px; width: 100%;
      text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.6);
      animation: modalSlide 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    .resign-dialog h3 { margin: 0 0 0.75rem; color: #e8e8e8; font-size: 1.2rem; }
    .resign-dialog p { color: #a0a8b8; font-size: 0.95rem; margin: 0 0 1.5rem; }
    .dialog-actions { display: flex; gap: 0.75rem; justify-content: center; }
    .btn-cancel-dialog, .btn-confirm-resign {
      padding: 0.7rem 1.2rem; border-radius: 0.75rem; border: none;
      font-size: 0.9rem; font-weight: 600; cursor: pointer; font-family: inherit;
    }
    .btn-cancel-dialog { background: rgba(255,255,255,0.1); color: #e8e8e8; transition: background 0.2s; }
    .btn-cancel-dialog:hover { background: rgba(255,255,255,0.15); }
    .btn-confirm-resign { background: #e05050; color: #fff; transition: background 0.2s; }
    .btn-confirm-resign:hover { background: #ff5555; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes modalSlide { from { transform: translateY(20px) scale(0.9); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
  `]
})
export class GamePhaseComponent implements OnInit, OnDestroy {
  @ViewChild(ChessBoardComponent) boardComp!: ChessBoardComponent;

  state!: GameState;
  squareSize = 72;
  lastMove: { from: string; to: string; capturedPiece?: { type: PieceType; color: PieceColor } | null } | null = null;
  showResignConfirm = false;
  private pendingPromotion: { from: string; to: string } | null = null;
  private subs: Subscription[] = [];

  triggerReplay(): void {
    this.boardComp?.replayLastMove();
  }

  initialChar(name?: string | null): string {
    return name && name.length > 0 ? name[0].toUpperCase() : '?';
  }

  get opponentColor(): PieceColor {
    return this.state?.yourColor === 'White' ? 'Black' : 'White';
  }

  get defeatedColor(): PieceColor | null {
    if (this.state?.phase === 'Finished' && this.state?.result?.winner) {
      return this.state.result.winner === 'White' ? 'Black' : 'White';
    }
    return null;
  }

  get isCheckmate(): boolean {
    return this.state?.phase === 'Finished' && this.state?.result?.reason === 'Checkmate';
  }

  get piecesCapturedByYou(): { type: PieceType }[] {
    const oppColor = this.opponentColor;
    const remainingOpp = this.state?.allPieces?.filter(p => p.color === oppColor) ?? [];
    return this.calculateCaptured(remainingOpp);
  }

  get piecesCapturedByOpponent(): { type: PieceType }[] {
    const myColor = this.state?.yourColor ?? 'White';
    const remainingMy = this.state?.allPieces?.filter(p => p.color === myColor) ?? [];
    return this.calculateCaptured(remainingMy);
  }

  private calculateCaptured(remaining: ChessPiece[]): { type: PieceType }[] {
    const initial: Record<PieceType, number> = {
      Pawn: 8, Knight: 2, Bishop: 2, Rook: 2, Queen: 1, King: 1
    };
    const current: Record<PieceType, number> = {
      Pawn: 0, Knight: 0, Bishop: 0, Rook: 0, Queen: 0, King: 0
    };
    remaining.forEach(p => { if (current[p.type] !== undefined) current[p.type]++; });

    const captured: { type: PieceType }[] = [];
    const types: PieceType[] = ['Queen', 'Rook', 'Bishop', 'Knight', 'Pawn'];
    types.forEach(t => {
      const missing = Math.max(0, initial[t] - current[t]);
      for (let i = 0; i < missing; i++) captured.push({ type: t });
    });
    return captured;
  }

  get pairedMoves(): [string, string?][] {
    const hist = this.state?.sanMoveHistory?.length ? this.state.sanMoveHistory : (this.state?.moveHistory ?? []);
    const pairs: [string, string?][] = [];
    for (let i = 0; i < hist.length; i += 2)
      pairs.push([hist[i], hist[i+1]]);
    return pairs;
  }

  constructor(private gameService: GameService) {}

  ngOnInit(): void {
    this.adjustBoardSize();
    this.subs.push(
      this.gameService.state$.subscribe(s => {
        if (s.lastMoveDetails) {
          this.lastMove = s.lastMoveDetails;
        } else if (s.moveHistory && s.moveHistory.length > 0 && s.moveHistory.length !== this.state?.moveHistory?.length) {
          const last = s.moveHistory[s.moveHistory.length - 1];
          this.lastMove = { from: last.substring(0,2), to: last.substring(2,4) };
        }
        this.state = s;
      })
    );
  }

  @HostListener('window:resize')
  onResize(): void {
    this.adjustBoardSize();
  }

  private adjustBoardSize(): void {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (vw >= 900) {
      const availableW = Math.min(560, vw - 580);
      const maxW = Math.floor(availableW / 8);
      const maxH = Math.floor((vh - 200) / 8);
      const calculated = Math.min(maxW, maxH);
      this.squareSize = Math.max(48, Math.min(68, calculated));
    } else if (vw < 480) {
      const maxW = Math.floor((vw - 24) / 8);
      const maxH = Math.floor((vh - 310) / 8);
      const calculated = Math.min(maxW, maxH);
      this.squareSize = Math.max(30, Math.min(42, calculated));
    } else {
      const maxW = Math.floor((vw - 44) / 8);
      const maxH = Math.floor((vh - 320) / 8);
      const calculated = Math.min(maxW, maxH);
      this.squareSize = Math.max(40, Math.min(56, calculated));
    }
  }

  async onSquareClick(e: { row: number; col: number; algebraic: string }): Promise<void> {
    const s = this.state;
    if (!s || s.currentTurn !== s.yourColor || s.phase === 'Finished') return;

    const piece = s.allPieces.find(p => p.row === e.row && p.col === e.col);
    const alg = e.algebraic;

    if (s.selectedSquare && s.legalMoves.includes(alg)) {
      const sel = this.gameService.fromAlgebraic(s.selectedSquare);
      const movingPiece = s.allPieces.find(p => p.row === sel.row && p.col === sel.col);
      const isPromo = movingPiece?.type === 'Pawn' &&
        ((movingPiece.color === 'White' && e.row === 7) ||
         (movingPiece.color === 'Black' && e.row === 0));

      if (isPromo) {
        // Handled by board component intercepting the click and emitting promotionChosen
        return;
      } else {
        await this.gameService.makeMove(s.selectedSquare, alg);
      }
    } else if (piece && piece.color === s.yourColor) {
      await this.gameService.getLegalMoves(alg);
    } else {
      this.gameService.clearSelection();
    }
  }

  async onPieceDragged(e: { fromRow: number; fromCol: number; toRow: number; toCol: number }): Promise<void> {
    const from = this.gameService.toAlgebraic(e.fromRow, e.fromCol);
    const to   = this.gameService.toAlgebraic(e.toRow, e.toCol);
    if (this.pendingPromotion) {
      this.pendingPromotion = { from, to };
    } else {
      const piece = this.state.allPieces.find(p => p.row === e.fromRow && p.col === e.fromCol);
      const isPromo = piece?.type === 'Pawn' &&
        ((piece.color === 'White' && e.toRow === 7) || (piece.color === 'Black' && e.toRow === 0));
      if (isPromo) {
        this.pendingPromotion = { from, to };
      } else {
        await this.gameService.makeMove(from, to);
      }
    }
  }

  async onPromotionChosen(piece: string): Promise<void> {
    if (this.pendingPromotion) {
      await this.gameService.makeMove(this.pendingPromotion.from, this.pendingPromotion.to, piece);
      this.pendingPromotion = null;
    }
  }

  async offerDraw(): Promise<void> { await this.gameService.offerDraw(); }
  async acceptDraw(): Promise<void> { await this.gameService.acceptDraw(); }
  async declineDraw(): Promise<void> { await this.gameService.declineDraw(); }

  confirmResign(): void {
    this.showResignConfirm = true;
  }

  executeResign(): void {
    this.showResignConfirm = false;
    this.gameService.resign();
  }

  miniPiece(type: PieceType, color: string): string {
    const w: Record<PieceType,string> = { King:'♔',Queen:'♕',Rook:'♖',Bishop:'♗',Knight:'♘',Pawn:'♙' };
    const b: Record<PieceType,string> = { King:'♚',Queen:'♛',Rook:'♜',Bishop:'♝',Knight:'♞',Pawn:'♟' };
    return color === 'White' ? w[type] : b[type];
  }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }
}
