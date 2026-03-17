import type { WizardGameState } from '@wizard/shared'
import { createDecisionId, nowIso } from './special-utils.js'

export const applyBombImmediateEffect = (
  state: WizardGameState,
  playerId: string,
) => {
  state.logs.push({
    id: createDecisionId(),
    createdAt: nowIso(),
    type: 'specialEffect',
    messageKey: 'special.bomb.played',
    messageParams: {
      playerId,
    },
  })
}
