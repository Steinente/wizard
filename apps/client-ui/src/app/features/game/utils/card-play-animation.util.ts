import type { Card } from '@wizard/shared'

export type PendingCardPlayAnimation = {
  card: Card
  sourceRect: DOMRect
}

export type PlayedCardAnimationState = {
  card: Card
  startLeft: number
  startTop: number
  width: number
  height: number
  translateX: number
  translateY: number
  running: boolean
}

export const getTrickPlaySignature = (
  plays: Array<{ playerId: string; card: Card }>,
): string => plays.map((play) => `${play.playerId}:${play.card.id}`).join('|')

export const resolveNextTrickSlotRect = (
  trickGrid: HTMLElement,
  sourceRect: DOMRect,
  playIndex: number,
): DOMRect => {
  const gridRect = trickGrid.getBoundingClientRect()
  const computedStyle = window.getComputedStyle(trickGrid)
  const gapValue = Number.parseFloat(
    computedStyle.columnGap || computedStyle.gap || '10',
  )
  const gap = Number.isFinite(gapValue) ? gapValue : 10
  const slotWidth = sourceRect.width
  const slotHeight = sourceRect.height
  const columnSpan = slotWidth + gap
  const availableWidth = Math.max(gridRect.width, slotWidth)
  const columns = Math.max(1, Math.floor((availableWidth + gap) / columnSpan))
  const columnIndex = playIndex % columns
  const rowIndex = Math.floor(playIndex / columns)
  const targetLeft = gridRect.left + columnIndex * columnSpan
  const targetTop = gridRect.top + rowIndex * (slotHeight + gap)

  return new DOMRect(targetLeft, targetTop, slotWidth, slotHeight)
}

export const createPlayedCardAnimationState = (
  card: Card,
  sourceRect: DOMRect,
  targetRect: DOMRect,
): PlayedCardAnimationState => {
  const startCenterX = sourceRect.left + sourceRect.width / 2
  const startCenterY = sourceRect.top + sourceRect.height / 2
  const targetCenterX = targetRect.left + targetRect.width / 2
  const targetCenterY = targetRect.top + targetRect.height / 2

  return {
    card,
    startLeft: sourceRect.left,
    startTop: sourceRect.top,
    width: sourceRect.width,
    height: sourceRect.height,
    translateX: targetCenterX - startCenterX,
    translateY: targetCenterY - startCenterY,
    running: false,
  }
}

export const isPointInsideRect = (
  clientX: number,
  clientY: number,
  rect: DOMRect,
): boolean =>
  clientX >= rect.left &&
  clientX <= rect.right &&
  clientY >= rect.top &&
  clientY <= rect.bottom

export const resolveTrickGridElement = (): HTMLElement | null => {
  if (typeof document === 'undefined') {
    return null
  }

  const el = document.querySelector('.game-trick-block .trick-cards-grid')

  return el instanceof HTMLElement ? el : null
}
