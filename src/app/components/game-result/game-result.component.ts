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
    <!-- Minimized floating bar when viewing board -->
    <div class="minimized-bar" *ngIf="minimized" (click)="minimized = false">
      <span class="mini-icon">{{ resultIcon }}</span>
      <span class="mini-title">{{ resultTitle }}</span>
      <span class="mini-action">Click to expand results ⤢</span>
    </div>

    <!-- Full overlay -->
    <div class="result-overlay" *ngIf="!minimized">
      <div class="result-card" [class.win]="isWin" [class.loss]="isLoss" [class.draw]="isDraw">
        <div class="result-icon">{{ resultIcon }}</div>
        <h2 class="result-title">{{ resultTitle }}</h2>
        <p class="result-reason" *ngIf="result?.reason">{{ result?.reason }}</p>
        <div class="result-detail">
          <span *ngIf="result?.winner">{{ result?.winner }} wins</span>
          <span *ngIf="!result?.winner">Draw</span>
        </div>
        <div class="action-buttons">
          <button class="btn-view-board" (click)="minimized = true">👁 View Board</button>
          <button class="btn-home" (click)="goHome()">← Home</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .minimized-bar {
      position: fixed; bottom: 1.5rem; left: 50%; transform: translateX(-50%);
      background: #1e2538; border: 1px solid rgba(255,255,255,0.2);
      border-radius: 2rem; padding: 0.6rem 1.5rem; display: flex; align-items: center; gap: 0.75rem;
      cursor: pointer; z-index: 100; box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      animation: slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    @keyframes slideUp { from { transform: translateX(-50%) translateY(30px); opacity: 0; } to { transform: translateX(-50%) translateY(0); opacity: 1; } }
    .mini-icon { font-size: 1.2rem; }
    .mini-title { font-weight: 700; color: #e8e8e8; font-size: 0.95rem; }
    .mini-action { color: #f0c040; font-size: 0.82rem; font-weight: 600; }

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
    .btn-view-board {
      background: rgba(64,160,240,0.15); border: 1px solid rgba(64,160,240,0.35);
      border-radius: 0.85rem; color: #40a0f0; padding: 0.75rem 1.2rem;
      font-size: 0.95rem; cursor: pointer; font-family: inherit; font-weight: 700;
      transition: all 0.2s;
    }
    .btn-view-board:hover { background: rgba(64,160,240,0.25); transform: translateY(-2px); }

    .btn-home {
      background: linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.06));
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 0.85rem; color: #e8e8e8; padding: 0.75rem 1.4rem;
      font-size: 0.95rem; cursor: pointer; font-family: inherit; font-weight: 700;
      transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    .btn-home:hover { background: rgba(255,255,255,0.22); transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.3); }

    @media (max-width: 480px) {
      .result-overlay { padding: 1rem; }
      .result-card { padding: 1.75rem 1.25rem; max-width: 320px; border-radius: 1.25rem; }
      .result-icon { font-size: 3.2rem; margin-bottom: 0.3rem; }
      .result-title { font-size: 1.6rem; margin-bottom: 0.3rem; }
      .result-reason { font-size: 0.85rem; }
      .result-detail { font-size: 0.95rem; margin-bottom: 1.25rem; }
      .btn-view-board, .btn-home { padding: 0.6rem 0.9rem; font-size: 0.85rem; }
      .minimized-bar { bottom: 0.75rem; padding: 0.45rem 1rem; }
      .mini-icon { font-size: 1rem; }
      .mini-title { font-size: 0.82rem; }
      .mini-action { font-size: 0.72rem; }
    }
  `]
})
export class GameResultComponent implements OnInit, OnDestroy {
  result: GameFinishedEvent | null = null;
  yourColor = 'White';
  minimized = false;
  private sub?: Subscription;
  private confettiFired = false;

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

      if (this.isWin && !this.confettiFired) {
        this.confettiFired = true;
        setTimeout(() => this.fireConfetti(), 200);
      }
    });
  }

  goHome(): void {
    this.gameService.clearSession();
    this.router.navigate(['/']);
  }

  private fireConfetti(): void {
    try {
      const canvas = document.createElement('canvas');
      canvas.style.position = 'fixed';
      canvas.style.inset = '0';
      canvas.style.width = '100vw';
      canvas.style.height = '100vh';
      canvas.style.pointerEvents = 'none';
      canvas.style.zIndex = '9999';
      document.body.appendChild(canvas);

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const colors = ['#f0c040', '#40a0f0', '#e05050', '#60d060', '#e060e0', '#ffffff'];
      const particles = Array.from({ length: 90 }, () => ({
        x: canvas.width / 2,
        y: canvas.height * 0.4,
        vx: (Math.random() - 0.5) * 18,
        vy: (Math.random() - 0.7) * 18,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 12
      }));

      const render = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let alive = false;

        particles.forEach(p => {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.35; // gravity
          p.alpha -= 0.012;
          p.rotation += p.vRot;

          if (p.alpha > 0) {
            alive = true;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rotation * Math.PI) / 180);
            ctx.globalAlpha = Math.max(0, p.alpha);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            ctx.restore();
          }
        });

        if (alive) {
          requestAnimationFrame(render);
        } else {
          canvas.remove();
        }
      };
      render();
    } catch (e) {}
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }
}
