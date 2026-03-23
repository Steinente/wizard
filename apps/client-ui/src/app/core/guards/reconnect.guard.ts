import { inject } from '@angular/core'
import { CanActivateFn, Router } from '@angular/router'
import { AppStore } from '../state/app.store'

export const lobbyAccessGuard: CanActivateFn = (route) => {
  const store = inject(AppStore)
  const router = inject(Router)

  const routeCode = route.paramMap.get('code')?.toUpperCase()
  const activeLobbyCode = store.lobby()?.code?.toUpperCase()

  if (routeCode && activeLobbyCode === routeCode) {
    return true
  }

  if (!routeCode) {
    return router.parseUrl('/')
  }

  return router.createUrlTree(['/join', routeCode])
}

export const reconnectGuard: CanActivateFn = (route) => {
  const store = inject(AppStore)
  const router = inject(Router)
  const routeCode = route.paramMap.get('code')?.toUpperCase()
  const activeGameCode = store.gameState()?.lobbyCode?.toUpperCase()

  if (routeCode && activeGameCode === routeCode) {
    return true
  }

  if (!routeCode) {
    return router.parseUrl('/')
  }

  return router.createUrlTree(['/join', routeCode])
}
