import type { Card, Suit } from '../cards.js'

const isAlwaysPlayable = (card: Card) =>
  card.type === 'wizard' || card.type === 'jester' || card.type === 'special'

const hasMatchingSuit = (card: Card, suit: Suit) =>
  card.type === 'number' && card.suit === suit

export const isLegalPlay = (
  hand: Card[],
  cardToPlay: Card,
  leadSuit: Suit | null,
): boolean => {
  if (isAlwaysPlayable(cardToPlay)) {
    return true
  }

  if (!leadSuit) {
    return true
  }

  const hasLeadSuitInHand = hand.some((card) => hasMatchingSuit(card, leadSuit))

  if (!hasLeadSuitInHand) {
    return true
  }

  return hasMatchingSuit(cardToPlay, leadSuit)
}
