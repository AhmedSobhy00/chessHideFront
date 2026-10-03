import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { GameService } from '../../core/services/game.service';
import { GameFinishedEvent } from '../../models/game.model';

@Component({
  selector: 'app-game-result',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="result-overlay">
      <div class="result-card" [class.win]="isWin" [class.loss]="isLoss" [class.draw]="isDraw">
        <div class="result-icon">{{ resultIcon }}</div>
        <h2 class="result-title">{{ resultTitle }}</h2>
        <p class="result-reason" *ngIf="result?.reason">{{ result?.reason }}</p>
        <div class="result-detail">
          <span *ngIf="result?.winner">{{ result?.winner }} wins</span>
          <span *ngIf="!result?.winner">Draw</span>
        </div>
        <div class="action-buttons">
          <button class="btn-home" (click)="goHome()">← Home</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .result-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.75); backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center; z-index: 50; padding: 2rem;
    }
    .result-card {
      background: #1e2538; border-radius: 1.5rem; padding: 2.5rem 2rem;
      text-align: center; max-width: 380px; width: 100%;
      border: 2px solid transparent;
      box-shadow: 0 20px 80px rgba(0,0,0,0.6);
      animation: pop-in 0.4s cubic-bezier(0.22,1,0.36,1);
    }
    @keyframes pop-in { from{transform:scale(0.7);opacity:0} to{transform:scale(1);opacity:1} }
    .result-card.win  { border-color: #f0c040; box-shadow: 0 20px 80px rgba(240,192,64,0.2); }
    .result-card.loss { border-color: #e05050; box-shadow: 0 20px 80px rgba(224,80,80,0.2); }
    .result-card.draw { border-color: #4080e0; box-shadow: 0 20px 80px rgba(64,128,224,0.2); }

    .result-icon { font-size: 4rem; margin-bottom: 0.5rem; }
    .result-title { font-size: 2rem; font-weight: 800; margin: 0 0 0.5rem; color: #e8e8e8; }
    .win  .result-title { color: #f0c040; }
    .loss .result-title { color: #e05050; }
    .draw .result-title { color: #4080e0; }
    .result-reason { color: #a0a8b8; font-size: 0.9rem; margin: 0 0 0.5rem; }
    .result-detail { font-size: 1.1rem; font-weight: 600; color: #c0c8d8; margin-bottom: 1.5rem; }

    .action-buttons { display: flex; gap: 0.75rem; justify-content: center; }
    .btn-home {
      background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15);
      border-radius: 0.75rem; color: #e8e8e8; padding: 0.7rem 1.5rem;
      font-size: 0.95rem; cursor: pointer; font-family: inherit; font-weight: 600;
    }
    .btn-home:hover { background: rgba(255,255,255,0.14); }
  `]
})
export class GameResultComponent implements OnInit, OnDestroy {
  result: GameFinishedEvent | null = null;
  yourColor = 'White';
  private sub?: Subscription;

  get isWin()  { return !!this.result?.winner && this.result.winner === this.yourColor; }
  get isLoss() { return !!this.result?.winner && this.result.winner !== this.yourColor; }
  get isDraw() { return !this.result?.winner; }

  get resultIcon(): string {
    if (this.isWin)  return '🏆';
    if (this.isLoss) return '💔';
    return '🤝';
  }
  get resultTitle(): string {
    if (this.isWin)  return 'You Won!';
    if (this.isLoss) return 'You Lost';
    return 'Draw';
  }

  constructor(private gameService: GameService, private router: Router) {}

  ngOnInit(): void {
    this.sub = this.gameService.state$.subscribe(s => {
      this.result = s.result;
      this.yourColor = s.yourColor;
    });
  }

  goHome(): void {
    this.gameService.clearSession();
    this.router.navigate(['/']);
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }
}
