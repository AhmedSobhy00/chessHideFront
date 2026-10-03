import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { GameService } from '../../core/services/game.service';

@Component({
  selector: 'app-lobby',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="lobby-container">
      <div class="brand">
        <div class="brand-icon">♟</div>
        <h1 class="brand-title">Hidden Formation<br><span>Chess</span></h1>
        <p class="brand-tagline">Arrange your pieces in secret. Strike by surprise.</p>
      </div>

      <div class="lobby-card">
        <div class="name-field">
          <label for="playerName">Your Name</label>
          <input
            id="playerName"
            type="text"
            [(ngModel)]="playerName"
            placeholder="Anonymous"
            maxlength="24"
            (keydown.enter)="joinId ? joinGame() : createGame()"
          />
        </div>

        <div class="actions">
          <button class="btn btn-primary" (click)="createGame()" [disabled]="loading">
            <span class="btn-icon">+</span>
            Create Game
          </button>

          <div class="divider"><span>or</span></div>

          <div class="join-row">
            <input
              type="text"
              [(ngModel)]="joinId"
              placeholder="Game ID (e.g. AB12CD)"
              maxlength="8"
              class="join-input"
              (keydown.enter)="joinGame()"
            />
            <button class="btn btn-secondary" (click)="joinGame()" [disabled]="loading || !joinId">
              Join
            </button>
          </div>
        </div>

        <div class="error-msg" *ngIf="errorMsg">{{ errorMsg }}</div>
        <div class="loading" *ngIf="loading">Connecting…</div>
      </div>
    </div>
  `,
  styles: [`
    .lobby-container {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2.5rem;
      padding: 2rem;
    }
    .brand { text-align: center; }
    .brand-icon { font-size: 5rem; line-height: 1; margin-bottom: 0.5rem; filter: drop-shadow(0 0 20px #f0c040aa); }
    .brand-title { font-size: 2rem; font-weight: 800; color: #f0c040; line-height: 1.1; margin: 0 0 0.5rem; }
    .brand-title span { color: #e8e8e8; }
    .brand-tagline { color: #a0a8b8; font-size: 1rem; margin: 0; }
    .lobby-card {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 1.5rem;
      padding: 2rem;
      width: 100%;
      max-width: 420px;
      backdrop-filter: blur(10px);
      box-shadow: 0 20px 60px rgba(0,0,0,0.4);
    }
    .name-field { margin-bottom: 1.5rem; }
    .name-field label { display: block; font-size: 0.8rem; color: #a0a8b8; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.4rem; }
    input[type="text"] {
      width: 100%; box-sizing: border-box;
      background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.12);
      border-radius: 0.75rem; color: #e8e8e8; padding: 0.75rem 1rem;
      font-size: 1rem; font-family: inherit; outline: none;
      transition: border-color 0.2s;
    }
    input[type="text"]:focus { border-color: #f0c040; }
    .actions { display: flex; flex-direction: column; gap: 1rem; }
    .btn {
      display: flex; align-items: center; justify-content: center; gap: 0.5rem;
      padding: 0.85rem 1.5rem; border-radius: 0.75rem; border: none;
      font-size: 1rem; font-weight: 700; cursor: pointer; transition: all 0.2s;
      font-family: inherit;
    }
    .btn-primary { background: linear-gradient(135deg, #f0c040, #d4880a); color: #1a1a2e; }
    .btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 24px #f0c04044; }
    .btn-secondary { background: rgba(255,255,255,0.08); color: #e8e8e8; border: 1px solid rgba(255,255,255,0.12); }
    .btn-secondary:hover:not(:disabled) { background: rgba(255,255,255,0.14); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-icon { font-size: 1.2rem; }
    .divider { display: flex; align-items: center; gap: 0.5rem; color: #505870; font-size: 0.85rem; }
    .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: rgba(255,255,255,0.08); }
    .join-row { display: flex; gap: 0.5rem; }
    .join-row input { flex: 1; }
    .join-row .btn { white-space: nowrap; padding: 0.75rem 1.2rem; }
    .error-msg { margin-top: 1rem; color: #ff7070; font-size: 0.9rem; text-align: center; }
    .loading { margin-top: 1rem; color: #a0a8b8; text-align: center; font-size: 0.9rem; }
  `]
})
export class LobbyComponent implements OnInit, OnDestroy {
  playerName = '';
  joinId = '';
  loading = false;
  errorMsg = '';
  private sub?: Subscription;

  constructor(
    private gameService: GameService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Auto-fill game ID if navigated to /game/:id without being in a game
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.joinId = id.toUpperCase();

    this.sub = this.gameService.error$.subscribe(msg => {
      this.errorMsg = msg;
      this.loading = false;
    });
  }

  async createGame(): Promise<void> {
    this.errorMsg = '';
    this.loading = true;
    try {
      await this.gameService.createGame(this.playerName || 'Anonymous');
    } catch (e: any) {
      this.errorMsg = e.message || 'Failed to create game';
      this.loading = false;
    }
  }

  async joinGame(): Promise<void> {
    if (!this.joinId) return;
    this.errorMsg = '';
    this.loading = true;
    try {
      await this.gameService.joinGame(this.joinId.trim().toUpperCase(), this.playerName || 'Anonymous');
      this.router.navigate(['/game', this.joinId.trim().toUpperCase()]);
    } catch (e: any) {
      this.errorMsg = e.message || 'Failed to join game';
      this.loading = false;
    }
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }
}
