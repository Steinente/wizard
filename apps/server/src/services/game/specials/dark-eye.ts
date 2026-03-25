import type { Card, WizardGameState } from '@wizard/shared'
import { createDecisionId, nowIso } from './special-utils.js'

interface DarkEyeOption {
  cardId: string
  cardLabel: string
}

const toOptions = (
  cards: Card[],
  getReadableCardLabel: (card: Card) => string,
): DarkEyeOption[] =>
  cards.map((card) => ({
    cardId: card.id,
    cardLabel: getReadableCardLabel(card),
  }))

export const enqueueDarkEyeTrumpChoice = (context: {
  state: WizardGameState
  playerId: string | null
  getReadableCardLabel: (card: Card) => string
}): Card[] => {
  const round = context.state.currentRound

  if (!round) {
    throw new Error('Round not initialized')
  }

  const drawnCards = round.drawPile.splice(0, 3)
  round.deckRemainderCount = round.drawPile.length

  if (!drawnCards.length || !context.playerId) {
    return drawnCards
  }

  context.state.pendingDecision = {
    id: createDecisionId(),
    type: 'darkEyeTrumpChoice',
    playerId: context.playerId,
    createdAt: nowIso(),
    special: 'darkEye',
    options: toOptions(drawnCards, context.getReadableCardLabel),
    drawnCards,
  }

  return drawnCards
}

export const enqueueDarkEyePlayChoice = (context: {
  state: WizardGameState
  playerId: string
  sourceCardId: string
  getReadableCardLabel: (card: Card) => string
}): Card[] => {
  const round = context.state.currentRound

  if (!round) {
    throw new Error('Round not initialized')
  }

  const drawnCards = round.drawPile.splice(0, 3)
  round.deckRemainderCount = round.drawPile.length

  if (!drawnCards.length) {
    return []
  }

  context.state.pendingDecision = {
    id: createDecisionId(),
    type: 'darkEyePlayChoice',
    playerId: context.playerId,
    createdAt: nowIso(),
    cardId: context.sourceCardId,
    special: 'darkEye',
    options: toOptions(drawnCards, context.getReadableCardLabel),
    drawnCards,
  }

  return drawnCards
}

export const resolveDarkEyeChoiceDecision = (context: {
  state: WizardGameState
  playerId: string
  selectedCardId: string
}): {
  decisionType: 'darkEyeTrumpChoice' | 'darkEyePlayChoice'
  selectedCard: Card
} => {
  const round = context.state.currentRound
  const pendingDecision = context.state.pendingDecision

  if (!round || !pendingDecision) {
    throw new Error('No dark eye choice pending')
  }

  if (
    pendingDecision.type !== 'darkEyeTrumpChoice' &&
    pendingDecision.type !== 'darkEyePlayChoice'
  ) {
    throw new Error('No dark eye choice pending')
  }

  if (pendingDecision.playerId !== context.playerId) {
    throw new Error('error.pendingDecision')
  }

  const selectedCard = pendingDecision.drawnCards.find(
    (entry) => entry.id === context.selectedCardId,
  )

  if (!selectedCard) {
    throw new Error('Invalid dark eye card selection')
  }

  const remainingCards = pendingDecision.drawnCards.filter(
    (entry) => entry.id !== context.selectedCardId,
  )

  round.drawPile.push(...remainingCards)
  round.deckRemainderCount = round.drawPile.length
  context.state.pendingDecision = null

  return {
    decisionType: pendingDecision.type,
    selectedCard,
  }
}
