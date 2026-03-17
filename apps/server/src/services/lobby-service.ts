import type { GameConfig, LobbySummary } from '@wizard/shared'
import { prisma } from '../db/prisma.js'
import {
  LobbyStatus,
  OpenPredictionRestriction,
  PlayerRole,
  PredictionVisibility,
} from '../generated/prisma/client.js'
import { defaultGameConfig } from '../utils/default-game-config.js'
import { mapLobbyToSummary } from './lobby-mapper.js'

const CODE_LENGTH = 6

const normalizeCode = (code: string) => code.trim().toUpperCase()
const now = () => new Date()

const includePlayersByJoinOrder = () => ({
  players: {
    orderBy: {
      joinedAt: 'asc' as const,
    },
  },
})

const includePlayers = () => ({
  players: true as const,
})

const findPlayerBySessionToken = <T extends { sessionToken: string }>(
  players: T[],
  sessionToken: string,
) => players.find((entry) => entry.sessionToken === sessionToken)

const getLastKnownAudioEnabled = async (
  sessionToken: string,
): Promise<boolean> => {
  const previousPlayer = await prisma.player.findFirst({
    where: { sessionToken },
    orderBy: { updatedAt: 'desc' },
  })

  return previousPlayer?.audioEnabled ?? false
}

const loadLobbyByCodeWithPlayers = (code: string) =>
  prisma.lobby.findUnique({
    where: { code: normalizeCode(code) },
    include: includePlayersByJoinOrder(),
  })

const loadLobbyByCodeWithUnorderedPlayers = (code: string) =>
  prisma.lobby.findUnique({
    where: { code: normalizeCode(code) },
    include: includePlayers(),
  })

const loadLobbyByIdWithPlayersOrThrow = (id: string) =>
  prisma.lobby.findUniqueOrThrow({
    where: { id },
    include: includePlayersByJoinOrder(),
  })

const toPredictionVisibility = (value: GameConfig['predictionVisibility']) =>
  value === 'hidden'
    ? PredictionVisibility.HIDDEN
    : value === 'secret'
      ? PredictionVisibility.SECRET
      : PredictionVisibility.OPEN

const toOpenPredictionRestriction = (
  value: GameConfig['openPredictionRestriction'],
) =>
  value === 'mustEqualTricks'
    ? OpenPredictionRestriction.MUST_EQUAL_TRICKS
    : value === 'mustNotEqualTricks'
      ? OpenPredictionRestriction.MUST_NOT_EQUAL_TRICKS
      : OpenPredictionRestriction.NONE

const generateLobbyCode = async (): Promise<string> => {
  const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

  while (true) {
    let code = ''
    for (let i = 0; i < CODE_LENGTH; i++) {
      const index = Math.floor(Math.random() * CHARS.length)
      code += CHARS[index]
    }

    const existing = await prisma.lobby.findUnique({
      where: { code },
    })

    if (!existing) {
      return code
    }
  }
}

export class LobbyService {
  async createLobby(input: {
    playerName: string
    sessionToken: string
    config?: Partial<GameConfig>
  }): Promise<{ lobby: LobbySummary; playerId: string }> {
    const mergedConfig = {
      ...defaultGameConfig,
      ...input.config,
    }

    const code = await generateLobbyCode()

    const audioEnabledFromPrevious = await getLastKnownAudioEnabled(
      input.sessionToken,
    )

    const created = await prisma.lobby.create({
      data: {
        code,
        status: LobbyStatus.WAITING,
        predictionVisibility: toPredictionVisibility(
          mergedConfig.predictionVisibility,
        ),
        openPredictionRestriction: toOpenPredictionRestriction(
          mergedConfig.openPredictionRestriction,
        ),
        languageDefault: mergedConfig.languageDefault,
        allowIncludedSpecialCards: mergedConfig.allowIncludedSpecialCards,
        players: {
          create: {
            name: input.playerName.trim(),
            sessionToken: input.sessionToken,
            role: PlayerRole.HOST,
            connected: true,
            audioEnabled: audioEnabledFromPrevious,
          },
        },
      },
      include: includePlayersByJoinOrder(),
    })

    const hostPlayer = created.players[0]

    const lobby = await prisma.lobby.update({
      where: { id: created.id },
      data: {
        hostPlayerId: hostPlayer.id,
      },
      include: includePlayersByJoinOrder(),
    })

    return {
      lobby: mapLobbyToSummary(lobby),
      playerId: hostPlayer.id,
    }
  }

  async joinLobby(input: {
    code: string
    playerName: string
    sessionToken: string
  }): Promise<{ lobby: LobbySummary; playerId: string }> {
    const lobby = await loadLobbyByCodeWithPlayers(input.code)

    if (!lobby || lobby.status === LobbyStatus.CLOSED) {
      throw new Error('Lobby not found')
    }

    if (lobby.status !== LobbyStatus.WAITING) {
      throw new Error('Lobby is no longer accepting players')
    }

    if (lobby.players.length >= 6) {
      throw new Error('Lobby is full')
    }

    const existingByToken = findPlayerBySessionToken(
      lobby.players,
      input.sessionToken,
    )

    if (existingByToken) {
      const updated = await prisma.player.update({
        where: { id: existingByToken.id },
        data: {
          connected: true,
          name: input.playerName.trim(),
          disconnectedAt: null,
        },
      })

      const refreshed = await loadLobbyByIdWithPlayersOrThrow(lobby.id)

      return {
        lobby: mapLobbyToSummary(refreshed),
        playerId: updated.id,
      }
    }

    const audioEnabledFromPrevious = await getLastKnownAudioEnabled(
      input.sessionToken,
    )

    const created = await prisma.player.create({
      data: {
        lobbyId: lobby.id,
        name: input.playerName.trim(),
        sessionToken: input.sessionToken,
        role: PlayerRole.PLAYER,
        connected: true,
        audioEnabled: audioEnabledFromPrevious,
      },
    })

    const refreshed = await loadLobbyByIdWithPlayersOrThrow(lobby.id)

    return {
      lobby: mapLobbyToSummary(refreshed),
      playerId: created.id,
    }
  }

  async reconnectLobby(input: {
    code: string
    sessionToken: string
  }): Promise<{ lobby: LobbySummary; playerId: string }> {
    const lobby = await loadLobbyByCodeWithPlayers(input.code)

    if (!lobby || lobby.status === LobbyStatus.CLOSED) {
      throw new Error('Lobby not found')
    }

    const player = findPlayerBySessionToken(lobby.players, input.sessionToken)

    if (!player) {
      throw new Error('Lobby not found')
    }

    await prisma.player.update({
      where: { id: player.id },
      data: {
        connected: true,
        disconnectedAt: null,
      },
    })

    const data =
      player.id === lobby.hostPlayerId
        ? {
            hostDisconnectedAt: null,
            hostDisconnectDeadline: null,
          }
        : {}

    const refreshed = await prisma.lobby.update({
      where: { id: lobby.id },
      data,
      include: includePlayersByJoinOrder(),
    })

    return {
      lobby: mapLobbyToSummary(refreshed),
      playerId: player.id,
    }
  }

  async leaveLobby(input: {
    code: string
    sessionToken: string
  }): Promise<LobbySummary> {
    const lobby = await loadLobbyByCodeWithUnorderedPlayers(input.code)

    if (!lobby) {
      throw new Error('Lobby not found')
    }

    const player = findPlayerBySessionToken(lobby.players, input.sessionToken)

    if (!player) {
      throw new Error('Player not found in lobby')
    }

    if (player.id === lobby.hostPlayerId) {
      throw new Error('Host cannot leave the lobby without ending it')
    }

    await prisma.player.delete({
      where: { id: player.id },
    })

    const refreshed = await loadLobbyByIdWithPlayersOrThrow(lobby.id)

    return mapLobbyToSummary(refreshed)
  }

  async updateConfig(input: {
    code: string
    sessionToken: string
    config: Partial<GameConfig>
  }): Promise<LobbySummary> {
    const lobby = await loadLobbyByCodeWithUnorderedPlayers(input.code)

    if (!lobby) {
      throw new Error('Lobby not found')
    }

    const player = findPlayerBySessionToken(lobby.players, input.sessionToken)

    if (!player || player.id !== lobby.hostPlayerId) {
      throw new Error('Only the host can update the config')
    }

    const updated = await prisma.lobby.update({
      where: { id: lobby.id },
      data: {
        predictionVisibility: input.config.predictionVisibility
          ? toPredictionVisibility(input.config.predictionVisibility)
          : undefined,
        openPredictionRestriction: input.config.openPredictionRestriction
          ? toOpenPredictionRestriction(input.config.openPredictionRestriction)
          : undefined,
        languageDefault: input.config.languageDefault,
        allowIncludedSpecialCards: input.config.allowIncludedSpecialCards,
      },
      include: includePlayersByJoinOrder(),
    })

    return mapLobbyToSummary(updated)
  }

  async kickPlayer(input: {
    code: string
    sessionToken: string
    targetPlayerId: string
  }): Promise<{ lobby: LobbySummary; kickedSessionToken: string }> {
    const lobby = await loadLobbyByCodeWithUnorderedPlayers(input.code)

    if (!lobby) {
      throw new Error('Lobby not found')
    }

    const player = findPlayerBySessionToken(lobby.players, input.sessionToken)

    if (!player || player.id !== lobby.hostPlayerId) {
      throw new Error('Only the host can kick players')
    }

    if (input.targetPlayerId === lobby.hostPlayerId) {
      throw new Error('The host cannot kick themselves')
    }

    const targetPlayer = lobby.players.find(
      (entry) => entry.id === input.targetPlayerId,
    )

    if (!targetPlayer) {
      throw new Error('Target player not found')
    }

    await prisma.player.delete({
      where: { id: input.targetPlayerId },
    })

    const refreshed = await loadLobbyByIdWithPlayersOrThrow(lobby.id)

    return {
      lobby: mapLobbyToSummary(refreshed),
      kickedSessionToken: targetPlayer.sessionToken,
    }
  }

  async endLobby(input: { code: string; sessionToken: string }) {
    const lobby = await loadLobbyByCodeWithUnorderedPlayers(input.code)

    if (!lobby) {
      throw new Error('Lobby not found')
    }

    const player = findPlayerBySessionToken(lobby.players, input.sessionToken)

    if (!player || player.id !== lobby.hostPlayerId) {
      throw new Error('Only the host can end the lobby')
    }

    await prisma.lobby.update({
      where: { id: lobby.id },
      data: {
        status: LobbyStatus.CLOSED,
      },
    })

    await prisma.player.deleteMany({
      where: {
        lobbyId: lobby.id,
      },
    })

    return lobby.code
  }

  async markDisconnected(input: {
    code: string
    sessionToken: string
  }): Promise<LobbySummary | null> {
    const lobby = await loadLobbyByCodeWithUnorderedPlayers(input.code)

    if (!lobby) {
      return null
    }

    const player = findPlayerBySessionToken(lobby.players, input.sessionToken)

    if (!player) {
      return null
    }

    await prisma.player.update({
      where: { id: player.id },
      data: {
        connected: false,
        disconnectedAt: now(),
      },
    })

    const data =
      player.id === lobby.hostPlayerId
        ? {
            hostDisconnectedAt: now(),
            hostDisconnectDeadline: new Date(now().getTime() + 10 * 60 * 1000),
          }
        : {}

    const refreshed = await prisma.lobby.update({
      where: { id: lobby.id },
      data,
      include: includePlayersByJoinOrder(),
    })

    return mapLobbyToSummary(refreshed)
  }

  async closeExpiredHostLobbies(): Promise<string[]> {
    const current = now()

    const expired = await prisma.lobby.findMany({
      where: {
        status: {
          in: [LobbyStatus.WAITING, LobbyStatus.RUNNING, LobbyStatus.FINISHED],
        },
        hostDisconnectDeadline: {
          not: null,
          lte: current,
        },
      },
    })

    if (!expired.length) {
      return []
    }

    const codes = expired.map((entry) => entry.code)

    await prisma.lobby.updateMany({
      where: {
        id: {
          in: expired.map((entry) => entry.id),
        },
      },
      data: {
        status: LobbyStatus.CLOSED,
      },
    })

    return codes
  }
}
