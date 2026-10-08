import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, interval } from 'rxjs';
import { GameService } from '../../core/services/game.service';
import { GameState, ChessPiece, PieceColor } from '../../models/game.model';
import { ChessBoardComponent } from '../chess-board/chess-board.component';

@Component({
  selector: 'app-setup-phase',
  standalone: true,
  imports: [CommonModule, ChessBoardComponent],
  template: `
    <div class="setup-container">
      <!-- Header -->
      <div class="setup-header">
        <div class="phase-badge">
          <span class="badge-dot"></span>
          FORMATION PHASE
        </div>
        <div class="vs-info">
          <span class="you">{{ state.yourName }}</span>
          <span class="vs">vs</span>
          <span class="opp">{{ state.opponentName }}</span>
        </div>
      </div>

      <!-- Timer -->
      <div class="timer-section" [class.urgent]="timeLeft <= 10">
        <div class="timer-ring">
          <svg viewBox="0 0 60 60">
            <circle cx="30" cy="30" r="26" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="4"/>
            <circle cx="30" cy="30" r="26" fill="none" stroke="currentColor" stroke-width="4"
              stroke-dasharray="163.4"
              [attr.stroke-dashoffset]="timerDashOffset"
              stroke-linecap="round"
              transform="rotate(-90 30 30)"
            />
          </svg>
          <div class="timer-value">{{ timerDisplay }}</div>
        </div>
        <div class="timer-label">Time Remaining</div>
      </div>

      <!-- Instruction -->
      <div class="instruction" *ngIf="!state.isReady">
        Arrange your pieces freely within the blue highlighted zone.
      </div>
      <div class="instruction locked" *ngIf="state.isReady">
        ✓ Formation locked. Waiting for opponent…
        <span *ngIf="state.opponentReady" class="opp-ready"> Opponent is also ready!</span>
      </div>

      <!-- Board -->
      <div class="board-area">
        <app-chess-board
          [pieces]="state.yourPieces"
          [yourColor]="state.yourColor"
          mode="setup"
          [disabled]="state.isReady"
          [squareSize]="squareSize"
          (squareClicked)="onSquareClick($event)"
          (pieceDragged)="onPieceDragged($event)"
        ></app-chess-board>
      </div>

      <!-- Controls -->
      <div class="controls" *ngIf="!state.isReady">
        <button class="btn-ready" (click)="onReady()">
          <span class="check-icon">✓</span> READY
        </button>
      </div>
      <div class="controls" *ngIf="state.isReady">
        <div class="waiting-pulse">
          <div class="pulse-ring"></div>
          <div class="pulse-core"></div>
          Waiting for opponent…
        </div>
      </div>
    </div>
  `,
  styles: [`
    .setup-container {
      display: flex; flex-direction: column; align-items: center; justify-content: space-evenly;
      gap: 0.3rem; padding: 0.35rem 0.5rem; height: 100dvh; max-height: 100dvh;
      box-sizing: border-box; overflow: hidden;
    }
    .setup-header { display: flex; flex-direction: column; align-items: center; gap: 0.2rem; }
    .phase-badge { display: flex; align-items: center; gap: 0.4rem; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.12em; color: #40a0f0; text-transform: uppercase; }
    .badge-dot { width: 6px; height: 6px; border-radius: 50%; background: #40a0f0; animation: blink 1.2s infinite; }
    @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
    .vs-info { display: flex; gap: 0.6rem; align-items: center; color: #a0a8b8; font-size: 0.85rem; }
    .vs-info .you,.vs-info .opp { font-weight: 600; color: #e8e8e8; }
    .vs-info .vs { font-size: 0.75rem; }

    .timer-section { display: flex; align-items: center; gap: 0.5rem; }
    .timer-ring { position: relative; width: 48px; height: 48px; color: #40a0f0; }
    .timer-ring.urgent { color: #e05050; }
    .timer-ring svg { width: 100%; height: 100%; }
    .timer-value { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 0.92rem; font-weight: 800; color: #e8e8e8; font-variant-numeric: tabular-nums; }
    .timer-section.urgent .timer-ring { color: #e05050; animation: shake 0.3s infinite; }
    @keyframes shake { 0%,100%{transform:rotate(0)} 25%{transform:rotate(-1deg)} 75%{transform:rotate(1deg)} }
    .timer-label { font-size: 0.7rem; color: #a0a8b8; text-transform: uppercase; letter-spacing: 0.08em; }

    .instruction { font-size: 0.82rem; color: #a0a8b8; text-align: center; max-width: 380px; }
    .instruction.locked { color: #40a0f0; }
    .opp-ready { color: #60d060; }

    .board-area { width: 100%; display: flex; justify-content: center; }

    .controls { display: flex; justify-content: center; }
    .btn-ready {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.55rem 2.2rem; border-radius: 2rem;
      background: linear-gradient(135deg, #f0c040, #d4880a);
      color: #1a1a2e; font-size: 0.95rem; font-weight: 800; border: none;
      cursor: pointer; letter-spacing: 0.08em; transition: all 0.2s;
      box-shadow: 0 4px 20px rgba(240,192,64,0.3);
    }
    .btn-ready:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(240,192,64,0.45); }
    .check-icon { font-size: 1.1rem; }
    .waiting-pulse { display: flex; align-items: center; gap: 0.75rem; color: #a0a8b8; position: relative; font-size: 0.85rem; }
    .pulse-ring {
      width: 14px; height: 14px; border-radius: 50%;
      border: 2px solid #40a0f0; position: absolute;
      animation: pulsate 1.5s ease-out infinite;
    }
    .pulse-core { width: 8px; height: 8px; border-radius: 50%; background: #40a0f0; margin-left: 3px; }
    @keyframes pulsate { 0%{transform:scale(1);opacity:1} 100%{transform:scale(2.5);opacity:0} }

    @media (max-width: 480px) {
      .setup-container { padding: 0.25rem 0.4rem; gap: 0.25rem; }
      .phase-badge { font-size: 0.65rem; }
      .vs-info { font-size: 0.8rem; }
      .timer-ring { width: 42px; height: 42px; }
      .timer-value { font-size: 0.82rem; }
      .timer-label { font-size: 0.62rem; }
      .instruction { font-size: 0.75rem; max-width: 320px; }
      .btn-ready { padding: 0.45rem 1.6rem; font-size: 0.88rem; }
    }
  `]
})
export class SetupPhaseComponent implements OnInit, OnDestroy {
  state!: GameState;
  timeLeft = 60;
  timerDisplay = '01:00';
  timerDashOffset = 0;  // 0 = full circle
  squareSize = 72;
  private subs: Subscription[] = [];
  private selectedPiece: { row: number; col: number } | null = null;

  constructor(private gameService: GameService) {}

  ngOnInit(): void {
    this.adjustBoardSize();
    this.subs.push(
      this.gameService.state$.subscribe(s => {
        this.state = s;
        this.updateTimer();
      })
    );
    // Update timer every second
    this.subs.push(
      interval(1000).subscribe(() => this.updateTimer())
    );
  }

  private updateTimer(): void {
    if (!this.state?.setupEndsAt) return;
    const remaining = Math.max(0, Math.ceil((this.state.setupEndsAt.getTime() - Date.now()) / 1000));
    this.timeLeft = remaining;
    const min = Math.floor(remaining / 60);
    const sec = remaining % 60;
    this.timerDisplay = `${min.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`;
    // Dash offset: 163.4 = circumference; 0 = full, 163.4 = empty
    this.timerDashOffset = (1 - remaining / 60) * 163.4;
  }

  @HostListener('window:resize')
  onResize(): void {
    this.adjustBoardSize();
  }

  private adjustBoardSize(): void {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const maxW = Math.floor((vw - 44) / 8);
    const maxH = Math.floor((vh - 240) / 8);
    const calculated = Math.min(maxW, maxH);

    if (vw < 480) this.squareSize = Math.max(32, Math.min(42, calculated));
    else if (vw < 768) this.squareSize = Math.max(40, Math.min(56, calculated));
    else this.squareSize = Math.max(52, Math.min(72, calculated));
  }

  onSquareClick(e: { row: number; col: number; algebraic: string }): void {
    if (this.state.isReady) return;
    const piece = this.state.yourPieces.find(p => p.row === e.row && p.col === e.col);
    if (piece) {
      this.selectedPiece = { row: e.row, col: e.col };
    } else if (this.selectedPiece) {
      this.gameService.moveSetupPiece(this.selectedPiece.row, this.selectedPiece.col, e.row, e.col);
      this.selectedPiece = null;
    }
  }

  onPieceDragged(e: { fromRow: number; fromCol: number; toRow: number; toCol: number }): void {
    if (this.state.isReady) return;
    this.gameService.moveSetupPiece(e.fromRow, e.fromCol, e.toRow, e.toCol);
  }

  async onReady(): Promise<void> {
    await this.gameService.setReady();
  }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }
}
