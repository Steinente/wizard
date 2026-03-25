import {
  SPECIAL_CARD_KEY,
  type Card,
  type Suit,
  type WizardGameState,
} from '@wizard/shared'
import { createDecisionId, nowIso } from './special-utils.js'

interface ResolveWerewolfTrumpSwapContext {
  state: WizardGameState
  playerId: string
  suit: Suit | null
  registerResolvedEffect: (
    effect: WizardGameState['resolvedCardEffects'][number],
  ) => void
}

interface ResolveWerewolfTrumpSwapResult {
  playCardAfterSwap: Card | null
}

export const resolveWerewolfTrumpSwapDecision = (
  context: ResolveWerewolfTrumpSwapContext,
): ResolveWerewolfTrumpSwapResult => {
  if (!context.state.currentRound) {
    throw new Error('Round not initialized')
  }

  if (
    !context.state.pendingDecision ||
    context.state.pendingDecision.type !== 'werewolfTrumpSwap' ||
    context.state.pendingDecision.playerId !== context.playerId
  ) {
    throw new Error('No werewolf trump swap pending')
  }

  const roundPlayer = context.state.currentRound.players.find(
    (entry) => entry.playerId === context.playerId,
  )

  if (!roundPlayer) {
    throw new Error('Player is not part of the round')
  }

  const stagedPlayCard = context.state.pendingDecision.playCard ?? null
  const stagedWerewolfCardId = context.state.pendingDecision.cardId

  if (stagedPlayCard && stagedWerewolfCardId) {
    const werewolfCard: Card = {
      id: stagedWerewolfCardId,
      type: 'special',
      special: SPECIAL_CARD_KEY.werewolf,
      labelKey: 'card.special.werewolf',
    }

    context.state.currentRound.trumpCard = werewolfCard
    context.state.currentRound.trumpSuit = context.suit
    context.state.pendingDecision = null

    context.registerResolvedEffect({
      cardId: werewolfCard.id,
      ownerPlayerId: context.playerId,
      special: SPECIAL_CARD_KEY.werewolf,
      note: 'dark eye werewolf swapped trump',
    })

    context.state.logs.push({
      id: createDecisionId(),
      createdAt: nowIso(),
      type: 'specialEffect',
      messageKey: 'special.werewolf.pendingTrumpEffect',
      messageParams: {
        playerId: context.playerId,
        suit: context.suit ?? 'none',
        swappedCardLabel: describeCard(stagedPlayCard),
      },
    })

    return {
      playCardAfterSwap: stagedPlayCard,
    }
  }

  const werewolfCard = roundPlayer.hand.find(
    (entry) =>
      entry.type === 'special' && entry.special === SPECIAL_CARD_KEY.werewolf,
  )

  if (!werewolfCard) {
    throw new Error('Werewolf is not in hand')
  }

  const currentTrumpCard = context.state.currentRound.trumpCard

  if (!currentTrumpCard) {
    throw new Error('No trump card available to swap')
  }

  roundPlayer.hand = roundPlayer.hand.filter(
    (entry) => entry.id !== werewolfCard.id,
  )
  roundPlayer.hand.push(currentTrumpCard)

  context.state.currentRound.trumpCard = werewolfCard
  context.state.currentRound.trumpSuit = context.suit
  context.state.currentRound.activePlayerId =
    context.state.currentRound.roundLeaderPlayerId
  context.state.phase = 'prediction'
  context.state.pendingDecision = null

  context.registerResolvedEffect({
    cardId: werewolfCard.id,
    ownerPlayerId: context.playerId,
    special: SPECIAL_CARD_KEY.werewolf,
    note: 'trump swapped',
  })

  context.state.logs.push({
    id: createDecisionId(),
    createdAt: nowIso(),
    type: 'specialEffect',
    messageKey: 'special.werewolf.pendingTrumpEffect',
    messageParams: {
      playerId: context.playerId,
      suit: context.suit ?? 'none',
      swappedCardLabel: describeCard(currentTrumpCard),
    },
  })

  return {
    playCardAfterSwap: null,
  }
}

const describeCard = (card: Card): string => {
  if (card.type === 'number') {
    return `${card.suit} ${card.value}`
  }

  if (card.type === 'wizard') {
    return 'wizard'
  }

  if (card.type === 'jester') {
    return 'jester'
  }

  return card.special
}
