import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { GameService } from '../../core/services/game.service';
import { GameState, ChessPiece, PieceType } from '../../models/game.model';
import { ChessBoardComponent } from '../chess-board/chess-board.component';

@Component({
  selector: 'app-game-phase',
  standalone: true,
  imports: [CommonModule, ChessBoardComponent],
  template: `
    <div class="game-layout">

      <!-- Opponent area -->
      <div class="player-bar opponent-bar">
        <div class="player-info">
          <div class="player-avatar opponent-avatar">{{ state.opponentName[0]?.toUpperCase() }}</div>
          <div class="player-details">
            <span class="player-name">{{ state.opponentName }}</span>
            <span class="player-color">{{ opponentColor }}</span>
          </div>
          <div class="turn-indicator" [class.active]="state.currentTurn !== state.yourColor">
            <div class="turn-pulse" *ngIf="state.currentTurn !== state.yourColor"></div>
            {{ state.currentTurn !== state.yourColor ? 'Thinking…' : '' }}
          </div>
        </div>
        <div class="captured-pieces">
          <span *ngFor="let p of capturedOpponentPieces" class="cap-piece">
            {{ miniPiece(p.type, state.yourColor) }}
          </span>
        </div>
      </div>

      <!-- Check / status banner -->
      <div class="status-banner" *ngIf="state.isCheck">
        ♚ Check!
      </div>

      <!-- Board -->
      <div class="board-area">
        <app-chess-board
          [pieces]="state.allPieces"
          [yourColor]="state.yourColor"
          mode="play"
          [selectedSquare]="state.selectedSquare"
          [legalMoves]="state.legalMoves"
          [isCheck]="state.isCheck"
          [currentTurn]="state.currentTurn"
          [lastMove]="lastMove"
          [disabled]="state.currentTurn !== state.yourColor"
          [squareSize]="squareSize"
          (squareClicked)="onSquareClick($event)"
          (pieceDragged)="onPieceDragged($event)"
          (promotionChosen)="onPromotionChosen($event)"
        ></app-chess-board>
      </div>

      <!-- Your area -->
      <div class="player-bar your-bar">
        <div class="captured-pieces">
          <span *ngFor="let p of capturedYourPieces" class="cap-piece">
            {{ miniPiece(p.type, opponentColor) }}
          </span>
        </div>
        <div class="player-info">
          <div class="turn-indicator" [class.active]="state.currentTurn === state.yourColor">
            <div class="turn-pulse" *ngIf="state.currentTurn === state.yourColor"></div>
            {{ state.currentTurn === state.yourColor ? 'Your turn' : '' }}
          </div>
          <div class="player-details right">
            <span class="player-name">{{ state.yourName }} (You)</span>
            <span class="player-color">{{ state.yourColor }}</span>
          </div>
          <div class="player-avatar your-avatar">{{ state.yourName[0]?.toUpperCase() }}</div>
        </div>
      </div>

      <!-- Draw offer banner -->
      <div class="draw-offer-banner" *ngIf="state.drawOfferedToMe">
        <span>Opponent offers a draw</span>
        <button class="btn-accept" (click)="acceptDraw()">Accept</button>
        <button class="btn-decline" (click)="declineDraw()">Decline</button>
      </div>

      <!-- Action buttons -->
      <div class="action-buttons">
        <button class="btn-action resign" (click)="confirmResign()">
          🏳 Resign
        </button>
        <button class="btn-action draw" (click)="offerDraw()" [disabled]="state.drawOfferedToMe">
          ½ Offer Draw
        </button>
      </div>

      <!-- Move history -->
      <div class="move-history" *ngIf="state.moveHistory.length > 0">
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
    .game-layout { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; padding: 0.75rem; max-width: 600px; margin: 0 auto; }
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
    }
    @keyframes check-blink { from{opacity:1} to{opacity:0.6} }

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

  get opponentColor() {
    return this.state?.yourColor === 'White' ? 'Black' : 'White';
  }

  get capturedYourPieces() {
    return this.state?.yourColor === 'White'
      ? (this.state?.capturedByBlack ?? [])
      : (this.state?.capturedByWhite ?? []);
  }

  get capturedOpponentPieces() {
    return this.state?.yourColor === 'White'
      ? (this.state?.capturedByWhite ?? [])
      : (this.state?.capturedByBlack ?? []);
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
        if (s.moveHistory.length > 0 && s.moveHistory.length !== this.state?.moveHistory?.length) {
          const last = s.moveHistory[s.moveHistory.length - 1];
          this.lastMove = { from: last.substring(0,2), to: last.substring(2,4) };
        }
        this.state = s;
      })
    );
  }

  private adjustBoardSize(): void {
    const vw = window.innerWidth;
    if (vw < 480) this.squareSize = Math.floor((vw - 48) / 8);
    else if (vw < 768) this.squareSize = 64;
    else this.squareSize = 72;
  }

  async onSquareClick(e: { row: number; col: number; algebraic: string }): Promise<void> {
    const s = this.state;
    if (s.currentTurn !== s.yourColor) return;

    const piece = s.allPieces.find(p => p.row === e.row && p.col === e.col);
    const alg = e.algebraic;

    if (s.selectedSquare && s.legalMoves.includes(alg)) {
      // Check if pawn promotion
      const sel = this.gameService.fromAlgebraic(s.selectedSquare);
      const movingPiece = s.allPieces.find(p => p.row === sel.row && p.col === sel.col);
      const isPromo = movingPiece?.type === 'Pawn' &&
        ((movingPiece.color === 'White' && e.row === 7) ||
         (movingPiece.color === 'Black' && e.row === 0));

      if (isPromo) {
        this.pendingPromotion = { from: s.selectedSquare, to: alg };
        // Promotion dialog handled by board component's built-in dialog on drag
        // For click-based: emit to board (no - board emits back promotionChosen)
        // Simple fallback: queen promotion
        await this.gameService.makeMove(s.selectedSquare, alg, 'queen');
      } else {
        await this.gameService.makeMove(s.selectedSquare, alg);
      }
    } else if (piece && piece.color === s.yourColor) {
      await this.gameService.getLegalMoves(alg);
    } else {
      // Deselect
      this.gameService['patch']?.({ selectedSquare: null, legalMoves: [] });
    }
  }

  async onPieceDragged(e: { fromRow: number; fromCol: number; toRow: number; toCol: number }): Promise<void> {
    const from = this.gameService.toAlgebraic(e.fromRow, e.fromCol);
    const to   = this.gameService.toAlgebraic(e.toRow, e.toCol);
    if (this.pendingPromotion) {
      // Promotion already started — wait for promotionChosen event
      this.pendingPromotion = { from, to };
    } else {
      // Check pawn promotion
      const piece = this.state.allPieces.find(p => p.row === e.fromRow && p.col === e.fromCol);
      const isPromo = piece?.type === 'Pawn' &&
        ((piece.color === 'White' && e.toRow === 7) || (piece.color === 'Black' && e.toRow === 0));
      if (isPromo) {
        this.pendingPromotion = { from, to };
        // board component opens dialog; wait for promotionChosen
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
