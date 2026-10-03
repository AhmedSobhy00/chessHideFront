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
    .setup-container { display: flex; flex-direction: column; align-items: center; gap: 1.25rem; padding: 1rem; min-height: 100vh; }
    .setup-header { display: flex; flex-direction: column; align-items: center; gap: 0.4rem; }
    .phase-badge { display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.12em; color: #40a0f0; text-transform: uppercase; }
    .badge-dot { width: 7px; height: 7px; border-radius: 50%; background: #40a0f0; animation: blink 1.2s infinite; }
    @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
    .vs-info { display: flex; gap: 0.75rem; align-items: center; color: #a0a8b8; }
    .vs-info .you,.vs-info .opp { font-weight: 600; color: #e8e8e8; }
    .vs-info .vs { font-size: 0.8rem; }

    .timer-section { display: flex; flex-direction: column; align-items: center; gap: 0.25rem; }
    .timer-ring { position: relative; width: 80px; height: 80px; color: #40a0f0; }
    .timer-ring.urgent { color: #e05050; }
    .timer-ring svg { width: 100%; height: 100%; }
    .timer-value { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; font-weight: 800; color: #e8e8e8; font-variant-numeric: tabular-nums; }
    .timer-section.urgent .timer-ring { color: #e05050; animation: shake 0.3s infinite; }
    @keyframes shake { 0%,100%{transform:rotate(0)} 25%{transform:rotate(-1deg)} 75%{transform:rotate(1deg)} }
    .timer-label { font-size: 0.72rem; color: #a0a8b8; text-transform: uppercase; letter-spacing: 0.08em; }

    .instruction { font-size: 0.9rem; color: #a0a8b8; text-align: center; max-width: 380px; }
    .instruction.locked { color: #40a0f0; }
    .opp-ready { color: #60d060; }

    .board-area { width: 100%; display: flex; justify-content: center; }

    .controls { display: flex; justify-content: center; }
    .btn-ready {
      display: flex; align-items: center; gap: 0.6rem;
      padding: 0.85rem 3rem; border-radius: 2rem;
      background: linear-gradient(135deg, #f0c040, #d4880a);
      color: #1a1a2e; font-size: 1.1rem; font-weight: 800; border: none;
      cursor: pointer; letter-spacing: 0.08em; transition: all 0.2s;
      box-shadow: 0 4px 20px rgba(240,192,64,0.3);
    }
    .btn-ready:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(240,192,64,0.45); }
    .check-icon { font-size: 1.2rem; }
    .waiting-pulse { display: flex; align-items: center; gap: 0.75rem; color: #a0a8b8; position: relative; }
    .pulse-ring {
      width: 16px; height: 16px; border-radius: 50%;
      border: 2px solid #40a0f0; position: absolute;
      animation: pulsate 1.5s ease-out infinite;
    }
    .pulse-core { width: 10px; height: 10px; border-radius: 50%; background: #40a0f0; margin-left: 3px; }
    @keyframes pulsate { 0%{transform:scale(1);opacity:1} 100%{transform:scale(2.5);opacity:0} }
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
    if (vw < 480) this.squareSize = Math.max(36, Math.floor((vw - 32) / 8));
    else if (vw < 768) this.squareSize = 60;
    else this.squareSize = 72;
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
