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
    <div
      class="game-container"
      [class.your-turn-glow]="isYourTurn"
      [class.enemy-turn-glow]="isOpponentTurn"
      (contextmenu)="$event.preventDefault()"
    >
      <!-- Top Tactical HUD (Displays only the fleet being targeted) -->
      <div class="tactical-hud" *ngIf="state">
        <!-- MY FLEET STATUS (Shown when viewing My Fleet) -->
        <div class="hud-box" *ngIf="activeView === 'fleet'">
          <div class="hud-label">🛡️ MY FLEET STATUS</div>
          <div class="fleet-diagrams">
            <div
              *ngFor="let item of myFleetStatus"
              class="ship-status-card"
              [class.sunk]="item.isSunk"
              [title]="item.name + ' (' + (item.isSunk ? 'SUNK' : item.remainingCells + '/' + item.totalCells + ' operational') + ')'"
            >
              <div class="ship-shape-grid">
                <div *ngFor="let row of getShipShapeMatrix(item.type)" class="mini-shape-row">
                  <span
                    *ngFor="let filled of row"
                    class="mini-shape-cell"
                    [class.empty]="!filled"
                    [class.alive]="filled && !item.isSunk"
                    [class.dead]="filled && item.isSunk"
                  ></span>
                </div>
              </div>
              <span class="ship-name-micro">{{ item.name }}</span>
            </div>
          </div>
        </div>

        <!-- ENEMY FLEET STATUS (Shown when viewing Radar) -->
        <div class="hud-box" *ngIf="activeView === 'radar'">
          <div class="hud-label enemy-label">🎯 ENEMY FLEET STATUS</div>
          <div class="fleet-diagrams">
            <div
              *ngFor="let item of enemyFleetStatus"
              class="ship-status-card enemy-card"
              [class.sunk]="item.isSunk"
              [title]="item.name + ' (' + (item.isSunk ? 'SUNK' : 'Operational') + ')'"
            >
              <div class="ship-shape-grid">
                <div *ngFor="let row of getShipShapeMatrix(item.type)" class="mini-shape-row">
                  <span
                    *ngFor="let filled of row"
                    class="mini-shape-cell"
                    [class.empty]="!filled"
                    [class.alive-enemy]="filled && !item.isSunk"
                    [class.dead]="filled && item.isSunk"
                  ></span>
                </div>
              </div>
              <span class="ship-name-micro">{{ item.name }}</span>
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
                  [class.enemy-ship-revealed]="state.phase === 'Finished' && isEnemyShipCellAt(r, c) && state.targetRadar[r][c] !== 'Sunk'"
                  [class.ship-carrier]="state.phase === 'Finished' && getEnemyShipTypeAt(r, c) === 'Carrier'"
                  [class.ship-battleship]="state.phase === 'Finished' && getEnemyShipTypeAt(r, c) === 'Battleship'"
                  [class.ship-cruiser]="state.phase === 'Finished' && getEnemyShipTypeAt(r, c) === 'Cruiser'"
                  [class.ship-submarine]="state.phase === 'Finished' && getEnemyShipTypeAt(r, c) === 'Submarine'"
                  [class.ship-destroyer]="state.phase === 'Finished' && getEnemyShipTypeAt(r, c) === 'Destroyer'"
                  [class.clickable]="isYourTurn && state.targetRadar[r][c] === 'Empty'"
                  (click)="fireShot(r, c)"
                >
                  <!-- Crisp Hit / Miss Markers -->
                  <span *ngIf="state.targetRadar[r][c] === 'Miss'" class="marker-miss">✕</span>
                  <span *ngIf="state.targetRadar[r][c] === 'Hit'" class="marker-hit">🔴</span>
                  <span *ngIf="state.targetRadar[r][c] === 'Sunk'" class="marker-sunk">✕</span>
                  <span *ngIf="state.phase === 'Finished' && isEnemyShipCellAt(r, c) && state.targetRadar[r][c] === 'Empty'" class="marker-revealed">🚢</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- MY FLEET VIEW (Your Ocean - Fully Visible Fleet Ships as Colored Metallic Blocks) -->
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
                  [class.ship-carrier]="getShipTypeAt(r, c) === 'Carrier'"
                  [class.ship-battleship]="getShipTypeAt(r, c) === 'Battleship'"
                  [class.ship-cruiser]="getShipTypeAt(r, c) === 'Cruiser'"
                  [class.ship-submarine]="getShipTypeAt(r, c) === 'Submarine'"
                  [class.ship-destroyer]="getShipTypeAt(r, c) === 'Destroyer'"
                  [class.cell-hit]="state.yourGrid[r][c] === 'Hit'"
                  [class.cell-miss]="state.yourGrid[r][c] === 'Miss'"
                  [class.cell-sunk]="state.yourGrid[r][c] === 'Sunk'"
                >
                  <!-- Visible Metallic Blocks (No Emojis), Hit / Miss Markers on top -->
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
      user-select: none; transition: background 0.6s ease, box-shadow 0.6s ease;
    }

    .game-container.your-turn-glow {
      background: radial-gradient(circle at 50% 20%, #082942 0%, #0b132b 85%);
      box-shadow: inset 0 0 70px rgba(0, 240, 255, 0.22);
    }

    .game-container.enemy-turn-glow {
      background: radial-gradient(circle at 50% 20%, #3a1c06 0%, #0b132b 85%);
      box-shadow: inset 0 0 70px rgba(255, 140, 0, 0.24);
    }

    /* Tactical Dual HUD */
    .tactical-hud {
      display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;
      background: rgba(13, 27, 62, 0.85); border: 1.5px solid rgba(0, 240, 255, 0.35);
      border-radius: 1.25rem; padding: 0.5rem 0.85rem; width: 100%; max-width: 440px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.6); margin-bottom: 0.3rem; box-sizing: border-box;
    }
    .hud-box { display: flex; flex-direction: column; gap: 0.3rem; flex: 1; }
    .hud-label { font-size: 0.65rem; font-weight: 900; color: #00f0ff; letter-spacing: 0.1em; }
    .hud-label.enemy-label { color: #ff9900; }
    
    .fleet-diagrams { display: flex; gap: 0.35rem; align-items: flex-end; justify-content: space-between; }
    .ship-status-card {
      display: flex; flex-direction: column; align-items: center; gap: 3px;
      background: rgba(0, 0, 0, 0.35); border: 1px solid rgba(0, 240, 255, 0.25);
      border-radius: 0.4rem; padding: 0.25rem 0.3rem; transition: all 0.3s ease; flex: 1;
    }
    .ship-status-card.enemy-card { border-color: rgba(255, 170, 0, 0.25); }
    .ship-status-card.sunk {
      border-color: rgba(255, 60, 60, 0.3); background: rgba(30, 0, 0, 0.4);
      opacity: 0.35; filter: grayscale(0.8);
    }
    .ship-name-micro {
      font-size: 0.52rem; font-weight: 800; color: #8a99ad; text-transform: uppercase;
      letter-spacing: 0.03em; line-height: 1;
    }

    .mini-shape-grid { display: flex; flex-direction: column; gap: 2px; }
    .mini-shape-row { display: flex; gap: 2px; justify-content: center; }
    .mini-shape-cell {
      width: 7px; height: 7px; border-radius: 1.5px; box-sizing: border-box;
    }
    .mini-shape-cell.empty { visibility: hidden; }
    .mini-shape-cell.alive {
      background: #00f0ff; box-shadow: 0 0 5px #00f0ff;
    }
    .mini-shape-cell.alive-enemy {
      background: #ffaa00; box-shadow: 0 0 5px #ffaa00;
    }
    .mini-shape-cell.dead {
      background: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .hud-divider { width: 1px; height: 36px; background: rgba(0, 240, 255, 0.25); }

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

    /* Ocean Grid Container (Mobile & Desktop Responsive Scaling) */
    .ocean-wrapper { display: flex; justify-content: center; width: 100%; max-width: 650px; }
    .ocean-grid-container { display: flex; flex-direction: column; align-items: flex-end; }
    .col-labels { display: flex; margin-left: 22px; }
    .col-labels span { width: clamp(27px, 8.2vw, 54px); text-align: center; font-size: 0.75rem; font-weight: 800; color: #708098; }
    .grid-body { display: flex; }
    .row-labels { display: flex; flex-direction: column; justify-content: space-around; width: 22px; text-align: right; padding-right: 4px; }
    .row-labels span { font-size: 0.75rem; font-weight: 800; color: #708098; height: clamp(27px, 8.2vw, 54px); line-height: clamp(27px, 8.2vw, 54px); }

    .board-grid {
      border: 2px solid rgba(0,240,255,0.35); border-radius: 0.65rem; overflow: hidden;
      background: radial-gradient(circle at center, #0e2246 0%, #050c1e 100%);
      box-shadow: 0 15px 40px rgba(0,0,0,0.6);
    }
    .grid-row { display: flex; }
    .grid-cell {
      width: clamp(27px, 8.2vw, 54px); height: clamp(27px, 8.2vw, 54px);
      border: 1px solid rgba(0,240,255,0.12);
      display: flex; align-items: center; justify-content: center; position: relative; box-sizing: border-box;
    }

    @media (min-width: 768px) {
      .tactical-hud { max-width: 620px; padding: 0.75rem 1.25rem; }
      .ocean-wrapper { max-width: 620px; }
      .turn-banner { max-width: 620px; font-size: 0.95rem; }
      .switch-tab { padding: 0.5rem 1.25rem; font-size: 0.88rem; }
      .ship-status-card { padding: 0.35rem 0.6rem; }
      .mini-shape-cell { width: 9px; height: 9px; }
    }

    @media (max-width: 767px) {
      .tactical-hud { max-width: 100%; padding: 0.4rem 0.6rem; }
      .fleet-diagrams { flex-wrap: nowrap; overflow-x: auto; max-width: 100%; gap: 0.25rem; }
      .ship-status-card { min-width: 48px; }
      .mini-shape-cell { width: 6px; height: 6px; }
    }
    .radar-cell.clickable { cursor: crosshair; }
    .radar-cell.clickable:hover { background: rgba(0,240,255,0.25); border-color: #00f0ff; }

    /* Distinct Metallic Styling & Outer Hull Borders for Individual Ship Types */
    .ship-carrier {
      background: linear-gradient(135deg, rgba(0, 240, 255, 0.6) 0%, rgba(0, 140, 220, 0.45) 100%) !important;
      border: 1.5px solid #00f0ff !important;
      box-shadow: inset 0 0 8px rgba(0, 240, 255, 0.6), 0 0 4px rgba(0, 240, 255, 0.4) !important;
      border-radius: 3px;
    }
    .ship-battleship {
      background: linear-gradient(135deg, rgba(0, 140, 255, 0.6) 0%, rgba(0, 80, 190, 0.45) 100%) !important;
      border: 1.5px solid #0088ff !important;
      box-shadow: inset 0 0 8px rgba(0, 140, 255, 0.6), 0 0 4px rgba(0, 140, 255, 0.4) !important;
      border-radius: 3px;
    }
    .ship-cruiser {
      background: linear-gradient(135deg, rgba(0, 255, 170, 0.6) 0%, rgba(0, 180, 120, 0.45) 100%) !important;
      border: 1.5px solid #00ffaa !important;
      box-shadow: inset 0 0 8px rgba(0, 255, 170, 0.6), 0 0 4px rgba(0, 255, 170, 0.4) !important;
      border-radius: 3px;
    }
    .ship-submarine {
      background: linear-gradient(135deg, rgba(160, 100, 255, 0.6) 0%, rgba(100, 50, 200, 0.45) 100%) !important;
      border: 1.5px solid #a064ff !important;
      box-shadow: inset 0 0 8px rgba(160, 100, 255, 0.6), 0 0 4px rgba(160, 100, 255, 0.4) !important;
      border-radius: 3px;
    }
    .ship-destroyer {
      background: linear-gradient(135deg, rgba(255, 170, 0, 0.6) 0%, rgba(200, 120, 0, 0.45) 100%) !important;
      border: 1.5px solid #ffaa00 !important;
      box-shadow: inset 0 0 8px rgba(255, 170, 0, 0.6), 0 0 4px rgba(255, 170, 0, 0.4) !important;
      border-radius: 3px;
    }

    /* Metallic Sunk Ship Blocks for Radar Grid when Enemy Ship is Destroyed */
    .radar-cell.cell-sunk {
      background: linear-gradient(135deg, rgba(255, 50, 50, 0.55) 0%, rgba(180, 20, 20, 0.45) 100%) !important;
      border: 1.5px solid #ff3333 !important;
      box-shadow: inset 0 0 10px rgba(255, 0, 0, 0.6), 0 0 6px rgba(255, 0, 0, 0.4) !important;
      border-radius: 3px;
    }

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
        icon: ''
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
        icon: ''
      };
    });
  }

  get enemyFleetStatus(): FleetStatusItem[] {
    const ships: ShipType[] = ['Carrier', 'Battleship', 'Cruiser', 'Submarine', 'Destroyer'];
    return ships.map(t => {
      const total = getShipRelativeCells(t, false).length;
      let isSunk = this.sunkEnemyShipTypes.has(t);

      if (!isSunk && this.state?.enemyShips && this.state.enemyShips.length > 0) {
        const enemyObj = this.state.enemyShips.find((s: any) => (s.type || s.Type) === t);
        if (enemyObj) {
          isSunk = enemyObj.isSunk || enemyObj.IsSunk || false;
        }
      }

      return {
        type: t,
        name: t,
        totalCells: total,
        remainingCells: isSunk ? 0 : total,
        isSunk: isSunk,
        icon: ''
      };
    });
  }

  isEnemyShipCellAt(r: number, c: number): boolean {
    if (!this.state?.enemyShips || this.state.enemyShips.length === 0) return false;
    return this.state.enemyShips.some((s: any) => {
      const cells = s.occupiedCells || s.OccupiedCells || [];
      return cells.some((cell: any) => (cell.row ?? cell.Row) === r && (cell.col ?? cell.Col) === c);
    });
  }

  getEnemyShipTypeAt(r: number, c: number): ShipType | null {
    if (!this.state?.enemyShips || this.state.enemyShips.length === 0) return null;
    const ship = this.state.enemyShips.find((s: any) => {
      const cells = s.occupiedCells || s.OccupiedCells || [];
      return cells.some((cell: any) => (cell.row ?? cell.Row) === r && (cell.col ?? cell.Col) === c);
    });
    return ship ? (ship.type || ship.Type) : null;
  }

  getShipShapeMatrix(type: ShipType): boolean[][] {
    switch (type) {
      case 'Carrier':
        return [
          [true, true, true, false],
          [false, true, true, true]
        ];
      case 'Cruiser':
        return [
          [true, true, true],
          [false, true, false]
        ];
      case 'Battleship':
        return [
          [true, true, true, true]
        ];
      case 'Submarine':
        return [
          [true, true, true]
        ];
      case 'Destroyer':
      default:
        return [
          [true, true]
        ];
    }
  }

  hasYourShipAt(r: number, c: number): boolean {
    return this.getShipTypeAt(r, c) !== null || (!!this.state?.yourGrid && (this.state.yourGrid[r][c] === 'Ship' || this.state.yourGrid[r][c] === 'Hit' || this.state.yourGrid[r][c] === 'Sunk'));
  }

  getShipTypeAt(r: number, c: number): ShipType | null {
    if (!this.state || !this.state.yourShips) return null;
    const ship = this.state.yourShips.find(s => s.occupiedCells.some(cell => cell.row === r && cell.col === c));
    return ship ? ship.type : null;
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

