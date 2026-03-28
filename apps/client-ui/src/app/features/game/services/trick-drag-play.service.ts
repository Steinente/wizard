import { Injectable, computed, signal } from '@angular/core'
import type { Card } from '@wizard/shared'
import {
  isPointInsideRect,
  resolveTrickGridElement,
  type PendingCardPlayAnimation,
} from '../utils/card-play-animation.util'

@Injectable()
export class TrickDragPlayService {
  private readonly draggedPlayCardSignal =
    signal<PendingCardPlayAnimation | null>(null)
  private readonly trickDropPreviewActiveSignal = signal(false)

  readonly trickDropPreviewCard = computed(() =>
    this.trickDropPreviewActiveSignal()
      ? (this.draggedPlayCardSignal()?.card ?? null)
      : null,
  )

  readonly trickDragActiveSignal = computed(
    () => this.draggedPlayCardSignal() !== null,
  )

  startPlayDrag(
    payload: { card: Card; sourceRect: DOMRect },
    canPlayCard: (card: Card) => boolean,
  ) {
    if (!canPlayCard(payload.card)) {
      this.reset()
      return
    }

    this.draggedPlayCardSignal.set(payload)
  }

  endPlayDrag() {
    this.reset()
  }

  onTrickDragOver(event: DragEvent, canPlayCard: (card: Card) => boolean) {
    this.updatePreviewStateAtPoint(event.clientX, event.clientY, canPlayCard)

    if (!this.trickDropPreviewActiveSignal()) {
      return
    }

    event.preventDefault()

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move'
    }
  }

  onTrickPointerMove(
    clientX: number,
    clientY: number,
    canPlayCard: (card: Card) => boolean,
  ) {
    this.updatePreviewStateAtPoint(clientX, clientY, canPlayCard)
  }

  consumeDropAtPoint(
    clientX: number,
    clientY: number,
    canPlayCard: (card: Card) => boolean,
  ): PendingCardPlayAnimation | null {
    this.updatePreviewStateAtPoint(clientX, clientY, canPlayCard)

    const draggedPlayCard = this.draggedPlayCardSignal()

    if (!draggedPlayCard || !this.trickDropPreviewActiveSignal()) {
      return null
    }

    this.reset()

    return draggedPlayCard
  }

  private updatePreviewStateAtPoint(
    clientX: number,
    clientY: number,
    canPlayCard: (card: Card) => boolean,
  ) {
    const draggedPlayCard = this.draggedPlayCardSignal()

    if (!draggedPlayCard) {
      return
    }

    const trickGrid = resolveTrickGridElement()

    if (!trickGrid) {
      this.trickDropPreviewActiveSignal.set(false)
      return
    }

    const isOverGrid = isPointInsideRect(
      clientX,
      clientY,
      trickGrid.getBoundingClientRect(),
    )

    if (!isOverGrid || !canPlayCard(draggedPlayCard.card)) {
      this.trickDropPreviewActiveSignal.set(false)
      return
    }

    this.trickDropPreviewActiveSignal.set(true)
  }

  onTrickDragLeave() {
    this.trickDropPreviewActiveSignal.set(false)
  }

  consumeDrop(event: DragEvent): PendingCardPlayAnimation | null {
    const draggedPlayCard = this.draggedPlayCardSignal()

    if (!draggedPlayCard || !this.trickDropPreviewActiveSignal()) {
      return null
    }

    event.preventDefault()
    this.reset()

    return draggedPlayCard
  }

  reset() {
    this.draggedPlayCardSignal.set(null)
    this.trickDropPreviewActiveSignal.set(false)
  }
}
