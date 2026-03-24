import type { Card, WizardGameState } from '@wizard/shared'
import type {
  BeforePlaySpecialContext,
  BeforePlaySpecialResult,
} from './special-types.js'
import { createDecisionId, nowIso } from './special-utils.js'
import { createVampireCopiedCard } from './vampire.js'

interface ResolveShapeShifterContext {
  state: WizardGameState
  playerId: string
  cardId: string
  mode: 'wizard' | 'jester'
  registerResolvedEffect: (
    effect: WizardGameState['resolvedCardEffects'][number],
  ) => void
  removeCardFromHand: (playerId: string, cardId: string) => Card
  appendCardToCurrentTrick: (playerId: string, card: Card) => void
}

export const handleShapeShifterBeforePlay = (
  context: BeforePlaySpecialContext,
): BeforePlaySpecialResult => {
  context.state.pendingDecision = {
    id: createDecisionId(),
    type: 'shapeShifterChoice',
    playerId: context.playerId,
    createdAt: nowIso(),
    cardId: context.card.id,
    special: context.card.special,
    modeOptions: ['wizard', 'jester'],
  }

  return {
    requiresDecision: true,
    messageKey: 'special.shapeShifter.choose',
  }
}

export const resolveShapeShifterDecision = (
  context: ResolveShapeShifterContext,
) => {
  if (
    !context.state.pendingDecision ||
    context.state.pendingDecision.type !== 'shapeShifterChoice' ||
    context.state.pendingDecision.playerId !== context.playerId ||
    context.state.pendingDecision.cardId !== context.cardId
  ) {
    throw new Error('No matching shape shifter decision pending')
  }

  const roundPlayer = context.state.currentRound?.players.find(
    (entry) => entry.playerId === context.playerId,
  )
  const pendingCard = roundPlayer?.hand.find(
    (entry) => entry.id === context.cardId,
  )
  const isVampireShapeShifterCopy =
    pendingCard?.type === 'special' && pendingCard.special === 'vampire'

  context.registerResolvedEffect({
    cardId: context.cardId,
    ownerPlayerId: context.playerId,
    special: isVampireShapeShifterCopy ? 'vampire' : 'shapeShifter',
    ...(isVampireShapeShifterCopy
      ? {
          copiedCard: createVampireCopiedCard(context.cardId, 'shapeShifter'),
        }
      : {}),
    shapeShifterMode: context.mode,
    note: isVampireShapeShifterCopy
      ? 'vampire copied shape shifter mode chosen by player'
      : 'chosen by player',
  })

  context.state.pendingDecision = null

  const card = context.removeCardFromHand(context.playerId, context.cardId)
  context.appendCardToCurrentTrick(context.playerId, card)

  context.state.logs.push({
    id: createDecisionId(),
    createdAt: nowIso(),
    type: 'specialEffect',
    messageKey: 'special.shapeShifter.resolved',
    messageParams: {
      playerId: context.playerId,
      mode: context.mode === 'wizard' ? 'card.wizard' : 'card.jester',
    },
  })
}
