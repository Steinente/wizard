import type {
  GameLogColorKey,
  PredictionViewItem,
  RoundPlayerViewState,
  RoundViewState,
  Suit,
  WizardGameState,
  WizardGameViewState,
} from '@wizard/shared'

type RoundColorToken = Suit | 'none'

const PREVIOUS_ROUND_MESSAGE_KEYS = new Set([
  'special.witch.noHandCard',
  'game.round.scored',
  'game.finished',
])

const isSuitValue = (value: unknown): value is Suit =>
  value === 'red' || value === 'yellow' || value === 'green' || value === 'blue'

const getRoundColorToken = (
  entry: Pick<WizardGameState['logs'][number], 'messageKey' | 'messageParams'>,
): RoundColorToken | undefined => {
  switch (entry.messageKey) {
    case 'game.trump.roundStart':
    case 'game.trump.roundStart.withValue':
    case 'game.trump.selected':
    case 'game.trump.selected.bySpecial':
    case 'special.werewolf.pendingTrumpEffect': {
      const suit = entry.messageParams?.suit

      if (suit === 'none' || suit === null) {
        return 'none'
      }

      return isSuitValue(suit) ? suit : undefined
    }
    case 'game.trump.noTrumpDueToCard':
    case 'game.trump.noTrumpFinalRound':
      return 'none'
    default:
      return undefined
  }
}

const toRoundColorKey = (
  token: RoundColorToken,
  consecutiveRoundCount: number,
): GameLogColorKey => {
  return toColorKeyForTone(token, consecutiveRoundCount % 2 === 0)
}

const toColorKeyForTone = (
  token: RoundColorToken,
  useAlternateTone: boolean,
): GameLogColorKey => {
  switch (token) {
    case 'red':
      return useAlternateTone ? 'redAlt' : 'red'
    case 'yellow':
      return useAlternateTone ? 'yellowAlt' : 'yellow'
    case 'green':
      return useAlternateTone ? 'greenAlt' : 'green'
    case 'blue':
      return useAlternateTone ? 'blueAlt' : 'blue'
    case 'none':
      return useAlternateTone ? 'grayAlt' : 'gray'
  }
}

const buildLogColorKeyById = (
  logs: WizardGameState['logs'],
): {
  backgroundColorKeyById: Map<string, GameLogColorKey>
  borderColorKeyById: Map<string, GameLogColorKey>
} => {
  if (!logs.length) {
    return {
      backgroundColorKeyById: new Map(),
      borderColorKeyById: new Map(),
    }
  }

  const roundIndexByLogId = new Map<string, number>()
  const roundTokens = new Map<number, RoundColorToken>()
  const roundColorKeyByIndex = new Map<number, GameLogColorKey>()
  const roundUsesAlternateTone = new Map<number, boolean>()
  const backgroundColorKeyById = new Map<string, GameLogColorKey>()
  const borderColorKeyById = new Map<string, GameLogColorKey>()

  let currentRoundIndex = 0
  let roundNumber = 1
  let completedTricksInRound = 0

  const isTrickCompletionLog = (
    entry: WizardGameState['logs'][number],
  ): boolean =>
    entry.type === 'trickWon' ||
    entry.messageKey === 'game.trick.canceledByBomb'

  const previousRoundIndex = () => Math.max(0, currentRoundIndex - 1)

  for (const entry of logs) {
    const targetRoundIndex = PREVIOUS_ROUND_MESSAGE_KEYS.has(entry.messageKey)
      ? previousRoundIndex()
      : currentRoundIndex

    roundIndexByLogId.set(entry.id, targetRoundIndex)

    if (!roundTokens.has(targetRoundIndex)) {
      const token = getRoundColorToken(entry)

      if (token) {
        roundTokens.set(targetRoundIndex, token)
      }
    }

    if (!isTrickCompletionLog(entry)) {
      continue
    }

    completedTricksInRound += 1

    if (completedTricksInRound >= roundNumber) {
      completedTricksInRound = 0
      roundNumber += 1
      currentRoundIndex += 1
    }
  }

  let previousResolvedToken: RoundColorToken | null = null
  let consecutiveRoundCount = 0

  for (let roundIndex = 0; roundIndex <= currentRoundIndex; roundIndex += 1) {
    const token = roundTokens.get(roundIndex)

    if (!token) {
      roundColorKeyByIndex.set(roundIndex, 'gray')
      roundUsesAlternateTone.set(roundIndex, false)
      continue
    }

    if (token === previousResolvedToken) {
      consecutiveRoundCount += 1
    } else {
      previousResolvedToken = token
      consecutiveRoundCount = 1
    }

    const useAlternateTone = consecutiveRoundCount % 2 === 0

    roundUsesAlternateTone.set(roundIndex, useAlternateTone)
    roundColorKeyByIndex.set(
      roundIndex,
      toRoundColorKey(token, consecutiveRoundCount),
    )
  }

  const currentBorderTokenByRound = new Map<number, RoundColorToken>()

  for (const entry of logs) {
    const roundIndex = roundIndexByLogId.get(entry.id) ?? 0
    const backgroundColorKey = roundColorKeyByIndex.get(roundIndex) ?? 'gray'
    const token = getRoundColorToken(entry)

    backgroundColorKeyById.set(entry.id, backgroundColorKey)

    if (token) {
      currentBorderTokenByRound.set(roundIndex, token)
    }

    const effectiveBorderToken = currentBorderTokenByRound.get(roundIndex)

    if (!effectiveBorderToken) {
      borderColorKeyById.set(entry.id, 'gray')
      continue
    }

    borderColorKeyById.set(
      entry.id,
      toColorKeyForTone(
        effectiveBorderToken,
        roundUsesAlternateTone.get(roundIndex) ?? false,
      ),
    )
  }

  return {
    backgroundColorKeyById,
    borderColorKeyById,
  }
}

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
  prediction: toPredictionView(
    player.prediction,
    player.playerId === selfPlayerId,
  ),
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
): WizardGameViewState => {
  const visibleLogs = state.logs.filter(
    (entry) =>
      !entry.visibleToPlayerId || entry.visibleToPlayerId === selfPlayerId,
  )
  const { backgroundColorKeyById, borderColorKeyById } =
    buildLogColorKeyById(visibleLogs)

  return {
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
    playerInteractionStats: state.playerInteractionStats.map((entry) => ({
      playerId: entry.playerId,
      totalInteractionTimeMs: entry.totalInteractionTimeMs,
      interactionCount: entry.interactionCount,
    })),
    scoreboard: state.scoreboard,
    logs: visibleLogs.map((entry) => ({
      ...entry,
      colorKey: backgroundColorKeyById.get(entry.id) ?? 'gray',
      borderColorKey: borderColorKeyById.get(entry.id) ?? 'gray',
    })),
    chatMessages: state.chatMessages,
    pendingDecision: (() => {
      const decision = state.pendingDecision

      if (!decision) {
        return null
      }

      if (decision.playerId === selfPlayerId) {
        return decision
      }

      if (
        decision.type === 'darkEyeTrumpChoice' ||
        decision.type === 'darkEyePlayChoice'
      ) {
        return {
          ...decision,
          options: [],
          drawnCards: [],
          playCard: undefined,
        }
      }

      return decision
    })(),
    resolvedCardEffects: state.resolvedCardEffects,
    createdAt: state.createdAt,
    updatedAt: state.updatedAt,
  }
}
