import { Injectable } from '@angular/core'
import { Router } from '@angular/router'
import { GameFacadeService } from './game-facade.service'
import { SessionService } from './session.service'

@Injectable({ providedIn: 'root' })
export class AppInitService {
  private initialized = false

  constructor(
    private readonly session: SessionService,
    private readonly facade: GameFacadeService,
    private readonly router: Router,
  ) {}

  init() {
    if (this.initialized) {
      return
    }

    this.initialized = true

    const currentUrl = this.router.url

    if (currentUrl.startsWith('/lobby/')) {
      return
    }

    const storedCode = this.session.lastLobbyCode()

    if (!storedCode) {
      return
    }

    this.facade.reconnectLobby(storedCode)
  }
}
