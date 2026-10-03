import { Routes } from '@angular/router';
import { GameShellComponent } from './components/game-shell/game-shell.component';

export const routes: Routes = [
  { path: '',          component: GameShellComponent },
  { path: 'game/:id',  component: GameShellComponent },
  { path: '**',        redirectTo: '' }
];
