import type { Card, Suit, WizardGameState } from '@wizard/shared'
import type {
  BeforePlaySpecialContext,
  BeforePlaySpecialResult,
} from './special-types.js'
import { createDecisionId, nowIso } from './special-utils.js'

interface ResolveCloudContext {
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

interface ResolveCloudAdjustmentContext {
  state: WizardGameState
  playerId: string
  delta: 1 | -1
  finishRoundAndAdvance: () => Promise<void> | void
}

export const handleCloudBeforePlay = (
  context: BeforePlaySpecialContext,
): BeforePlaySpecialResult => {
  context.state.pendingDecision = {
    id: createDecisionId(),
    type: 'cloudSuitChoice',
    playerId: context.playerId,
    createdAt: nowIso(),
    cardId: context.card.id,
    special: 'cloud',
    allowedSuits: ['red', 'yellow', 'green', 'blue'],
  }

  return {
    requiresDecision: true,
    messageKey: 'special.cloud.chooseSuit',
  }
}

export const resolveCloudDecision = (context: ResolveCloudContext) => {
  if (
    !context.state.pendingDecision ||
    context.state.pendingDecision.type !== 'cloudSuitChoice' ||
    context.state.pendingDecision.playerId !== context.playerId ||
    context.state.pendingDecision.cardId !== context.cardId
  ) {
    throw new Error('No matching cloud decision pending')
  }

  context.registerResolvedEffect({
    cardId: context.cardId,
    ownerPlayerId: context.playerId,
    special: 'cloud',
    chosenSuit: context.suit,
    chosenValue: 9.75,
    note: 'cloud suit chosen',
  })

  context.state.pendingDecision = null

  const card = context.removeCardFromHand(context.playerId, context.cardId)
  context.appendCardToCurrentTrick(context.playerId, card)

  context.state.logs.push({
    id: createDecisionId(),
    createdAt: nowIso(),
    type: 'specialEffect',
    messageKey: 'special.cloud.played',
    messageParams: {
      playerId: context.playerId,
      suit: context.suit,
    },
  })
}

export const resolveCloudAdjustmentDecision = async (
  context: ResolveCloudAdjustmentContext,
) => {
  if (
    !context.state.pendingDecision ||
    context.state.pendingDecision.type !== 'cloudPredictionAdjustment' ||
    context.state.pendingDecision.playerId !== context.playerId
  ) {
    throw new Error('No cloud prediction adjustment pending')
  }

  const roundPlayer = context.state.currentRound?.players.find(
    (entry) => entry.playerId === context.playerId,
  )

  if (!roundPlayer?.prediction || !context.state.currentRound) {
    throw new Error('Prediction not found')
  }

  const nextValue = roundPlayer.prediction.value + context.delta

  if (nextValue < 0 || nextValue > context.state.currentRound.roundNumber) {
    throw new Error('Adjusted prediction is out of range')
  }

  roundPlayer.prediction.value = nextValue
  roundPlayer.prediction.changedByCloud = true
  roundPlayer.prediction.cloudDelta = context.delta
  roundPlayer.prediction.revealed = true
  roundPlayer.pendingCloudAdjustment = false
  context.state.pendingDecision = null

  context.state.logs.push({
    id: createDecisionId(),
    createdAt: nowIso(),
    type: 'specialEffect',
    messageKey: 'special.cloud.predictionAdjusted',
    messageParams: {
      playerId: context.playerId,
      delta: context.delta,
    },
  })

  await context.finishRoundAndAdvance()
}
