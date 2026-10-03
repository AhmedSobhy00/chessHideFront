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
      position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px);
      display: flex; align-items: center; justify-content: center; z-index: 50; padding: 2rem;
      animation: fadeIn 0.3s ease-out;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .result-card {
      background: #1e2538; border-radius: 1.75rem; padding: 2.75rem 2.25rem;
      text-align: center; max-width: 400px; width: 100%;
      border: 2px solid transparent; position: relative; overflow: hidden;
      box-shadow: 0 25px 90px rgba(0,0,0,0.7);
      animation: pop-in 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    @keyframes pop-in {
      from { transform: scale(0.6) translateY(30px); opacity: 0; }
      to { transform: scale(1) translateY(0); opacity: 1; }
    }
    .result-card.win  { border-color: #f0c040; box-shadow: 0 20px 90px rgba(240,192,64,0.3); }
    .result-card.loss { border-color: #e05050; box-shadow: 0 20px 90px rgba(224,80,80,0.3); }
    .result-card.draw { border-color: #4080e0; box-shadow: 0 20px 90px rgba(64,128,224,0.3); }

    .result-icon {
      font-size: 4.5rem; margin-bottom: 0.5rem;
      animation: bounceIcon 1s infinite alternate cubic-bezier(0.45, 0.05, 0.55, 0.95);
    }
    @keyframes bounceIcon {
      0% { transform: translateY(0) scale(1); }
      100% { transform: translateY(-8px) scale(1.08); }
    }

    .result-title { font-size: 2.2rem; font-weight: 800; margin: 0 0 0.5rem; color: #e8e8e8; letter-spacing: 0.02em; }
    .win  .result-title { color: #f0c040; text-shadow: 0 0 20px rgba(240,192,64,0.4); }
    .loss .result-title { color: #e05050; text-shadow: 0 0 20px rgba(224,80,80,0.4); }
    .draw .result-title { color: #4080e0; text-shadow: 0 0 20px rgba(64,128,224,0.4); }
    .result-reason { color: #a0a8b8; font-size: 0.95rem; margin: 0 0 0.5rem; }
    .result-detail { font-size: 1.15rem; font-weight: 600; color: #c0c8d8; margin-bottom: 1.75rem; }

    .action-buttons { display: flex; gap: 0.75rem; justify-content: center; }
    .btn-home {
      background: linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.06));
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 0.85rem; color: #e8e8e8; padding: 0.75rem 1.8rem;
      font-size: 1rem; cursor: pointer; font-family: inherit; font-weight: 700;
      transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    .btn-home:hover { background: rgba(255,255,255,0.22); transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.3); }
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
