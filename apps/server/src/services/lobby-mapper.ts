import type {
  GameConfig,
  LobbySummary,
  OpenPredictionRestriction,
  PlayerIdentity,
  PlayerLobbyState,
  PredictionVisibility,
  SpecialCardKey,
} from '@wizard/shared'
import { SPECIAL_CARD_KEYS } from '@wizard/shared'
import type { Lobby, Player, PlayerRole } from '../generated/prisma/client.js'

type LobbyWithPlayers = Lobby & {
  players: Player[]
}

const mapPlayerRole = (role: PlayerRole): 'host' | 'player' | 'spectator' =>
  role === 'HOST' ? 'host' : role === 'SPECTATOR' ? 'spectator' : 'player'

const mapPredictionVisibility = (value: string): PredictionVisibility =>
  value.toLowerCase() as PredictionVisibility

const mapOpenPredictionRestriction = (
  value: string,
): OpenPredictionRestriction =>
  value === 'MUST_EQUAL_TRICKS'
    ? 'mustEqualTricks'
    : value === 'MUST_NOT_EQUAL_TRICKS'
      ? 'mustNotEqualTricks'
      : 'none'

const parseSpecialCardSettings = (
  value: string | null,
): {
  includedSpecialCards: SpecialCardKey[]
  cloudRuleTiming: GameConfig['cloudRuleTiming']
} => {
  const fallback = {
    includedSpecialCards: [...SPECIAL_CARD_KEYS],
    cloudRuleTiming: 'endOfRound' as const,
  }

  if (value === null) return fallback

  try {
    const parsed = JSON.parse(value)

    if (Array.isArray(parsed)) {
      return {
        includedSpecialCards: parsed as SpecialCardKey[],
        cloudRuleTiming: fallback.cloudRuleTiming,
      }
    }

    if (parsed && typeof parsed === 'object') {
      const maybeCards = (parsed as { includedSpecialCards?: unknown })
        .includedSpecialCards
      const maybeTiming = (parsed as { cloudRuleTiming?: unknown })
        .cloudRuleTiming

      return {
        includedSpecialCards: Array.isArray(maybeCards)
          ? (maybeCards as SpecialCardKey[])
          : fallback.includedSpecialCards,
        cloudRuleTiming:
          maybeTiming === 'immediateAfterTrick'
            ? 'immediateAfterTrick'
            : 'endOfRound',
      }
    }

    return fallback
  } catch {
    return fallback
  }
}

export const mapLobbyToSummary = (lobby: LobbyWithPlayers): LobbySummary => {
  const specialCardSettings = parseSpecialCardSettings(
    lobby.includedSpecialCards,
  )

  const config: GameConfig = {
    predictionVisibility: mapPredictionVisibility(lobby.predictionVisibility),
    openPredictionRestriction: mapOpenPredictionRestriction(
      lobby.openPredictionRestriction,
    ),
    cloudRuleTiming: specialCardSettings.cloudRuleTiming,
    readLogEnabledByDefault: lobby.readLogEnabledByDefault,
    languageDefault: lobby.languageDefault === 'de' ? 'de' : 'en',
    includedSpecialCards: specialCardSettings.includedSpecialCards,
  }

  const players = lobby.players.map((player) => {
    const identity: PlayerIdentity = {
      id: player.id,
      sessionToken: player.sessionToken,
      name: player.name,
      role: mapPlayerRole(player.role),
    }

    const state: PlayerLobbyState = {
      playerId: player.id,
      connected: player.connected,
      joinedAt: player.joinedAt.toISOString(),
      disconnectedAt: player.disconnectedAt?.toISOString() ?? null,
    }

    return {
      ...identity,
      ...state,
    }
  })

  return {
    code: lobby.code,
    hostPlayerId: lobby.hostPlayerId ?? '',
    status:
      lobby.status === 'WAITING'
        ? 'waiting'
        : lobby.status === 'RUNNING'
          ? 'running'
          : lobby.status === 'FINISHED'
            ? 'finished'
            : 'closed',
    hasPassword: false,
    config,
    players,
    createdAt: lobby.createdAt.toISOString(),
    updatedAt: lobby.updatedAt.toISOString(),
  }
}
