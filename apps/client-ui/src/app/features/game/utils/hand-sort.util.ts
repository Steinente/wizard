import { SUITS, type Card, type Suit } from '@wizard/shared'

const SPECIAL_SORT_PRIORITY: Record<string, number> = {
  dragon: 90,
  shapeShifter: 80,
  wizard: 70,
  werewolf: 60,
  darkEye: 55,
  cloud: 50,
  juggler: 40,
  bomb: 30,
  jester: 20,
  fairy: 10,
  witch: 5,
}

const SUIT_SORT_PRIORITY = [...SUITS].reverse().reduce(
  (priority, suit, index) => {
    priority[suit] = SUITS.length - index
    return priority
  },
  {} as Record<Suit, number>,
)

export const applyManualHandOrder = (cards: Card[], manualOrder: string[]) => {
  const orderIndex = new Map(
    manualOrder.map((cardId, index) => [cardId, index] as const),
  )

  return [...cards].sort((left, right) => {
    const leftIndex = orderIndex.get(left.id) ?? Number.MAX_SAFE_INTEGER
    const rightIndex = orderIndex.get(right.id) ?? Number.MAX_SAFE_INTEGER

    return leftIndex - rightIndex
  })
}

export const sortHandCards = (cards: Card[], trumpSuit: Suit | null) =>
  [...cards].sort((left, right) =>
    compareCardsForHandSort(left, right, trumpSuit),
  )

export const reorderHandCards = (
  cards: Card[],
  draggedCardId: string,
  targetCardId: string,
) => {
  const draggedIndex = cards.findIndex((card) => card.id === draggedCardId)
  const targetIndex = cards.findIndex((card) => card.id === targetCardId)

  if (draggedIndex < 0 || targetIndex < 0 || draggedIndex === targetIndex) {
    return null
  }

  const reordered = [...cards]
  const [draggedCard] = reordered.splice(draggedIndex, 1)

  if (!draggedCard) {
    return null
  }

  reordered.splice(targetIndex, 0, draggedCard)
  return reordered
}

const compareCardsForHandSort = (
  left: Card,
  right: Card,
  trumpSuit: Suit | null,
) => {
  const leftIsNumber = left.type === 'number'
  const rightIsNumber = right.type === 'number'

  if (leftIsNumber !== rightIsNumber) {
    return leftIsNumber ? 1 : -1
  }

  if (!leftIsNumber && !rightIsNumber) {
    return specialSortPriority(right) - specialSortPriority(left)
  }

  if (left.type !== 'number' || right.type !== 'number') {
    return 0
  }

  const leftSuitPriority = numberSuitPriority(left.suit, trumpSuit)
  const rightSuitPriority = numberSuitPriority(right.suit, trumpSuit)

  if (leftSuitPriority !== rightSuitPriority) {
    return rightSuitPriority - leftSuitPriority
  }

  return right.value - left.value
}

const specialSortPriority = (card: Exclude<Card, { type: 'number' }>) => {
  if (card.type === 'wizard') {
    return SPECIAL_SORT_PRIORITY.wizard
  }

  if (card.type === 'jester') {
    return SPECIAL_SORT_PRIORITY.jester
  }

  return SPECIAL_SORT_PRIORITY[card.special] ?? 0
}

const numberSuitPriority = (suit: Suit, trumpSuit: Suit | null) => {
  if (suit === trumpSuit) {
    return 100
  }

  return SUIT_SORT_PRIORITY[suit]
}
