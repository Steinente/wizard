import { Injectable, OnDestroy, computed, effect, signal } from '@angular/core'
import type { Card } from '@wizard/shared'
import { SessionService } from '../../core/services/session.service'
import { AppStore } from '../../core/state/app.store'
import {
  createPlayedCardAnimationState,
  getTrickPlaySignature,
  resolveNextTrickSlotRect,
  resolveTrickGridElement,
  type PendingCardPlayAnimation,
  type PlayedCardAnimationState,
} from './utils/card-play-animation.util'

@Injectable()
export class CardPlayAnimationService implements OnDestroy {
  private readonly playedCardAnimationSignal =
    signal<PlayedCardAnimationState | null>(null)
  private readonly pendingCardPlayAnimationSignal =
    signal<PendingCardPlayAnimation | null>(null)
  private lastSeenTrickKey: string | null = null
  private lastSeenTrickPlaySignature = ''
  private animationTimeoutId: ReturnType<typeof setTimeout> | null = null
  private animationRafId: number | null = null

  readonly cardPlayAnimationEnabled = computed(() =>
    this.session.cardPlayAnimationEnabled(),
  )
  readonly playedCardAnimation = computed(() =>
    this.playedCardAnimationSignal(),
  )

  constructor(
    private readonly store: AppStore,
    private readonly session: SessionService,
  ) {
    effect(() => {
      const state = this.store.gameState()
      const trick = state?.currentRound?.currentTrick
      const trickPlays = trick?.plays ?? []
      const roundNumber = state?.currentRound?.roundNumber ?? null
      const lobbyCode = state?.lobbyCode ?? null

      if (!state || roundNumber === null || !lobbyCode) {
        this.lastSeenTrickKey = null
        this.lastSeenTrickPlaySignature = ''
        return
      }

      const trickKey = `${lobbyCode}:${roundNumber}:${trick?.leadPlayerId ?? 'none'}`
      const playSignature = getTrickPlaySignature(trickPlays)
      const trickKeyChanged = this.lastSeenTrickKey !== trickKey
      const previousSignature = trickKeyChanged
        ? ''
        : this.lastSeenTrickPlaySignature

      if (trickKeyChanged) {
        this.lastSeenTrickKey = trickKey
      }

      if (previousSignature === playSignature) {
        this.lastSeenTrickPlaySignature = playSignature
        return
      }

      this.lastSeenTrickPlaySignature = playSignature

      const pendingAnimation = this.pendingCardPlayAnimationSignal()
      if (!pendingAnimation || !this.cardPlayAnimationEnabled()) {
        return
      }

      const previousEntries = new Set(
        previousSignature.length > 0 ? previousSignature.split('|') : [],
      )
      const newPlay = trickPlays.find((play) => {
        const entryKey = `${play.playerId}:${play.card.id}`
        return (
          !previousEntries.has(entryKey) &&
          play.playerId === state.selfPlayerId &&
          play.card.id === pendingAnimation.card.id
        )
      })

      if (!newPlay) {
        return
      }

      this.pendingCardPlayAnimationSignal.set(null)
      this.startPlayedCardAnimation(newPlay.card, pendingAnimation.sourceRect)
    })
  }

  setPendingAnimation(card: Card, sourceRect: DOMRect) {
    this.pendingCardPlayAnimationSignal.set({ card, sourceRect })
  }

  resetRoundState() {
    this.lastSeenTrickKey = null
    this.lastSeenTrickPlaySignature = ''
    this.pendingCardPlayAnimationSignal.set(null)
  }

  private startPlayedCardAnimation(card: Card, sourceRect: DOMRect) {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      return
    }

    const targetRect = this.resolveTrickAnimationTargetRect(sourceRect)

    if (!targetRect) {
      return
    }

    this.playedCardAnimationSignal.set(
      createPlayedCardAnimationState(card, sourceRect, targetRect),
    )

    if (this.animationRafId !== null) {
      window.cancelAnimationFrame(this.animationRafId)
      this.animationRafId = null
    }

    if (this.animationTimeoutId) {
      clearTimeout(this.animationTimeoutId)
      this.animationTimeoutId = null
    }

    this.animationRafId = window.requestAnimationFrame(() => {
      this.playedCardAnimationSignal.update((animation) =>
        animation ? { ...animation, running: true } : null,
      )

      this.animationTimeoutId = setTimeout(() => {
        this.playedCardAnimationSignal.set(null)
        this.animationTimeoutId = null
      }, 260)
    })
  }

  private resolveTrickAnimationTargetRect(sourceRect: DOMRect): DOMRect | null {
    const trickGrid = resolveTrickGridElement()

    if (!trickGrid) {
      return null
    }

    const plays =
      this.store.gameState()?.currentRound?.currentTrick?.plays ?? []
    const playedCardCount = Math.max(0, plays.length - 1)

    return resolveNextTrickSlotRect(trickGrid, sourceRect, playedCardCount)
  }

  ngOnDestroy() {
    if (this.animationTimeoutId) {
      clearTimeout(this.animationTimeoutId)
      this.animationTimeoutId = null
    }

    if (this.animationRafId !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(this.animationRafId)
      this.animationRafId = null
    }
  }
}
