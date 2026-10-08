import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { BattleshipService } from '../../../core/services/battleship.service';
import { BattleshipGameState, PlaceShipDTO, ShipType, Coordinate, getShipRelativeCells } from '../../../models/battleship.model';

interface ShipConfig {
  type: ShipType;
  name: string;
  length: number;
}

@Component({
  selector: 'app-battleship-setup',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="setup-container" (contextmenu)="onRightClick($event)">
      <div class="setup-header">
        <div class="header-badges">
          <span class="header-badge">FLEET DEPLOYMENT</span>
          <span class="timer-badge" [class.urgent]="timeLeft <= 10">⏳ {{ formattedTime }}</span>
        </div>
        <h2>Position Your Fleet</h2>
        <p>Left-click to place • <b>Right-click</b> anywhere to rotate • Lock when ready</p>
      </div>

      <div class="setup-layout">
        <!-- Controls & Unplaced Ships Drawer -->
        <div class="setup-panel">
          <div class="orientation-toggle">
            <span class="label">Orientation:</span>
            <button class="btn-rotate" (click)="toggleOrientation()">
              {{ isVertical ? '↕ Vertical' : '↔ Horizontal' }}
            </button>
          </div>

          <div class="ships-list">
            <div
              *ngFor="let s of fleetConfig"
              class="ship-card"
              [class.placed]="isShipPlaced(s.type)"
              [class.selected]="selectedShipType === s.type"
              (click)="selectShipToPlace(s.type)"
            >
              <!-- Mini 2D Shape Matrix Diagram (Same HUD Look) -->
              <div class="ship-shape-grid">
                <div *ngFor="let row of getShipShapeMatrix(s.type)" class="mini-shape-row">
                  <span
                    *ngFor="let filled of row"
                    class="mini-shape-cell"
                    [class.empty]="!filled"
                    [class.placed-cell]="filled && isShipPlaced(s.type)"
                    [class.selected-cell]="filled && selectedShipType === s.type && !isShipPlaced(s.type)"
                    [class.unplaced-cell]="filled && !isShipPlaced(s.type) && selectedShipType !== s.type"
                  ></span>
                </div>
              </div>

              <div class="ship-info">
                <span class="ship-name">{{ s.name }}</span>
                <span class="ship-len">{{ getShipCellCount(s.type) }} cells</span>
              </div>
              <span class="status-icon" *ngIf="isShipPlaced(s.type)" (click)="unplaceShip($event, s.type)" title="Remove ship">✕</span>
              <span class="status-icon" *ngIf="!isShipPlaced(s.type)">➔</span>
            </div>
          </div>

          <div class="setup-actions">
            <button class="btn-action rotate-mobile" (click)="toggleOrientation()">
              🔄 Rotate Ship ({{ isVertical ? '↕ Vertical' : '↔ Horizontal' }})
            </button>
            <button class="btn-action random" (click)="randomizeFleet()">
              🎲 Randomize Fleet
            </button>
            <button class="btn-action ready" (click)="lockFleet()" [disabled]="placedShipsCount < 5 || state?.isReady">
              {{ state?.isReady ? '✓ Fleet Locked' : '🚀 LOCK FLEET & READY' }}
            </button>
          </div>
        </div>

        <!-- 10x10 Placement Grid -->
        <div class="grid-wrapper">
          <div class="col-labels">
            <span *ngFor="let c of cols">{{ c }}</span>
          </div>
          <div class="grid-body">
            <div class="row-labels">
              <span *ngFor="let r of rows">{{ r }}</span>
            </div>
            <div class="board-grid">
              <div *ngFor="let r of [0,1,2,3,4,5,6,7,8,9]" class="grid-row">
                <div
                  *ngFor="let c of [0,1,2,3,4,5,6,7,8,9]"
                  class="grid-cell"
                  [class.has-ship]="hasShipAt(r, c)"
                  [class.ship-carrier]="getShipTypeAt(r, c) === 'Carrier'"
                  [class.ship-battleship]="getShipTypeAt(r, c) === 'Battleship'"
                  [class.ship-cruiser]="getShipTypeAt(r, c) === 'Cruiser'"
                  [class.ship-submarine]="getShipTypeAt(r, c) === 'Submarine'"
                  [class.ship-destroyer]="getShipTypeAt(r, c) === 'Destroyer'"
                  [class.preview-valid]="isPreviewCell(r, c) && isPreviewValid"
                  [class.preview-invalid]="isPreviewCell(r, c) && !isPreviewValid"
                  (mouseenter)="onCellHover(r, c)"
                  (mouseleave)="onCellLeave()"
                  (click)="onCellClick(r, c)"
                >
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="waiting-banner" *ngIf="state?.isReady && !state?.opponentReady">
        <div class="pulse-dot"></div>
        <span>Fleet deployed! Waiting for opponent to position their fleet…</span>
      </div>
    </div>
  `,
  styles: [`
    .setup-container {
      display: flex; flex-direction: column; align-items: center; justify-content: space-evenly;
      padding: 0.75rem 0.5rem; min-height: 100dvh; box-sizing: border-box; background: #0b132b; color: #e8e8e8;
      user-select: none;
    }
    .setup-header { text-align: center; margin-bottom: 0.4rem; }
    .header-badges { display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-bottom: 0.2rem; }
    .header-badge {
      display: inline-block; font-size: 0.7rem; font-weight: 800; letter-spacing: 0.15em;
      color: #00f0ff; background: rgba(0,240,255,0.1); border: 1px solid rgba(0,240,255,0.3);
      padding: 0.2rem 0.6rem; border-radius: 1rem;
    }
    .timer-badge {
      font-size: 0.8rem; font-weight: 900; color: #ffaa00; background: rgba(255,170,0,0.15);
      border: 1px solid rgba(255,170,0,0.35); padding: 0.2rem 0.6rem; border-radius: 1rem;
    }
    .timer-badge.urgent { color: #ff3333; background: rgba(255,51,51,0.2); border-color: #ff3333; animation: pulse 0.6s infinite alternate; }
    .setup-header h2 { margin: 0; font-size: 1.35rem; font-weight: 800; color: #fff; }
    .setup-header p { margin: 0.1rem 0 0; font-size: 0.82rem; color: #8a99ad; }
    .setup-header p b { color: #00f0ff; }

    .setup-layout {
      display: flex; gap: 1.25rem; align-items: center; justify-content: center; flex-wrap: wrap;
      max-width: 900px; width: 100%;
    }

    .setup-panel {
      background: rgba(13, 27, 62, 0.7); border: 1px solid rgba(0,240,255,0.2);
      border-radius: 1rem; padding: 0.85rem; display: flex; flex-direction: column; gap: 0.75rem;
      width: 280px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); box-sizing: border-box;
    }
    .orientation-toggle { display: flex; align-items: center; justify-content: space-between; font-size: 0.82rem; }
    .orientation-toggle .label { color: #8a99ad; font-weight: 600; }
    .btn-rotate {
      background: rgba(0,240,255,0.15); border: 1px solid rgba(0,240,255,0.4); color: #00f0ff;
      padding: 0.35rem 0.75rem; border-radius: 0.5rem; cursor: pointer; font-family: inherit; font-size: 0.8rem; font-weight: 700;
      transition: all 0.2s;
    }
    .btn-rotate:hover { background: rgba(0,240,255,0.3); }

    .ships-list { display: flex; flex-direction: column; gap: 0.4rem; }
    .ship-card {
      display: flex; align-items: center; gap: 0.6rem; padding: 0.45rem 0.75rem;
      background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08); border-radius: 0.65rem;
      cursor: pointer; transition: all 0.2s;
    }
    .ship-card:hover { border-color: rgba(0,240,255,0.4); background: rgba(0,240,255,0.05); }
    .ship-card.selected { border-color: #00f0ff; background: rgba(0,240,255,0.15); box-shadow: 0 0 10px rgba(0,240,255,0.2); }
    .ship-card.placed { opacity: 0.75; border-color: rgba(60,200,60,0.4); background: rgba(60,200,60,0.06); }

    /* Mini 2D Shape Grid inside Ship Card */
    .ship-shape-grid { display: flex; flex-direction: column; gap: 2px; min-width: 32px; justify-content: center; }
    .mini-shape-row { display: flex; gap: 2px; justify-content: center; }
    .mini-shape-cell { width: 7px; height: 7px; border-radius: 1.5px; box-sizing: border-box; }
    .mini-shape-cell.empty { visibility: hidden; }
    .mini-shape-cell.selected-cell { background: #00f0ff; box-shadow: 0 0 5px #00f0ff; }
    .mini-shape-cell.placed-cell { background: #3cd23c; box-shadow: 0 0 5px #3cd23c; }
    .mini-shape-cell.unplaced-cell { background: rgba(255, 255, 255, 0.25); border: 1px solid rgba(255, 255, 255, 0.15); }

    .ship-info { flex: 1; display: flex; flex-direction: column; }
    .ship-name { font-weight: 700; font-size: 0.82rem; color: #e8e8e8; }
    .ship-len { font-size: 0.7rem; color: #708098; }
    .status-icon { font-size: 0.85rem; color: #00f0ff; font-weight: 800; padding: 2px 6px; border-radius: 4px; }
    .ship-card.placed .status-icon:hover { background: rgba(255,50,50,0.3); color: #ff5555; }

    .setup-actions { display: flex; flex-direction: column; gap: 0.45rem; margin-top: 0.2rem; }
    .btn-action {
      padding: 0.65rem; border-radius: 0.65rem; border: none; font-size: 0.88rem; font-weight: 800;
      cursor: pointer; font-family: inherit; transition: all 0.2s; text-align: center;
    }
    .btn-action.rotate-mobile { background: rgba(0,240,255,0.15); color: #00f0ff; border: 1px solid rgba(0,240,255,0.3); }
    .btn-action.random { background: rgba(255,255,255,0.08); color: #e8e8e8; border: 1px solid rgba(255,255,255,0.15); }
    .btn-action.random:hover { background: rgba(255,255,255,0.15); }
    .btn-action.ready { background: linear-gradient(135deg, #00f0ff, #0088cc); color: #0b132b; box-shadow: 0 4px 15px rgba(0,240,255,0.3); }
    .btn-action.ready:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(0,240,255,0.5); }
    .btn-action:disabled { opacity: 0.4; cursor: not-allowed; box-shadow: none; }

    /* Grid Styling Responsive for Mobile & Desktop */
    .grid-wrapper { display: flex; flex-direction: column; align-items: flex-end; }
    .col-labels { display: flex; margin-left: 22px; }
    .col-labels span { width: clamp(27px, 8.2vw, 54px); text-align: center; font-size: 0.75rem; font-weight: 700; color: #708098; }
    .grid-body { display: flex; }
    .row-labels { display: flex; flex-direction: column; justify-content: space-around; width: 22px; text-align: right; padding-right: 4px; }
    .row-labels span { font-size: 0.75rem; font-weight: 700; color: #708098; height: clamp(27px, 8.2vw, 54px); line-height: clamp(27px, 8.2vw, 54px); }

    .board-grid { border: 2px solid rgba(0,240,255,0.3); border-radius: 0.5rem; overflow: hidden; background: rgba(5,12,30,0.9); }
    .grid-row { display: flex; }
    .grid-cell {
      width: clamp(27px, 8.2vw, 54px); height: clamp(27px, 8.2vw, 54px);
      border: 1px solid rgba(0,240,255,0.1);
      display: flex; align-items: center; justify-content: center; cursor: pointer;
      position: relative; transition: background 0.15s; box-sizing: border-box;
    }
    .grid-cell:hover { background: rgba(0,240,255,0.15); }

    @media (min-width: 768px) {
      .setup-layout { flex-direction: row; align-items: flex-start; max-width: 980px; gap: 2.5rem; }
      .setup-panel { width: 300px; }
    }

    @media (max-width: 767px) {
      .setup-layout { flex-direction: column; align-items: center; width: 100%; gap: 0.85rem; }
      .setup-panel { width: 100%; max-width: 380px; padding: 0.65rem; }
      .ships-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.35rem; }
      .ship-card { padding: 0.35rem 0.5rem; }
    }

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
    .grid-cell:hover { background: rgba(0,240,255,0.15); }
    .grid-cell.has-ship {
      background: linear-gradient(135deg, rgba(0, 240, 255, 0.5) 0%, rgba(0, 130, 230, 0.4) 100%);
      border: 1px solid rgba(0, 240, 255, 0.75);
      box-shadow: inset 0 0 8px rgba(0, 240, 255, 0.45);
    }
    .grid-cell.preview-valid { background: rgba(60,220,90,0.4) !important; }
    .grid-cell.preview-invalid { background: rgba(240,60,60,0.5) !important; }

    .waiting-banner {
      display: flex; align-items: center; gap: 0.6rem; justify-content: center;
      background: rgba(0,240,255,0.12); border: 1px solid rgba(0,240,255,0.3);
      border-radius: 0.75rem; padding: 0.65rem 1.2rem; color: #00f0ff; font-size: 0.85rem; font-weight: 700;
    }
    .pulse-dot { width: 8px; height: 8px; border-radius: 50%; background: #00f0ff; animation: pulse 1s infinite alternate; }
    @keyframes pulse { from{opacity:0.4;transform:scale(0.8)} to{opacity:1;transform:scale(1.2)} }
  `]
})
export class BattleshipSetupComponent implements OnInit, OnDestroy {
  state: BattleshipGameState | null = null;
  cols = ['A','B','C','D','E','F','G','H','I','J'];
  rows = ['1','2','3','4','5','6','7','8','9','10'];

  fleetConfig: ShipConfig[] = [
    { type: 'Carrier', name: 'Carrier', length: 6 },
    { type: 'Battleship', name: 'Battleship', length: 4 },
    { type: 'Cruiser', name: 'Cruiser', length: 4 },
    { type: 'Submarine', name: 'Submarine', length: 3 },
    { type: 'Destroyer', name: 'Destroyer', length: 2 }
  ];

  selectedShipType: ShipType = 'Carrier';
  isVertical = false;
  placedShipsMap = new Map<ShipType, PlaceShipDTO>();

  hoveredCell: Coordinate | null = null;
  isPreviewValid = true;

  timeLeft = 60;
  private timerId: any = null;
  private sub?: Subscription;

  constructor(private battleship: BattleshipService) {}

  ngOnInit(): void {
    this.startSetupTimer();
    this.sub = this.battleship.state$.subscribe(s => {
      this.state = s;
      if (s.yourShips && s.yourShips.length > 0) {
        s.yourShips.forEach(ship => {
          this.placedShipsMap.set(ship.type, {
            Type: ship.type,
            StartRow: ship.startRow,
            StartCol: ship.startCol,
            IsVertical: ship.isVertical
          });
        });
      }
    });
  }

  private startSetupTimer(): void {
    if (this.timerId) clearInterval(this.timerId);
    this.timeLeft = 60;
    this.timerId = setInterval(() => {
      if (this.timeLeft > 0) {
        this.timeLeft--;
      } else {
        clearInterval(this.timerId);
        this.onTimerExpired();
      }
    }, 1000);
  }

  private async onTimerExpired(): Promise<void> {
    if (this.state?.isReady) return;
    if (this.placedShipsCount < 5) {
      await this.battleship.randomizeFleet();
    }
    await this.lockFleet();
  }

  get formattedTime(): string {
    const m = Math.floor(this.timeLeft / 60);
    const s = this.timeLeft % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  get placedShipsCount(): number {
    return this.placedShipsMap.size;
  }

  isShipPlaced(type: ShipType): boolean {
    return this.placedShipsMap.has(type);
  }

  selectShipToPlace(type: ShipType): void {
    this.selectedShipType = type;
    this.validatePreview();
  }

  getShipCellCount(type: ShipType): number {
    return getShipRelativeCells(type, false).length;
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

  unplaceShip(event: Event, type: ShipType): void {
    event.stopPropagation();
    this.placedShipsMap.delete(type);
    this.validatePreview();
  }

  toggleOrientation(): void {
    this.isVertical = !this.isVertical;
    this.validatePreview();
  }

  onRightClick(event: MouseEvent): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.toggleOrientation();
  }

  onCellHover(row: number, col: number): void {
    this.hoveredCell = { row, col };
    this.validatePreview();
  }

  onCellLeave(): void {
    this.hoveredCell = null;
  }

  isPreviewCell(row: number, col: number): boolean {
    if (!this.hoveredCell || !this.selectedShipType) return false;
    const rels = getShipRelativeCells(this.selectedShipType, this.isVertical);
    return rels.some(r => this.hoveredCell!.row + r.row === row && this.hoveredCell!.col + r.col === col);
  }

  hasShipAt(row: number, col: number): boolean {
    return this.getShipTypeAt(row, col) !== null;
  }

  getShipTypeAt(row: number, col: number): ShipType | null {
    for (const [shipType, dto] of this.placedShipsMap.entries()) {
      const rels = getShipRelativeCells(dto.Type, dto.IsVertical);
      if (rels.some(r => dto.StartRow + r.row === row && dto.StartCol + r.col === col)) {
        return shipType;
      }
    }
    return null;
  }

  validatePreview(): void {
    if (!this.hoveredCell || !this.selectedShipType) {
      this.isPreviewValid = true;
      return;
    }

    const rels = getShipRelativeCells(this.selectedShipType, this.isVertical);
    for (const r of rels) {
      const targetRow = this.hoveredCell.row + r.row;
      const targetCol = this.hoveredCell.col + r.col;

      if (targetRow < 0 || targetRow >= 10 || targetCol < 0 || targetCol >= 10) {
        this.isPreviewValid = false;
        return;
      }

      for (const [shipType, dto] of this.placedShipsMap.entries()) {
        if (shipType === this.selectedShipType) continue; // Replacing current
        const existingRels = getShipRelativeCells(dto.Type, dto.IsVertical);
        if (existingRels.some(er => dto.StartRow + er.row === targetRow && dto.StartCol + er.col === targetCol)) {
          this.isPreviewValid = false;
          return;
        }
      }
    }

    this.isPreviewValid = true;
  }

  onCellClick(row: number, col: number): void {
    if (!this.selectedShipType || !this.isPreviewValid) return;

    this.placedShipsMap.set(this.selectedShipType, {
      Type: this.selectedShipType,
      StartRow: row,
      StartCol: col,
      IsVertical: this.isVertical
    });

    // Auto select next unplaced ship
    const unplaced = this.fleetConfig.find(f => !this.placedShipsMap.has(f.type));
    if (unplaced) {
      this.selectedShipType = unplaced.type;
    }

    this.validatePreview();
  }

  async randomizeFleet(): Promise<void> {
    await this.battleship.randomizeFleet();
  }

  async lockFleet(): Promise<void> {
    if (this.placedShipsCount < 5) return;
    if (this.timerId) clearInterval(this.timerId);
    await this.battleship.placeFleet(Array.from(this.placedShipsMap.values()));
    await this.battleship.setReady();
  }

  ngOnDestroy(): void {
    if (this.timerId) clearInterval(this.timerId);
    this.sub?.unsubscribe();
  }
}
