import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { BattleshipService } from '../../../core/services/battleship.service';
import { BattleshipGameState, PlaceShipDTO, ShipType, Coordinate, getShipRelativeCells } from '../../../models/battleship.model';

interface ShipConfig {
  type: ShipType;
  name: string;
  length: number;
  icon: string;
}

@Component({
  selector: 'app-battleship-setup',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="setup-container" (contextmenu)="$event.preventDefault()">
      <div class="setup-header">
        <div class="header-badge">FLEET DEPLOYMENT</div>
        <h2>Position Your Fleet</h2>
        <p>Left-click to place • <b>Right-click anywhere or press Rotate</b> to change orientation (↔ / ↕)</p>
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
              <span class="ship-icon">{{ s.icon }}</span>
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
            <div class="board-grid" (contextmenu)="onRightClick($event)">
              <div *ngFor="let r of [0,1,2,3,4,5,6,7,8,9]" class="grid-row">
                <div
                  *ngFor="let c of [0,1,2,3,4,5,6,7,8,9]"
                  class="grid-cell"
                  [class.has-ship]="hasShipAt(r, c)"
                  [class.preview-valid]="isPreviewCell(r, c) && isPreviewValid"
                  [class.preview-invalid]="isPreviewCell(r, c) && !isPreviewValid"
                  (mouseenter)="onCellHover(r, c)"
                  (mouseleave)="onCellLeave()"
                  (click)="onCellClick(r, c)"
                  (contextmenu)="onRightClick($event, r, c)"
                >
                  <span class="cell-content" *ngIf="hasShipAt(r, c)">🚢</span>
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
    .header-badge {
      display: inline-block; font-size: 0.7rem; font-weight: 800; letter-spacing: 0.15em;
      color: #00f0ff; background: rgba(0,240,255,0.1); border: 1px solid rgba(0,240,255,0.3);
      padding: 0.2rem 0.6rem; border-radius: 1rem; margin-bottom: 0.2rem;
    }
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
    .ship-icon { font-size: 1.2rem; }
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

    /* Grid Styling Responsive for Mobile */
    .grid-wrapper { display: flex; flex-direction: column; align-items: flex-end; }
    .col-labels { display: flex; margin-left: 22px; }
    .col-labels span { width: clamp(26px, 7.5dvw, 36px); text-align: center; font-size: 0.72rem; font-weight: 700; color: #708098; }
    .grid-body { display: flex; }
    .row-labels { display: flex; flex-direction: column; justify-content: space-around; width: 22px; text-align: right; padding-right: 4px; }
    .row-labels span { font-size: 0.72rem; font-weight: 700; color: #708098; height: clamp(26px, 7.5dvw, 36px); line-height: clamp(26px, 7.5dvw, 36px); }

    .board-grid { border: 2px solid rgba(0,240,255,0.3); border-radius: 0.5rem; overflow: hidden; background: rgba(5,12,30,0.9); }
    .grid-row { display: flex; }
    .grid-cell {
      width: clamp(26px, 7.5dvw, 36px); height: clamp(26px, 7.5dvw, 36px);
      border: 1px solid rgba(0,240,255,0.1);
      display: flex; align-items: center; justify-content: center; cursor: pointer;
      position: relative; transition: background 0.15s;
    }
    .grid-cell:hover { background: rgba(0,240,255,0.15); }
    .grid-cell.has-ship { background: rgba(0,240,255,0.3); border-color: rgba(0,240,255,0.6); }
    .grid-cell.preview-valid { background: rgba(60,220,90,0.4) !important; }
    .grid-cell.preview-invalid { background: rgba(240,60,60,0.5) !important; }
    .cell-content { font-size: 1.05rem; line-height: 1; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5)); }

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
    { type: 'Carrier', name: 'Carrier', length: 5, icon: '🚢' },
    { type: 'Battleship', name: 'Battleship', length: 4, icon: '🛳️' },
    { type: 'Cruiser', name: 'Cruiser', length: 4, icon: '🛥️' },
    { type: 'Submarine', name: 'Submarine', length: 3, icon: '🌊' },
    { type: 'Destroyer', name: 'Destroyer', length: 2, icon: '⛵' }
  ];

  selectedShipType: ShipType = 'Carrier';
  isVertical = false;
  placedShipsMap = new Map<ShipType, PlaceShipDTO>();

  hoveredCell: Coordinate | null = null;
  isPreviewValid = true;

  private sub?: Subscription;

  constructor(private battleship: BattleshipService) {}

  ngOnInit(): void {
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

  get placedShipsCount(): number {
    return this.placedShipsMap.size;
  }

  getShipCellCount(type: ShipType): number {
    return getShipRelativeCells(type, false).length;
  }

  isShipPlaced(type: ShipType): boolean {
    return this.placedShipsMap.has(type);
  }

  selectShipToPlace(type: ShipType): void {
    this.selectedShipType = type;
    this.validatePreview();
  }

  unplaceShip(event: MouseEvent, type: ShipType): void {
    event.stopPropagation();
    this.placedShipsMap.delete(type);
    this.selectedShipType = type;
    this.validatePreview();
  }

  toggleOrientation(): void {
    this.isVertical = !this.isVertical;
    this.validatePreview();
  }

  onRightClick(event: MouseEvent, row?: number, col?: number): void {
    event.preventDefault();
    event.stopPropagation();

    if (row !== undefined && col !== undefined) {
      // Find ship placed at (row, col)
      const placedEntry = Array.from(this.placedShipsMap.entries()).find(([_, s]) => {
        const rel = getShipRelativeCells(s.Type, s.IsVertical);
        return rel.some(r => (s.StartRow + r.row) === row && (s.StartCol + r.col) === col);
      });

      if (placedEntry) {
        const [type, s] = placedEntry;
        const newVert = !s.IsVertical;
        // Test if rotated ship is valid at StartRow, StartCol
        const rel = getShipRelativeCells(type, newVert);
        let valid = true;
        for (const rCell of rel) {
          const r = s.StartRow + rCell.row;
          const c = s.StartCol + rCell.col;
          if (r < 0 || r > 9 || c < 0 || c > 9) { valid = false; break; }
          // Overlap check with other ships
          Array.from(this.placedShipsMap.entries()).forEach(([otherT, otherS]) => {
            if (otherT === type) return;
            const otherRel = getShipRelativeCells(otherS.Type, otherS.IsVertical);
            if (otherRel.some(or => (otherS.StartRow + or.row) === r && (otherS.StartCol + or.col) === c)) {
              valid = false;
            }
          });
        }

        if (valid) {
          s.IsVertical = newVert;
          this.placedShipsMap.set(type, s);
          if (this.placedShipsMap.size === 5) {
            this.battleship.placeFleet(Array.from(this.placedShipsMap.values()));
          }
          this.validatePreview();
          return;
        }
      }
    }

    // Default right-click behavior: toggle current orientation
    this.toggleOrientation();
  }

  hasShipAt(row: number, col: number): boolean {
    return Array.from(this.placedShipsMap.values()).some(s => {
      const rel = getShipRelativeCells(s.Type, s.IsVertical);
      return rel.some(r => (s.StartRow + r.row) === row && (s.StartCol + r.col) === col);
    });
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
    const rel = getShipRelativeCells(this.selectedShipType, this.isVertical);
    return rel.some(r => (this.hoveredCell!.row + r.row) === row && (this.hoveredCell!.col + r.col) === col);
  }

  validatePreview(): void {
    if (!this.hoveredCell || !this.selectedShipType) return;
    const rel = getShipRelativeCells(this.selectedShipType, this.isVertical);
    let valid = true;

    for (const rCell of rel) {
      const r = this.hoveredCell.row + rCell.row;
      const c = this.hoveredCell.col + rCell.col;

      if (r < 0 || r > 9 || c < 0 || c > 9) { valid = false; break; }

      // Check overlap with other placed ships (excluding currently selected ship)
      Array.from(this.placedShipsMap.entries()).forEach(([t, s]) => {
        if (t === this.selectedShipType) return;
        const sRel = getShipRelativeCells(s.Type, s.IsVertical);
        if (sRel.some(sr => (s.StartRow + sr.row) === r && (s.StartCol + sr.col) === c)) {
          valid = false;
        }
      });
    }

    this.isPreviewValid = valid;
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

    // Send to backend only if all 5 ships are placed
    if (this.placedShipsMap.size === 5) {
      this.battleship.placeFleet(Array.from(this.placedShipsMap.values()));
    }
  }

  async randomizeFleet(): Promise<void> {
    await this.battleship.randomizeFleet();
  }

  async lockFleet(): Promise<void> {
    if (this.placedShipsCount < 5) return;
    await this.battleship.placeFleet(Array.from(this.placedShipsMap.values()));
    await this.battleship.setReady();
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }
}

