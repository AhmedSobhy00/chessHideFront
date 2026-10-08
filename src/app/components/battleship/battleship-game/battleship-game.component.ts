import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { BattleshipService } from '../../../core/services/battleship.service';
import { BattleshipGameState, CellState, Coordinate } from '../../../models/battleship.model';

@Component({
  selector: 'app-battleship-game',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="game-container">
      <!-- Player Status Header -->
      <div class="battle-header" *ngIf="state">
        <div class="player-card opponent" [class.turn-active]="isOpponentTurn">
          <div class="avatar">🤖</div>
          <div class="details">
            <span class="name">{{ state.opponentName || 'Enemy Fleet' }}</span>
            <span class="role">Opponent</span>
          </div>
          <div class="turn-status" *ngIf="isOpponentTurn">
            <div class="pulse"></div> Striking…
          </div>
        </div>

        <div class="vs-badge">VS</div>

        <div class="player-card you" [class.turn-active]="isYourTurn">
          <div class="turn-status your-status" *ngIf="isYourTurn">
            <div class="pulse"></div> YOUR TURN
          </div>
          <div class="details right">
            <span class="name">{{ state.yourName }} (You)</span>
            <span class="role">Commander</span>
          </div>
          <div class="avatar">👨‍✈️</div>
        </div>
      </div>

      <!-- Turn Announcement Banner -->
      <div class="turn-banner" [class.your-turn]="isYourTurn" *ngIf="state && state.phase === 'Playing'">
        <span>{{ isYourTurn ? '🎯 YOUR TURN: Select Enemy Target on Radar' : '⏳ ENEMY TURN: Incoming Radar Strike…' }}</span>
      </div>

      <!-- Dual Grid Layout -->
      <div class="grids-container" *ngIf="state">
        
        <!-- TARGET RADAR GRID (Left/Main: Enemy ocean to hit) -->
        <div class="grid-section radar-section">
          <div class="section-title">
            <span class="icon">🎯</span>
            <span class="title">TARGET RADAR (Enemy Ocean)</span>
          </div>

          <div class="grid-wrapper">
            <div class="col-labels">
              <span *ngFor="let c of cols">{{ c }}</span>
            </div>
            <div class="grid-body">
              <div class="row-labels">
                <span *ngFor="let r of rows">{{ r }}</span>
              </div>
              <div class="board-grid radar-board">
                <div *ngFor="let r of [0,1,2,3,4,5,6,7,8,9]" class="grid-row">
                  <div
                    *ngFor="let c of [0,1,2,3,4,5,6,7,8,9]"
                    class="grid-cell radar-cell"
                    [class.cell-hit]="state.targetRadar[r][c] === 'Hit'"
                    [class.cell-miss]="state.targetRadar[r][c] === 'Miss'"
                    [class.cell-sunk]="state.targetRadar[r][c] === 'Sunk'"
                    [class.clickable]="isYourTurn && state.targetRadar[r][c] === 'Empty'"
                    (click)="fireShot(r, c)"
                  >
                    <span *ngIf="state.targetRadar[r][c] === 'Hit'" class="icon-hit">💥</span>
                    <span *ngIf="state.targetRadar[r][c] === 'Miss'" class="icon-miss">🌊</span>
                    <span *ngIf="state.targetRadar[r][c] === 'Sunk'" class="icon-sunk">🔥</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- YOUR FLEET GRID (Right: Your ocean) -->
        <div class="grid-section fleet-section">
          <div class="section-title">
            <span class="icon">🛡️</span>
            <span class="title">YOUR FLEET (Your Ocean)</span>
          </div>

          <div class="grid-wrapper">
            <div class="col-labels">
              <span *ngFor="let c of cols">{{ c }}</span>
            </div>
            <div class="grid-body">
              <div class="row-labels">
                <span *ngFor="let r of rows">{{ r }}</span>
              </div>
              <div class="board-grid fleet-board">
                <div *ngFor="let r of [0,1,2,3,4,5,6,7,8,9]" class="grid-row">
                  <div
                    *ngFor="let c of [0,1,2,3,4,5,6,7,8,9]"
                    class="grid-cell fleet-cell"
                    [class.has-ship]="state.yourGrid[r][c] === 'Ship'"
                    [class.cell-hit]="state.yourGrid[r][c] === 'Hit'"
                    [class.cell-miss]="state.yourGrid[r][c] === 'Miss'"
                    [class.cell-sunk]="state.yourGrid[r][c] === 'Sunk'"
                  >
                    <span *ngIf="state.yourGrid[r][c] === 'Ship'" class="icon-ship">🚢</span>
                    <span *ngIf="state.yourGrid[r][c] === 'Hit'" class="icon-hit">💥</span>
                    <span *ngIf="state.yourGrid[r][c] === 'Miss'" class="icon-miss">🌊</span>
                    <span *ngIf="state.yourGrid[r][c] === 'Sunk'" class="icon-sunk">🔥</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Action Buttons -->
      <div class="action-bar" *ngIf="state && state.phase === 'Playing'">
        <button class="btn-resign" (click)="showResignConfirm = true">🏳 Resign Battle</button>
      </div>

      <!-- Resign Dialog -->
      <div class="modal-overlay" *ngIf="showResignConfirm">
        <div class="modal-dialog">
          <h3>Resign Battle?</h3>
          <p>Are you sure you want to forfeit this naval battle?</p>
          <div class="dialog-actions">
            <button class="btn-cancel" (click)="showResignConfirm = false">Cancel</button>
            <button class="btn-confirm" (click)="executeResign()">Yes, Resign</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .game-container {
      display: flex; flex-direction: column; align-items: center; justify-content: space-evenly;
      padding: 0.5rem 1rem; min-height: 100dvh; box-sizing: border-box; background: #0b132b; color: #e8e8e8;
    }

    .battle-header {
      display: flex; align-items: center; justify-content: center; gap: 1rem; width: 100%; max-width: 900px;
    }
    .player-card {
      display: flex; align-items: center; gap: 0.65rem; padding: 0.5rem 0.85rem;
      background: rgba(13, 27, 62, 0.7); border: 1px solid rgba(255,255,255,0.1); border-radius: 0.85rem;
      flex: 1; max-width: 380px; transition: all 0.3s;
    }
    .player-card.turn-active {
      border-color: #00f0ff; background: rgba(0, 240, 255, 0.1); box-shadow: 0 0 15px rgba(0, 240, 255, 0.25);
    }
    .player-card .avatar { font-size: 1.5rem; }
    .player-card .details { flex: 1; display: flex; flex-direction: column; }
    .player-card .details.right { align-items: flex-end; }
    .player-card .name { font-weight: 800; font-size: 0.92rem; color: #fff; }
    .player-card .role { font-size: 0.7rem; color: #8a99ad; text-transform: uppercase; }
    .vs-badge { font-weight: 900; font-size: 0.85rem; color: #00f0ff; opacity: 0.7; }

    .turn-status {
      display: flex; align-items: center; gap: 0.35rem; font-size: 0.72rem; font-weight: 800;
      color: #ffaa00; background: rgba(255,170,0,0.15); padding: 0.2rem 0.5rem; border-radius: 1rem;
    }
    .turn-status.your-status { color: #00f0ff; background: rgba(0,240,255,0.15); }
    .turn-status .pulse { width: 6px; height: 6px; border-radius: 50%; background: currentColor; animation: pulse 1s infinite alternate; }

    .turn-banner {
      background: rgba(13, 27, 62, 0.9); border: 1px solid rgba(255,255,255,0.1);
      padding: 0.4rem 1.2rem; border-radius: 2rem; font-size: 0.82rem; font-weight: 700; color: #8a99ad;
      margin: 0.25rem 0;
    }
    .turn-banner.your-turn { border-color: #00f0ff; color: #00f0ff; box-shadow: 0 0 12px rgba(0,240,255,0.2); }

    .grids-container {
      display: flex; gap: 2rem; align-items: center; justify-content: center; flex-wrap: wrap;
      max-width: 950px; width: 100%;
    }

    .grid-section { display: flex; flex-direction: column; align-items: center; gap: 0.3rem; }
    .section-title { display: flex; align-items: center; gap: 0.4rem; font-size: 0.78rem; font-weight: 800; color: #00f0ff; letter-spacing: 0.08em; }

    .grid-wrapper { display: flex; flex-direction: column; align-items: flex-end; }
    .col-labels { display: flex; margin-left: 22px; }
    .col-labels span { width: 32px; text-align: center; font-size: 0.72rem; font-weight: 700; color: #708098; }
    .grid-body { display: flex; }
    .row-labels { display: flex; flex-direction: column; justify-content: space-around; width: 22px; text-align: right; padding-right: 5px; }
    .row-labels span { font-size: 0.72rem; font-weight: 700; color: #708098; height: 32px; line-height: 32px; }

    .board-grid { border: 2px solid rgba(0,240,255,0.3); border-radius: 0.5rem; overflow: hidden; background: rgba(5,12,30,0.95); }
    .grid-row { display: flex; }
    .grid-cell {
      width: 32px; height: 32px; border: 1px solid rgba(0,240,255,0.08);
      display: flex; align-items: center; justify-content: center; position: relative; font-size: 0.95rem;
    }
    .radar-cell.clickable { cursor: crosshair; }
    .radar-cell.clickable:hover { background: rgba(0,240,255,0.25); }

    .fleet-cell.has-ship { background: rgba(0,240,255,0.2); }
    .grid-cell.cell-hit { background: rgba(255,60,60,0.35) !important; border-color: #ff3c3c !important; }
    .grid-cell.cell-miss { background: rgba(60,140,250,0.2) !important; }
    .grid-cell.cell-sunk { background: rgba(220,20,20,0.6) !important; border-color: #ff1e1e !important; }

    .action-bar { margin-top: 0.5rem; }
    .btn-resign {
      background: rgba(220,60,60,0.15); color: #ff7070; border: 1px solid rgba(220,60,60,0.3);
      padding: 0.45rem 1.2rem; border-radius: 0.65rem; font-size: 0.82rem; font-weight: 700;
      cursor: pointer; font-family: inherit; transition: all 0.2s;
    }
    .btn-resign:hover { background: rgba(220,60,60,0.28); }

    .modal-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center; z-index: 200; padding: 1.5rem;
    }
    .modal-dialog {
      background: #0d1b3e; border: 1px solid rgba(255,255,255,0.15); border-radius: 1.25rem;
      padding: 1.75rem; max-width: 360px; width: 100%; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.7);
    }
    .modal-dialog h3 { margin: 0 0 0.5rem; color: #fff; font-size: 1.2rem; }
    .modal-dialog p { color: #8a99ad; font-size: 0.9rem; margin: 0 0 1.25rem; }
    .dialog-actions { display: flex; gap: 0.75rem; justify-content: center; }
    .btn-cancel, .btn-confirm {
      padding: 0.6rem 1.2rem; border-radius: 0.65rem; border: none; font-size: 0.88rem; font-weight: 700; cursor: pointer; font-family: inherit;
    }
    .btn-cancel { background: rgba(255,255,255,0.1); color: #e8e8e8; }
    .btn-confirm { background: #ff4444; color: #fff; }
  `]
})
export class BattleshipGameComponent implements OnInit, OnDestroy {
  state: BattleshipGameState | null = null;
  showResignConfirm = false;

  cols = ['A','B','C','D','E','F','G','H','I','J'];
  rows = ['1','2','3','4','5','6','7','8','9','10'];

  private sub?: Subscription;

  constructor(private battleship: BattleshipService) {}

  ngOnInit(): void {
    this.sub = this.battleship.state$.subscribe(s => { this.state = s; });
  }

  get isYourTurn(): boolean {
    return !!(this.state && this.state.currentTurnPlayerId === this.state.playerId);
  }

  get isOpponentTurn(): boolean {
    return !!(this.state && this.state.currentTurnPlayerId && this.state.currentTurnPlayerId !== this.state.playerId);
  }

  async fireShot(row: number, col: number): Promise<void> {
    if (!this.isYourTurn || !this.state) return;
    if (this.state.targetRadar[row][col] !== 'Empty') return;

    await this.battleship.fireShot(row, col);
  }

  async executeResign(): Promise<void> {
    this.showResignConfirm = false;
    await this.battleship.resign();
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }
}
