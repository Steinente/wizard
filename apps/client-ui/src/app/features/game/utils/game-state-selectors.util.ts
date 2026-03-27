import type { PendingDecision, WizardGameViewState } from '@wizard/shared'

export const isPendingDecisionActor = (
  pendingDecision: PendingDecision,
  playerId: string,
) => {
  if (pendingDecision.type === 'jugglerPassCard') {
    return pendingDecision.remainingPlayerIds.includes(playerId)
  }

  return pendingDecision.playerId === playerId
}

export const getOwnPendingDecision = (
  state: WizardGameViewState | null | undefined,
) => {
  if (!state?.pendingDecision) {
    return null
  }

  return isPendingDecisionActor(state.pendingDecision, state.selfPlayerId)
    ? state.pendingDecision
    : null
}

export const canPlayerPredict = (
  state: WizardGameViewState | null | undefined,
  playerId: string,
) => {
  if (!state || state.phase !== 'prediction') {
    return false
  }

  const ownRoundPlayer = state.currentRound?.players.find(
    (entry) => entry.playerId === playerId,
  )

  if (!ownRoundPlayer || ownRoundPlayer.prediction) {
    return false
  }

  if (state.config.predictionVisibility !== 'open') {
    return true
  }

  return state.currentRound?.activePlayerId === playerId
}

export const isRoundPlayerActive = (
  state: WizardGameViewState,
  playerId: string,
) => {
  if (state.pendingDecision) {
    return isPendingDecisionActor(state.pendingDecision, playerId)
  }

  if (
    state.phase === 'prediction' &&
    state.config.predictionVisibility !== 'open'
  ) {
    const roundPlayer = state.currentRound?.players.find(
      (player) => player.playerId === playerId,
    )

    return !roundPlayer?.prediction
  }

  return state.currentRound?.activePlayerId === playerId
}
