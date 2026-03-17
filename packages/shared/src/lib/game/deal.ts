import type { Card } from '../cards.js'

export interface DealResult {
  hands: Record<string, Card[]>
  trumpCard: Card | null
  remainingDeck: Card[]
}

export const dealCards = (
  deck: ReadonlyArray<Card>,
  playerIds: ReadonlyArray<string>,
  cardsPerPlayer: number,
): DealResult => {
  const workingDeck = [...deck]
  const hands: Record<string, Card[]> = Object.fromEntries(
    playerIds.map((playerId) => [playerId, [] as Card[]]),
  )

  for (let round = 0; round < cardsPerPlayer; round += 1) {
    for (const playerId of playerIds) {
      const nextCard = workingDeck.shift()

      if (!nextCard) {
        throw new Error('Not enough cards in deck while dealing')
      }

      hands[playerId].push(nextCard)
    }
  }

  return {
    hands,
    trumpCard: workingDeck.shift() ?? null,
    remainingDeck: workingDeck,
  }
}
