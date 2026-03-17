import type { WizardGameState } from '@wizard/shared'
import { createDecisionId, nowIso } from './special-utils.js'

export const applyDragonImmediateEffect = (
  state: WizardGameState,
  playerId: string,
) => {
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
