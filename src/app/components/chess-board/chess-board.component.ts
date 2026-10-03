import {
  Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, HostListener
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
  isInCheck: boolean;
  isShaking: boolean;
}

@Component({
  selector: 'app-chess-board',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="board-wrap" [class.flipped]="flipBoard">
      <div class="board">
        <!-- File labels (a–h) -->
        <div class="file-labels" [class.flipped]="flipBoard">
          <span *ngFor="let f of displayedFiles">{{ f }}</span>
        </div>

        <!-- Rank labels + rows -->
        <div class="board-inner">
          <div class="rank-label-col">
            <div *ngFor="let r of displayedRanks" class="rank-label">{{ r }}</div>
          </div>

          <div class="squares">
            <ng-container *ngFor="let row of boardRows">
              <div
                *ngFor="let sq of row; trackBy: trackBySq"
                class="square"
                [class.light]="sq.isLight"
                [class.dark]="!sq.isLight"
                [class.highlighted]="sq.isHighlighted"
                [class.selected]="sq.isSelected"
                [class.setup-zone]="sq.isSetupZone"
                [class.last-move]="sq.isLastMove"
                [class.in-check]="sq.isInCheck"
                [class.shake]="sq.isShaking"
                (click)="onSquareClick(sq)"
                (dragover)="onDragOver($event)"
                (drop)="onDrop($event, sq)"
                (touchstart)="onTouchStart($event, sq)"
                (touchend)="onTouchEnd($event, sq)"
              >
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
                  [class.fallen-king]="isFallenKing(sq.piece)"
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
    :host { display: block; user-select: none; }

    .board-wrap { position: relative; }
    .board { display: inline-flex; flex-direction: column; }
    .board-inner { display: flex; }
    .file-labels {
      display: flex; padding-left: 1.4rem;
      font-size: 0.7rem; color: #888; letter-spacing: 0.05em;
    }
    .file-labels.flipped { flex-direction: row-reverse; }
    .file-labels span { width: var(--sq, 72px); text-align: center; }
    .rank-label-col { display: flex; flex-direction: column; justify-content: space-around; width: 1.4rem; }
    .rank-label { font-size: 0.7rem; color: #888; text-align: center; height: var(--sq, 72px); display: flex; align-items: center; justify-content: center; }
    .squares {
      display: grid; grid-template-columns: repeat(8, var(--sq, 72px)); grid-template-rows: repeat(8, var(--sq, 72px));
      border: 3px solid #333; border-radius: 6px; overflow: hidden;
      box-shadow: 0 12px 40px rgba(0,0,0,0.4);
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

    .piece {
      font-size: calc(var(--sq, 72px) * 0.74);
      line-height: 1; position: relative; z-index: 1;
      filter: drop-shadow(1px 3px 4px rgba(0,0,0,0.5));
      transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    .piece.draggable:hover { transform: scale(1.15) translateY(-2px); cursor: grab; z-index: 3; }
    .piece.draggable:active { transform: scale(1.2) translateY(-4px); cursor: grabbing; z-index: 4; }
    .piece.white { color: #fff8dc; filter: drop-shadow(1px 2px 4px rgba(0,0,0,0.85)); }
    .piece.black { color: #111; filter: drop-shadow(1px 2px 4px rgba(255,255,255,0.4)); }
    .piece.fallen-king {
      transform: rotate(-90deg) translateY(8px) !important;
      transition: transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      filter: drop-shadow(-3px 3px 6px rgba(0,0,0,0.85)) opacity(0.85);
      z-index: 5;
    }

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
      .file-labels, .rank-label-col { font-size: 0.6rem; }
      .file-labels { padding-left: 0.9rem; }
      .rank-label-col { width: 0.9rem; }
      .promo-btn { font-size: 2rem; padding: 0.6rem 0.7rem; }
    }
  `]
})
export class ChessBoardComponent implements OnChanges {
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
  private touchFrom: { row: number; col: number } | null = null;

  get flipBoard(): boolean { return this.yourColor === 'Black'; }

  isFallenKing(piece: ChessPiece | undefined): boolean {
    if (!piece || !this.defeatedColor) return false;
    return piece.type === 'King' && piece.color === this.defeatedColor;
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

  constructor(private gameService: GameService, private sound: SoundService) {}

  @HostListener('window:resize')
  onResize(): void {
    this.updateSquareSize();
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.updateSquareSize();
    this.buildBoard();
  }

  private updateSquareSize(): void {
    const vw = window.innerWidth;
    let size = this.squareSize;
    if (vw < 480) {
      size = Math.max(36, Math.floor((vw - 32) / 8));
    } else if (vw < 768) {
      size = Math.max(48, Math.floor((vw - 64) / 8));
    }
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

        const sqKey = `${actualRow}_${actualCol}`;

        row.push({
          row: actualRow, col: actualCol,
          piece,
          isLight: (actualRow + actualCol) % 2 !== 0,
          isHighlighted: this.legalMoves.includes(alg),
          isSelected: this.selectedSquare === alg,
          isSetupZone: this.mode === 'setup' && actualRow >= deployMin && actualRow <= deployMax,
          isLastMove,
          isInCheck: inCheck,
          isShaking: this.shakingSquareKeys.has(sqKey)
        });
      }
      rows.push(row);
    }
    this.boardRows = rows;
  }

  onSquareClick(sq: Square): void {
    if (this.disabled) return;
    const alg = this.gameService.toAlgebraic(sq.row, sq.col);

    // If a piece is selected and user clicks an illegal target square:
    if (this.selectedSquare && !sq.isHighlighted && sq.piece?.color !== this.yourColor && alg !== this.selectedSquare) {
      const selPos = this.gameService.fromAlgebraic(this.selectedSquare);
      const selKey = `${selPos.row}_${selPos.col}`;
      const targetKey = `${sq.row}_${sq.col}`;
      this.triggerDenial([selKey, targetKey]);
      return;
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

    if (this.mode === 'play') {
      if (!sq.isHighlighted) {
        const fromKey = `${fr}_${fc}`;
        const targetKey = `${sq.row}_${sq.col}`;
        this.triggerDenial([fromKey, targetKey]);
        return;
      }

      const piece = this.pieces.find(p => p.row === fr && p.col === fc);
      if (piece?.type === 'Pawn') {
        const isPromoRow = (piece.color === 'White' && sq.row === 7) ||
                           (piece.color === 'Black' && sq.row === 0);
        if (isPromoRow) {
          this.pendingPromotion = { fromRow: fr, fromCol: fc, toRow: sq.row, toCol: sq.col };
          this.promotionPending = true;
          return;
        }
      }
    } else if (this.mode === 'setup') {
      if (!sq.isSetupZone || (sq.piece && sq.piece !== this.pieces.find(p => p.row === fr && p.col === fc))) {
        const fromKey = `${fr}_${fc}`;
        const targetKey = `${sq.row}_${sq.col}`;
        this.triggerDenial([fromKey, targetKey]);
        return;
      }
    }

    this.pieceDragged.emit({ fromRow: fr, fromCol: fc, toRow: sq.row, toCol: sq.col });
  }

  onDragEnd(): void { this.dragFrom = null; }

  onTouchStart(e: TouchEvent, sq: Square): void {
    if (sq.piece && this.canDrag(sq.piece)) {
      this.touchFrom = { row: sq.row, col: sq.col };
    }
  }

  onTouchEnd(e: TouchEvent, sq: Square): void {
    if (this.touchFrom) {
      this.touchFrom = null;
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
      King: '♚', Queen: '♛', Rook: '♜', Bishop: '♝', Knight: '♞', Pawn: '♟'
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
}
