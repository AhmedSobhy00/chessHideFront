import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { GameService } from '../../core/services/game.service';
import { GameState } from '../../models/game.model';
import { LobbyComponent } from '../lobby/lobby.component';
import { WaitingRoomComponent } from '../waiting-room/waiting-room.component';
import { SetupPhaseComponent } from '../setup-phase/setup-phase.component';
import { GamePhaseComponent } from '../game-phase/game-phase.component';
import { GameResultComponent } from '../game-result/game-result.component';

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

      <!-- Phase routing -->
      <ng-container *ngIf="state">
        <!-- No game yet or lobby -->
        <app-lobby *ngIf="state.phase === 'WaitingForPlayers' && !state.gameId"></app-lobby>

        <!-- Waiting for second player -->
        <app-waiting-room *ngIf="state.phase === 'WaitingForPlayers' && state.gameId"></app-waiting-room>

        <!-- Hidden formation setup -->
        <app-setup-phase *ngIf="state.phase === 'Setup'"></app-setup-phase>

        <!-- Reveal animation + playing -->
        <div *ngIf="state.phase === 'Playing' || state.phase === 'Reveal'">
          <app-game-phase></app-game-phase>
          <!-- Result overlay rendered on top when Finished -->
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
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .shell { min-height: 100vh; position: relative; }
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
    .abandoned-card p { color: #a0a8b8; margin: 0; }
  `]
})
export class GameShellComponent implements OnInit, OnDestroy {
  state: GameState | null = null;
  errorMsg = '';
  private subs: Subscription[] = [];

  constructor(
    private gameService: GameService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.gameService.state$.subscribe(s => { this.state = s; })
    );
    this.subs.push(
      this.gameService.error$.subscribe(msg => {
        this.errorMsg = msg;
        setTimeout(() => this.errorMsg = '', 4000);
      })
    );

    // Attempt reconnection if session stored and we're on a game URL
    const gameId = this.route.snapshot.paramMap.get('id');
    const session = this.gameService.loadSession();
    if (gameId && session && session.gameId === gameId) {
      this.gameService.reconnect(session.gameId, session.playerId).catch(() => {});
    }
  }

  dismissError(): void { this.errorMsg = ''; }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }
}
