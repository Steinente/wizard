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
import { disablesFollowSuitForDragonLead } from './specials/index.js'

export const normalizeCode = (code: string) => code.trim().toUpperCase()

const parseIncludedSpecialCards = (value: string | null): SpecialCardKey[] => {
  if (value === null) return [...SPECIAL_CARD_KEYS]
  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) return parsed as SpecialCardKey[]
    return [...SPECIAL_CARD_KEYS]
  } catch {
    return [...SPECIAL_CARD_KEYS]
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
  predictionVisibility: toPredictionVisibility(lobby.predictionVisibility),
  openPredictionRestriction: toOpenPredictionRestriction(
    lobby.openPredictionRestriction,
  ),
  readLogEnabledByDefault: lobby.readLogEnabledByDefault,
  languageDefault: lobby.languageDefault === 'de' ? 'de' : 'en',
  includedSpecialCards: parseIncludedSpecialCards(lobby.includedSpecialCards),
})

export const toJson = (value: WizardGameState): Prisma.JsonObject =>
  JSON.parse(JSON.stringify(value)) as Prisma.JsonObject

export const fromJson = (value: unknown): WizardGameState =>
  value as WizardGameState

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
])

export const getResolvedEffectForCard = (
  state: WizardGameState,
  cardId: string,
) => state.resolvedCardEffects.find((entry) => entry.cardId === cardId)

export const disablesFollowSuitAsLeadCard = (
  card: Card,
  state: WizardGameState,
): boolean => {
  if (card.type === 'wizard') {
    return true
  }

  if (disablesFollowSuitForDragonLead(card)) {
    return true
  }

  if (card.type === 'special' && card.special === 'shapeShifter') {
    return (
      getResolvedEffectForCard(state, card.id)?.shapeShifterMode === 'wizard'
    )
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

  const filteredPlays = filterOutBombPlays(trick.plays)

  if (!filteredPlays.length) {
    return trick.leadPlayerId
  }

  const simulated = resolveTrickWinner(
    {
      ...trick,
      plays: filteredPlays,
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
