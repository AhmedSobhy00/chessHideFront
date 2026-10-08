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
  icon: string;
}

@Component({
  selector: 'app-battleship-game',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="game-container" (contextmenu)="$event.preventDefault()">
      <!-- Top Dual Tactical HUD (Your Fleet & Enemy Fleet Status) -->
      <div class="tactical-hud" *ngIf="state">
        <!-- MY FLEET -->
        <div class="hud-box">
          <div class="hud-label">🛡️ MY FLEET</div>
          <div class="fleet-diagrams">
            <div
              *ngFor="let item of myFleetStatus"
              class="ship-status-pill"
              [class.sunk]="item.isSunk"
              [title]="item.name + ' (' + item.remainingCells + '/' + item.totalCells + ')'"
            >
              <div class="ship-icon-mini">{{ item.icon }}</div>
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

        <!-- ENEMY FLEET STATUS -->
        <div class="hud-box">
          <div class="hud-label enemy-label">🎯 ENEMY FLEET</div>
          <div class="fleet-diagrams">
            <div
              *ngFor="let item of enemyFleetStatus"
              class="ship-status-pill enemy-pill"
              [class.sunk]="item.isSunk"
              [title]="item.name + ' (' + (item.isSunk ? 'Sunk' : item.totalCells + ' cells') + ')'"
            >
              <div class="ship-icon-mini">{{ item.icon }}</div>
              <div class="block-bar">
                <span
                  *ngFor="let b of getArray(item.totalCells)"
                  class="block-cell enemy-block"
                  [class.sunk-block]="item.isSunk"
                ></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Ocean View Mode Switcher Pills -->
      <div class="ocean-switcher" *ngIf="state">
        <button
          type="button"
          class="switch-tab"
          [class.active]="activeView === 'radar'"
          (click)="switchView('radar')"
        >
          <span class="tab-icon">🎯</span>
          <span class="tab-label">Enemy Ocean (Radar)</span>
          <span class="pulse-dot" *ngIf="isYourTurn"></span>
        </button>

        <button
          type="button"
          class="switch-tab"
          [class.active]="activeView === 'fleet'"
          (click)="switchView('fleet')"
        >
          <span class="tab-icon">🛡️</span>
          <span class="tab-label">My Fleet (Ocean)</span>
          <span class="pulse-dot enemy" *ngIf="isOpponentTurn"></span>
        </button>
      </div>

      <!-- Turn & Shot Banner -->
      <div class="turn-banner" [class.your-turn]="isYourTurn" *ngIf="state && state.phase === 'Playing'">
        <div class="banner-main">
          <ng-container *ngIf="shotFeedback; else defaultBanner">
            <span class="shot-feedback-text">{{ shotFeedback }}</span>
          </ng-container>

          <ng-template #defaultBanner>
            <ng-container *ngIf="activeView === 'radar'">
              <span *ngIf="isYourTurn">🎯 YOUR TURN: Tap enemy coordinates to launch strike!</span>
              <span *ngIf="isOpponentTurn" class="enemy-text">⏳ OPPONENT TURN: Enemy admiral is aiming…</span>
            </ng-container>

            <ng-container *ngIf="activeView === 'fleet'">
              <span *ngIf="isOpponentTurn" class="enemy-text">⚠️ INCOMING STRIKE: Defending your fleet!</span>
              <span *ngIf="isYourTurn">🛡️ YOUR FLEET: All systems operational. Switch to Radar to strike.</span>
            </ng-container>
          </ng-template>
        </div>
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
                  <!-- Crisp Hit / Miss Markers -->
                  <span *ngIf="state.targetRadar[r][c] === 'Miss'" class="marker-miss">✕</span>
                  <span *ngIf="state.targetRadar[r][c] === 'Hit'" class="marker-hit">🔴</span>
                  <span *ngIf="state.targetRadar[r][c] === 'Sunk'" class="marker-sunk">✕</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- MY FLEET VIEW (Your Ocean - Fully Visible Fleet Ships) -->
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
                  [class.has-ship]="hasYourShipAt(r, c)"
                  [class.cell-hit]="state.yourGrid[r][c] === 'Hit'"
                  [class.cell-miss]="state.yourGrid[r][c] === 'Miss'"
                  [class.cell-sunk]="state.yourGrid[r][c] === 'Sunk'"
                >
                  <!-- Visible Ship Icon & Artwork -->
                  <span *ngIf="hasYourShipAt(r, c)" class="ship-graphic">{{ getShipIconAt(r, c) }}</span>
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
      padding: 0.6rem 0.5rem; min-height: 100dvh; box-sizing: border-box; background: #0b132b; color: #e8e8e8;
      user-select: none;
    }

    /* Tactical Dual HUD */
    .tactical-hud {
      display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;
      background: rgba(13, 27, 62, 0.85); border: 1.5px solid rgba(0, 240, 255, 0.35);
      border-radius: 1.25rem; padding: 0.5rem 0.85rem; width: 100%; max-width: 440px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.6); margin-bottom: 0.3rem; box-sizing: border-box;
    }
    .hud-box { display: flex; flex-direction: column; gap: 0.2rem; flex: 1; }
    .hud-label { font-size: 0.65rem; font-weight: 900; color: #00f0ff; letter-spacing: 0.1em; }
    .hud-label.enemy-label { color: #ff9900; }
    
    .fleet-diagrams { display: flex; gap: 0.35rem; align-items: center; flex-wrap: wrap; }
    .ship-status-pill { display: flex; align-items: center; gap: 2px; opacity: 1; transition: opacity 0.3s; }
    .ship-status-pill.sunk { opacity: 0.35; filter: grayscale(1); }
    .ship-icon-mini { font-size: 0.8rem; line-height: 1; }

    .block-bar { display: flex; gap: 2px; }
    .block-cell {
      width: 6px; height: 12px; background: #ff9900; border-radius: 2px;
      box-shadow: 0 0 4px rgba(255,153,0,0.5);
    }
    .block-cell.damaged { background: #ff3333; box-shadow: 0 0 4px rgba(255,51,51,0.5); }
    .enemy-block { background: #00f0ff; box-shadow: 0 0 4px rgba(0,240,255,0.5); }
    .enemy-block.sunk-block { background: #ff3333; box-shadow: 0 0 4px rgba(255,51,51,0.5); }

    .hud-divider { width: 1px; height: 32px; background: rgba(0, 240, 255, 0.25); }

    /* Ocean Switcher Pills */
    .ocean-switcher {
      display: flex; gap: 0.4rem; background: rgba(0,0,0,0.4); padding: 4px;
      border-radius: 9999px; border: 1px solid rgba(0,240,255,0.2); margin-bottom: 0.35rem;
    }
    .switch-tab {
      display: flex; align-items: center; gap: 0.35rem; padding: 0.38rem 0.85rem;
      border-radius: 9999px; border: none; background: transparent; color: #8a99ad;
      font-weight: 800; font-size: 0.78rem; cursor: pointer; transition: all 0.2s; font-family: inherit;
    }
    .switch-tab:hover:not(.active) { color: #ffffff; background: rgba(255,255,255,0.06); }
    .switch-tab.active { background: #00f0ff; color: #0b132b; box-shadow: 0 0 12px rgba(0,240,255,0.4); }
    .tab-icon { font-size: 0.9rem; }

    .pulse-dot { width: 7px; height: 7px; border-radius: 50%; background: #0b132b; animation: pulse 1s infinite alternate; }
    .pulse-dot.enemy { background: #ffaa00; }
    @keyframes pulse { from{opacity:0.4;transform:scale(0.8)} to{opacity:1;transform:scale(1.3)} }

    /* Turn Banner */
    .turn-banner {
      background: rgba(13, 27, 62, 0.85); border: 1px solid rgba(255,255,255,0.1);
      padding: 0.4rem 0.85rem; border-radius: 1.5rem; font-size: 0.78rem; font-weight: 800; color: #8a99ad;
      margin-bottom: 0.4rem; text-align: center; max-width: 440px; width: 100%; box-sizing: border-box;
      min-height: 34px; display: flex; align-items: center; justify-content: center;
    }
    .turn-banner.your-turn { border-color: #00f0ff; color: #00f0ff; box-shadow: 0 0 12px rgba(0,240,255,0.2); }
    .turn-banner .enemy-text { color: #ffaa00; }
    .shot-feedback-text { color: #ffe600; text-shadow: 0 0 8px rgba(255,230,0,0.6); }

    /* Ocean Grid Container (Mobile responsive scaling) */
    .ocean-wrapper { display: flex; justify-content: center; width: 100%; max-width: 440px; }
    .ocean-grid-container { display: flex; flex-direction: column; align-items: flex-end; }
    .col-labels { display: flex; margin-left: 22px; }
    .col-labels span { width: clamp(26px, 7.8dvw, 36px); text-align: center; font-size: 0.72rem; font-weight: 800; color: #708098; }
    .grid-body { display: flex; }
    .row-labels { display: flex; flex-direction: column; justify-content: space-around; width: 22px; text-align: right; padding-right: 4px; }
    .row-labels span { font-size: 0.72rem; font-weight: 800; color: #708098; height: clamp(26px, 7.8dvw, 36px); line-height: clamp(26px, 7.8dvw, 36px); }

    .board-grid {
      border: 2px solid rgba(0,240,255,0.35); border-radius: 0.65rem; overflow: hidden;
      background: radial-gradient(circle at center, #0e2246 0%, #050c1e 100%);
      box-shadow: 0 15px 40px rgba(0,0,0,0.6);
    }
    .grid-row { display: flex; }
    .grid-cell {
      width: clamp(26px, 7.8dvw, 36px); height: clamp(26px, 7.8dvw, 36px);
      border: 1px solid rgba(0,240,255,0.12);
      display: flex; align-items: center; justify-content: center; position: relative;
    }
    .radar-cell.clickable { cursor: crosshair; }
    .radar-cell.clickable:hover { background: rgba(0,240,255,0.25); border-color: #00f0ff; }

    .fleet-cell.has-ship { background: rgba(0,240,255,0.25); border-color: rgba(0,240,255,0.5); }
    .ship-graphic { font-size: 1.1rem; line-height: 1; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6)); position: absolute; z-index: 1; }

    /* Crisp Hit & Miss Markers */
    .marker-miss {
      font-size: 1.3rem; font-weight: 900; color: rgba(255, 255, 255, 0.75);
      text-shadow: 0 0 6px rgba(255,255,255,0.5); font-family: monospace, sans-serif; position: relative; z-index: 2;
    }
    .marker-hit {
      font-size: 1.1rem; filter: drop-shadow(0 0 8px #ff0000); animation: pulseHit 0.8s infinite alternate; position: relative; z-index: 2;
    }
    .marker-sunk {
      font-size: 1.35rem; font-weight: 900; color: #ff3333;
      text-shadow: 0 0 8px #ff0000; font-family: monospace, sans-serif; position: relative; z-index: 2;
    }
    @keyframes pulseHit { from{transform:scale(0.9)} to{transform:scale(1.25)} }

    .action-bar { margin-top: 0.5rem; }
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
  shotFeedback: string | null = null;

  cols = ['A','B','C','D','E','F','G','H','I','J'];
  rows = ['1','2','3','4','5','6','7','8','9','10'];

  sunkEnemyShipTypes = new Set<ShipType>();

  private sub?: Subscription;
  private switchTimer: any = null;

  constructor(private battleship: BattleshipService) {}

  ngOnInit(): void {
    this.sub = this.battleship.state$.subscribe(s => {
      const prevTurn = this.state?.currentTurnPlayerId;
      this.state = s;

      if (s?.lastShotDetails) {
        const d = s.lastShotDetails;
        if (d.isSunk && d.sunkShipType) {
          this.sunkEnemyShipTypes.add(d.sunkShipType as ShipType);
        }
      }

      if (s && s.phase === 'Playing' && s.currentTurnPlayerId && prevTurn && s.currentTurnPlayerId !== prevTurn) {
        // Shot happened and turn changed! Give 1.4s delay so user sees outcome before view tab flips
        const isMyTurnNow = s.currentTurnPlayerId === s.playerId;
        this.shotFeedback = isMyTurnNow ? '🌊 OPPONENT MISSED! Your turn to strike!' : '🎯 STRIKE MISSED! Opponent turn…';

        if (this.switchTimer) clearTimeout(this.switchTimer);
        this.switchTimer = setTimeout(() => {
          this.activeView = isMyTurnNow ? 'radar' : 'fleet';
          this.shotFeedback = null;
        }, 1400);
      } else if (s && !prevTurn && s.phase === 'Playing') {
        this.activeView = this.isYourTurn ? 'radar' : 'fleet';
      }
    });
  }

  switchView(view: 'radar' | 'fleet'): void {
    if (this.switchTimer) clearTimeout(this.switchTimer);
    this.shotFeedback = null;
    this.activeView = view;
  }

  get isYourTurn(): boolean {
    return !!(this.state && this.state.currentTurnPlayerId === this.state.playerId);
  }

  get isOpponentTurn(): boolean {
    return !!(this.state && this.state.currentTurnPlayerId && this.state.currentTurnPlayerId !== this.state.playerId);
  }

  get myFleetStatus(): FleetStatusItem[] {
    const defaultShips: ShipType[] = ['Carrier', 'Battleship', 'Cruiser', 'Submarine', 'Destroyer'];
    if (!this.state || !this.state.yourShips || this.state.yourShips.length === 0) {
      return defaultShips.map(t => ({
        type: t, name: t,
        totalCells: getShipRelativeCells(t, false).length,
        remainingCells: getShipRelativeCells(t, false).length,
        isSunk: false,
        icon: this.getShipIconByType(t)
      }));
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
        icon: this.getShipIconByType(s.type)
      };
    });
  }

  get enemyFleetStatus(): FleetStatusItem[] {
    const ships: ShipType[] = ['Carrier', 'Battleship', 'Cruiser', 'Submarine', 'Destroyer'];
    return ships.map(t => {
      const total = getShipRelativeCells(t, false).length;
      const isSunk = this.sunkEnemyShipTypes.has(t);
      return {
        type: t,
        name: t,
        totalCells: total,
        remainingCells: isSunk ? 0 : total,
        isSunk: isSunk,
        icon: this.getShipIconByType(t)
      };
    });
  }

  hasYourShipAt(r: number, c: number): boolean {
    if (!this.state) return false;
    if (this.state.yourGrid && (this.state.yourGrid[r][c] === 'Ship' || this.state.yourGrid[r][c] === 'Hit' || this.state.yourGrid[r][c] === 'Sunk')) {
      return true;
    }
    if (this.state.yourShips) {
      return this.state.yourShips.some(s => s.occupiedCells.some(cell => cell.row === r && cell.col === c));
    }
    return false;
  }

  getShipIconAt(r: number, c: number): string {
    if (!this.state || !this.state.yourShips) return '🚢';
    const ship = this.state.yourShips.find(s => s.occupiedCells.some(cell => cell.row === r && cell.col === c));
    return ship ? this.getShipIconByType(ship.type) : '🚢';
  }

  getShipIconByType(type: ShipType): string {
    switch (type) {
      case 'Carrier': return '🚢';
      case 'Battleship': return '🛳️';
      case 'Cruiser': return '🛥️';
      case 'Submarine': return '🌊';
      case 'Destroyer': return '⛵';
      default: return '🚢';
    }
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

  ngOnDestroy(): void {
    if (this.switchTimer) clearTimeout(this.switchTimer);
    this.sub?.unsubscribe();
  }
}

