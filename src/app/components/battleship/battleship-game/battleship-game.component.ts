import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { BattleshipService } from '../../../core/services/battleship.service';
import { BattleshipGameState, CellState, Coordinate, ShipType, getShipRelativeCells } from '../../../models/battleship.model';

interface FleetStatusItem {
  type: ShipType;
  name: string;
  totalCells: number;
  remainingCells: number;
  isSunk: boolean;
  shapeBlocks: number[]; // e.g. [1, 1, 1, 1, 1]
}

@Component({
  selector: 'app-battleship-game',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="game-container" (contextmenu)="$event.preventDefault()">
      <!-- Top Tactical HUD (Matching Sea Battle UI) -->
      <div class="tactical-hud" *ngIf="state">
        <div class="hud-left">
          <div class="hud-title">FLEET STATUS</div>
          <div class="fleet-diagrams">
            <div
              *ngFor="let item of myFleetStatus"
              class="ship-status-pill"
              [class.sunk]="item.isSunk"
              [title]="item.name + ' (' + item.remainingCells + '/' + item.totalCells + ')'"
            >
              <div class="block-bar">
                <span
                  *ngFor="let b of getArray(item.totalCells); let idx = index"
                  class="block-cell"
                  [class.damaged]="idx >= item.remainingCells"
                ></span>
              </div>
            </div>
          </div>
        </div>

        <div class="hud-divider"></div>

        <div class="hud-right">
          <div class="turn-counter-label">TURN</div>
          <div class="turn-number">{{ turnCount }}</div>
        </div>
      </div>

      <!-- Ocean View Mode Switcher Pills -->
      <div class="ocean-switcher" *ngIf="state">
        <button
          type="button"
          class="switch-tab"
          [class.active]="activeView === 'radar'"
          (click)="activeView = 'radar'"
        >
          <span class="tab-icon">🎯</span>
          <span class="tab-label">Enemy Ocean (Radar)</span>
          <span class="pulse-dot" *ngIf="isYourTurn"></span>
        </button>

        <button
          type="button"
          class="switch-tab"
          [class.active]="activeView === 'fleet'"
          (click)="activeView = 'fleet'"
        >
          <span class="tab-icon">🛡️</span>
          <span class="tab-label">My Fleet (Ocean)</span>
          <span class="pulse-dot enemy" *ngIf="isOpponentTurn"></span>
        </button>
      </div>

      <!-- Status Banner -->
      <div class="turn-banner" [class.your-turn]="isYourTurn" *ngIf="state && state.phase === 'Playing'">
        <ng-container *ngIf="activeView === 'radar'">
          <span *ngIf="isYourTurn">🎯 YOUR TURN: Tap enemy coordinates to launch strike!</span>
          <span *ngIf="isOpponentTurn" class="enemy-text">⏳ OPPONENT TURN: Enemy admiral is aiming…</span>
        </ng-container>

        <ng-container *ngIf="activeView === 'fleet'">
          <span *ngIf="isOpponentTurn" class="enemy-text">⚠️ INCOMING STRIKE: Defending your fleet!</span>
          <span *ngIf="isYourTurn">🛡️ YOUR FLEET: All systems operational. Switch to Radar to strike.</span>
        </ng-container>
      </div>

      <!-- Single Main Ocean Board (10x10 Grid) -->
      <div class="ocean-wrapper" *ngIf="state">
        
        <!-- TARGET RADAR VIEW (Enemy Ocean) -->
        <div class="ocean-grid-container" *ngIf="activeView === 'radar'">
          <div class="col-labels">
            <span *ngFor="let c of cols">{{ c }}</span>
          </div>
          <div class="grid-body">
            <div class="row-labels">
              <span *ngFor="let r of rows">{{ r }}</span>
            </div>
            <div class="board-grid radar-grid">
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
                  <!-- Crisp Markers -->
                  <span *ngIf="state.targetRadar[r][c] === 'Miss'" class="marker-miss">✕</span>
                  <span *ngIf="state.targetRadar[r][c] === 'Hit'" class="marker-hit">🔴</span>
                  <span *ngIf="state.targetRadar[r][c] === 'Sunk'" class="marker-sunk">✕</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- MY FLEET VIEW (Your Ocean - Visible Fleet) -->
        <div class="ocean-grid-container" *ngIf="activeView === 'fleet'">
          <div class="col-labels">
            <span *ngFor="let c of cols">{{ c }}</span>
          </div>
          <div class="grid-body">
            <div class="row-labels">
              <span *ngFor="let r of rows">{{ r }}</span>
            </div>
            <div class="board-grid fleet-grid">
              <div *ngFor="let r of [0,1,2,3,4,5,6,7,8,9]" class="grid-row">
                <div
                  *ngFor="let c of [0,1,2,3,4,5,6,7,8,9]"
                  class="grid-cell fleet-cell"
                  [class.has-ship]="state.yourGrid[r][c] === 'Ship'"
                  [class.cell-hit]="state.yourGrid[r][c] === 'Hit'"
                  [class.cell-miss]="state.yourGrid[r][c] === 'Miss'"
                  [class.cell-sunk]="state.yourGrid[r][c] === 'Sunk'"
                >
                  <!-- Visible Ship Icon & Artwork -->
                  <span *ngIf="state.yourGrid[r][c] === 'Ship'" class="ship-graphic">🚢</span>
                  <span *ngIf="state.yourGrid[r][c] === 'Miss'" class="marker-miss">✕</span>
                  <span *ngIf="state.yourGrid[r][c] === 'Hit'" class="marker-hit">🔴</span>
                  <span *ngIf="state.yourGrid[r][c] === 'Sunk'" class="marker-sunk">✕</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Action Footer -->
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
      display: flex; flex-direction: column; align-items: center; justify-content: space-between;
      padding: 0.75rem 0.5rem; min-height: 100dvh; box-sizing: border-box; background: #0b132b; color: #e8e8e8;
      user-select: none;
    }

    /* Tactical HUD */
    .tactical-hud {
      display: flex; align-items: center; justify-content: space-between;
      background: rgba(13, 27, 62, 0.85); border: 1.5px solid rgba(0, 240, 255, 0.35);
      border-radius: 1.25rem; padding: 0.6rem 1.2rem; width: 100%; max-width: 440px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.6); margin-bottom: 0.4rem;
    }
    .hud-left { display: flex; flex-direction: column; gap: 0.2rem; }
    .hud-title { font-size: 0.65rem; font-weight: 900; color: #00f0ff; letter-spacing: 0.12em; }
    .fleet-diagrams { display: flex; gap: 0.4rem; align-items: center; }
    .ship-status-pill { display: flex; flex-direction: column; opacity: 1; transition: opacity 0.3s; }
    .ship-status-pill.sunk { opacity: 0.35; filter: grayscale(1); }
    .block-bar { display: flex; gap: 2px; }
    .block-cell {
      width: 7px; height: 14px; background: #ff9900; border-radius: 2px;
      box-shadow: 0 0 4px rgba(255,153,0,0.5);
    }
    .block-cell.damaged { background: #ff3333; box-shadow: 0 0 4px rgba(255,51,51,0.5); }

    .hud-divider { width: 1px; height: 28px; background: rgba(0, 240, 255, 0.25); }

    .hud-right { text-align: center; }
    .turn-counter-label { font-size: 0.62rem; font-weight: 800; color: #8a99ad; letter-spacing: 0.1em; }
    .turn-number { font-size: 1.2rem; font-weight: 900; color: #ff9900; line-height: 1; }

    /* Ocean Switcher Pills */
    .ocean-switcher {
      display: flex; gap: 0.5rem; background: rgba(0,0,0,0.4); padding: 4px;
      border-radius: 9999px; border: 1px solid rgba(0,240,255,0.2); margin-bottom: 0.35rem;
    }
    .switch-tab {
      display: flex; align-items: center; gap: 0.4rem; padding: 0.4rem 1rem;
      border-radius: 9999px; border: none; background: transparent; color: #8a99ad;
      font-weight: 800; font-size: 0.8rem; cursor: pointer; transition: all 0.2s; font-family: inherit;
    }
    .switch-tab:hover:not(.active) { color: #ffffff; background: rgba(255,255,255,0.06); }
    .switch-tab.active { background: #00f0ff; color: #0b132b; box-shadow: 0 0 12px rgba(0,240,255,0.4); }
    .tab-icon { font-size: 0.95rem; }

    .pulse-dot { width: 7px; height: 7px; border-radius: 50%; background: #0b132b; animation: pulse 1s infinite alternate; }
    .pulse-dot.enemy { background: #ffaa00; }
    @keyframes pulse { from{opacity:0.4;transform:scale(0.8)} to{opacity:1;transform:scale(1.3)} }

    /* Turn Banner */
    .turn-banner {
      background: rgba(13, 27, 62, 0.85); border: 1px solid rgba(255,255,255,0.1);
      padding: 0.4rem 1rem; border-radius: 1.5rem; font-size: 0.8rem; font-weight: 800; color: #8a99ad;
      margin-bottom: 0.5rem; text-align: center; max-width: 440px; width: 100%; box-sizing: border-box;
    }
    .turn-banner.your-turn { border-color: #00f0ff; color: #00f0ff; box-shadow: 0 0 12px rgba(0,240,255,0.2); }
    .turn-banner .enemy-text { color: #ffaa00; }

    /* Ocean Grid Container */
    .ocean-wrapper { display: flex; justify-content: center; width: 100%; max-width: 440px; }
    .ocean-grid-container { display: flex; flex-direction: column; align-items: flex-end; }
    .col-labels { display: flex; margin-left: 26px; }
    .col-labels span { width: 38px; text-align: center; font-size: 0.78rem; font-weight: 800; color: #708098; }
    .grid-body { display: flex; }
    .row-labels { display: flex; flex-direction: column; justify-content: space-around; width: 26px; text-align: right; padding-right: 6px; }
    .row-labels span { font-size: 0.78rem; font-weight: 800; color: #708098; height: 38px; line-height: 38px; }

    .board-grid {
      border: 2px solid rgba(0,240,255,0.35); border-radius: 0.65rem; overflow: hidden;
      background: radial-gradient(circle at center, #0e2246 0%, #050c1e 100%);
      box-shadow: 0 15px 40px rgba(0,0,0,0.6);
    }
    .grid-row { display: flex; }
    .grid-cell {
      width: 38px; height: 38px; border: 1px solid rgba(0,240,255,0.12);
      display: flex; align-items: center; justify-content: center; position: relative;
    }
    .radar-cell.clickable { cursor: crosshair; }
    .radar-cell.clickable:hover { background: rgba(0,240,255,0.25); border-color: #00f0ff; }

    .fleet-cell.has-ship { background: rgba(0,240,255,0.22); border-color: rgba(0,240,255,0.45); }
    .ship-graphic { font-size: 1.25rem; line-height: 1; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6)); }

    /* Crisp Hit & Miss Markers (Matching screenshot requirement: X and red dot) */
    .marker-miss {
      font-size: 1.35rem; font-weight: 900; color: rgba(255, 255, 255, 0.7);
      text-shadow: 0 0 6px rgba(255,255,255,0.5); font-family: monospace, sans-serif;
    }
    .marker-hit {
      font-size: 1.1rem; filter: drop-shadow(0 0 8px #ff0000); animation: pulseHit 0.8s infinite alternate;
    }
    .marker-sunk {
      font-size: 1.4rem; font-weight: 900; color: #ff3333;
      text-shadow: 0 0 8px #ff0000; font-family: monospace, sans-serif;
    }
    @keyframes pulseHit { from{transform:scale(0.9)} to{transform:scale(1.25)} }

    .action-bar { margin-top: 0.6rem; }
    .btn-resign {
      background: rgba(220,60,60,0.15); color: #ff7070; border: 1px solid rgba(220,60,60,0.3);
      padding: 0.45rem 1.2rem; border-radius: 0.65rem; font-size: 0.82rem; font-weight: 800;
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
      padding: 0.6rem 1.2rem; border-radius: 0.65rem; border: none; font-size: 0.88rem; font-weight: 800; cursor: pointer; font-family: inherit;
    }
    .btn-cancel { background: rgba(255,255,255,0.1); color: #e8e8e8; }
    .btn-confirm { background: #ff4444; color: #fff; }
  `]
})
export class BattleshipGameComponent implements OnInit, OnDestroy {
  state: BattleshipGameState | null = null;
  activeView: 'radar' | 'fleet' = 'radar';
  showResignConfirm = false;
  turnCount = 1;

  cols = ['A','B','C','D','E','F','G','H','I','J'];
  rows = ['1','2','3','4','5','6','7','8','9','10'];

  private sub?: Subscription;

  constructor(private battleship: BattleshipService) {}

  ngOnInit(): void {
    this.sub = this.battleship.state$.subscribe(s => {
      const prevTurn = this.state?.currentTurnPlayerId;
      this.state = s;

      if (s && s.currentTurnPlayerId && prevTurn && s.currentTurnPlayerId !== prevTurn) {
        this.turnCount++;
        // Auto switch active ocean tab based on turn
        if (this.isYourTurn) this.activeView = 'radar';
        else if (this.isOpponentTurn) this.activeView = 'fleet';
      } else if (s && !prevTurn) {
        this.activeView = this.isYourTurn ? 'radar' : 'fleet';
      }
    });
  }

  get isYourTurn(): boolean {
    return !!(this.state && this.state.currentTurnPlayerId === this.state.playerId);
  }

  get isOpponentTurn(): boolean {
    return !!(this.state && this.state.currentTurnPlayerId && this.state.currentTurnPlayerId !== this.state.playerId);
  }

  get myFleetStatus(): FleetStatusItem[] {
    if (!this.state || !this.state.yourShips) {
      return [
        { type: 'Carrier', name: 'Carrier', totalCells: 5, remainingCells: 5, isSunk: false, shapeBlocks: [1,1,1,1,1] },
        { type: 'Battleship', name: 'Battleship', totalCells: 4, remainingCells: 4, isSunk: false, shapeBlocks: [1,1,1,1] },
        { type: 'Cruiser', name: 'Cruiser', totalCells: 4, remainingCells: 4, isSunk: false, shapeBlocks: [1,1,1,1] },
        { type: 'Submarine', name: 'Submarine', totalCells: 3, remainingCells: 3, isSunk: false, shapeBlocks: [1,1,1] },
        { type: 'Destroyer', name: 'Destroyer', totalCells: 2, remainingCells: 2, isSunk: false, shapeBlocks: [1,1] }
      ];
    }

    return this.state.yourShips.map(s => {
      const total = s.occupiedCells.length > 0 ? s.occupiedCells.length : getShipRelativeCells(s.type, s.isVertical).length;
      const hits = s.hits || 0;
      const rem = Math.max(0, total - hits);
      return {
        type: s.type,
        name: s.type,
        totalCells: total,
        remainingCells: rem,
        isSunk: s.isSunk || rem === 0,
        shapeBlocks: Array(total).fill(1)
      };
    });
  }

  getArray(count: number): number[] {
    return Array(count).fill(0);
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

