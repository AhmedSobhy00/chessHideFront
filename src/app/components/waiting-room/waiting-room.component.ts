import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { GameService } from '../../core/services/game.service';
import { GameState } from '../../models/game.model';

@Component({
  selector: 'app-waiting-room',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="waiting-container">
      <div class="waiting-card">
        <div class="chess-icon">♟</div>
        <h2>Waiting for opponent</h2>
        <p class="sub">Share this Game ID with a friend:</p>

        <div class="game-id-box">
          <span class="game-id">{{ state?.gameId }}</span>
          <button class="copy-btn" (click)="copyId()" [class.copied]="copied">
            {{ copied ? '✓ Copied!' : '⎘ Copy' }}
          </button>
        </div>

        <div class="share-url">
          <span>or share link: </span>
          <code>{{ shareUrl }}</code>
          <button class="copy-btn sm" (click)="copyUrl()">⎘</button>
        </div>

        <div class="waiting-animation">
          <div class="dot"></div>
          <div class="dot"></div>
          <div class="dot"></div>
        </div>

        <button class="btn-cancel" (click)="cancel()">Cancel</button>
      </div>
    </div>
  `,
  styles: [`
    .waiting-container { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 2rem; }
    .waiting-card {
      background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
      border-radius: 1.5rem; padding: 2.5rem 2rem; max-width: 420px; width: 100%;
      text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.4);
    }
    .chess-icon { font-size: 3.5rem; margin-bottom: 0.5rem; filter: drop-shadow(0 0 10px #f0c04088); }
    h2 { color: #e8e8e8; font-size: 1.5rem; margin: 0 0 0.4rem; }
    .sub { color: #a0a8b8; font-size: 0.9rem; margin: 0 0 1.5rem; }

    .game-id-box {
      display: flex; align-items: center; justify-content: center; gap: 0.75rem;
      background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1);
      border-radius: 0.75rem; padding: 0.75rem 1rem; margin-bottom: 0.75rem;
    }
    .game-id { font-size: 2rem; font-weight: 800; color: #f0c040; letter-spacing: 0.2em; font-family: monospace; }
    .copy-btn {
      background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15);
      border-radius: 0.5rem; color: #e8e8e8; padding: 0.4rem 0.8rem;
      font-size: 0.8rem; cursor: pointer; font-family: inherit; transition: all 0.2s;
    }
    .copy-btn.copied { background: rgba(60,200,60,0.15); border-color: #40d060; color: #60e080; }
    .copy-btn.sm { padding: 0.2rem 0.5rem; font-size: 0.75rem; }
    .copy-btn:hover { background: rgba(255,255,255,0.14); }

    .share-url { display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; color: #808898; margin-bottom: 1.5rem; flex-wrap: wrap; justify-content: center; }
    .share-url code { color: #a0a8b8; }

    .waiting-animation { display: flex; justify-content: center; gap: 0.4rem; margin-bottom: 1.5rem; }
    .dot {
      width: 8px; height: 8px; border-radius: 50%; background: #40a0f0;
      animation: bounce 1.2s infinite ease-in-out;
    }
    .dot:nth-child(2) { animation-delay: 0.2s; }
    .dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes bounce { 0%,80%,100%{transform:scale(0.6);opacity:0.5} 40%{transform:scale(1);opacity:1} }

    .btn-cancel {
      background: none; border: 1px solid rgba(255,255,255,0.12); border-radius: 0.5rem;
      color: #a0a8b8; padding: 0.5rem 1.5rem; cursor: pointer; font-family: inherit; font-size: 0.9rem;
    }
    .btn-cancel:hover { border-color: #e05050; color: #e05050; }
  `]
})
export class WaitingRoomComponent implements OnInit, OnDestroy {
  state: GameState | null = null;
  copied = false;
  get shareUrl() { return window.location.origin + '/game/' + (this.state?.gameId ?? ''); }
  private sub?: Subscription;

  constructor(private gameService: GameService, private router: Router) {}

  ngOnInit(): void {
    this.sub = this.gameService.state$.subscribe(s => { this.state = s; });
  }

  copyId(): void {
    navigator.clipboard.writeText(this.state?.gameId ?? '').then(() => {
      this.copied = true;
      setTimeout(() => this.copied = false, 2000);
    });
  }

  copyUrl(): void { navigator.clipboard.writeText(this.shareUrl); }

  cancel(): void {
    this.gameService.clearSession();
    this.router.navigate(['/']);
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }
}
