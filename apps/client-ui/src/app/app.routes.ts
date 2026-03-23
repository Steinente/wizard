import { Routes } from '@angular/router'
import { lobbyAccessGuard, reconnectGuard } from './core/guards/reconnect.guard'
import { GamePageComponent } from './features/game/game-page.component'
import { HomePageComponent } from './features/home/home-page.component'
import { JoinPageComponent } from './features/join/join-page.component'
import { LegalImprintPageComponent } from './features/legal/legal-imprint-page.component'
import { LegalPrivacyPageComponent } from './features/legal/legal-privacy-page.component'
import { LobbyPageComponent } from './features/lobby/lobby-page.component'

export const routes: Routes = [
  {
    path: '',
    component: HomePageComponent,
  },
  {
    path: 'join/:code',
    component: JoinPageComponent,
  },
  {
    path: 'lobby/:code',
    component: LobbyPageComponent,
    canActivate: [lobbyAccessGuard],
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
