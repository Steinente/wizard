import type {
  BeforePlaySpecialContext,
  BeforePlaySpecialResult,
} from './special-types.js'
import { createDecisionId, nowIso } from './special-utils.js'

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
