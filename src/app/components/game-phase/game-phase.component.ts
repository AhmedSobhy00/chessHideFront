import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
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

      <!-- Opponent area -->
      <div class="player-bar opponent-bar">
        <div class="player-info" *ngIf="state">
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
        <div class="captured-pieces" *ngIf="state">
          <span *ngFor="let p of piecesCapturedByOpponent" class="cap-piece">
            {{ miniPiece(p.type, state.yourColor) }}
          </span>
        </div>
      </div>

      <!-- Check / Checkmate status banner -->
      <div class="status-banner" *ngIf="state && (state.isCheck || isCheckmate)" [class.checkmate]="isCheckmate">
        {{ isCheckmate ? '♚ Checkmate!' : '♚ Check!' }}
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
          [disabled]="state.phase === 'Finished' || state.currentTurn !== state.yourColor"
          [squareSize]="squareSize"
          (squareClicked)="onSquareClick($event)"
          (pieceDragged)="onPieceDragged($event)"
          (promotionChosen)="onPromotionChosen($event)"
        ></app-chess-board>
      </div>

      <!-- Your area -->
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

      <!-- Draw offer banner -->
      <div class="draw-offer-banner" *ngIf="state && state.drawOfferedToMe">
        <span>Opponent offers a draw</span>
        <button class="btn-accept" (click)="acceptDraw()">Accept</button>
        <button class="btn-decline" (click)="declineDraw()">Decline</button>
      </div>

      <!-- Action buttons -->
      <div class="action-buttons" *ngIf="state && state.phase !== 'Finished'">
        <button class="btn-action resign" (click)="confirmResign()">
          🏳 Resign
        </button>
        <button class="btn-action draw" (click)="offerDraw()" [disabled]="state.drawOfferedToMe">
          ½ Offer Draw
        </button>
      </div>

      <!-- Move history -->
      <div class="move-history" *ngIf="state && state.moveHistory && state.moveHistory.length > 0">
        <div class="history-inner">
          <span *ngFor="let mv of pairedMoves; let i = index" class="move-pair">
            <span class="move-num">{{ i + 1 }}.</span>
            <span class="move white">{{ mv[0] }}</span>
            <span class="move black" *ngIf="mv[1]">{{ mv[1] }}</span>
          </span>
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
      display: flex; flex-direction: column; align-items: center; gap: 0.75rem; padding: 0.75rem; max-width: 600px; margin: 0 auto;
    }
    .player-bar { width: 100%; display: flex; flex-direction: column; gap: 0.3rem; }
    .player-info { display: flex; align-items: center; gap: 0.6rem; }
    .player-avatar {
      width: 36px; height: 36px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 1rem; font-weight: 700;
    }
    .opponent-avatar { background: linear-gradient(135deg,#4060c0,#204080); color: #fff; }
    .your-avatar     { background: linear-gradient(135deg,#c06040,#804020); color: #fff; }
    .player-details { display: flex; flex-direction: column; flex: 1; }
    .player-details.right { align-items: flex-end; }
    .player-name { font-weight: 600; color: #e8e8e8; font-size: 0.95rem; }
    .player-color { font-size: 0.72rem; color: #a0a8b8; text-transform: uppercase; letter-spacing: 0.05em; }
    .turn-indicator { font-size: 0.8rem; color: #a0a8b8; display: flex; align-items: center; gap: 0.4rem; min-width: 80px; }
    .turn-indicator.active { color: #f0c040; }
    .turn-pulse { width: 8px; height: 8px; border-radius: 50%; background: #f0c040; animation: pulse-anim 1s infinite; flex-shrink: 0; }
    @keyframes pulse-anim { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.3)} }

    .captured-pieces { display: flex; flex-wrap: wrap; gap: 0.1rem; min-height: 1.2rem; }
    .cap-piece { font-size: 1.1rem; line-height: 1; }

    .status-banner {
      background: linear-gradient(135deg, #e05050, #901010);
      color: #fff; padding: 0.4rem 1.5rem; border-radius: 2rem;
      font-weight: 700; font-size: 0.95rem; animation: check-blink 0.6s infinite alternate;
      box-shadow: 0 4px 15px rgba(224,80,80,0.4);
    }
    .status-banner.checkmate {
      background: linear-gradient(135deg, #d03030, #600000);
      font-size: 1.05rem; padding: 0.5rem 1.75rem; letter-spacing: 0.05em;
      box-shadow: 0 6px 20px rgba(220,30,30,0.6);
      animation: checkmate-pulse 0.8s infinite alternate ease-in-out;
    }
    @keyframes check-blink { from{opacity:1} to{opacity:0.6} }
    @keyframes checkmate-pulse { from{transform:scale(0.96);opacity:0.9} to{transform:scale(1.04);opacity:1} }

    .board-area { width: 100%; display: flex; justify-content: center; }

    .draw-offer-banner {
      display: flex; align-items: center; gap: 0.75rem;
      background: rgba(60,120,240,0.15); border: 1px solid #3c78f0;
      border-radius: 0.75rem; padding: 0.6rem 1rem; font-size: 0.9rem; color: #e8e8e8;
      width: 100%; box-sizing: border-box;
    }
    .draw-offer-banner span { flex: 1; }
    .btn-accept, .btn-decline {
      padding: 0.35rem 0.85rem; border-radius: 0.5rem; border: none;
      font-size: 0.85rem; font-weight: 600; cursor: pointer; font-family: inherit;
    }
    .btn-accept  { background: #40d060; color: #111; }
    .btn-decline { background: rgba(255,255,255,0.08); color: #e8e8e8; border: 1px solid rgba(255,255,255,0.15); }

    .action-buttons { display: flex; gap: 0.75rem; width: 100%; justify-content: center; }
    .btn-action {
      padding: 0.6rem 1.4rem; border-radius: 0.75rem; border: none;
      font-size: 0.9rem; font-weight: 600; cursor: pointer; font-family: inherit;
      transition: all 0.2s;
    }
    .btn-action:disabled { opacity: 0.4; cursor: not-allowed; }
    .btn-action.resign  { background: rgba(220,60,60,0.15); color: #e07070; border: 1px solid rgba(220,60,60,0.3); }
    .btn-action.resign:hover:not(:disabled)  { background: rgba(220,60,60,0.25); }
    .btn-action.draw    { background: rgba(100,180,100,0.12); color: #80d080; border: 1px solid rgba(100,180,100,0.25); }
    .btn-action.draw:hover:not(:disabled)    { background: rgba(100,180,100,0.22); }

    .move-history {
      width: 100%; max-height: 100px; overflow-y: auto;
      background: rgba(0,0,0,0.2); border-radius: 0.5rem; padding: 0.4rem 0.6rem;
      box-sizing: border-box;
    }
    .history-inner { display: flex; flex-wrap: wrap; gap: 0.25rem 0.5rem; }
    .move-pair { display: flex; gap: 0.3rem; align-items: baseline; }
    .move-num { color: #606878; font-size: 0.78rem; }
    .move { font-size: 0.85rem; font-family: monospace; color: #d0d4df; }
    .move.white { color: #e8e8e8; }
    .move.black { color: #a0a8b8; }
  `]
})
export class GamePhaseComponent implements OnInit, OnDestroy {
  state!: GameState;
  squareSize = 72;
  lastMove: { from: string; to: string } | null = null;
  private pendingPromotion: { from: string; to: string } | null = null;
  private subs: Subscription[] = [];

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
    const hist = this.state?.moveHistory ?? [];
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
        if (s.moveHistory && s.moveHistory.length > 0 && s.moveHistory.length !== this.state?.moveHistory?.length) {
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
    if (vw < 480) this.squareSize = Math.max(36, Math.floor((vw - 32) / 8));
    else if (vw < 768) this.squareSize = 64;
    else this.squareSize = 72;
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
        this.pendingPromotion = { from: s.selectedSquare, to: alg };
        await this.gameService.makeMove(s.selectedSquare, alg, 'queen');
      } else {
        await this.gameService.makeMove(s.selectedSquare, alg);
      }
    } else if (piece && piece.color === s.yourColor) {
      await this.gameService.getLegalMoves(alg);
    } else {
      this.gameService['patch']?.({ selectedSquare: null, legalMoves: [] });
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
    if (confirm('Are you sure you want to resign?')) this.gameService.resign();
  }

  miniPiece(type: PieceType, color: string): string {
    const w: Record<PieceType,string> = { King:'♔',Queen:'♕',Rook:'♖',Bishop:'♗',Knight:'♘',Pawn:'♙' };
    const b: Record<PieceType,string> = { King:'♚',Queen:'♛',Rook:'♜',Bishop:'♝',Knight:'♞',Pawn:'♟' };
    return color === 'White' ? w[type] : b[type];
  }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }
}
