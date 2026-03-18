import type {
  PredictionViewItem,
  RoundPlayerViewState,
  RoundViewState,
  WizardGameState,
  WizardGameViewState,
} from '@wizard/shared'

const toPredictionView = (
  prediction: {
    playerId: string
    value: number
    revealed: boolean
    changedByCloud: boolean
    cloudDelta?: 1 | -1 | 0 | null
  } | null,
  isSelf: boolean,
): PredictionViewItem | null => {
  if (!prediction) {
    return null
  }

  return {
    playerId: prediction.playerId,
    value: prediction.revealed || isSelf ? prediction.value : null,
    revealed: prediction.revealed,
    changedByCloud: prediction.changedByCloud,
    cloudDelta: prediction.cloudDelta ?? 0,
  }
}

const toRoundPlayerView = (
  player: WizardGameState['currentRound'] extends infer R
    ? R extends { players: infer P }
      ? P extends Array<infer Item>
        ? Item
        : never
      : never
    : never,
  selfPlayerId: string,
): RoundPlayerViewState => ({
  playerId: player.playerId,
  hand: player.playerId === selfPlayerId ? player.hand : [],
  handCount: player.hand.length,
  tricksWon: player.tricksWon,
  prediction: toPredictionView(player.prediction, player.playerId === selfPlayerId),
  pendingCloudAdjustment: player.pendingCloudAdjustment ?? false,
})

const toRoundView = (
  round: NonNullable<WizardGameState['currentRound']>,
  selfPlayerId: string,
): RoundViewState => ({
  roundNumber: round.roundNumber,
  dealerIndex: round.dealerIndex,
  activePlayerId: round.activePlayerId,
  roundLeaderPlayerId: round.roundLeaderPlayerId,
  trumpSuit: round.trumpSuit,
  trumpCard: round.trumpCard,
  deckRemainderCount: round.deckRemainderCount,
  players: round.players.map((player) =>
    toRoundPlayerView(player, selfPlayerId),
  ),
  currentTrick: round.currentTrick,
  completedTricks: round.completedTricks,
})

export const createGameStateView = (
  state: WizardGameState,
  selfPlayerId: string,
  spectators: string[],
  playerPresence: Record<string, 'online' | 'away' | 'offline'>,
): WizardGameViewState => ({
  selfPlayerId,
  lobbyCode: state.lobbyCode,
  lobbyStatus: state.lobbyStatus,
  config: state.config,
  players: state.players.map((player) => ({
    ...player,
    presence: playerPresence[player.playerId] ?? 'offline',
  })),
  spectators,
  phase: state.phase,
  maxRounds: state.maxRounds,
  currentRound: state.currentRound
    ? toRoundView(state.currentRound, selfPlayerId)
    : null,
  scoreboard: state.scoreboard,
  logs: state.logs.filter(
    (entry) =>
      !entry.visibleToPlayerId || entry.visibleToPlayerId === selfPlayerId,
  ),
  pendingDecision: state.pendingDecision,
  resolvedCardEffects: state.resolvedCardEffects,
  createdAt: state.createdAt,
  updatedAt: state.updatedAt,
})
