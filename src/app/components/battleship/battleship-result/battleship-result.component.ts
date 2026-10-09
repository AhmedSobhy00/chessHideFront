import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { BattleshipService } from '../../../core/services/battleship.service';
import { BattleshipGameState } from '../../../models/battleship.model';

@Component({
  selector: 'app-battleship-result',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Minimized floating bar when viewing board -->
    <div class="minimized-bar" *ngIf="minimized && state && state.phase === 'Finished'" (click)="minimized = false">
      <span class="mini-icon">{{ isWinner ? '🏆' : '💀' }}</span>
      <span class="mini-title">{{ isWinner ? 'VICTORY!' : 'DEFEAT' }}</span>
      <span class="mini-action">Click to expand summary ⤢</span>
    </div>

    <!-- Full result overlay -->
    <div class="result-overlay" *ngIf="!minimized && state && state.phase === 'Finished'">
      <div class="result-card" [class.win]="isWinner" [class.loss]="!isWinner">
        <div class="banner-icon">{{ isWinner ? '🏆' : '💀' }}</div>
        <h2 class="title">{{ isWinner ? 'VICTORY!' : 'DEFEAT' }}</h2>
        <p class="subtitle">
          {{ isWinner ? 'You destroyed the enemy fleet!' : (state.winnerName + ' eliminated your fleet.') }}
        </p>

        <div class="reason-badge" *ngIf="state.finishReason">
          {{ state.finishReason }}
        </div>

        <div class="actions">
          <button class="btn btn-secondary" (click)="minimized = true">
            👁️ View Board & Enemy Ships
          </button>
          <button class="btn btn-primary" (click)="returnToLobby()">
            ⚓ Fleet Command
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .minimized-bar {
      position: fixed; bottom: 1.5rem; left: 50%; transform: translateX(-50%);
      background: #0d1b3e; border: 1.5px solid #00f0ff;
      border-radius: 2rem; padding: 0.6rem 1.5rem; display: flex; align-items: center; gap: 0.75rem;
      cursor: pointer; z-index: 600; box-shadow: 0 10px 30px rgba(0,0,0,0.7);
      animation: slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    @keyframes slideUp { from { transform: translateX(-50%) translateY(30px); opacity: 0; } to { transform: translateX(-50%) translateY(0); opacity: 1; } }
    .mini-icon { font-size: 1.2rem; }
    .mini-title { font-weight: 800; color: #00f0ff; font-size: 0.95rem; }
    .mini-action { color: #8a99ad; font-size: 0.82rem; font-weight: 600; }

    .result-overlay {
      position: fixed; inset: 0; background: rgba(5, 10, 25, 0.88); backdrop-filter: blur(10px);
      z-index: 500; display: flex; align-items: center; justify-content: center; padding: 1.5rem;
      animation: fadeIn 0.3s ease-out;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .result-card {
      background: #0d1b3e; border: 2px solid rgba(0, 240, 255, 0.3); border-radius: 1.5rem;
      padding: 2.25rem 2rem; max-width: 400px; width: 100%; text-align: center;
      box-shadow: 0 25px 70px rgba(0,0,0,0.8); animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    @keyframes popIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }

    .result-card.win { border-color: #00f0ff; box-shadow: 0 0 40px rgba(0,240,255,0.4); }
    .result-card.loss { border-color: #ff3c3c; box-shadow: 0 0 40px rgba(255,60,60,0.4); }

    .banner-icon { font-size: 4rem; margin-bottom: 0.5rem; }
    .title { font-size: 2rem; font-weight: 900; margin: 0 0 0.25rem; color: #fff; letter-spacing: 0.05em; }
    .win .title { color: #00f0ff; }
    .loss .title { color: #ff5555; }
    .subtitle { color: #8a99ad; font-size: 0.95rem; margin: 0 0 1.25rem; }

    .reason-badge {
      display: inline-block; font-size: 0.78rem; font-weight: 700; color: #a0b0c5;
      background: rgba(255,255,255,0.06); padding: 0.3rem 0.8rem; border-radius: 1rem; margin-bottom: 1.5rem;
    }

    .actions { display: flex; flex-direction: column; gap: 0.65rem; }
    .btn {
      padding: 0.85rem 1.5rem; border-radius: 0.75rem; border: none; font-size: 0.95rem;
      font-weight: 800; cursor: pointer; transition: all 0.2s; font-family: inherit;
    }
    .btn-secondary {
      background: rgba(0,240,255,0.15); border: 1px solid rgba(0,240,255,0.35); color: #00f0ff;
    }
    .btn-secondary:hover { background: rgba(0,240,255,0.28); transform: translateY(-2px); }
    .btn-primary { background: linear-gradient(135deg, #00f0ff, #0088cc); color: #0b132b; }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,240,255,0.4); }
  `]
})
export class BattleshipResultComponent implements OnInit, OnDestroy {
  state: BattleshipGameState | null = null;
  minimized = false;
  private sub?: Subscription;

  constructor(
    private battleship: BattleshipService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.sub = this.battleship.state$.subscribe(s => { this.state = s; });
  }

  get isWinner(): boolean {
    return !!(this.state && this.state.winnerPlayerId === this.state.playerId);
  }

  returnToLobby(): void {
    this.battleship.clearSession();
    this.router.navigate(['/battleship']);
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }
}
