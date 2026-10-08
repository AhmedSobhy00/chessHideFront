import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { BattleshipService } from '../../../core/services/battleship.service';
import { BattleshipGameState } from '../../../models/battleship.model';
import { BattleshipLobbyComponent } from '../battleship-lobby/battleship-lobby.component';
import { BattleshipSetupComponent } from '../battleship-setup/battleship-setup.component';
import { BattleshipGameComponent } from '../battleship-game/battleship-game.component';
import { BattleshipResultComponent } from '../battleship-result/battleship-result.component';

@Component({
  selector: 'app-battleship-shell',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BattleshipLobbyComponent,
    BattleshipSetupComponent,
    BattleshipGameComponent,
    BattleshipResultComponent
  ],
  template: `
    <div class="bs-shell" [class.in-game]="state && (state.phase === 'Setup' || state.phase === 'Playing')">
      <!-- Error Toast -->
      <div class="error-toast" *ngIf="errorMsg" (click)="errorMsg = ''">
        ⚠ {{ errorMsg }}
      </div>

      <!-- Direct Share Link Join Screen -->
      <div class="direct-join-overlay" *ngIf="urlGameId && (!state || !state.gameId)">
        <div class="join-card">
          <div class="badge">BATTLE ROOM #{{ urlGameId }}</div>
          <h2>Join Battleship Match</h2>
          <p>You have been invited to naval battle! Enter your commander name to join.</p>
          <div class="form-group">
            <input
              type="text"
              class="join-input"
              [(ngModel)]="playerName"
              placeholder="Commander Name (e.g. Alex)"
              (keyup.enter)="onJoinDirect()"
            />
            <button class="btn-join" [disabled]="!playerName.trim()" (click)="onJoinDirect()">
              Join Battle →
            </button>
          </div>
        </div>
      </div>

      <!-- Battleship Route / Phase Views -->
      <ng-container *ngIf="state && (!urlGameId || state.gameId)">
        <!-- Lobby / Waiting -->
        <app-battleship-lobby *ngIf="state.phase === 'WaitingForPlayers' && !state.gameId"></app-battleship-lobby>

        <!-- Waiting for 2nd player -->
        <div class="waiting-room-overlay" *ngIf="state.phase === 'WaitingForPlayers' && state.gameId">
          <div class="waiting-card">
            <div class="badge">BATTLE ROOM</div>
            <h2>Game Code</h2>
            <div class="game-id-box">
              <span class="game-id">{{ state.gameId }}</span>
              <div class="copy-actions">
                <button class="copy-btn" [class.copied]="copied" (click)="copyId()" [title]="'Copy Room Code'">
                  {{ copied ? '✓ Code Copied' : '⎘ Copy Code' }}
                </button>
                <button class="copy-btn" [class.copied]="copiedLink" (click)="copyLink()" [title]="'Copy Invite Link'">
                  {{ copiedLink ? '✓ Link Copied' : '🔗 Copy Link' }}
                </button>
              </div>
            </div>
            <p>Waiting for opponent to join naval command…</p>
            <button class="btn-cancel" (click)="leave()">Leave Room</button>
          </div>
        </div>

        <!-- Setup Phase -->
        <app-battleship-setup *ngIf="state.phase === 'Setup'"></app-battleship-setup>

        <!-- Playing Phase -->
        <app-battleship-game *ngIf="state.phase === 'Playing'"></app-battleship-game>

        <!-- Finished Phase -->
        <ng-container *ngIf="state.phase === 'Finished'">
          <app-battleship-game></app-battleship-game>
          <app-battleship-result></app-battleship-result>
        </ng-container>
      </ng-container>

      <!-- Creator Footer -->
      <footer class="site-footer" *ngIf="!state || state.phase === 'WaitingForPlayers'">
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
    .bs-shell { min-height: 100dvh; display: flex; flex-direction: column; position: relative; background: #0b132b; }
    .bs-shell.in-game { height: 100dvh; max-height: 100dvh; overflow: hidden; }

    .error-toast {
      position: fixed; top: 1rem; left: 50%; transform: translateX(-50%);
      background: #c02030; color: #fff; padding: 0.6rem 1.5rem; border-radius: 0.75rem;
      font-size: 0.9rem; font-weight: 700; z-index: 1000; cursor: pointer; box-shadow: 0 4px 16px rgba(0,0,0,0.5);
    }

    .waiting-room-overlay {
      min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1.5rem;
    }
    .waiting-card {
      background: #0d1b3e; border: 1px solid rgba(0,240,255,0.25); border-radius: 1.25rem;
      padding: 1.75rem 1.6rem; max-width: 400px; width: 100%; text-align: center; color: #e8e8e8;
      box-shadow: 0 20px 60px rgba(0,0,0,0.7); display: flex; flex-direction: column; gap: 0.85rem;
    }
    .waiting-card .badge { display: inline-block; font-size: 0.7rem; font-weight: 800; color: #00f0ff; letter-spacing: 0.15em; margin-bottom: 0.2rem; }
    .waiting-card h2 { margin: 0; font-size: 0.82rem; color: #8a99ad; text-transform: uppercase; letter-spacing: 0.05em; }
    .waiting-card p { color: #8a99ad; font-size: 0.85rem; margin: 0; }

    .game-id-box {
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem;
      background: rgba(0,0,0,0.4); border: 1px solid rgba(0,240,255,0.25);
      border-radius: 0.85rem; padding: 0.65rem 0.75rem;
    }
    .game-id { font-size: 1.85rem; font-weight: 900; color: #00f0ff; letter-spacing: 0.18em; font-family: monospace; }
    .copy-actions { display: flex; gap: 0.5rem; width: 100%; justify-content: center; }
    .copy-btn {
      flex: 1; background: rgba(0,240,255,0.12); border: 1px solid rgba(0,240,255,0.3);
      border-radius: 0.5rem; color: #00f0ff; padding: 0.45rem 0.65rem;
      font-size: 0.78rem; font-weight: 800; cursor: pointer; font-family: inherit; transition: all 0.2s; text-align: center;
    }
    .copy-btn.copied { background: rgba(60,200,60,0.2); border-color: #40d060; color: #60e080; }
    .copy-btn:hover { background: rgba(0,240,255,0.25); }

    .btn-cancel {
      background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15);
      color: #e8e8e8; padding: 0.6rem 1.2rem; border-radius: 0.65rem; font-size: 0.85rem; font-weight: 700; cursor: pointer;
    }

    /* Direct Share Link Join Screen */
    .direct-join-overlay {
      min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1.5rem;
      background: radial-gradient(circle at 50% 30%, #0d1b3e 0%, #060d20 100%);
    }
    .join-card {
      background: #0d1b3e; border-radius: 1.5rem; padding: 2.2rem 1.8rem;
      max-width: 400px; width: 100%; border: 1px solid rgba(0,240,255,0.3);
      box-shadow: 0 20px 60px rgba(0,0,0,0.7); text-align: center;
    }
    .join-card h2 { color: #ffffff; margin: 0.2rem 0 0.5rem; font-weight: 900; font-size: 1.4rem; }
    .join-card p { color: #8a99ad; font-size: 0.88rem; margin: 0 0 1.5rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.75rem; }
    .join-input {
      background: rgba(0,0,0,0.4); border: 1px solid rgba(0,240,255,0.25);
      border-radius: 0.75rem; color: #e8e8e8; padding: 0.8rem 1rem; font-size: 1rem;
      font-family: inherit; outline: none; transition: border-color 0.2s;
    }
    .join-input:focus { border-color: #00f0ff; box-shadow: 0 0 10px rgba(0,240,255,0.3); }
    .btn-join {
      background: linear-gradient(135deg, #00f0ff, #0088cc);
      color: #0b132b; border: none; border-radius: 0.75rem; padding: 0.85rem;
      font-size: 1rem; font-weight: 800; cursor: pointer; font-family: inherit;
      transition: all 0.2s;
    }
    .btn-join:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,240,255,0.4); }
    .btn-join:disabled { opacity: 0.4; cursor: not-allowed; }

    .site-footer {
      width: 100%; padding: 1.25rem 1rem; margin-top: auto; text-align: center; position: relative; z-index: 10;
    }
    .footer-content { display: flex; flex-direction: column; align-items: center; gap: 0.4rem; font-size: 0.82rem; color: #808898; }
    .created-by { color: #8a99ad; font-weight: 600; }
    .created-by a { color: #00f0ff; text-decoration: none; font-weight: 700; transition: color 0.2s; }
    .created-by a:hover { color: #fff; text-decoration: underline; }

    .footer-links { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; justify-content: center; }
    .footer-links a { color: #808898; text-decoration: none; display: inline-flex; align-items: center; gap: 0.25rem; transition: all 0.2s; font-size: 0.8rem; }
    .footer-links a:hover { color: #00f0ff; transform: translateY(-1px); }
    .footer-links .sep { color: rgba(255,255,255,0.15); font-size: 0.7rem; }
  `]
})
export class BattleshipShellComponent implements OnInit, OnDestroy {
  state: BattleshipGameState | null = null;
  errorMsg = '';
  urlGameId: string | null = null;
  playerName = '';
  copied = false;
  copiedLink = false;
  private subs: Subscription[] = [];

  constructor(
    private battleship: BattleshipService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.route.paramMap.subscribe(params => {
        const rawId = params.get('id');
        this.urlGameId = rawId ? rawId.trim().toUpperCase() : null;
      })
    );

    this.subs.push(
      this.battleship.state$.subscribe(s => { this.state = s; })
    );

    this.subs.push(
      this.battleship.error$.subscribe(msg => { this.errorMsg = msg; })
    );

    // Reconnection check
    const session = this.battleship.loadSession();
    if (this.urlGameId && session && session.gameId.toUpperCase() === this.urlGameId) {
      this.battleship.reconnect(session.gameId, session.playerId).catch(() => {});
    }
  }

  copyId(): void {
    if (!this.state?.gameId) return;
    navigator.clipboard.writeText(this.state.gameId).then(() => {
      this.copied = true;
      setTimeout(() => this.copied = false, 2000);
    });
  }

  copyLink(): void {
    if (!this.state?.gameId) return;
    const url = `${window.location.origin}/battleship/game/${this.state.gameId}`;
    navigator.clipboard.writeText(url).then(() => {
      this.copiedLink = true;
      setTimeout(() => this.copiedLink = false, 2000);
    });
  }

  async onJoinDirect(): Promise<void> {
    if (!this.urlGameId || !this.playerName.trim()) return;
    try {
      await this.battleship.joinGame(this.urlGameId, this.playerName.trim());
    } catch (e: any) {
      this.errorMsg = e.message || 'Failed to join game';
    }
  }

  leave(): void {
    this.battleship.clearSession();
    this.router.navigate(['/battleship']);
  }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }
}
