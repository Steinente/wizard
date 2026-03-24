import type {
  Card,
  GameConfig,
  SpecialCardKey,
  Suit,
  WizardGameState,
} from '@wizard/shared'
import {
  SPECIAL_CARD_KEYS,
  filterOutBombPlays,
  resolveTrickWinner,
} from '@wizard/shared'
import { prisma } from '../../db/prisma.js'
import type { Prisma } from '../../generated/prisma/client.js'
import {
  OpenPredictionRestriction,
  PredictionVisibility,
} from '../../generated/prisma/client.js'
import {
  disablesFollowSuitForDragonLead,
  disablesFollowSuitForWitchLead,
} from './specials/index.js'

export const normalizeCode = (code: string) => code.trim().toUpperCase()

export const parseSpecialCardSettings = (
  value: string | null,
): {
  includedSpecialCards: SpecialCardKey[]
  cloudRuleTiming: GameConfig['cloudRuleTiming']
  specialCardsRandomizerEnabled: boolean
} => {
  const fallback = {
    includedSpecialCards: [...SPECIAL_CARD_KEYS],
    cloudRuleTiming: 'endOfRound' as const,
    specialCardsRandomizerEnabled: false,
  }

  if (value === null) return fallback

  try {
    const parsed = JSON.parse(value)

    if (Array.isArray(parsed)) {
      return {
        includedSpecialCards: parsed as SpecialCardKey[],
        cloudRuleTiming: fallback.cloudRuleTiming,
        specialCardsRandomizerEnabled: fallback.specialCardsRandomizerEnabled,
      }
    }

    if (parsed && typeof parsed === 'object') {
      const maybeCards = (parsed as { includedSpecialCards?: unknown })
        .includedSpecialCards
      const maybeTiming = (parsed as { cloudRuleTiming?: unknown })
        .cloudRuleTiming
      const maybeRandomizer = (
        parsed as { specialCardsRandomizerEnabled?: unknown }
      ).specialCardsRandomizerEnabled

      return {
        includedSpecialCards: Array.isArray(maybeCards)
          ? (maybeCards as SpecialCardKey[])
          : fallback.includedSpecialCards,
        cloudRuleTiming:
          maybeTiming === 'immediateAfterTrick'
            ? 'immediateAfterTrick'
            : 'endOfRound',
        specialCardsRandomizerEnabled: maybeRandomizer === true,
      }
    }

    return fallback
  } catch {
    return fallback
  }
}

const toPredictionVisibility = (
  value: PredictionVisibility,
): GameConfig['predictionVisibility'] =>
  value === PredictionVisibility.HIDDEN
    ? 'hidden'
    : value === PredictionVisibility.SECRET
      ? 'secret'
      : 'open'

const toOpenPredictionRestriction = (
  value: OpenPredictionRestriction,
): GameConfig['openPredictionRestriction'] =>
  value === OpenPredictionRestriction.MUST_EQUAL_TRICKS
    ? 'mustEqualTricks'
    : value === OpenPredictionRestriction.MUST_NOT_EQUAL_TRICKS
      ? 'mustNotEqualTricks'
      : 'none'

export const loadLobbyByCode = async (code: string) =>
  prisma.lobby.findUnique({
    where: { code: normalizeCode(code) },
    include: {
      players: {
        orderBy: {
          joinedAt: 'asc',
        },
      },
      gameState: true,
    },
  })

export type LobbyWithPlayers = Awaited<ReturnType<typeof loadLobbyByCode>>

export const lobbyConfigToShared = (
  lobby: NonNullable<LobbyWithPlayers>,
): GameConfig => ({
  ...parseSpecialCardSettings(lobby.includedSpecialCards),
  predictionVisibility: toPredictionVisibility(lobby.predictionVisibility),
  openPredictionRestriction: toOpenPredictionRestriction(
    lobby.openPredictionRestriction,
  ),
  readLogEnabledByDefault: lobby.readLogEnabledByDefault,
  languageDefault: lobby.languageDefault === 'de' ? 'de' : 'en',
})

export const serializeSpecialCardSettings = (settings: {
  includedSpecialCards: SpecialCardKey[]
  cloudRuleTiming: GameConfig['cloudRuleTiming']
  specialCardsRandomizerEnabled: boolean
}) => JSON.stringify(settings)

export const toJson = (value: WizardGameState): Prisma.JsonObject =>
  JSON.parse(JSON.stringify(value)) as Prisma.JsonObject

export const fromJson = (value: unknown): WizardGameState => {
  const state = value as WizardGameState & { chatMessages?: unknown }

  if (!Array.isArray(state.chatMessages)) {
    state.chatMessages = []
  }

  if (state.currentRound && !Array.isArray(state.currentRound.drawPile)) {
    state.currentRound.drawPile = []
  }

  return state as WizardGameState
}

export const nowIso = () => new Date().toISOString()

export const getPlayerBySessionToken = (
  lobby: NonNullable<LobbyWithPlayers>,
  sessionToken: string,
) => {
  const player = lobby.players.find(
    (entry) => entry.sessionToken === sessionToken,
  )

  if (!player) {
    throw new Error('Player not found in lobby')
  }

  return player
}

export const getSeatOrderedPlayerIds = (state: WizardGameState) =>
  state.players
    .slice()
    .sort((a, b) => a.seatIndex - b.seatIndex)
    .map((player) => player.playerId)

export const getNextPlayerId = (
  orderedPlayerIds: string[],
  currentPlayerId: string,
): string | null => {
  const index = orderedPlayerIds.findIndex(
    (playerId) => playerId === currentPlayerId,
  )

  if (index === -1) {
    return null
  }

  return orderedPlayerIds[(index + 1) % orderedPlayerIds.length] ?? null
}

export const ensurePredictionRevealedForScoring = (state: WizardGameState) => {
  if (!state.currentRound) {
    return
  }

  for (const player of state.currentRound.players) {
    if (player.prediction) {
      player.prediction.revealed = true
    }
  }
}

export const getReadableCardLabel = (card: Card): string => {
  if (card.type === 'number') {
    return `${card.suit} ${card.value}`
  }

  if (card.type === 'wizard') {
    return 'wizard'
  }

  if (card.type === 'jester') {
    return 'jester'
  }

  return card.special
}

export const NO_TRUMP_SELECTABLE_SPECIALS = new Set([
  'wizard',
  'shapeShifter',
  'juggler',
  'cloud',
  'dragon',
  'werewolf',
  'witch',
])

export const getResolvedEffectForCard = (
  state: WizardGameState,
  cardId: string,
) => state.resolvedCardEffects.find((entry) => entry.cardId === cardId)

export const disablesFollowSuitAsLeadCard = (
  card: Card,
  state: WizardGameState,
): boolean => {
  const resolvedEffect = getResolvedEffectForCard(state, card.id)
  const effectiveCard =
    card.type === 'special' &&
    card.special === 'vampire' &&
    resolvedEffect?.copiedCard
      ? resolvedEffect.copiedCard
      : card

  if (effectiveCard.type === 'wizard') {
    return true
  }

  if (disablesFollowSuitForDragonLead(effectiveCard)) {
    return true
  }

  if (disablesFollowSuitForWitchLead(effectiveCard)) {
    return true
  }

  if (
    effectiveCard.type === 'special' &&
    effectiveCard.special === 'shapeShifter'
  ) {
    return resolvedEffect?.shapeShifterMode === 'wizard'
  }

  return false
}

export const isFollowSuitDisabledInTrick = (
  trick: NonNullable<WizardGameState['currentRound']>['currentTrick'] | null,
  state: WizardGameState,
): boolean => {
  const firstPlay = trick?.plays[0]

  if (!firstPlay) {
    return false
  }

  return disablesFollowSuitAsLeadCard(firstPlay.card, state)
}

export const getHypotheticalNextLeaderPlayerId = (
  trick: NonNullable<WizardGameState['currentRound']>['currentTrick'],
  trumpSuit: Suit | null,
  resolvedEffects: WizardGameState['resolvedCardEffects'],
): string | null => {
  if (!trick) {
    return null
  }

  const filteredPlaysWithEffects = filterOutBombPlays(
    trick.plays,
    resolvedEffects,
  )

  if (!filteredPlaysWithEffects.length) {
    return trick.leadPlayerId
  }

  const simulated = resolveTrickWinner(
    {
      ...trick,
      plays: filteredPlaysWithEffects,
      cancelledByBomb: false,
    },
    trumpSuit,
    resolvedEffects,
  )

  return simulated.winnerPlayerId
}

export const getWerewolfOwnerPlayerId = (
  state: WizardGameState,
): string | null => {
  if (!state.currentRound) {
    return null
  }

  const owner = state.currentRound.players.find((player) =>
    player.hand.some(
      (card) => card.type === 'special' && card.special === 'werewolf',
    ),
  )

  return owner?.playerId ?? null
}

export const SPECIAL_TRUMP_CARDS = [
  'shapeShifter',
  'dragon',
  'werewolf',
  'vampire',
  'juggler',
  'cloud',
] as const

export const getPlayerBeforeRoundLeader = (
  state: WizardGameState,
): string | null => {
  if (!state.currentRound) {
    return null
  }

  const players = state.players
  const roundLeaderPlayerId = state.currentRound.roundLeaderPlayerId
  const roundLeaderIndex = players.findIndex(
    (player) => player.playerId === roundLeaderPlayerId,
  )

  if (roundLeaderIndex === -1) {
    return null
  }

  const previousIndex =
    roundLeaderIndex === 0 ? players.length - 1 : roundLeaderIndex - 1
  return players[previousIndex].playerId
}
