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
    <div class="lobby-container">
      
      <!-- 3-Second Countdown Overlay -->
      <div class="countdown-overlay" *ngIf="state?.isStartingMatch">
        <div class="countdown-box">
          <div class="countdown-label">MATCH STARTING IN</div>
          <div class="countdown-number">
            {{ state?.countdownSeconds }}
          </div>
          <div class="countdown-sub">Prepare for battle!</div>
        </div>
      </div>

      <div class="lobby-card">
        
        <!-- Header & Code -->
        <div class="lobby-header">
          <div class="header-top-row">
            <div class="lobby-badge">MATCH LOBBY</div>
            <button class="btn-home-icon" (click)="cancel()" title="Return to Home">🏠 Home</button>
          </div>
          <h2>Game Code</h2>
          <div class="game-id-box">
            <span class="game-id">{{ state?.gameId }}</span>
            <div class="copy-actions">
              <button class="copy-btn" [class.copied]="copied" (click)="copyId()" [title]="'Copy Code'">
                {{ copied ? '✓ Code Copied' : '⎘ Copy Code' }}
              </button>
              <button class="copy-btn" [class.copied]="copiedLink" (click)="copyLink()" [title]="'Copy Invite Link'">
                {{ copiedLink ? '✓ Link Copied' : '🔗 Copy Link' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Players List -->
        <div class="players-section">
          <h3>Players</h3>
          <div class="player-card host">
            <div class="player-avatar" [class.white-avatar]="hostColor === 'White'" [class.black-avatar]="hostColor === 'Black'">
              {{ hostColor === 'White' ? '♔' : '♚' }}
            </div>
            <div class="player-info">
              <span class="player-name">
                {{ isHost ? (state?.yourName || 'Host') : (state?.opponentName || 'Waiting...') }}
              </span>
              <span class="player-role">👑 Room Host ({{ hostColor }})</span>
            </div>
            <span class="status-badge ready">Ready</span>
          </div>

          <div class="player-card opponent" [class.joined]="hasOpponent">
            <div class="player-avatar" [class.white-avatar]="challengerColor === 'White'" [class.black-avatar]="challengerColor === 'Black'">
              {{ challengerColor === 'White' ? '♔' : '♚' }}
            </div>
            <div class="player-info">
              <span class="player-name">
                {{ isHost ? (state?.opponentName || 'Waiting for player...') : (state?.yourName || 'You') }}
              </span>
              <span class="player-role">⚔️ Challenger ({{ challengerColor }})</span>
            </div>
            <span class="status-badge" [class.ready]="hasOpponent" [class.waiting]="!hasOpponent">
              {{ hasOpponent ? 'Joined' : 'Waiting…' }}
            </span>
          </div>
        </div>

        <!-- Selected Game Mode & Rules -->
        <div class="rules-card">
          <div class="rules-header">
            <span class="mode-icon">{{ state?.gameMode === 'Classic' ? '♟' : '🤫' }}</span>
            <span class="mode-title">{{ state?.gameMode === 'Classic' ? 'Classic Chess' : 'Hidden Formation' }}</span>
          </div>
          <p class="rules-subtitle">Game Mode & Rules</p>
          
          <ul class="rules-list" *ngIf="state?.gameMode !== 'Classic'">
            <li>⏱️ <strong>60s Secret Setup:</strong> Both players place their pieces in secret before the match begins.</li>
            <li>🛡️ <strong>Deployment Zone:</strong> White places on Ranks 1–4, Black on Ranks 5–8.</li>
            <li>🙈 <strong>Fog of War:</strong> Opponent's pieces remain hidden until both formations are locked.</li>
          </ul>

          <ul class="rules-list" *ngIf="state?.gameMode === 'Classic'">
            <li>♟️ <strong>Standard Setup:</strong> Traditional chess piece starting layout.</li>
            <li>⚖️ <strong>Standard Rules:</strong> Traditional chess movements, checks, checkmates, and turns.</li>
          </ul>
        </div>

        <!-- Actions -->
        <div class="lobby-actions">
          <div *ngIf="isHost">
            <button
              class="btn-start"
              (click)="startMatch()"
              [disabled]="!hasOpponent || state?.isStartingMatch"
            >
              <span class="btn-icon">🚀</span>
              {{ hasOpponent ? 'Start Match' : 'Waiting for Opponent...' }}
            </button>
          </div>

          <div *ngIf="!isHost" class="guest-waiting-banner">
            <div class="pulse-dot"></div>
            <span>Waiting for room host to start the match…</span>
          </div>

          <button class="btn-cancel" (click)="cancel()">Leave Lobby</button>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .lobby-container {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem 0.75rem;
      position: relative;
    }
    .lobby-card {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 1.25rem;
      padding: 1.25rem 1.4rem;
      max-width: 410px;
      width: 100%;
      box-shadow: 0 15px 45px rgba(0,0,0,0.5);
      backdrop-filter: blur(10px);
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .lobby-header { text-align: center; }
    .header-top-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.25rem; }
    .btn-home-icon {
      background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15);
      border-radius: 9999px; color: #a0a8b8; padding: 0.2rem 0.65rem; font-size: 0.72rem;
      font-weight: 700; cursor: pointer; font-family: inherit; transition: all 0.2s;
    }
    .btn-home-icon:hover { background: rgba(255,255,255,0.18); color: #fff; transform: translateY(-1px); }
    .lobby-badge {
      display: inline-block;
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.15em;
      color: #f0c040;
      background: rgba(240,192,64,0.12);
      border: 1px solid rgba(240,192,64,0.25);
      padding: 0.15rem 0.5rem;
      border-radius: 1rem;
    }
    h2 { margin: 0 0 0.5rem; color: #a0a8b8; font-size: 0.82rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }

    .game-id-box {
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem;
      background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.1);
      border-radius: 0.85rem; padding: 0.65rem 0.75rem;
    }
    .game-id { font-size: 1.85rem; font-weight: 800; color: #f0c040; letter-spacing: 0.18em; font-family: monospace; }
    .copy-actions { display: flex; gap: 0.5rem; width: 100%; justify-content: center; }
    .copy-btn {
      flex: 1; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15);
      border-radius: 0.5rem; color: #e8e8e8; padding: 0.45rem 0.65rem;
      font-size: 0.78rem; font-weight: 700; cursor: pointer; font-family: inherit; transition: all 0.2s; text-align: center;
    }
    .copy-btn.copied { background: rgba(60,200,60,0.2); border-color: #40d060; color: #60e080; }
    .copy-btn:hover { background: rgba(255,255,255,0.14); }

    .players-section { display: flex; flex-direction: column; gap: 0.45rem; }
    .players-section h3 { margin: 0 0 0.15rem; font-size: 0.75rem; color: #a0a8b8; text-transform: uppercase; letter-spacing: 0.08em; }

    .player-card {
      display: flex; align-items: center; gap: 0.6rem;
      background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.06);
      border-radius: 0.75rem; padding: 0.5rem 0.75rem;
      transition: all 0.3s;
    }
    .player-card.joined { border-color: rgba(60,200,60,0.25); background: rgba(60,200,60,0.04); }
    .player-avatar {
      width: 32px; height: 32px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.1rem; flex-shrink: 0;
    }
    .white-avatar { background: linear-gradient(135deg,#f0c040,#d4880a); color: #111; }
    .black-avatar { background: linear-gradient(135deg,#4060c0,#204080); color: #fff; }
    .player-info { flex: 1; display: flex; flex-direction: column; }
    .player-name { font-weight: 700; color: #e8e8e8; font-size: 0.88rem; }
    .player-role { font-size: 0.68rem; color: #808898; }
    .status-badge {
      font-size: 0.68rem; font-weight: 700; padding: 0.15rem 0.5rem; border-radius: 1rem;
      text-transform: uppercase; letter-spacing: 0.05em;
    }
    .status-badge.ready   { background: rgba(60,200,60,0.15); color: #60e080; border: 1px solid rgba(60,200,60,0.3); }
    .status-badge.waiting { background: rgba(255,255,255,0.06); color: #808898; border: 1px solid rgba(255,255,255,0.1); }

    .rules-card {
      background: rgba(0,0,0,0.25); border: 1px solid rgba(240,192,64,0.15);
      border-radius: 0.85rem; padding: 0.75rem 0.85rem;
    }
    .rules-header { display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.15rem; }
    .mode-icon { font-size: 1.1rem; }
    .mode-title { font-weight: 800; font-size: 0.95rem; color: #f0c040; }
    .rules-subtitle { margin: 0 0 0.4rem; font-size: 0.7rem; color: #808898; text-transform: uppercase; letter-spacing: 0.05em; }
    .rules-list { margin: 0; padding-left: 1rem; display: flex; flex-direction: column; gap: 0.3rem; color: #c0c8d8; font-size: 0.78rem; line-height: 1.3; }
    .rules-list strong { color: #e8e8e8; }

    .lobby-actions { display: flex; flex-direction: column; gap: 0.6rem; align-items: center; }
    .btn-start {
      width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.4rem;
      background: linear-gradient(135deg, #f0c040, #d4880a); color: #1a1a2e;
      padding: 0.75rem 1.2rem; border-radius: 0.75rem; border: none;
      font-size: 0.95rem; font-weight: 800; cursor: pointer; transition: all 0.2s;
      font-family: inherit; box-shadow: 0 6px 20px rgba(240,192,64,0.3);
    }
    .btn-start:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 10px 25px rgba(240,192,64,0.45); }
    .btn-start:disabled { opacity: 0.4; cursor: not-allowed; box-shadow: none; }
    .btn-icon { font-size: 1.1rem; }

    .guest-waiting-banner {
      display: flex; align-items: center; gap: 0.5rem; justify-content: center;
      background: rgba(60,140,250,0.12); border: 1px solid rgba(60,140,250,0.25);
      border-radius: 0.65rem; padding: 0.6rem 0.85rem; width: 100%; box-sizing: border-box;
      color: #90c0ff; font-size: 0.8rem; font-weight: 600;
    }
    .pulse-dot { width: 7px; height: 7px; border-radius: 50%; background: #40a0f0; animation: pulse 1s infinite alternate; }
    @keyframes pulse { from{opacity:0.4;transform:scale(0.8)} to{opacity:1;transform:scale(1.2)} }

    .btn-cancel {
      background: none; border: 1px solid rgba(255,255,255,0.12); border-radius: 0.45rem;
      color: #808898; padding: 0.4rem 1rem; cursor: pointer; font-family: inherit; font-size: 0.78rem;
      transition: all 0.2s;
    }
    .btn-cancel:hover { border-color: #e05050; color: #e05050; }

    /* 3-Second Countdown Overlay */
    .countdown-overlay {
      position: fixed; inset: 0; background: rgba(10, 15, 30, 0.92);
      backdrop-filter: blur(12px); z-index: 100;
      display: flex; align-items: center; justify-content: center;
    }
    .countdown-box { text-align: center; animation: pop-in 0.3s ease-out; }
    .countdown-label { font-size: 0.9rem; font-weight: 800; color: #f0c040; letter-spacing: 0.2em; margin-bottom: 0.4rem; }
    .countdown-number {
      font-size: 6rem; font-weight: 900; color: #fff; line-height: 1;
      text-shadow: 0 0 40px rgba(240,192,64,0.8);
      animation: number-pulse 0.8s ease-in-out infinite alternate;
    }
    .countdown-sub { color: #a0a8b8; font-size: 1rem; margin-top: 0.75rem; }
    @keyframes pop-in { from{transform:scale(0.8);opacity:0} to{transform:scale(1);opacity:1} }
    @keyframes number-pulse { from{transform:scale(0.9);opacity:0.8} to{transform:scale(1.1);opacity:1} }

    @media (max-width: 480px) {
      .lobby-container { padding: 0.75rem 0.5rem; }
      .lobby-card { padding: 1rem 0.85rem; gap: 0.85rem; border-radius: 1rem; }
      .game-id { font-size: 1.5rem; letter-spacing: 0.15em; }
      .game-id-box { padding: 0.4rem 0.6rem; gap: 0.4rem; }
      .copy-btn { padding: 0.35rem 0.5rem; font-size: 0.72rem; }
      .player-card { padding: 0.45rem 0.6rem; gap: 0.45rem; }
      .player-avatar { width: 28px; height: 28px; font-size: 0.95rem; }
      .player-name { font-size: 0.82rem; }
      .player-role { font-size: 0.65rem; }
      .rules-card { padding: 0.65rem; }
      .mode-title { font-size: 0.88rem; }
      .rules-list { font-size: 0.72rem; padding-left: 0.85rem; gap: 0.25rem; }
      .btn-start { padding: 0.65rem 0.85rem; font-size: 0.88rem; }
      .countdown-number { font-size: 4.2rem; }
    }
  `]
})
export class WaitingRoomComponent implements OnInit, OnDestroy {
  state: GameState | null = null;
  copied = false;
  copiedLink = false;
  private sub?: Subscription;

  get isHost(): boolean {
    return this.state?.isHost ?? true;
  }

  get hostColor(): string {
    if (this.isHost) return this.state?.yourColor ?? 'White';
    return this.state?.yourColor === 'White' ? 'Black' : 'White';
  }

  get challengerColor(): string {
    return this.hostColor === 'White' ? 'Black' : 'White';
  }

  get hasOpponent(): boolean {
    return !!(this.isHost ? this.state?.opponentName : this.state?.yourName);
  }

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

  copyLink(): void {
    const url = `${window.location.origin}/game/${this.state?.gameId}`;
    navigator.clipboard.writeText(url).then(() => {
      this.copiedLink = true;
      setTimeout(() => this.copiedLink = false, 2000);
    });
  }

  async startMatch(): Promise<void> {
    if (!this.hasOpponent) return;
    await this.gameService.startMatch();
  }

  cancel(): void {
    this.gameService.clearSession();
    this.router.navigate(['/']);
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }
}
