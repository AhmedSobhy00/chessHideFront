import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { BattleshipService } from '../../../core/services/battleship.service';

@Component({
  selector: 'app-battleship-lobby',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bs-lobby-container">
      <!-- Arcade Game Switcher -->
      <div class="game-switcher">
        <button type="button" class="switcher-btn" (click)="goToChess()">
          <span class="sw-icon">♟️</span> Hidden Chess
        </button>
        <button type="button" class="switcher-btn active">
          <span class="sw-icon">🚀</span> Battleship
        </button>
      </div>

      <div class="brand">
        <div class="brand-icon">
          <svg class="brand-missile-logo" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Outer Glow Ring -->
            <circle cx="50" cy="50" r="42" stroke="url(#missileGlowRing)" stroke-width="1.5" stroke-dasharray="4 4" opacity="0.6" />
            
            <!-- Fire Thruster Flame -->
            <path d="M 50 72 Q 43 85 50 96 Q 57 85 50 72 Z" fill="url(#fireFlame)" />
            <path d="M 50 74 Q 46 83 50 90 Q 54 83 50 74 Z" fill="#ffff00" />
            
            <!-- Missile Body -->
            <path d="M 50 8 C 38 25 38 60 40 74 L 60 74 C 62 60 62 25 50 8 Z" fill="url(#missileBodyGrad)" stroke="#00f0ff" stroke-width="2" />
            
            <!-- Warhead Tip -->
            <path d="M 50 8 C 45 16 43 25 43 30 L 57 30 C 57 25 55 16 50 8 Z" fill="url(#warheadGrad)" stroke="#ff3366" stroke-width="1.5" />
            
            <!-- Side Fins -->
            <path d="M 38 58 L 22 74 L 40 72 Z" fill="#1b2a4a" stroke="#00f0ff" stroke-width="1.5" />
            <path d="M 62 58 L 78 74 L 60 72 Z" fill="#1b2a4a" stroke="#00f0ff" stroke-width="1.5" />
            
            <!-- Tech Details / Glowing Lines -->
            <line x1="50" y1="34" x2="50" y2="62" stroke="#00f0ff" stroke-width="2" stroke-linecap="round" />
            <circle cx="50" cy="42" r="3" fill="#00f0ff" />
            <circle cx="50" cy="54" r="2" fill="#ffaa00" />

            <defs>
              <linearGradient id="missileGlowRing" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#00f0ff" />
                <stop offset="100%" stop-color="#ff3366" />
              </linearGradient>
              <linearGradient id="fireFlame" x1="50" y1="72" x2="50" y2="96" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#ffaa00" />
                <stop offset="50%" stop-color="#ff3300" />
                <stop offset="100%" stop-color="rgba(255,51,0,0)" />
              </linearGradient>
              <linearGradient id="missileBodyGrad" x1="40" y1="8" x2="60" y2="74" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#16284f" />
                <stop offset="50%" stop-color="#0d1b3e" />
                <stop offset="100%" stop-color="#060d20" />
              </linearGradient>
              <linearGradient id="warheadGrad" x1="43" y1="8" x2="57" y2="30" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#ff3366" />
                <stop offset="100%" stop-color="#aa1133" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <h1 class="brand-title">NAVAL <span>BATTLESHIP</span></h1>
        <p class="brand-tagline">Deploy your fleet in secret. Command radar strikes.</p>
      </div>

      <div class="lobby-card">
        <div class="name-field">
          <label for="playerName">Commander Name</label>
          <input
            id="playerName"
            type="text"
            [(ngModel)]="playerName"
            placeholder="Admiral Alex"
            maxlength="24"
            (keydown.enter)="joinId ? joinGame() : createGame()"
          />
        </div>

        <div class="actions">
          <button class="btn btn-bot" (click)="openBotModal()" [disabled]="loading">
            <span class="btn-icon">🤖</span> Play vs Computer (Bot)
          </button>

          <button class="btn btn-primary" (click)="createGame()" [disabled]="loading">
            <span class="btn-icon">+</span> Create Battleship Room
          </button>

          <div class="divider"><span>or join fleet</span></div>

          <div class="join-row">
            <input
              type="text"
              [(ngModel)]="joinId"
              placeholder="Game Code (e.g. NAVY12)"
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
      </div>
    </div>

    <!-- Bot Difficulty Modal -->
    <div class="modal-overlay" *ngIf="showBotModal" (click)="showBotModal = false">
      <div class="modal-card" (click)="$event.stopPropagation()">
        <h2>🤖 Battle vs Computer</h2>
        <p class="modal-subtitle">Select AI admiral difficulty</p>

        <div class="difficulty-options">
          <button
            type="button"
            class="diff-btn"
            [class.active]="selectedDifficulty === 'Easy'"
            (click)="selectedDifficulty = 'Easy'"
          >
            <span class="diff-icon">⚓</span>
            <div class="diff-info">
              <span class="diff-title">Easy (Cadet)</span>
              <span class="diff-desc">Random sonar strikes</span>
            </div>
          </button>

          <button
            type="button"
            class="diff-btn"
            [class.active]="selectedDifficulty === 'Medium'"
            (click)="selectedDifficulty = 'Medium'"
          >
            <span class="diff-icon">🎯</span>
            <div class="diff-info">
              <span class="diff-title">Medium (Captain)</span>
              <span class="diff-desc">Hunt & target hit cells</span>
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
              <span class="diff-title">Hard (Admiral)</span>
              <span class="diff-desc">High density tactical AI</span>
            </div>
          </button>
        </div>

        <div class="modal-actions">
          <button class="btn btn-primary btn-full" (click)="startBotGame()" [disabled]="loading">
            {{ loading ? 'Launching Fleet...' : 'Engage Battle' }}
          </button>
          <button class="btn btn-link" (click)="showBotModal = false">Cancel</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .bs-lobby-container {
      flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 0.85rem; padding: 1rem 0.75rem;
    }
    .game-switcher {
      display: flex;
      background: rgba(0, 0, 0, 0.4);
      padding: 4px;
      border-radius: 9999px;
      border: 1px solid rgba(0, 240, 255, 0.2);
      gap: 4px;
    }
    .switcher-btn {
      display: flex; align-items: center; gap: 0.4rem;
      padding: 0.4rem 0.9rem; border-radius: 9999px; border: none;
      background: transparent; color: #8a99ad; font-weight: 700;
      font-size: 0.82rem; cursor: pointer; transition: all 0.2s; font-family: inherit;
    }
    .switcher-btn:hover:not(.active) { color: #ffffff; background: rgba(255, 255, 255, 0.08); }
    .switcher-btn.active { background: #00f0ff; color: #0b132b; box-shadow: 0 0 12px rgba(0,240,255,0.35); }
    .sw-icon { font-size: 1rem; }

    .brand { text-align: center; }
    .brand-icon { display: flex; align-items: center; justify-content: center; margin-bottom: 0.2rem; filter: drop-shadow(0 0 15px #00f0ffaa); }
    .brand-missile-logo { width: 72px; height: 72px; filter: drop-shadow(0 0 12px rgba(0,240,255,0.7)); }
    .brand-title { font-size: 1.55rem; font-weight: 900; color: #00f0ff; letter-spacing: 0.05em; line-height: 1.1; margin: 0 0 0.25rem; }
    .brand-title span { color: #ffffff; }
    .brand-tagline { color: #8a99ad; font-size: 0.85rem; margin: 0; }

    .lobby-card {
      background: rgba(11, 19, 43, 0.75); border: 1px solid rgba(0, 240, 255, 0.2);
      border-radius: 1.25rem; padding: 1.25rem 1.4rem; width: 100%; max-width: 410px;
      backdrop-filter: blur(12px); box-shadow: 0 15px 45px rgba(0,0,0,0.6);
    }
    .name-field { margin-bottom: 0.85rem; }
    .name-field label { display: block; font-size: 0.75rem; color: #8a99ad; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.3rem; font-weight: 700; }
    input[type="text"] {
      width: 100%; box-sizing: border-box; background: rgba(0,0,0,0.4);
      border: 1px solid rgba(0, 240, 255, 0.25); border-radius: 0.65rem; color: #e8e8e8;
      padding: 0.6rem 0.85rem; font-size: 0.95rem; font-family: inherit; outline: none;
      transition: border-color 0.2s;
    }
    input[type="text"]:focus { border-color: #00f0ff; box-shadow: 0 0 10px rgba(0, 240, 255, 0.3); }

    .actions { display: flex; flex-direction: column; gap: 0.65rem; }
    .btn {
      display: flex; align-items: center; justify-content: center; gap: 0.4rem;
      padding: 0.7rem 1.2rem; border-radius: 0.65rem; border: none;
      font-size: 0.92rem; font-weight: 800; cursor: pointer; transition: all 0.2s; font-family: inherit;
    }
    .btn-bot {
      background: linear-gradient(135deg, #00c6ff, #0072ff); color: #ffffff;
      box-shadow: 0 4px 14px rgba(0, 198, 255, 0.35);
    }
    .btn-bot:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(0, 198, 255, 0.5); }
    .btn-primary { background: linear-gradient(135deg, #00f0ff, #0088cc); color: #0b132b; }
    .btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(0, 240, 255, 0.45); }
    .btn-secondary { background: rgba(255,255,255,0.08); color: #e8e8e8; border: 1px solid rgba(255,255,255,0.15); }
    .btn-secondary:hover:not(:disabled) { background: rgba(255,255,255,0.14); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-icon { font-size: 1.1rem; }

    .divider { display: flex; align-items: center; gap: 0.4rem; color: #506078; font-size: 0.78rem; margin: 0.1rem 0; }
    .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: rgba(255,255,255,0.1); }
    .join-row { display: flex; gap: 0.4rem; }
    .join-row input { flex: 1; }
    .join-row .btn { white-space: nowrap; padding: 0.6rem 1rem; }
    .error-msg { margin-top: 0.75rem; color: #ff5555; font-size: 0.85rem; text-align: center; }

    /* Modal */
    .modal-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(6px);
      display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem;
      animation: fadeIn 0.2s ease-out;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .modal-card {
      background: #0d1b3e; border: 1px solid rgba(0,240,255,0.3); border-radius: 1.25rem;
      padding: 1.4rem; width: 100%; max-width: 380px; box-shadow: 0 20px 60px rgba(0,0,0,0.7); text-align: center;
    }
    .modal-card h2 { margin: 0 0 0.2rem; color: #e8e8e8; font-size: 1.25rem; }
    .modal-subtitle { color: #8a99ad; font-size: 0.8rem; margin: 0 0 1rem; }

    .difficulty-options { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1.25rem; }
    .diff-btn {
      display: flex; align-items: center; gap: 0.75rem; padding: 0.65rem 0.85rem;
      background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 0.75rem;
      cursor: pointer; color: #8a99ad; transition: all 0.2s; text-align: left; font-family: inherit;
    }
    .diff-btn:hover { background: rgba(0,240,255,0.06); border-color: rgba(0,240,255,0.3); }
    .diff-btn.active {
      background: rgba(0,240,255,0.15); border-color: #00f0ff; color: #e8e8e8;
      box-shadow: 0 0 15px rgba(0,240,255,0.25);
    }
    .diff-icon { font-size: 1.3rem; }
    .diff-info { display: flex; flex-direction: column; }
    .diff-title { font-weight: 700; color: #e8e8e8; font-size: 0.88rem; }
    .diff-btn.active .diff-title { color: #00f0ff; }
    .diff-desc { font-size: 0.7rem; color: #708098; }

    .modal-actions { display: flex; flex-direction: column; gap: 0.4rem; }
    .btn-full { width: 100%; }
    .btn-link { background: none; border: none; color: #8a99ad; font-size: 0.85rem; cursor: pointer; padding: 0.4rem; }
    .btn-link:hover { color: #e8e8e8; }
  `]
})
export class BattleshipLobbyComponent implements OnInit, OnDestroy {
  playerName = '';
  joinId = '';
  selectedDifficulty: 'Easy' | 'Medium' | 'Hard' = 'Medium';
  showBotModal = false;
  loading = false;
  errorMsg = '';
  private sub?: Subscription;

  constructor(
    private battleship: BattleshipService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.joinId = id.toUpperCase();

    this.sub = this.battleship.error$.subscribe(msg => {
      this.errorMsg = msg;
      this.loading = false;
    });
  }

  openBotModal(): void {
    this.errorMsg = '';
    this.showBotModal = true;
  }

  async startBotGame(): Promise<void> {
    this.errorMsg = '';
    this.loading = true;
    try {
      await this.battleship.createBotGame(this.playerName || 'Commander', this.selectedDifficulty);
      this.showBotModal = false;
    } catch (e: any) {
      this.errorMsg = e.message || 'Failed to start bot battle';
      this.loading = false;
    }
  }

  async createGame(): Promise<void> {
    this.errorMsg = '';
    this.loading = true;
    try {
      await this.battleship.createGame(this.playerName || 'Commander');
    } catch (e: any) {
      this.errorMsg = e.message || 'Failed to create room';
      this.loading = false;
    }
  }

  async joinGame(): Promise<void> {
    if (!this.joinId) return;
    this.errorMsg = '';
    this.loading = true;
    try {
      await this.battleship.joinGame(this.joinId.trim().toUpperCase(), this.playerName || 'Commander');
      this.router.navigate(['/battleship/game', this.joinId.trim().toUpperCase()]);
    } catch (e: any) {
      this.errorMsg = e.message || 'Failed to join room';
      this.loading = false;
    }
  }

  goToChess(): void {
    this.router.navigate(['/']);
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }
}
