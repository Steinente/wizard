import type {
  GameConfig,
  LobbySummary,
  OpenPredictionRestriction,
  PlayerIdentity,
  PlayerLobbyState,
  PredictionVisibility,
} from '@wizard/shared'
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

export const mapLobbyToSummary = (lobby: LobbyWithPlayers): LobbySummary => {
  const config: GameConfig = {
    predictionVisibility: mapPredictionVisibility(lobby.predictionVisibility),
    openPredictionRestriction: mapOpenPredictionRestriction(
      lobby.openPredictionRestriction,
    ),
    audioEnabledByDefault: lobby.audioEnabledByDefault,
    languageDefault: lobby.languageDefault === 'de' ? 'de' : 'en',
    allowIncludedSpecialCards: lobby.allowIncludedSpecialCards,
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
