import type { Card, WizardGameState } from '@wizard/shared'
import { createDecisionId, nowIso } from './special-utils.js'

export const disablesFollowSuitForDragonLead = (card: Card): boolean =>
  card.type === 'special' && card.special === 'dragon'

export const logDragonPlayed = (state: WizardGameState, playerId: string) => {
  state.logs.push({
    id: createDecisionId(),
    createdAt: nowIso(),
    type: 'specialEffect',
    messageKey: 'special.dragon.played',
    messageParams: {
      playerId,
    },
  })
}
