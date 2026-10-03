import { Routes } from '@angular/router';
import { GameShellComponent } from './components/game-shell/game-shell.component';
import { LobbyComponent } from './components/lobby/lobby.component';

export const routes: Routes = [
  { path: '',          component: LobbyComponent },
  { path: 'game/:id',  component: GameShellComponent },
  { path: '**',        redirectTo: '' }
];
