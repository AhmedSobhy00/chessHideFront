import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { GameService } from '../../core/services/game.service';
import { GameState } from '../../models/game.model';
import { LobbyComponent } from '../lobby/lobby.component';
import { WaitingRoomComponent } from '../waiting-room/waiting-room.component';
import { SetupPhaseComponent } from '../setup-phase/setup-phase.component';
import { GamePhaseComponent } from '../game-phase/game-phase.component';
import { GameResultComponent } from '../game-result/game-result.component';
import { SoundService } from '../../core/services/sound.service';

@Component({
  selector: 'app-game-shell',
  standalone: true,
  imports: [
    CommonModule,
    LobbyComponent,
    WaitingRoomComponent,
    SetupPhaseComponent,
    GamePhaseComponent,
    GameResultComponent,
  ],
  template: `
    <div class="shell">
      <!-- Error toast -->
      <div class="error-toast" *ngIf="errorMsg" (click)="dismissError()">
        ⚠ {{ errorMsg }}
      </div>

      <!-- Mute Toggle -->
      <button class="mute-btn" (click)="toggleMute()" [attr.aria-label]="isMuted ? 'Unmute' : 'Mute'">
        {{ isMuted ? '🔇' : '🔊' }}
      </button>

      <!-- Direct Share Link Join Screen -->
      <div class="direct-join-overlay" *ngIf="urlGameId && (!state || !state.gameId)">
        <div class="join-card">
          <div class="game-badge">GAME #{{ urlGameId }}</div>
          <h2>Join Hidden Chess Game</h2>
          <p>You have been invited to play! Enter your name to start.</p>
          <div class="form-group">
            <input
              type="text"
              class="join-input"
              [value]="playerName"
              (input)="playerName = $any($event.target).value"
              placeholder="Your Name (e.g. Alex)"
              (keyup.enter)="onJoinDirect()"
            />
            <button class="btn-join" [disabled]="!playerName.trim()" (click)="onJoinDirect()">
              Join Game →
            </button>
          </div>
        </div>
      </div>

      <!-- Phase routing -->
      <ng-container *ngIf="state && (!urlGameId || state.gameId)">
        <!-- No game yet or lobby -->
        <app-lobby *ngIf="state.phase === 'WaitingForPlayers' && !state.gameId"></app-lobby>

        <!-- Waiting for second player -->
        <app-waiting-room *ngIf="state.phase === 'WaitingForPlayers' && state.gameId"></app-waiting-room>

        <!-- Hidden formation setup -->
        <app-setup-phase *ngIf="state.phase === 'Setup'"></app-setup-phase>

        <!-- Reveal animation + playing -->
        <div *ngIf="state.phase === 'Playing' || state.phase === 'Reveal'">
          <app-game-phase></app-game-phase>
        </div>

        <!-- Finished — show overlay on top of last board state -->
        <div *ngIf="state.phase === 'Finished'">
          <app-game-phase></app-game-phase>
          <app-game-result></app-game-result>
        </div>

        <!-- Abandoned -->
        <div *ngIf="state.phase === 'Abandoned'" class="abandoned-msg">
          <div class="abandoned-card">
            <div class="icon">⚡</div>
            <h2>Connection Lost</h2>
            <p>Waiting for opponent to reconnect…</p>
            <button class="btn-leave" (click)="leaveGame()">Leave Game</button>
          </div>
        </div>
      </ng-container>

      <!-- Creator Footer -->
      <footer class="site-footer">
        <div class="footer-content">
          <span class="created-by">Created by <a href="https://ahmedsobhi.vercel.app/" target="_blank" rel="noopener">Ahmed Sobhi</a></span>
          <div class="footer-links">
            <a href="https://ahmedsobhi.vercel.app/" target="_blank" rel="noopener" title="Portfolio">
              <span class="icon">🌐</span> Portfolio
            </a>
            <span class="sep">•</span>
            <a href="https://linkedin.com/in/ahmedsobhi01" target="_blank" rel="noopener" title="LinkedIn">
              <span class="icon">💼</span> LinkedIn
            </a>
            <span class="sep">•</span>
            <a href="mailto:ahmedsobhi.dev@gmail.com" title="Email">
              <span class="icon">✉️</span> Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    .shell { min-height: 100vh; display: flex; flex-direction: column; position: relative; }
    .error-toast {
      position: fixed; top: 1rem; left: 50%; transform: translateX(-50%);
      background: #c02030; color: #fff; padding: 0.6rem 1.5rem;
      border-radius: 0.75rem; font-size: 0.9rem; font-weight: 600;
      z-index: 200; cursor: pointer; box-shadow: 0 4px 16px rgba(0,0,0,0.3);
      animation: slide-in 0.3s ease;
    }
    @keyframes slide-in { from{opacity:0;transform:translateX(-50%) translateY(-10px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }

    .abandoned-msg { min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .abandoned-card { text-align: center; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 1.5rem; padding: 3rem 2rem; }
    .abandoned-card .icon { font-size: 3rem; margin-bottom: 0.75rem; }
    .abandoned-card h2 { color: #e8e8e8; margin: 0 0 0.5rem; }
    .abandoned-card p { color: #a0a8b8; margin: 0 0 1.5rem; }
    .btn-leave {
      background: rgba(220,60,60,0.15); color: #e07070; border: 1px solid rgba(220,60,60,0.3);
      padding: 0.6rem 1.4rem; border-radius: 0.75rem; cursor: pointer; font-family: inherit;
      font-size: 0.9rem; font-weight: 600; transition: all 0.2s;
    }
    .btn-leave:hover { background: rgba(220,60,60,0.25); }
    
    .mute-btn {
      position: absolute; top: 1rem; right: 1rem; z-index: 100;
      background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1);
      color: #fff; width: 40px; height: 40px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.2rem; cursor: pointer; transition: all 0.2s;
    }
    .mute-btn:hover { background: rgba(255,255,255,0.1); transform: scale(1.05); }

    /* Direct Share Link Join Overlay */
    .direct-join-overlay {
      min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1.5rem;
      background: radial-gradient(circle at 50% 30%, #1a2238 0%, #0d111d 100%);
    }
    .join-card {
      background: #1e2538; border-radius: 1.5rem; padding: 2.5rem 2rem;
      max-width: 400px; width: 100%; border: 1px solid rgba(255,255,255,0.12);
      box-shadow: 0 20px 60px rgba(0,0,0,0.5); text-align: center;
      animation: popIn 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    @keyframes popIn { from { transform: scale(0.85); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    .game-badge {
      display: inline-block; padding: 0.3rem 0.8rem; border-radius: 2rem;
      background: rgba(64,160,240,0.15); color: #40a0f0; border: 1px solid rgba(64,160,240,0.3);
      font-size: 0.8rem; font-weight: 700; letter-spacing: 0.08em; margin-bottom: 1rem;
    }
    .join-card h2 { color: #e8e8e8; margin: 0 0 0.5rem; font-weight: 800; font-size: 1.5rem; }
    .join-card p { color: #a0a8b8; font-size: 0.9rem; margin: 0 0 1.5rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.75rem; }
    .join-input {
      background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.15);
      border-radius: 0.75rem; color: #e8e8e8; padding: 0.8rem 1rem; font-size: 1rem;
      font-family: inherit; outline: none; transition: border-color 0.2s;
    }
    .join-input:focus { border-color: #f0c040; }
    .btn-join {
      background: linear-gradient(135deg, #f0c040, #d4880a);
      color: #1a1a2e; border: none; border-radius: 0.75rem; padding: 0.85rem;
      font-size: 1rem; font-weight: 800; cursor: pointer; font-family: inherit;
      transition: all 0.2s;
    }
    .btn-join:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(240,192,64,0.35); }
    .btn-join:disabled { opacity: 0.4; cursor: not-allowed; }

    /* Footer styling */
    .site-footer {
      width: 100%;
      padding: 1.25rem 1rem;
      margin-top: auto;
      text-align: center;
      position: relative;
      z-index: 10;
    }
    .footer-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.82rem;
      color: #808898;
    }
    .created-by { color: #a0a8b8; font-weight: 600; }
    .created-by a { color: #f0c040; text-decoration: none; font-weight: 700; transition: color 0.2s; }
    .created-by a:hover { color: #fff; text-decoration: underline; }

    .footer-links { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; justify-content: center; }
    .footer-links a {
      color: #808898; text-decoration: none; display: inline-flex; align-items: center; gap: 0.25rem;
      transition: all 0.2s; font-size: 0.8rem;
    }
    .footer-links a:hover { color: #f0c040; transform: translateY(-1px); }
    .footer-links .sep { color: rgba(255,255,255,0.15); font-size: 0.7rem; }
  `]
})
export class GameShellComponent implements OnInit, OnDestroy {
  state: GameState | null = null;
  errorMsg = '';
  urlGameId: string | null = null;
  playerName = '';
  private subs: Subscription[] = [];

  constructor(
    private gameService: GameService,
    private route: ActivatedRoute,
    private router: Router,
    private sound: SoundService
  ) {}

  get isMuted(): boolean {
    return this.sound.isMuted;
  }

  toggleMute(): void {
    this.sound.toggleMute();
  }

  leaveGame(): void {
    this.gameService.clearSession();
    this.router.navigate(['/']);
  }

  ngOnInit(): void {
    this.subs.push(
      this.route.paramMap.subscribe(params => {
        const rawId = params.get('id');
        this.urlGameId = rawId ? rawId.trim().toUpperCase() : null;
        if (!this.urlGameId && this.state?.gameId) {
          this.gameService.resetState();
        }
      })
    );

    this.subs.push(
      this.gameService.state$.subscribe(s => { this.state = s; })
    );
    this.subs.push(
      this.gameService.error$.subscribe(msg => {
        this.errorMsg = msg;
        setTimeout(() => this.errorMsg = '', 4000);
      })
    );

    // Attempt reconnection if session stored and matches route ID
    const session = this.gameService.loadSession();
    if (this.urlGameId && session && session.gameId.toUpperCase() === this.urlGameId) {
      this.gameService.reconnect(session.gameId, session.playerId).catch(() => {});
    }
  }

  async onJoinDirect(): Promise<void> {
    if (!this.urlGameId || !this.playerName.trim()) return;
    await this.gameService.joinGame(this.urlGameId, this.playerName.trim());
  }

  dismissError(): void { this.errorMsg = ''; }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }
}
