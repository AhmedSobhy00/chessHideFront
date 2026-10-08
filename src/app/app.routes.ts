import { Routes } from '@angular/router';
import { GameShellComponent } from './components/game-shell/game-shell.component';
import { BattleshipShellComponent } from './components/battleship/battleship-shell/battleship-shell.component';

export const routes: Routes = [
  { path: '',                    component: GameShellComponent },
  { path: 'game/:id',            component: GameShellComponent },
  { path: 'battleship',          component: BattleshipShellComponent },
  { path: 'battleship/game/:id', component: BattleshipShellComponent },
  { path: '**',                  redirectTo: '' }
];

