import { Routes } from '@angular/router'
import { reconnectGuard } from './core/guards/reconnect.guard'
import { GamePageComponent } from './features/game/game-page.component'
import { HomePageComponent } from './features/home/home-page.component'
import { LegalImprintPageComponent } from './features/legal/legal-imprint-page.component'
import { LegalPrivacyPageComponent } from './features/legal/legal-privacy-page.component'
import { LobbyPageComponent } from './features/lobby/lobby-page.component'

export const routes: Routes = [
  {
    path: '',
    component: HomePageComponent,
  },
  {
    path: 'lobby/:code',
    component: LobbyPageComponent,
  },
  {
    path: 'game/:code',
    component: GamePageComponent,
    canActivate: [reconnectGuard],
  },
  {
    path: 'imprint',
    component: LegalImprintPageComponent,
  },
  {
    path: 'privacy',
    component: LegalPrivacyPageComponent,
  },
  {
    path: '**',
    redirectTo: '',
  },
]
