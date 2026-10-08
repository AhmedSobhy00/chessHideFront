import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { GameService } from '../../core/services/game.service';
import { GameMode } from '../../models/game.model';

@Component({
  selector: 'app-lobby',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="lobby-container">
      <div class="brand">
        <div class="brand-icon">♟</div>
        <h1 class="brand-title">Hidden Formation <span>Chess</span></h1>
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

        <div class="mode-selector">
          <label>Game Mode</label>
          <div class="mode-options">
            <button
              type="button"
              class="mode-btn"
              [class.active]="selectedMode === 'HiddenFormation'"
              (click)="selectedMode = 'HiddenFormation'"
            >
              <span class="mode-icon">🤫</span>
              <span class="mode-title">Hidden Formation</span>
              <span class="mode-desc">60s secret setup</span>
            </button>
            <button
              type="button"
              class="mode-btn"
              [class.active]="selectedMode === 'Classic'"
              (click)="selectedMode = 'Classic'"
            >
              <span class="mode-icon">♟</span>
              <span class="mode-title">Classic Chess</span>
              <span class="mode-desc">Standard start</span>
            </button>
          </div>
        </div>

        <div class="actions">
          <button class="btn btn-bot" (click)="openBotModal()" [disabled]="loading">
            <span class="spinner" *ngIf="loading && loadingAction === 'bot'"></span>
            <span class="btn-icon" *ngIf="!loading || loadingAction !== 'bot'">🤖</span>
            {{ (loading && loadingAction === 'bot') ? 'Starting Bot Match...' : 'Play vs Computer (Bot)' }}
          </button>

          <button class="btn btn-primary" (click)="createGame()" [disabled]="loading">
            <span class="spinner" *ngIf="loading && loadingAction === 'create'"></span>
            <span class="btn-icon" *ngIf="!loading || loadingAction !== 'create'">+</span>
            {{ (loading && loadingAction === 'create') ? 'Creating Game...' : ('Create ' + (selectedMode === 'Classic' ? 'Classic' : 'Hidden') + ' Room') }}
          </button>

          <div class="divider"><span>or join existing</span></div>

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
              <span class="spinner" *ngIf="loading && loadingAction === 'join'"></span>
              {{ (loading && loadingAction === 'join') ? 'Joining...' : 'Join' }}
            </button>
          </div>
        </div>

        <div class="error-msg" *ngIf="errorMsg">{{ errorMsg }}</div>
      </div>
    </div>

    <!-- Bot Modal with Difficulty & Color Selection -->
    <div class="modal-overlay" *ngIf="showBotModal" (click)="showBotModal = false">
      <div class="modal-card" (click)="$event.stopPropagation()">
        <h2>🤖 Play vs Computer</h2>
        <p class="modal-subtitle">Choose difficulty and your piece color</p>

        <div class="modal-section-label">Select Difficulty</div>
        <div class="difficulty-options">
          <button
            type="button"
            class="diff-btn"
            [class.active]="selectedDifficulty === 'Easy'"
            (click)="selectedDifficulty = 'Easy'"
          >
            <span class="diff-icon">🌱</span>
            <div class="diff-info">
              <span class="diff-title">Easy</span>
              <span class="diff-desc">Casual & friendly</span>
            </div>
          </button>
          <button
            type="button"
            class="diff-btn"
            [class.active]="selectedDifficulty === 'Medium'"
            (click)="selectedDifficulty = 'Medium'"
          >
            <span class="diff-icon">⚔️</span>
            <div class="diff-info">
              <span class="diff-title">Medium</span>
              <span class="diff-desc">Balanced opponent</span>
            </div>
          </button>
          <button
            type="button"
            class="diff-btn"
            [class.active]="selectedDifficulty === 'Hard'"
            (click)="selectedDifficulty = 'Hard'"
          >
            <span class="diff-icon">🧠</span>
            <div class="diff-info">
              <span class="diff-title">Hard</span>
              <span class="diff-desc">Tactical master</span>
            </div>
          </button>
        </div>

        <div class="modal-section-label">Select Your Color</div>
        <div class="color-options modal-color-options">
          <button
            type="button"
            class="color-btn"
            [class.active]="selectedColor === 'White'"
            (click)="selectedColor = 'White'"
          >
            <span class="pawn-symbol white-pawn">♙</span>
            <span class="color-title">White</span>
          </button>
          <button
            type="button"
            class="color-btn"
            [class.active]="selectedColor === 'Random'"
            (click)="selectedColor = 'Random'"
          >
            <span class="pawn-symbol random-pawns">♙♟</span>
            <span class="color-title">Random</span>
          </button>
          <button
            type="button"
            class="color-btn"
            [class.active]="selectedColor === 'Black'"
            (click)="selectedColor = 'Black'"
          >
            <span class="pawn-symbol black-pawn">♟</span>
            <span class="color-title">Black</span>
          </button>
        </div>

        <div class="modal-actions">
          <button class="btn btn-primary btn-full" (click)="startBotGame()" [disabled]="loading">
            <span class="spinner" *ngIf="loading"></span>
            {{ loading ? 'Starting Match...' : 'Start Battle' }}
          </button>
          <button class="btn btn-link" (click)="showBotModal = false">Cancel</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .lobby-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.85rem;
      padding: 1rem 0.75rem;
    }
    .brand { text-align: center; }
    .brand-icon { font-size: 2.8rem; line-height: 1; margin-bottom: 0.2rem; filter: drop-shadow(0 0 15px #f0c040aa); }
    .brand-title { font-size: 1.55rem; font-weight: 800; color: #f0c040; line-height: 1.1; margin: 0 0 0.25rem; }
    .brand-title span { color: #e8e8e8; }
    .brand-tagline { color: #a0a8b8; font-size: 0.85rem; margin: 0; }

    .lobby-card {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 1.25rem;
      padding: 1.25rem 1.4rem;
      width: 100%;
      max-width: 410px;
      backdrop-filter: blur(10px);
      box-shadow: 0 15px 45px rgba(0,0,0,0.4);
    }
    .name-field { margin-bottom: 0.85rem; }
    .name-field label, .mode-selector label, .color-selector label { display: block; font-size: 0.75rem; color: #a0a8b8; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.3rem; font-weight: 600; }
    input[type="text"] {
      width: 100%; box-sizing: border-box;
      background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.12);
      border-radius: 0.65rem; color: #e8e8e8; padding: 0.6rem 0.85rem;
      font-size: 0.95rem; font-family: inherit; outline: none;
      transition: border-color 0.2s;
    }
    input[type="text"]:focus { border-color: #f0c040; }

    .mode-selector, .color-selector { margin-bottom: 0.85rem; }
    .mode-options { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
    .mode-btn {
      display: flex; flex-direction: column; align-items: center; text-align: center;
      background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.1);
      border-radius: 0.65rem; padding: 0.5rem 0.4rem; cursor: pointer;
      color: #a0a8b8; transition: all 0.2s; font-family: inherit;
    }
    .mode-btn:hover { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.2); }
    .mode-btn.active {
      background: rgba(240,192,64,0.12); border-color: #f0c040; color: #e8e8e8;
      box-shadow: 0 0 12px rgba(240,192,64,0.2);
    }
    .mode-icon { font-size: 1.2rem; margin-bottom: 0.1rem; }
    .mode-title { font-weight: 700; font-size: 0.8rem; color: #e8e8e8; margin-bottom: 0.1rem; }
    .mode-btn.active .mode-title { color: #f0c040; }
    .mode-desc { font-size: 0.68rem; color: #707888; }

    /* Color selector */
    .color-options { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.4rem; }
    .color-btn {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.1);
      border-radius: 0.65rem; padding: 0.45rem 0.25rem; cursor: pointer;
      color: #a0a8b8; transition: all 0.2s; font-family: inherit;
    }
    .color-btn:hover { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.2); }
    .color-btn.active {
      background: rgba(240,192,64,0.12); border-color: #f0c040; color: #e8e8e8;
      box-shadow: 0 0 12px rgba(240,192,64,0.2);
    }
    .pawn-symbol { font-size: 1.3rem; line-height: 1; margin-bottom: 0.15rem; }
    .white-pawn { color: #f0d9b5; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5)); }
    .black-pawn { color: #111; filter: drop-shadow(0 0 2px rgba(255,255,255,0.8)); }
    .random-pawns { font-size: 1.1rem; letter-spacing: -2px; }
    .color-title { font-weight: 700; font-size: 0.76rem; color: #e8e8e8; }
    .color-btn.active .color-title { color: #f0c040; }

    .actions { display: flex; flex-direction: column; gap: 0.65rem; }
    .btn {
      display: flex; align-items: center; justify-content: center; gap: 0.4rem;
      padding: 0.7rem 1.2rem; border-radius: 0.65rem; border: none;
      font-size: 0.92rem; font-weight: 700; cursor: pointer; transition: all 0.2s;
      font-family: inherit;
    }
    .btn-bot {
      background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: #ffffff;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }
    .btn-bot:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(59, 130, 246, 0.45); }
    .btn-primary { background: linear-gradient(135deg, #f0c040, #d4880a); color: #1a1a2e; }
    .btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px #f0c04044; }
    .btn-secondary { background: rgba(255,255,255,0.08); color: #e8e8e8; border: 1px solid rgba(255,255,255,0.12); }
    .btn-secondary:hover:not(:disabled) { background: rgba(255,255,255,0.14); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-icon { font-size: 1.1rem; }
    .divider { display: flex; align-items: center; gap: 0.4rem; color: #505870; font-size: 0.78rem; margin: 0.1rem 0; }
    .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: rgba(255,255,255,0.08); }
    .join-row { display: flex; gap: 0.4rem; }
    .join-row input { flex: 1; }
    .join-row .btn { white-space: nowrap; padding: 0.6rem 1rem; }
    .error-msg { margin-top: 0.75rem; color: #ff7070; font-size: 0.85rem; text-align: center; }

    .spinner {
      display: inline-block; width: 0.9rem; height: 0.9rem;
      border: 2px solid rgba(255,255,255,0.3); border-radius: 50%;
      border-top-color: #ffffff; animation: spin 0.6s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Modal */
    .modal-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.75);
      backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center;
      z-index: 1000; padding: 1rem; animation: fadeIn 0.2s ease-out;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .modal-card {
      background: #1e2436; border: 1px solid rgba(255,255,255,0.12);
      border-radius: 1.25rem; padding: 1.4rem; width: 100%; max-width: 380px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.6); text-align: center;
    }
    .modal-card h2 { margin: 0 0 0.2rem; color: #e8e8e8; font-size: 1.25rem; }
    .modal-subtitle { color: #a0a8b8; font-size: 0.8rem; margin: 0 0 1rem; }

    .modal-section-label { font-size: 0.72rem; color: #808898; text-transform: uppercase; letter-spacing: 0.08em; text-align: left; margin-bottom: 0.4rem; font-weight: 700; }
    .difficulty-options { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem; }
    .diff-btn {
      display: flex; align-items: center; gap: 0.75rem; padding: 0.65rem 0.85rem;
      background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.1);
      border-radius: 0.75rem; cursor: pointer; color: #a0a8b8; transition: all 0.2s;
      text-align: left; font-family: inherit;
    }
    .diff-btn:hover { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.2); }
    .diff-btn.active {
      background: rgba(59,130,246,0.15); border-color: #3b82f6; color: #e8e8e8;
      box-shadow: 0 0 12px rgba(59,130,246,0.25);
    }
    .diff-icon { font-size: 1.3rem; }
    .diff-info { display: flex; flex-direction: column; }
    .diff-title { font-weight: 700; color: #e8e8e8; font-size: 0.88rem; }
    .diff-btn.active .diff-title { color: #60a5fa; }
    .diff-desc { font-size: 0.7rem; color: #707888; }

    .modal-color-options { margin-bottom: 1.25rem; }

    .modal-actions { display: flex; flex-direction: column; gap: 0.4rem; }
    .btn-full { width: 100%; }
    .btn-link { background: none; border: none; color: #a0a8b8; font-size: 0.85rem; cursor: pointer; padding: 0.4rem; }
    .btn-link:hover { color: #e8e8e8; }

    @media (max-width: 480px) {
      .lobby-container { gap: 0.6rem; padding: 0.75rem 0.5rem; }
      .brand-icon { font-size: 2.4rem; margin-bottom: 0.1rem; }
      .brand-title { font-size: 1.35rem; margin-bottom: 0.15rem; }
      .brand-tagline { font-size: 0.78rem; }
      .lobby-card { padding: 1rem 0.85rem; border-radius: 1rem; }
      .name-field { margin-bottom: 0.75rem; }
      input[type="text"] { padding: 0.55rem 0.75rem; font-size: 0.88rem; }
      .mode-selector, .color-selector { margin-bottom: 0.75rem; }
      .mode-options { gap: 0.4rem; }
      .mode-btn { padding: 0.45rem 0.25rem; }
      .mode-icon { font-size: 1.1rem; }
      .mode-title { font-size: 0.75rem; }
      .mode-desc { font-size: 0.62rem; }
      .btn { padding: 0.6rem 0.85rem; font-size: 0.85rem; }
    }
  `]
})
export class LobbyComponent implements OnInit, OnDestroy {
  playerName = '';
  joinId = '';
  selectedMode: GameMode = 'HiddenFormation';
  selectedColor: 'White' | 'Random' | 'Black' = 'Random';
  selectedDifficulty: 'Easy' | 'Medium' | 'Hard' = 'Medium';
  showBotModal = false;
  loading = false;
  loadingAction: 'create' | 'join' | 'bot' | null = null;
  errorMsg = '';
  private sub?: Subscription;

  constructor(
    private gameService: GameService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.joinId = id.toUpperCase();

    this.sub = this.gameService.error$.subscribe(msg => {
      this.errorMsg = msg;
      this.loading = false;
      this.loadingAction = null;
    });
  }

  openBotModal(): void {
    this.errorMsg = '';
    this.showBotModal = true;
  }

  async startBotGame(): Promise<void> {
    this.errorMsg = '';
    this.loading = true;
    this.loadingAction = 'bot';
    try {
      await this.gameService.createBotGame(
        this.playerName || 'Anonymous',
        this.selectedMode,
        this.selectedDifficulty,
        this.selectedColor
      );
      this.showBotModal = false;
    } catch (e: any) {
      this.errorMsg = e.message || 'Failed to start bot game';
      this.loading = false;
      this.loadingAction = null;
    }
  }

  async createGame(): Promise<void> {
    this.errorMsg = '';
    this.loading = true;
    this.loadingAction = 'create';
    try {
      await this.gameService.createGame(
        this.playerName || 'Anonymous',
        this.selectedMode,
        this.selectedColor
      );
    } catch (e: any) {
      this.errorMsg = e.message || 'Failed to create game';
      this.loading = false;
      this.loadingAction = null;
    }
  }

  async joinGame(): Promise<void> {
    if (!this.joinId) return;
    this.errorMsg = '';
    this.loading = true;
    this.loadingAction = 'join';
    try {
      await this.gameService.joinGame(this.joinId.trim().toUpperCase(), this.playerName || 'Anonymous');
      this.router.navigate(['/game', this.joinId.trim().toUpperCase()]);
    } catch (e: any) {
      this.errorMsg = e.message || 'Failed to join game';
      this.loading = false;
      this.loadingAction = null;
    }
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }
}
