import type { WizardGameState } from '@wizard/shared'

const dateToIso = (value: number) => new Date(value).toISOString()

const getOrCreatePlayerStats = (state: WizardGameState, playerId: string) => {
  const existing = state.playerInteractionStats.find(
    (entry) => entry.playerId === playerId,
  )

  if (existing) {
    return existing
  }

  const created = {
    playerId,
    totalInteractionTimeMs: 0,
    interactionCount: 0,
    pendingInteractionStartedAt: null,
  }

  state.playerInteractionStats.push(created)
  return created
}

const getActionablePlayerIds = (state: WizardGameState): string[] => {
  if (state.phase === 'finished' || state.phase === 'roundSetup') {
    return []
  }

  if (state.pendingDecision?.playerId) {
    return [state.pendingDecision.playerId]
  }

  const round = state.currentRound

  if (!round) {
    return []
  }

  if (state.phase === 'prediction') {
    if (state.config.predictionVisibility !== 'open') {
      return round.players
        .filter((player) => !player.prediction)
        .map((player) => player.playerId)
    }

    return round.activePlayerId ? [round.activePlayerId] : []
  }

  if (state.phase === 'playing' || state.phase === 'trumpSelection') {
    return round.activePlayerId ? [round.activePlayerId] : []
  }

  return []
}

export const syncActionableInteractionTimers = (
  state: WizardGameState,
  now = Date.now(),
) => {
  const actionablePlayerIds = new Set(getActionablePlayerIds(state))

  for (const player of state.players) {
    const stats = getOrCreatePlayerStats(state, player.playerId)
    const isActionable = actionablePlayerIds.has(player.playerId)

    if (isActionable && !stats.pendingInteractionStartedAt) {
      stats.pendingInteractionStartedAt = dateToIso(now)
      continue
    }

    if (!isActionable) {
      stats.pendingInteractionStartedAt = null
    }
  }
}

export const recordPlayerInteractionCompletion = (
  state: WizardGameState,
  playerId: string,
  now = Date.now(),
) => {
  const stats = getOrCreatePlayerStats(state, playerId)
  const startedAt = stats.pendingInteractionStartedAt

  let durationMs = 0
  if (startedAt) {
    const parsed = Date.parse(startedAt)
    if (Number.isFinite(parsed) && parsed <= now) {
      durationMs = now - parsed
    }
  }

  stats.totalInteractionTimeMs += durationMs
  stats.interactionCount += 1
  stats.pendingInteractionStartedAt = null
}
