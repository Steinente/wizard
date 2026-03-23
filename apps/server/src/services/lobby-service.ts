import type { GameConfig, LobbySummary, SpecialCardKey } from '@wizard/shared'
import { SPECIAL_CARD_KEYS } from '@wizard/shared'
import crypto from 'node:crypto'
import { env } from '../config/env.js'
import { prisma } from '../db/prisma.js'
import {
  LobbyStatus,
  OpenPredictionRestriction,
  PlayerRole,
  PredictionVisibility,
} from '../generated/prisma/client.js'
import { defaultGameConfig } from '../utils/default-game-config.js'
import { mapLobbyToSummary } from './lobby-mapper.js'

const normalizeCode = (code: string) => code.trim().toUpperCase()

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

const serializeSpecialCardSettings = (
  settings: Pick<GameConfig, 'includedSpecialCards' | 'cloudRuleTiming'>,
): string => JSON.stringify(settings)

const CODE_LENGTH = 6
const lobbyPasswordHashes = new Map<string, string>()

const normalizePassword = (password: string | undefined) =>
  password?.trim() ?? ''
const hashPassword = (password: string) =>
  crypto.createHash('sha256').update(password).digest('hex')
const now = () => new Date()
type ClosableLobby = { id: string; code: string }

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

const getLastKnownReadLogEnabled = async (
  sessionToken: string,
): Promise<boolean> => {
  const previousPlayer = await prisma.player.findFirst({
    where: { sessionToken },
    orderBy: { updatedAt: 'desc' },
  })

  return previousPlayer?.readLogEnabled ?? false
}

const getLastKnownHostedConfig = async (
  sessionToken: string,
): Promise<Partial<GameConfig>> => {
  const previousLobby = await prisma.lobby.findFirst({
    where: {
      players: {
        some: {
          sessionToken,
          role: PlayerRole.HOST,
        },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  })

  if (!previousLobby) {
    return {}
  }

  return {
    predictionVisibility:
      previousLobby.predictionVisibility === PredictionVisibility.HIDDEN
        ? 'hidden'
        : previousLobby.predictionVisibility === PredictionVisibility.SECRET
          ? 'secret'
          : 'open',
    openPredictionRestriction:
      previousLobby.openPredictionRestriction ===
      OpenPredictionRestriction.MUST_EQUAL_TRICKS
        ? 'mustEqualTricks'
        : previousLobby.openPredictionRestriction ===
            OpenPredictionRestriction.MUST_NOT_EQUAL_TRICKS
          ? 'mustNotEqualTricks'
          : 'none',
    readLogEnabledByDefault: previousLobby.readLogEnabledByDefault,
    languageDefault: previousLobby.languageDefault === 'de' ? 'de' : 'en',
    ...parseSpecialCardSettings(previousLobby.includedSpecialCards),
  }
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

const loadJoinableLobbiesWithPlayers = () =>
  prisma.lobby.findMany({
    where: {
      status: { in: [LobbyStatus.WAITING, LobbyStatus.RUNNING] },
    },
    include: {
      ...includePlayersByJoinOrder(),
      gameState: {
        select: {
          createdAt: true,
        },
      },
    },
  })

type JoinableLobby = Awaited<
  ReturnType<typeof loadJoinableLobbiesWithPlayers>
>[number]

const activePlayersCount = (lobby: JoinableLobby) =>
  lobby.players.filter((player) => player.role !== PlayerRole.SPECTATOR).length

const runningStartTime = (lobby: JoinableLobby) =>
  (lobby.gameState?.createdAt ?? lobby.updatedAt).getTime()

const compareJoinableLobbies = (a: JoinableLobby, b: JoinableLobby) => {
  const aWaiting = a.status === LobbyStatus.WAITING
  const bWaiting = b.status === LobbyStatus.WAITING

  // Waiting lobbies are always shown first.
  if (aWaiting !== bWaiting) {
    return aWaiting ? -1 : 1
  }

  if (aWaiting) {
    // Fewer active players first.
    const byPlayers = activePlayersCount(a) - activePlayersCount(b)
    if (byPlayers !== 0) {
      return byPlayers
    }

    // If player count is equal, newest lobby first.
    return b.createdAt.getTime() - a.createdAt.getTime()
  }

  // Running lobbies: newest started game first (least time elapsed).
  const byStartTime = runningStartTime(b) - runningStartTime(a)
  if (byStartTime !== 0) {
    return byStartTime
  }

  return b.createdAt.getTime() - a.createdAt.getTime()
}

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

const withPasswordFlag = (summary: LobbySummary): LobbySummary => ({
  ...summary,
  hasPassword: lobbyPasswordHashes.has(summary.code),
})

export class LobbyService {
  private async closeLobbies(lobbies: ClosableLobby[]): Promise<string[]> {
    if (!lobbies.length) {
      return []
    }

    const codes = lobbies.map((entry) => entry.code)

    for (const code of codes) {
      lobbyPasswordHashes.delete(code)
    }

    await prisma.lobby.updateMany({
      where: {
        id: {
          in: lobbies.map((entry) => entry.id),
        },
      },
      data: {
        status: LobbyStatus.CLOSED,
      },
    })

    return codes
  }

  async createLobby(input: {
    playerName: string
    sessionToken: string
    password?: string
    config?: Partial<GameConfig>
  }): Promise<{ lobby: LobbySummary; playerId: string }> {
    const lastKnownHostedConfig = await getLastKnownHostedConfig(
      input.sessionToken,
    )

    const mergedConfig = {
      ...defaultGameConfig,
      ...lastKnownHostedConfig,
      ...input.config,
    }

    const code = await generateLobbyCode()
    const password = normalizePassword(input.password)

    const readLogEnabledFromPrevious = await getLastKnownReadLogEnabled(
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
        readLogEnabledByDefault: mergedConfig.readLogEnabledByDefault,
        languageDefault: mergedConfig.languageDefault,
        includedSpecialCards: serializeSpecialCardSettings({
          includedSpecialCards: mergedConfig.includedSpecialCards,
          cloudRuleTiming: mergedConfig.cloudRuleTiming,
        }),
        players: {
          create: {
            name: input.playerName.trim(),
            sessionToken: input.sessionToken,
            role: PlayerRole.HOST,
            connected: true,
            inGame: false,
            readLogEnabled: readLogEnabledFromPrevious,
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

    if (password) {
      lobbyPasswordHashes.set(code, hashPassword(password))
    } else {
      lobbyPasswordHashes.delete(code)
    }

    return {
      lobby: withPasswordFlag(mapLobbyToSummary(lobby)),
      playerId: hostPlayer.id,
    }
  }

  async joinLobby(input: {
    code: string
    playerName: string
    sessionToken: string
    password?: string
  }): Promise<{ lobby: LobbySummary; playerId: string }> {
    const lobby = await loadLobbyByCodeWithPlayers(input.code)
    const normalizedCode = normalizeCode(input.code)

    if (!lobby || lobby.status === LobbyStatus.CLOSED) {
      throw new Error('error.lobbyNotFound')
    }

    if (lobby.status !== LobbyStatus.WAITING) {
      throw new Error('error.lobbyNotAccepting')
    }

    const requiredHash = lobbyPasswordHashes.get(normalizedCode)
    if (requiredHash) {
      const password = normalizePassword(input.password)

      if (!password) {
        throw new Error('error.lobbyPasswordRequired')
      }

      if (hashPassword(password) !== requiredHash) {
        throw new Error('error.lobbyPasswordInvalid')
      }
    }

    if (lobby.players.length >= 6) {
      throw new Error('error.lobbyFull')
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
          inGame: false,
          name: input.playerName.trim(),
          disconnectedAt: null,
        },
      })

      const refreshed = await loadLobbyByIdWithPlayersOrThrow(lobby.id)

      return {
        lobby: withPasswordFlag(mapLobbyToSummary(refreshed)),
        playerId: updated.id,
      }
    }

    const readLogEnabledFromPrevious = await getLastKnownReadLogEnabled(
      input.sessionToken,
    )

    const created = await prisma.player.create({
      data: {
        lobbyId: lobby.id,
        name: input.playerName.trim(),
        sessionToken: input.sessionToken,
        role: PlayerRole.PLAYER,
        connected: true,
        inGame: false,
        readLogEnabled: readLogEnabledFromPrevious,
      },
    })

    const refreshed = await loadLobbyByIdWithPlayersOrThrow(lobby.id)

    return {
      lobby: withPasswordFlag(mapLobbyToSummary(refreshed)),
      playerId: created.id,
    }
  }

  async spectateLobby(input: {
    code: string
    playerName: string
    sessionToken: string
    password?: string
  }): Promise<{ lobby: LobbySummary; playerId: string }> {
    const lobby = await loadLobbyByCodeWithPlayers(input.code)
    const normalizedCode = normalizeCode(input.code)

    if (!lobby || lobby.status === LobbyStatus.CLOSED) {
      throw new Error('error.lobbyNotFound')
    }

    if (lobby.status !== LobbyStatus.RUNNING) {
      throw new Error('error.lobbyNotRunning')
    }

    const requiredHash = lobbyPasswordHashes.get(normalizedCode)
    if (requiredHash) {
      const password = normalizePassword(input.password)

      if (!password) {
        throw new Error('error.lobbyPasswordRequired')
      }

      if (hashPassword(password) !== requiredHash) {
        throw new Error('error.lobbyPasswordInvalid')
      }
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
          inGame: true,
          name: input.playerName.trim(),
          disconnectedAt: null,
        },
      })

      const refreshed = await loadLobbyByIdWithPlayersOrThrow(lobby.id)
      return {
        lobby: withPasswordFlag(mapLobbyToSummary(refreshed)),
        playerId: updated.id,
      }
    }

    const readLogEnabledFromPrevious = await getLastKnownReadLogEnabled(
      input.sessionToken,
    )

    const created = await prisma.player.create({
      data: {
        lobbyId: lobby.id,
        name: input.playerName.trim(),
        sessionToken: input.sessionToken,
        role: PlayerRole.SPECTATOR,
        connected: true,
        inGame: true,
        readLogEnabled: readLogEnabledFromPrevious,
      },
    })

    const refreshed = await loadLobbyByIdWithPlayersOrThrow(lobby.id)
    return {
      lobby: withPasswordFlag(mapLobbyToSummary(refreshed)),
      playerId: created.id,
    }
  }

  async listLobbies(): Promise<LobbySummary[]> {
    const lobbies = await loadJoinableLobbiesWithPlayers()

    lobbies.sort(compareJoinableLobbies)

    return lobbies.map((lobby) => withPasswordFlag(mapLobbyToSummary(lobby)))
  }

  async reconnectLobby(input: {
    code: string
    sessionToken: string
  }): Promise<{ lobby: LobbySummary; playerId: string }> {
    const lobby = await loadLobbyByCodeWithPlayers(input.code)

    if (!lobby || lobby.status === LobbyStatus.CLOSED) {
      throw new Error('error.lobbyNotFound')
    }

    const player = findPlayerBySessionToken(lobby.players, input.sessionToken)

    if (!player) {
      throw new Error('error.lobbyNotFound')
    }

    await prisma.player.update({
      where: { id: player.id },
      data: {
        connected: true,
        inGame:
          lobby.status === LobbyStatus.RUNNING &&
          player.role !== PlayerRole.SPECTATOR,
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
      lobby: withPasswordFlag(mapLobbyToSummary(refreshed)),
      playerId: player.id,
    }
  }

  async leaveLobby(input: {
    code: string
    sessionToken: string
  }): Promise<LobbySummary> {
    const lobby = await loadLobbyByCodeWithUnorderedPlayers(input.code)

    if (!lobby) {
      throw new Error('error.lobbyNotFound')
    }

    const player = findPlayerBySessionToken(lobby.players, input.sessionToken)

    if (!player) {
      throw new Error('error.playerNotFound')
    }

    if (player.id === lobby.hostPlayerId) {
      throw new Error('error.hostCannotLeave')
    }

    await prisma.player.delete({
      where: { id: player.id },
    })

    const refreshed = await loadLobbyByIdWithPlayersOrThrow(lobby.id)

    return withPasswordFlag(mapLobbyToSummary(refreshed))
  }

  async updateConfig(input: {
    code: string
    sessionToken: string
    config: Partial<GameConfig>
  }): Promise<LobbySummary> {
    const lobby = await loadLobbyByCodeWithUnorderedPlayers(input.code)

    if (!lobby) {
      throw new Error('error.lobbyNotFound')
    }

    const player = findPlayerBySessionToken(lobby.players, input.sessionToken)

    if (!player || player.id !== lobby.hostPlayerId) {
      throw new Error('error.onlyHostCanUpdateConfig')
    }

    const previousSpecialCardSettings = parseSpecialCardSettings(
      lobby.includedSpecialCards,
    )

    const updated = await prisma.lobby.update({
      where: { id: lobby.id },
      data: {
        predictionVisibility: input.config.predictionVisibility
          ? toPredictionVisibility(input.config.predictionVisibility)
          : undefined,
        openPredictionRestriction: input.config.openPredictionRestriction
          ? toOpenPredictionRestriction(input.config.openPredictionRestriction)
          : undefined,
        readLogEnabledByDefault: input.config.readLogEnabledByDefault,
        languageDefault: input.config.languageDefault,
        includedSpecialCards:
          input.config.includedSpecialCards || input.config.cloudRuleTiming
            ? serializeSpecialCardSettings({
                includedSpecialCards:
                  input.config.includedSpecialCards ??
                  previousSpecialCardSettings.includedSpecialCards,
                cloudRuleTiming:
                  input.config.cloudRuleTiming ??
                  previousSpecialCardSettings.cloudRuleTiming,
              })
            : undefined,
      },
      include: includePlayersByJoinOrder(),
    })

    return withPasswordFlag(mapLobbyToSummary(updated))
  }

  async kickPlayer(input: {
    code: string
    sessionToken: string
    targetPlayerId: string
  }): Promise<{ lobby: LobbySummary; kickedSessionToken: string }> {
    const lobby = await loadLobbyByCodeWithUnorderedPlayers(input.code)

    if (!lobby) {
      throw new Error('error.lobbyNotFound')
    }

    const player = findPlayerBySessionToken(lobby.players, input.sessionToken)

    if (!player || player.id !== lobby.hostPlayerId) {
      throw new Error('error.onlyHostCanKick')
    }

    if (input.targetPlayerId === lobby.hostPlayerId) {
      throw new Error('error.hostCannotKickSelf')
    }

    const targetPlayer = lobby.players.find(
      (entry) => entry.id === input.targetPlayerId,
    )

    if (!targetPlayer) {
      throw new Error('error.targetPlayerNotFound')
    }

    await prisma.player.delete({
      where: { id: input.targetPlayerId },
    })

    const refreshed = await loadLobbyByIdWithPlayersOrThrow(lobby.id)

    return {
      lobby: withPasswordFlag(mapLobbyToSummary(refreshed)),
      kickedSessionToken: targetPlayer.sessionToken,
    }
  }

  async endLobby(input: { code: string; sessionToken: string }) {
    const lobby = await loadLobbyByCodeWithUnorderedPlayers(input.code)

    if (!lobby) {
      throw new Error('error.lobbyNotFound')
    }

    const player = findPlayerBySessionToken(lobby.players, input.sessionToken)

    if (!player || player.id !== lobby.hostPlayerId) {
      throw new Error('error.onlyHostCanCloseLobby')
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

    lobbyPasswordHashes.delete(lobby.code)

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

    const disconnectedAt = now()

    await prisma.player.update({
      where: { id: player.id },
      data: {
        connected: false,
        inGame: false,
        disconnectedAt,
      },
    })

    const data =
      player.id === lobby.hostPlayerId
        ? {
            hostDisconnectedAt: disconnectedAt,
            hostDisconnectDeadline: new Date(
              disconnectedAt.getTime() + env.LOBBY_INACTIVITY_TIMEOUT_MS,
            ),
          }
        : {}

    const refreshed = await prisma.lobby.update({
      where: { id: lobby.id },
      data,
      include: includePlayersByJoinOrder(),
    })

    return withPasswordFlag(mapLobbyToSummary(refreshed))
  }

  async setPlayerInGame(input: {
    code: string
    sessionToken: string
    inGame: boolean
  }): Promise<void> {
    const lobby = await loadLobbyByCodeWithUnorderedPlayers(input.code)

    if (!lobby) {
      throw new Error('error.lobbyNotFound')
    }

    const player = findPlayerBySessionToken(lobby.players, input.sessionToken)

    if (!player) {
      throw new Error('error.playerNotFound')
    }

    if (player.role === PlayerRole.SPECTATOR) {
      return
    }

    await prisma.player.update({
      where: { id: player.id },
      data: {
        inGame: input.inGame,
      },
    })
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
      select: {
        id: true,
        code: true,
      },
    })

    return this.closeLobbies(expired)
  }

  async closeInactiveRunningGames(): Promise<string[]> {
    const cutoff = new Date(Date.now() - env.LOBBY_INACTIVITY_TIMEOUT_MS)

    const expired = await prisma.lobby.findMany({
      where: {
        status: LobbyStatus.RUNNING,
        gameState: {
          is: {
            updatedAt: {
              lte: cutoff,
            },
          },
        },
      },
      select: {
        id: true,
        code: true,
      },
    })

    return this.closeLobbies(expired)
  }
}
