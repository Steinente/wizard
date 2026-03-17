import { inject } from '@angular/core'
import { CanActivateFn, Router } from '@angular/router'
import { AppStore } from '../state/app.store'

export const reconnectGuard: CanActivateFn = () => {
  const store = inject(AppStore)
  const router = inject(Router)

  if (store.lobby() || store.gameState()) {
    return true
  }

  return router.parseUrl('/')
}
