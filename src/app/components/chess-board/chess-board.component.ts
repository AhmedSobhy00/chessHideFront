import {
  Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, HostListener, ElementRef, OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChessPiece, PieceColor, PieceType } from '../../models/game.model';
import { GameService } from '../../core/services/game.service';
import { SoundService } from '../../core/services/sound.service';

interface Square {
  row: number;
  col: number;
  piece: ChessPiece | undefined;
  isLight: boolean;
  isHighlighted: boolean;   // legal move target
  isSelected: boolean;
  isSetupZone: boolean;
  isLastMove: boolean;
  isReplaying?: boolean;
  isInCheck: boolean;
  isWinningKing: boolean;
  isLosingKing: boolean;
  isShaking: boolean;
  isSliding?: boolean;
  slideDx?: number;
  slideDy?: number;
}

@Component({
  selector: 'app-chess-board',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="board-wrap" [class.flipped]="flipBoard">
      <div class="board">
        <div class="squares">
          <!-- Organic Cloud Overlay over Top 4 Ranks in Setup Mode -->
          <div class="cloud-overlay" *ngIf="mode === 'setup'">
            <div class="cloud-puff puff-1"></div>
            <div class="cloud-puff puff-2"></div>
            <div class="cloud-puff puff-3"></div>
            <div class="cloud-puff puff-4"></div>
            <div class="cloud-puff puff-5"></div>
            
            <div class="cloud-bottom-scallop">
              <svg viewBox="0 0 1000 120" preserveAspectRatio="none">
                <path d="M0 0 L0 50 Q 60 110, 120 50 Q 180 120, 260 60 Q 340 115, 420 55 Q 500 125, 580 60 Q 660 115, 740 50 Q 820 110, 900 45 Q 960 105, 1000 50 L1000 0 Z" fill="url(#cloudGrad)"/>
                <defs>
                  <linearGradient id="cloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="#1e293b" stop-opacity="0.96"/>
                    <stop offset="60%" stop-color="#334155" stop-opacity="0.92"/>
                    <stop offset="100%" stop-color="#475569" stop-opacity="0.88"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <div class="cloud-badge">
              <span class="cloud-icon">☁️</span>
              <span class="cloud-text">Opponent Territory (Hidden in Cloud)</span>
            </div>
          </div>
          <ng-container *ngFor="let row of boardRows; trackBy: trackByRow">
            <div
              *ngFor="let sq of row; trackBy: trackBySq"
              class="square"
              [attr.data-row]="sq.row"
              [attr.data-col]="sq.col"
              [class.light]="sq.isLight"
              [class.dark]="!sq.isLight"
              [class.highlighted]="sq.isHighlighted"
              [class.selected]="sq.isSelected"
              [class.setup-zone]="sq.isSetupZone"
              [class.last-move]="sq.isLastMove"
              [class.replaying]="sq.isReplaying"
              [class.in-check]="sq.isInCheck"
              [class.winning-king]="sq.isWinningKing"
              [class.losing-king]="sq.isLosingKing"
              [class.shake]="sq.isShaking"
              [attr.tabindex]="disabled ? null : 0"
              [attr.aria-label]="getAriaLabel(sq)"
              (click)="onSquareClick(sq)"
              (keydown.enter)="onSquareClick(sq)"
              (keydown.space)="onSquareClick(sq); $event.preventDefault()"
              (dragover)="onDragOver($event)"
              (drop)="onDrop($event, sq)"
              (touchstart)="onTouchStart($event, sq)"
            >
              <!-- Golden crown on top-left of winning king square -->
              <div class="winner-crown" *ngIf="sq.isWinningKing">👑</div>

              <!-- Legal-move dot / ring -->
              <div class="move-dot" *ngIf="sq.isHighlighted && !sq.piece"></div>
              <div class="move-ring" *ngIf="sq.isHighlighted && sq.piece"></div>

              <!-- Chess piece -->
              <div
                *ngIf="sq.piece"
                class="piece"
                [class.white]="sq.piece.color === 'White'"
                [class.black]="sq.piece.color === 'Black'"
                [class.draggable]="canDrag(sq.piece)"
                [class.sliding]="sq.isSliding"
                [style.--move-dx]="sq.isSliding ? sq.slideDx + 'px' : '0px'"
                [style.--move-dy]="sq.isSliding ? sq.slideDy + 'px' : '0px'"
                draggable="true"
                (dragstart)="onDragStart($event, sq)"
                (dragend)="onDragEnd()"
                [title]="sq.piece.color + ' ' + sq.piece.type"
              >
                {{ getPieceSymbol(sq.piece) }}
              </div>
            </div>
          </ng-container>
        </div>
      </div>
    </div>

    <!-- Promotion dialog -->
    <div class="promotion-overlay" *ngIf="promotionPending">
      <div class="promotion-dialog">
        <h3>Promote pawn to:</h3>
        <div class="promotion-choices">
          <button *ngFor="let p of promotionOptions"
            class="promo-btn"
            (click)="selectPromotion(p)">
            {{ getPromoPieceSymbol(p) }}
            <span>{{ p }}</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      user-select: none;
      -webkit-user-select: none;
      touch-action: none;
    }

    .board-wrap, .board, .board-inner, .squares, .square, .piece {
      touch-action: none;
      -webkit-touch-callout: none;
    }

    .board-wrap {
      position: relative;
      display: flex;
      justify-content: center;
      width: 100%;
    }
    .board {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      max-width: 100vw;
    }
    .squares {
      position: relative;
      display: grid;
      grid-template-columns: repeat(8, var(--sq, 72px));
      grid-template-rows: repeat(8, var(--sq, 72px));
      border: 3px solid #333;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 16px 50px rgba(0,0,0,0.5);
    }

    /* Organic Cloud Overlay in Setup Mode covering the top 4 ranks */
    .cloud-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 52%;
      z-index: 20;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      overflow: visible;
    }

    .cloud-puff {
      position: absolute;
      background: radial-gradient(circle, rgba(226, 232, 240, 0.95) 0%, rgba(148, 163, 184, 0.85) 60%, rgba(30, 41, 59, 0.7) 100%);
      border-radius: 50%;
      filter: blur(8px);
      box-shadow: 0 10px 30px rgba(0,0,0,0.4);
      animation: cloudFloat 6s ease-in-out infinite alternate;
    }

    .puff-1 { width: 45%; height: 80%; top: -10%; left: -10%; animation-delay: 0s; }
    .puff-2 { width: 55%; height: 90%; top: -15%; left: 25%; animation-delay: 1.5s; }
    .puff-3 { width: 45%; height: 80%; top: -10%; right: -10%; animation-delay: 3s; }
    .puff-4 { width: 35%; height: 70%; top: 20%; left: 10%; animation-delay: 2s; }
    .puff-5 { width: 35%; height: 70%; top: 20%; right: 10%; animation-delay: 4s; }

    .cloud-bottom-scallop {
      position: absolute;
      bottom: -18px;
      left: 0;
      right: 0;
      height: 40px;
      z-index: 2;
      filter: drop-shadow(0 6px 12px rgba(0,0,0,0.5));
    }

    .cloud-bottom-scallop svg {
      width: 100%;
      height: 100%;
      display: block;
    }

    .cloud-badge {
      position: relative;
      z-index: 10;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.55rem 1.1rem;
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid rgba(148, 163, 184, 0.4);
      border-radius: 24px;
      color: #e2e8f0;
      font-size: 0.84rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
      backdrop-filter: blur(6px);
      margin-top: -15px;
    }

    .cloud-icon {
      font-size: 1.2rem;
      animation: floatCloudIcon 2.5s ease-in-out infinite alternate;
    }

    @keyframes cloudFloat {
      0% { transform: translateY(0) scale(1); }
      100% { transform: translateY(-8px) scale(1.05); }
    }

    @keyframes floatCloudIcon {
      0% { transform: translateY(0); }
      100% { transform: translateY(-4px); }
    }

    .square.replaying {
      outline: 3px solid #60a5fa !important;
      outline-offset: -3px;
      z-index: 5;
      box-shadow: inset 0 0 15px rgba(96, 165, 250, 0.6), 0 0 20px rgba(96, 165, 250, 0.4);
      animation: replayPulse 0.8s infinite alternate ease-in-out;
    }
    @keyframes replayPulse {
      0% { opacity: 0.75; transform: scale(0.98); }
      100% { opacity: 1; transform: scale(1); }
    }

    @keyframes floatCloud {
      0% { transform: translateY(0); }
      100% { transform: translateY(-3px); }
    }

    .square {
      width: var(--sq, 72px); height: var(--sq, 72px);
      display: flex; align-items: center; justify-content: center;
      position: relative; cursor: pointer;
      transition: background 0.2s ease, box-shadow 0.2s ease;
    }
    .square.light  { background: #f0d9b5; }
    .square.dark   { background: #b58863; }
    .square.selected { outline: 3px solid #f0c040; outline-offset: -3px; z-index: 2; box-shadow: inset 0 0 12px rgba(240,192,64,0.5); }
    .square.highlighted.light { background: #cdd16f; }
    .square.highlighted.dark  { background: #aaa23a; }
    .square.last-move.light   { background: #cdd16f; }
    .square.last-move.dark    { background: #aaa23a; }
    .square.in-check {
      background: radial-gradient(circle at center, #ff333399 0%, #cc000044 70%, transparent 100%);
      animation: pulseCheck 1.2s infinite ease-in-out alternate;
    }

    /* Winning King (Green glow + border) & Losing King (Red glow + border) */
    .square.winning-king {
      background: radial-gradient(circle at center, rgba(60,220,60,0.65) 0%, rgba(30,160,30,0.4) 75%, transparent 100%) !important;
      box-shadow: inset 0 0 12px #40e060, 0 0 15px rgba(60,220,60,0.5);
      outline: 2px solid #40e060 !important;
      z-index: 5;
    }
    .square.losing-king {
      background: radial-gradient(circle at center, rgba(240,60,60,0.65) 0%, rgba(180,30,30,0.4) 75%, transparent 100%) !important;
      box-shadow: inset 0 0 12px #ff4444, 0 0 15px rgba(240,60,60,0.5);
      outline: 2px solid #ff4444 !important;
      z-index: 5;
    }
    .winner-crown {
      position: absolute;
      top: 1px;
      left: 2px;
      font-size: 0.95rem;
      line-height: 1;
      z-index: 10;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.8));
      animation: crownFloat 1.2s infinite alternate ease-in-out;
    }
    @keyframes crownFloat {
      0% { transform: translateY(0) scale(1); }
      100% { transform: translateY(-2px) scale(1.1); }
    }

    /* Denial shake animation on illegal move */
    .square.shake {
      animation: shakeSquare 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
      outline: 2px solid #ff4444 !important;
      z-index: 10;
    }
    .square.shake .piece {
      animation: shakePiece 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
    }

    @keyframes shakeSquare {
      10%, 90% { transform: translate3d(-2px, 0, 0); }
      20%, 80% { transform: translate3d(4px, 0, 0); }
      30%, 50%, 70% { transform: translate3d(-6px, 0, 0); }
      40%, 60% { transform: translate3d(6px, 0, 0); }
    }
    @keyframes shakePiece {
      10%, 90% { transform: translate3d(-4px, 0, 0) rotate(-6deg); }
      20%, 80% { transform: translate3d(6px, 0, 0) rotate(6deg); }
      30%, 50%, 70% { transform: translate3d(-8px, 0, 0) rotate(-8deg); }
      40%, 60% { transform: translate3d(8px, 0, 0) rotate(8deg); }
    }

    @keyframes pulseCheck {
      0% { opacity: 0.7; transform: scale(0.98); }
      100% { opacity: 1; transform: scale(1.02); }
    }
    .square.setup-zone { outline: 2px dashed rgba(64,160,240,0.45); outline-offset: -2px; }

    .move-dot {
      width: 28%; height: 28%; border-radius: 50%;
      background: rgba(0,0,0,0.3); position: absolute; pointer-events: none;
      animation: pulseDot 1.4s infinite ease-in-out alternate;
    }
    @keyframes pulseDot {
      0% { transform: scale(0.85); opacity: 0.6; }
      100% { transform: scale(1.15); opacity: 0.9; }
    }

    .move-ring {
      position: absolute; inset: 0; border-radius: 50%;
      border: 4px solid rgba(220,50,50,0.6); pointer-events: none;
      animation: pulseRing 1.2s infinite ease-in-out alternate;
    }
    @keyframes pulseRing {
      0% { transform: scale(0.9); opacity: 0.6; }
      100% { transform: scale(1.02); opacity: 1; }
    }

    @keyframes pieceSlide {
      from { transform: translate(var(--move-dx, 0px), var(--move-dy, 0px)); }
      to { transform: translate(0px, 0px); }
    }

    .piece {
      font-size: calc(var(--sq, 72px) * 0.74);
      line-height: 1; position: relative; z-index: 1;
      filter: drop-shadow(1px 3px 4px rgba(0,0,0,0.5));
      transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    .piece.sliding {
      animation: pieceSlide 0.28s cubic-bezier(0.22, 1, 0.36, 1) forwards;
      z-index: 50 !important;
    }
    .piece.draggable:hover { transform: scale(1.15) translateY(-2px); cursor: grab; z-index: 3; }
    .piece.draggable:active { transform: scale(1.2) translateY(-4px); cursor: grabbing; z-index: 4; }
    .piece.white { color: #fff8dc; filter: drop-shadow(1px 2px 4px rgba(0,0,0,0.85)); }
    .piece.black { color: #111; filter: drop-shadow(1px 2px 4px rgba(255,255,255,0.4)); }

    /* Promotion dialog responsive */
    .promotion-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.75);
      backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center;
      z-index: 100; animation: fadeIn 0.2s ease-out;
      padding: 1rem;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .promotion-dialog {
      background: #22283a; border-radius: 1.25rem; padding: 1.5rem 1.75rem;
      border: 1px solid rgba(255,255,255,0.15);
      box-shadow: 0 20px 60px rgba(0,0,0,0.6);
      max-width: 92vw; box-sizing: border-box;
      animation: modalSlide 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    @keyframes modalSlide {
      from { transform: translateY(20px) scale(0.9); opacity: 0; }
      to { transform: translateY(0) scale(1); opacity: 1; }
    }
    .promotion-dialog h3 { margin: 0 0 1rem; color: #e8e8e8; text-align: center; font-weight: 700; font-size: 1.1rem; }
    .promotion-choices { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; }
    .promo-btn {
      display: flex; flex-direction: column; align-items: center; gap: 0.3rem;
      background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
      border-radius: 0.85rem; padding: 0.75rem 0.9rem; cursor: pointer; color: #e8e8e8;
      font-size: 2.4rem; font-family: inherit; transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    .promo-btn span { font-size: 0.72rem; color: #a0a8b8; font-weight: 600; }
    .promo-btn:hover { background: rgba(240,192,64,0.2); border-color: #f0c040; transform: translateY(-4px) scale(1.08); }

    @media (max-width: 480px) {
      .file-labels { padding-left: 0.8rem; padding-right: 0.8rem; font-size: 0.55rem; }
      .rank-label-col { width: 0.8rem; font-size: 0.55rem; }
      .rank-label { height: var(--sq, 40px); }
      .squares { border-width: 2px; }
      .promo-btn { font-size: 1.8rem; padding: 0.5rem 0.6rem; }
      .piece { font-size: calc(var(--sq, 40px) * 0.72); }
      .winner-crown { font-size: 0.75rem; }
    }
  `]
})
export class ChessBoardComponent implements OnChanges, OnDestroy {
  @Input() pieces: ChessPiece[] = [];
  @Input() yourColor: PieceColor = 'White';
  @Input() mode: 'setup' | 'play' = 'play';
  @Input() selectedSquare: string | null = null;
  @Input() legalMoves: string[] = [];
  @Input() isCheck: boolean = false;
  @Input() currentTurn: PieceColor = 'White';
  @Input() lastMove: { from: string; to: string } | null = null;
  @Input() disabled: boolean = false;
  @Input() squareSize: number = 72;
  @Input() defeatedColor: PieceColor | null = null;

  @Output() squareClicked = new EventEmitter<{ row: number; col: number; algebraic: string }>();
  @Output() pieceDragged  = new EventEmitter<{ fromRow: number; fromCol: number; toRow: number; toCol: number }>();
  @Output() promotionChosen = new EventEmitter<string>();

  boardRows: Square[][] = [];
  files = ['a','b','c','d','e','f','g','h'];
  ranks = ['8','7','6','5','4','3','2','1'];

  shakingSquareKeys: Set<string> = new Set<string>();
  promotionPending = false;
  promotionOptions: PieceType[] = ['Queen','Rook','Bishop','Knight'];
  private pendingPromotion: { fromRow: number; fromCol: number; toRow: number; toCol: number } | null = null;
  private dragFrom: { row: number; col: number } | null = null;

  // Touch drag state & synthetic click prevention
  private touchFromSq: Square | null = null;
  private touchGhostEl: HTMLElement | null = null;
  private lastTouchTime = 0;

  get flipBoard(): boolean { return this.yourColor === 'Black'; }

  get winningColor(): PieceColor | null {
    if (!this.defeatedColor) return null;
    return this.defeatedColor === 'White' ? 'Black' : 'White';
  }

  trackByRow(index: number): number {
    return index;
  }

  trackBySq(index: number, sq: Square): string {
    return `${sq.row}_${sq.col}`;
  }

  get displayedFiles(): string[] {
    return this.flipBoard ? ['h','g','f','e','d','c','b','a'] : ['a','b','c','d','e','f','g','h'];
  }

  get displayedRanks(): string[] {
    return this.flipBoard ? ['1','2','3','4','5','6','7','8'] : ['8','7','6','5','4','3','2','1'];
  }

  constructor(
    private gameService: GameService,
    private sound: SoundService,
    private el: ElementRef
  ) {}

  // Document-level listeners: survive any re-render of the square elements
  private readonly docTouchMove = (e: TouchEvent) => this.onTouchMove(e);
  private readonly docTouchEnd = (e: TouchEvent) => this.onTouchEnd(e);
  private readonly docTouchCancel = () => this.onTouchCancel();

  private attachDocListeners(): void {
    document.addEventListener('touchmove', this.docTouchMove, { passive: false });
    document.addEventListener('touchend', this.docTouchEnd);
    document.addEventListener('touchcancel', this.docTouchCancel);
  }

  private detachDocListeners(): void {
    document.removeEventListener('touchmove', this.docTouchMove);
    document.removeEventListener('touchend', this.docTouchEnd);
    document.removeEventListener('touchcancel', this.docTouchCancel);
  }

  ngOnDestroy(): void {
    this.detachDocListeners();
    this.removeGhostPiece();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.updateSquareSize();
  }

  isReplaying = false;
  private replayTimeout?: any;
  private currentSquareSize = 72;
  private slidingTarget: { squareAlg: string; dx: number; dy: number } | null = null;
  private slideTimeout?: any;

  ngOnChanges(changes: SimpleChanges): void {
    this.updateSquareSize();

    if (changes['lastMove'] || changes['pieces']) {
      this.cancelReplay();
      if (changes['lastMove'] && this.lastMove) {
        this.calculateMoveSlide(this.lastMove.from, this.lastMove.to);
      }
    }

    this.buildBoard();
  }

  replayLastMove(): void {
    if (!this.lastMove) return;

    this.cancelReplay();
    this.isReplaying = true;

    this.calculateMoveSlide(this.lastMove.from, this.lastMove.to);
    this.sound.playMove();
    this.buildBoard();

    this.replayTimeout = setTimeout(() => {
      this.cancelReplay();
    }, 850);
  }

  cancelReplay(): void {
    if (this.replayTimeout) {
      clearTimeout(this.replayTimeout);
      this.replayTimeout = undefined;
    }
    if (this.isReplaying) {
      this.isReplaying = false;
      this.buildBoard();
    }
  }

  private calculateMoveSlide(from: string, to: string): void {
    const fromPos = this.gameService.fromAlgebraic(from);
    const toPos = this.gameService.fromAlgebraic(to);

    let fromDispRow: number, fromDispCol: number;
    let toDispRow: number, toDispCol: number;

    if (this.flipBoard) {
      fromDispRow = fromPos.row;
      fromDispCol = 7 - fromPos.col;
      toDispRow = toPos.row;
      toDispCol = 7 - toPos.col;
    } else {
      fromDispRow = 7 - fromPos.row;
      fromDispCol = fromPos.col;
      toDispRow = 7 - toPos.row;
      toDispCol = toPos.col;
    }

    const dx = (fromDispCol - toDispCol) * this.currentSquareSize;
    const dy = (fromDispRow - toDispRow) * this.currentSquareSize;

    this.slidingTarget = { squareAlg: to, dx, dy };

    if (this.slideTimeout) clearTimeout(this.slideTimeout);
    this.slideTimeout = setTimeout(() => {
      this.slidingTarget = null;
      this.buildBoard();
    }, 280);
  }

  private updateSquareSize(): void {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const maxFromWidth = Math.floor((vw - 8) / 8);
    const maxFromHeight = Math.floor((vh - 160) / 8);
    const calculated = Math.min(maxFromWidth, maxFromHeight);

    let size = this.squareSize;
    if (vw < 480) {
      size = Math.max(36, Math.min(58, calculated));
    } else if (vw < 768) {
      size = Math.max(48, Math.min(72, calculated));
    } else {
      size = Math.max(64, Math.min(92, calculated));
    }
    this.currentSquareSize = size;
    document.documentElement.style.setProperty('--sq', `${size}px`);
  }

  triggerDenial(keys: string[]): void {
    this.sound.playDenial();
    keys.forEach(k => this.shakingSquareKeys.add(k));
    this.buildBoard();

    setTimeout(() => {
      keys.forEach(k => this.shakingSquareKeys.delete(k));
      this.buildBoard();
    }, 400);
  }

  private buildBoard(): void {
    const rows: Square[][] = [];
    const deployMin = this.yourColor === 'White' ? 0 : 4;
    const deployMax = this.yourColor === 'White' ? 3 : 7;

    for (let displayRow = 7; displayRow >= 0; displayRow--) {
      const actualRow = this.flipBoard ? (7 - displayRow) : displayRow;
      const row: Square[] = [];

      for (let displayCol = 0; displayCol < 8; displayCol++) {
        const actualCol = this.flipBoard ? (7 - displayCol) : displayCol;
        const alg = this.gameService.toAlgebraic(actualRow, actualCol);
        const piece = this.pieces.find(p => p.row === actualRow && p.col === actualCol);

        let inCheck = false;
        if (this.isCheck && piece?.type === 'King' && piece?.color === this.currentTurn)
          inCheck = true;

        const isLastMove = !!this.lastMove &&
          (alg === this.lastMove.from || alg === this.lastMove.to);

        const isReplayingSquare = this.isReplaying && !!this.lastMove &&
          (alg === this.lastMove.from || alg === this.lastMove.to);

        const sqKey = `${actualRow}_${actualCol}`;

        const isWinningKing = !!this.defeatedColor && piece?.type === 'King' && piece?.color === this.winningColor;
        const isLosingKing  = !!this.defeatedColor && piece?.type === 'King' && piece?.color === this.defeatedColor;

        const isSliding = !!this.slidingTarget && this.slidingTarget.squareAlg === alg;
        const slideDx = isSliding ? this.slidingTarget!.dx : 0;
        const slideDy = isSliding ? this.slidingTarget!.dy : 0;

        row.push({
          row: actualRow, col: actualCol,
          piece,
          isLight: (actualRow + actualCol) % 2 !== 0,
          isHighlighted: this.legalMoves.includes(alg),
          isSelected: this.selectedSquare === alg,
          isSetupZone: this.mode === 'setup' && actualRow >= deployMin && actualRow <= deployMax,
          isLastMove,
          isReplaying: isReplayingSquare,
          isInCheck: inCheck,
          isWinningKing,
          isLosingKing,
          isShaking: this.shakingSquareKeys.has(sqKey),
          isSliding,
          slideDx,
          slideDy
        });
      }
      rows.push(row);
    }
    this.boardRows = rows;
  }

  onSquareClick(sq: Square): void {
    if (this.disabled) return;

    // Suppress synthetic mouse clicks generated by mobile browsers 450ms after touch interaction
    if (Date.now() - this.lastTouchTime < 450) {
      return;
    }

    const alg = this.gameService.toAlgebraic(sq.row, sq.col);

    // If a piece is selected and user clicks an illegal target square:
    if (this.selectedSquare && !sq.isHighlighted && sq.piece?.color !== this.yourColor && alg !== this.selectedSquare) {
      const selPos = this.gameService.fromAlgebraic(this.selectedSquare);
      const selKey = `${selPos.row}_${selPos.col}`;
      const targetKey = `${sq.row}_${sq.col}`;
      this.triggerDenial([selKey, targetKey]);
      return;
    }

    // Intercept promotion clicks
    if (this.selectedSquare && this.legalMoves.includes(alg)) {
      const selPos = this.gameService.fromAlgebraic(this.selectedSquare);
      const piece = this.pieces.find(p => p.row === selPos.row && p.col === selPos.col);
      if (piece?.type === 'Pawn') {
        const isPromoRow = (piece.color === 'White' && sq.row === 7) || (piece.color === 'Black' && sq.row === 0);
        if (isPromoRow) {
          this.pendingPromotion = { fromRow: selPos.row, fromCol: selPos.col, toRow: sq.row, toCol: sq.col };
          this.promotionPending = true;
          return; // Don't emit squareClicked so we don't trigger normal move handling
        }
      }
    }

    this.squareClicked.emit({
      row: sq.row, col: sq.col,
      algebraic: alg
    });
  }

  canDrag(piece: ChessPiece): boolean {
    if (this.disabled) return false;
    if (this.mode === 'setup') return piece.color === this.yourColor;
    return piece.color === this.yourColor && piece.color === this.currentTurn;
  }

  // ── Desktop Drag & Drop ──────────────────────────────────────────────────

  onDragStart(e: DragEvent, sq: Square): void {
    if (!sq.piece || !this.canDrag(sq.piece)) {
      e.preventDefault();
      if (sq.piece) {
        this.triggerDenial([`${sq.row}_${sq.col}`]);
      }
      return;
    }
    this.dragFrom = { row: sq.row, col: sq.col };
    e.dataTransfer?.setData('text/plain', `${sq.row},${sq.col}`);
    this.squareClicked.emit({
      row: sq.row, col: sq.col,
      algebraic: this.gameService.toAlgebraic(sq.row, sq.col)
    });
  }

  onDragOver(e: DragEvent): void { e.preventDefault(); }

  onDrop(e: DragEvent, sq: Square): void {
    e.preventDefault();
    if (!this.dragFrom) return;
    const { row: fr, col: fc } = this.dragFrom;
    this.dragFrom = null;

    if (fr === sq.row && fc === sq.col) return;
    this.executeMoveOrDrag(fr, fc, sq.row, sq.col);
  }

  onDragEnd(): void { this.dragFrom = null; }

  // ── Mobile Touch Drag & Drop ─────────────────────────────────────────────

  onTouchStart(e: TouchEvent, sq: Square): void {
    if (this.disabled) return;
    this.lastTouchTime = Date.now();

    if (!sq.piece || !this.canDrag(sq.piece)) {
      const alg = this.gameService.toAlgebraic(sq.row, sq.col);
      this.squareClicked.emit({ row: sq.row, col: sq.col, algebraic: alg });
      return;
    }

    this.touchFromSq = sq;
    const touch = e.touches[0];
    this.attachDocListeners();

    const symbol = this.getPieceSymbol(sq.piece);
    this.createGhostPiece(symbol, sq.piece.color, touch.clientX, touch.clientY);

    const alg = this.gameService.toAlgebraic(sq.row, sq.col);
    if (this.selectedSquare !== alg) {
      this.squareClicked.emit({ row: sq.row, col: sq.col, algebraic: alg });
    }
  }

  onTouchMove(e: TouchEvent): void {
    if (!this.touchFromSq || !this.touchGhostEl) return;
    e.preventDefault(); // Prevent scrolling while dragging piece
    const touch = e.touches[0];
    this.updateGhostPosition(touch.clientX, touch.clientY);
  }

  onTouchEnd(e: TouchEvent): void {
    this.lastTouchTime = Date.now();
    this.detachDocListeners();

    if (!this.touchFromSq) {
      this.removeGhostPiece();
      return;
    }

    const touch = e.changedTouches[0];
    const clientX = touch.clientX;
    const clientY = touch.clientY;

    // 1. MUST remove the ghost piece element FIRST so elementFromPoint hits the underlying square!
    this.removeGhostPiece();

    // 2. Query element under touch position
    const targetEl = document.elementFromPoint(clientX, clientY);
    const sqEl = targetEl?.closest('.square') as HTMLElement | null;

    const fromSq = this.touchFromSq;
    this.touchFromSq = null;

    if (sqEl) {
      const rowAttr = sqEl.getAttribute('data-row');
      const colAttr = sqEl.getAttribute('data-col');
      if (rowAttr !== null && colAttr !== null) {
        const toRow = parseInt(rowAttr, 10);
        const toCol = parseInt(colAttr, 10);

        if (fromSq.row !== toRow || fromSq.col !== toCol) {
          this.executeMoveOrDrag(fromSq.row, fromSq.col, toRow, toCol);
          return;
        }
      }
    }
  }

  onTouchCancel(): void {
    this.detachDocListeners();
    this.removeGhostPiece();
    this.touchFromSq = null;
  }

  private executeMoveOrDrag(fr: number, fc: number, tr: number, tc: number): void {
    const targetSq = this.boardRows.flat().find(s => s.row === tr && s.col === tc);

    if (this.mode === 'play') {
      const piece = this.pieces.find(p => p.row === fr && p.col === fc);
      if (piece?.type === 'Pawn') {
        const isPromoRow = (piece.color === 'White' && tr === 7) ||
                           (piece.color === 'Black' && tr === 0);
        if (isPromoRow) {
          this.pendingPromotion = { fromRow: fr, fromCol: fc, toRow: tr, toCol: tc };
          this.promotionPending = true;
          return;
        }
      }
    } else if (this.mode === 'setup') {
      if (!targetSq || !targetSq.isSetupZone || (targetSq.piece && targetSq.piece !== this.pieces.find(p => p.row === fr && p.col === fc))) {
        this.triggerDenial([`${fr}_${fc}`, `${tr}_${tc}`]);
        return;
      }
    }

    this.pieceDragged.emit({ fromRow: fr, fromCol: fc, toRow: tr, toCol: tc });
  }

  private createGhostPiece(symbol: string, color: PieceColor, x: number, y: number): void {
    this.removeGhostPiece();
    const el = document.createElement('div');
    el.className = `touch-ghost-piece ${color.toLowerCase()}`;
    el.innerText = symbol;
    el.style.position = 'fixed';
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.transform = 'translate(-50%, -50%) scale(1.25)';
    el.style.pointerEvents = 'none';
    el.style.zIndex = '99999';
    el.style.fontSize = '2.5rem';
    el.style.lineHeight = '1';
    el.style.filter = color === 'White' ? 'drop-shadow(0 4px 10px rgba(0,0,0,0.85))' : 'drop-shadow(0 4px 10px rgba(255,255,255,0.6))';
    el.style.color = color === 'White' ? '#fff8dc' : '#111';
    document.body.appendChild(el);
    this.touchGhostEl = el;
  }

  private updateGhostPosition(x: number, y: number): void {
    if (this.touchGhostEl) {
      this.touchGhostEl.style.left = `${x}px`;
      this.touchGhostEl.style.top = `${y}px`;
    }
  }

  private removeGhostPiece(): void {
    if (this.touchGhostEl) {
      this.touchGhostEl.remove();
      this.touchGhostEl = null;
    }
  }

  selectPromotion(piece: PieceType): void {
    this.promotionPending = false;
    if (this.pendingPromotion) {
      const { fromRow, fromCol, toRow, toCol } = this.pendingPromotion;
      this.pieceDragged.emit({ fromRow, fromCol, toRow, toCol });
      this.promotionChosen.emit(piece.toLowerCase());
      this.pendingPromotion = null;
    }
  }

  getPieceSymbol(piece: ChessPiece): string {
    const white: Record<PieceType, string> = {
      King: '♔', Queen: '♕', Rook: '♖', Bishop: '♗', Knight: '♘', Pawn: '♙'
    };
    const black: Record<PieceType, string> = {
      King: '♚', Queen: '♛', Rook: '♜', Bishop: '♝', Knight: '♞', Pawn: '♟\uFE0E'
    };
    return piece.color === 'White' ? white[piece.type] : black[piece.type];
  }

  getPromoPieceSymbol(type: PieceType): string {
    const symbols: Record<PieceType, string> = {
      King: '', Queen: '♛', Rook: '♜', Bishop: '♝', Knight: '♞', Pawn: ''
    };
    return this.yourColor === 'White' ?
      ({ King: '', Queen: '♕', Rook: '♖', Bishop: '♗', Knight: '♘', Pawn: '' } as any)[type]
      : symbols[type];
  }

  getAriaLabel(sq: Square): string {
    const alg = this.gameService.toAlgebraic(sq.row, sq.col);
    let label = alg;
    if (sq.piece) {
      label += `, ${sq.piece.color} ${sq.piece.type}`;
    } else {
      label += `, empty`;
    }
    if (sq.isHighlighted) label += ', legal move';
    if (sq.isInCheck) label += ', in check';
    return label;
  }
}
