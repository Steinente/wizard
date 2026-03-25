import {
  SPECIAL_CARD_KEY,
  type Card,
  type Suit,
  type WizardGameState,
} from '@wizard/shared'
import type {
  BeforePlaySpecialContext,
  BeforePlaySpecialResult,
} from './special-types.js'
import { createDecisionId, nowIso } from './special-utils.js'
import { createVampireCopiedCard } from './vampire.js'

interface ResolveJugglerContext {
  state: WizardGameState
  playerId: string
  cardId: string
  suit: Suit
  registerResolvedEffect: (
    effect: WizardGameState['resolvedCardEffects'][number],
  ) => void
  removeCardFromHand: (playerId: string, cardId: string) => Card
  appendCardToCurrentTrick: (playerId: string, card: Card) => void
}

interface SelectJugglerPassCardContext {
  state: WizardGameState
  playerId: string
  cardId: string
  removeCardFromHand: (playerId: string, cardId: string) => Card
  getReadableCardLabel: (card: Card) => string
}

export const handleJugglerBeforePlay = (
  context: BeforePlaySpecialContext,
): BeforePlaySpecialResult => {
  context.state.pendingDecision = {
    id: createDecisionId(),
    type: 'jugglerSuitChoice',
    playerId: context.playerId,
    createdAt: nowIso(),
    cardId: context.card.id,
    special: SPECIAL_CARD_KEY.juggler,
    allowedSuits: ['red', 'yellow', 'green', 'blue'],
  }

  return {
    requiresDecision: true,
    messageKey: 'special.juggler.chooseSuit',
  }
}

export const resolveJugglerDecision = (context: ResolveJugglerContext) => {
  if (
    !context.state.pendingDecision ||
    context.state.pendingDecision.type !== 'jugglerSuitChoice' ||
    context.state.pendingDecision.playerId !== context.playerId ||
    context.state.pendingDecision.cardId !== context.cardId
  ) {
    throw new Error('No matching juggler decision pending')
  }

  const isVampireJugglerCopy =
    context.state.pendingDecision.special === SPECIAL_CARD_KEY.vampire
  const stagedCard = context.state.pendingDecision.playCard

  context.registerResolvedEffect({
    cardId: context.cardId,
    ownerPlayerId: context.playerId,
    special: isVampireJugglerCopy
      ? SPECIAL_CARD_KEY.vampire
      : SPECIAL_CARD_KEY.juggler,
    ...(isVampireJugglerCopy
      ? {
          copiedCard: createVampireCopiedCard(
            context.cardId,
            SPECIAL_CARD_KEY.juggler,
          ),
        }
      : {}),
    chosenSuit: context.suit,
    chosenValue: 7.5,
    note: isVampireJugglerCopy
      ? 'vampire copied juggler suit chosen'
      : 'juggler suit chosen',
  })

  context.state.pendingDecision = null

  const card =
    stagedCard && stagedCard.id === context.cardId
      ? stagedCard
      : context.removeCardFromHand(context.playerId, context.cardId)
  context.appendCardToCurrentTrick(context.playerId, card)

  if (!isVampireJugglerCopy) {
    context.state.logs.push({
      id: createDecisionId(),
      createdAt: nowIso(),
      type: 'specialEffect',
      messageKey: 'special.juggler.played',
      messageParams: {
        playerId: context.playerId,
        suit: context.suit,
      },
    })
  }
}

export const selectJugglerPassCardSelection = (
  context: SelectJugglerPassCardContext,
): { completed: boolean } => {
  if (
    !context.state.pendingDecision ||
    context.state.pendingDecision.type !== 'jugglerPassCard'
  ) {
    throw new Error('No juggler pass selection pending')
  }

  if (
    !context.state.pendingDecision.remainingPlayerIds.includes(context.playerId)
  ) {
    throw new Error('No juggler pass selection pending')
  }

  const roundPlayer = context.state.currentRound?.players.find(
    (entry) => entry.playerId === context.playerId,
  )

  if (!roundPlayer?.hand.some((card) => card.id === context.cardId)) {
    throw new Error('Card not found in hand')
  }

  context.state.pendingDecision.selections[context.playerId] = context.cardId
  context.state.pendingDecision.remainingPlayerIds =
    context.state.pendingDecision.remainingPlayerIds.filter(
      (entry) => entry !== context.playerId,
    )

  if (context.state.pendingDecision.remainingPlayerIds.length > 0) {
    return { completed: false }
  }

  const ordered = context.state.pendingDecision.orderedPlayerIds
  const selections = context.state.pendingDecision.selections

  const removedCards = ordered.map((playerId) => {
    const selectedCardId = selections[playerId]

    if (!selectedCardId) {
      throw new Error('Missing juggler selection')
    }

    return {
      fromPlayerId: playerId,
      card: context.removeCardFromHand(playerId, selectedCardId),
    }
  })

  removedCards.forEach((entry, index) => {
    const receiverPlayerId = ordered[(index + 1) % ordered.length]
    const receiver = context.state.currentRound?.players.find(
      (player) => player.playerId === receiverPlayerId,
    )

    if (receiver) {
      receiver.hand.push(entry.card)

      context.state.logs.push({
        id: createDecisionId(),
        createdAt: nowIso(),
        type: 'specialEffect',
        messageKey: 'special.juggler.pass.receivedCard',
        messageParams: {
          cardLabel: context.getReadableCardLabel(entry.card),
        },
        visibleToPlayerId: receiverPlayerId,
      })
    }
  })

  context.state.logs.push({
    id: createDecisionId(),
    createdAt: nowIso(),
    type: 'specialEffect',
    messageKey: 'special.juggler.pass.completed',
  })

  context.state.pendingDecision = null

  return { completed: true }
}
