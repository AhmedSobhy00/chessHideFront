import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
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

      <!-- Battleship Route / Phase Views -->
      <ng-container *ngIf="state">
        <!-- Lobby / Waiting -->
        <app-battleship-lobby *ngIf="state.phase === 'WaitingForPlayers' && !state.gameId"></app-battleship-lobby>

        <!-- Waiting for 2nd player -->
        <div class="waiting-room-overlay" *ngIf="state.phase === 'WaitingForPlayers' && state.gameId">
          <div class="waiting-card">
            <div class="badge">BATTLE ROOM</div>
            <h2>Room Code: {{ state.gameId }}</h2>
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
      padding: 2.25rem 2rem; max-width: 400px; width: 100%; text-align: center; color: #e8e8e8;
      box-shadow: 0 20px 60px rgba(0,0,0,0.7);
    }
    .waiting-card .badge { display: inline-block; font-size: 0.7rem; font-weight: 800; color: #00f0ff; letter-spacing: 0.15em; margin-bottom: 0.5rem; }
    .waiting-card h2 { margin: 0 0 0.5rem; font-size: 1.4rem; color: #fff; }
    .waiting-card p { color: #8a99ad; font-size: 0.9rem; margin: 0 0 1.5rem; }
    .btn-cancel {
      background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15);
      color: #e8e8e8; padding: 0.6rem 1.2rem; border-radius: 0.65rem; font-size: 0.85rem; font-weight: 700; cursor: pointer;
    }

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

  leave(): void {
    this.battleship.clearSession();
    this.router.navigate(['/battleship']);
  }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }
}
