import type { ClientToServerEvents, ServerToClientEvents } from '@wizard/shared'
import type { Server } from 'socket.io'
import { GameService } from '../services/game/game-service.js'
import { LobbyService } from '../services/lobby-service.js'
import {
  createLobbySchema,
  endLobbySchema,
  gameStartSchema,
  joinLobbySchema,
  kickPlayerSchema,
  makePredictionSchema,
  playCardSchema,
  reconnectLobbySchema,
  resolveCloudAdjustmentSchema,
  resolveCloudSchema,
  resolveJugglerSchema,
  resolveShapeShifterSchema,
  resolveWerewolfTrumpSwapSchema,
  selectJugglerPassCardSchema,
  selectTrumpSuitSchema,
  setAudioEnabledSchema,
  updateConfigSchema,
} from './schemas.js'
import { SocketSessionStore } from './socket-session-store.js'
import type { WizardSocket } from './types.js'

type WizardIoServer = Server<ClientToServerEvents, ServerToClientEvents>

const emitError = (socket: WizardSocket, message: string, code?: string) => {
  socket.emit('error:message', { message, code })
}

const normalizeRoomCode = (code: string) => code.trim().toUpperCase()

const emitStateToLobby = async (
  io: WizardIoServer,
  roomCode: string,
  sockets: Set<string>,
  sessionStore: SocketSessionStore,
  gameService: GameService,
) => {
  for (const socketId of sockets) {
    const socket = io.sockets.sockets.get(socketId)

    if (!socket) {
      continue
    }

    const session = sessionStore.get(socketId)

    if (!session) {
      continue
    }

    try {
      const state = await gameService.getViewState({
        code: roomCode,
        sessionToken: session.sessionToken,
      })

      socket.emit('game:state', { state })
    } catch {
      // stale sockets ignored
    }
  }
}

const emitStateForCode = async (
  io: WizardIoServer,
  code: string,
  sessionStore: SocketSessionStore,
  gameService: GameService,
) => {
  const roomCode = normalizeRoomCode(code)
  const room = io.sockets.adapter.rooms.get(roomCode)

  if (!room) {
    return
  }

  await emitStateToLobby(io, roomCode, room, sessionStore, gameService)
}

const resolveCompletedTrickAfterDelay = async (
  io: WizardIoServer,
  code: string,
  stateAfterAction: {
    currentRound: { currentTrick: { plays: unknown[] } | null } | null
    players: unknown[]
  },
  sessionStore: SocketSessionStore,
  gameService: GameService,
) => {
  const roomCode = normalizeRoomCode(code)
  const room = io.sockets.adapter.rooms.get(roomCode)

  if (!room) {
    return
  }

  await emitStateToLobby(io, roomCode, room, sessionStore, gameService)

  const trick = stateAfterAction.currentRound?.currentTrick
  const playerCount = stateAfterAction.players.length
  const isTrickComplete = !!trick && trick.plays.length === playerCount

  if (!isTrickComplete) {
    return
  }

  await new Promise((resolve) => setTimeout(resolve, 3000))
  await gameService.resolvePendingCompletedTrick(code)
  await emitStateToLobby(io, roomCode, room, sessionStore, gameService)
}

const runSocketAction = async <TInput>(
  socket: WizardSocket,
  payload: unknown,
  parse: (payload: unknown) => TInput,
  run: (input: TInput) => Promise<void>,
  fallbackErrorMessage: string,
) => {
  try {
    const input = parse(payload)
    await run(input)
  } catch (error) {
    emitError(
      socket,
      error instanceof Error ? error.message : fallbackErrorMessage,
    )
  }
}

export const registerSocketHandlers = (
  io: WizardIoServer,
  socket: WizardSocket,
  lobbyService: LobbyService,
  gameService: GameService,
  sessionStore: SocketSessionStore,
) => {
  socket.on('lobby:create', async (payload) => {
    try {
      const input = createLobbySchema.parse(payload)
      const result = await lobbyService.createLobby(input)

      sessionStore.set(socket.id, {
        code: result.lobby.code,
        sessionToken: input.sessionToken,
      })

      await socket.join(result.lobby.code)
      socket.emit('lobby:created', {
        lobby: result.lobby,
        playerId: result.playerId,
      })
      io.to(result.lobby.code).emit('lobby:updated', { lobby: result.lobby })
    } catch (error) {
      emitError(
        socket,
        error instanceof Error ? error.message : 'error.createFailed',
      )
    }
  })

  socket.on('lobby:join', async (payload) => {
    try {
      const input = joinLobbySchema.parse(payload)
      const result = await lobbyService.joinLobby(input)

      sessionStore.set(socket.id, {
        code: result.lobby.code,
        sessionToken: input.sessionToken,
      })

      await socket.join(result.lobby.code)
      socket.emit('lobby:joined', {
        lobby: result.lobby,
        playerId: result.playerId,
      })
      io.to(result.lobby.code).emit('lobby:updated', { lobby: result.lobby })
    } catch (error) {
      emitError(
        socket,
        error instanceof Error ? error.message : 'error.joinFailed',
      )
    }
  })

  socket.on('lobby:reconnect', async (payload) => {
    try {
      const input = reconnectLobbySchema.parse(payload)
      const result = await lobbyService.reconnectLobby(input)

      sessionStore.set(socket.id, {
        code: result.lobby.code,
        sessionToken: input.sessionToken,
      })

      await socket.join(result.lobby.code)
      socket.emit('lobby:joined', {
        lobby: result.lobby,
        playerId: result.playerId,
      })
      io.to(result.lobby.code).emit('lobby:updated', { lobby: result.lobby })
      await emitStateForCode(io, result.lobby.code, sessionStore, gameService)
    } catch (error) {
      emitError(
        socket,
        error instanceof Error ? error.message : 'error.reconnectFailed',
      )
    }
  })

  socket.on('lobby:leave', async (payload) => {
    try {
      const code = normalizeRoomCode(payload.code)
      const lobby = await lobbyService.leaveLobby({
        code,
        sessionToken: payload.sessionToken,
      })

      socket.emit('lobby:closed', {
        code,
        reason: 'info.leftLobby',
      })
      await socket.leave(code)
      sessionStore.delete(socket.id)

      io.to(lobby.code).emit('lobby:updated', { lobby })
    } catch (error) {
      emitError(
        socket,
        error instanceof Error ? error.message : 'error.leaveFailed',
      )
    }
  })

  socket.on('lobby:updateConfig', async (payload) => {
    try {
      const input = updateConfigSchema.parse(payload)
      const lobby = await lobbyService.updateConfig(input)
      io.to(lobby.code).emit('lobby:updated', { lobby })
    } catch (error) {
      emitError(
        socket,
        error instanceof Error ? error.message : 'error.configUpdateFailed',
      )
    }
  })

  socket.on('lobby:kickPlayer', async (payload) => {
    try {
      const input = kickPlayerSchema.parse(payload)
      const code = normalizeRoomCode(input.code)
      const result = await lobbyService.kickPlayer(input)

      io.to(result.lobby.code).emit('lobby:updated', { lobby: result.lobby })

      const targetSocket = [...io.sockets.sockets.values()].find((entry) => {
        const session = sessionStore.get(entry.id)

        return (
          session?.code === code &&
          session.sessionToken === result.kickedSessionToken
        )
      })

      if (targetSocket) {
        targetSocket.emit('lobby:closed', {
          code,
          reason: 'info.removedFromLobby',
        })
        await targetSocket.leave(code)
        sessionStore.delete(targetSocket.id)
      }
    } catch (error) {
      emitError(
        socket,
        error instanceof Error ? error.message : 'error.kickFailed',
      )
    }
  })

  socket.on('lobby:end', async (payload) => {
    try {
      const input = endLobbySchema.parse(payload)
      const code = await lobbyService.endLobby(input)
      io.to(code).emit('lobby:closed', {
        code,
        reason: 'info.lobbyEndedByHost',
      })
    } catch (error) {
      emitError(
        socket,
        error instanceof Error ? error.message : 'error.closeLobbyFailed',
      )
    }
  })

  socket.on('game:start', async (payload) => {
    await runSocketAction(
      socket,
      payload,
      gameStartSchema.parse,
      async (input) => {
        const { lobby } = await gameService.startGame(input)

        io.to(lobby.code).emit('lobby:updated', { lobby })
        await emitStateForCode(io, lobby.code, sessionStore, gameService)
      },
      'error.gameStartFailed',
    )
  })

  socket.on('game:makePrediction', async (payload) => {
    await runSocketAction(
      socket,
      payload,
      makePredictionSchema.parse,
      async (input) => {
        await gameService.makePrediction(input)
        await emitStateForCode(io, input.code, sessionStore, gameService)
      },
      'error.predictionFailed',
    )
  })

  socket.on('game:selectTrumpSuit', async (payload) => {
    await runSocketAction(
      socket,
      payload,
      selectTrumpSuitSchema.parse,
      async (input) => {
        await gameService.selectTrumpSuit(input)
        await emitStateForCode(io, input.code, sessionStore, gameService)
      },
      'error.trumpSelectionFailed',
    )
  })

  socket.on('game:resolveShapeShifter', async (payload) => {
    try {
      const input = resolveShapeShifterSchema.parse(payload)
      const stateAfterResolution = await gameService.resolveShapeShifter(input)
      await resolveCompletedTrickAfterDelay(
        io,
        input.code,
        stateAfterResolution,
        sessionStore,
        gameService,
      )
    } catch (error) {
      emitError(
        socket,
        error instanceof Error
          ? error.message
          : 'error.shapeShifterResolutionFailed',
      )
    }
  })

  socket.on('game:resolveCloud', async (payload) => {
    try {
      const input = resolveCloudSchema.parse(payload)
      const stateAfterResolution = await gameService.resolveCloud(input)
      await resolveCompletedTrickAfterDelay(
        io,
        input.code,
        stateAfterResolution,
        sessionStore,
        gameService,
      )
    } catch (error) {
      emitError(
        socket,
        error instanceof Error ? error.message : 'error.cloudResolutionFailed',
      )
    }
  })

  socket.on('game:resolveCloudAdjustment', async (payload) => {
    await runSocketAction(
      socket,
      payload,
      resolveCloudAdjustmentSchema.parse,
      async (input) => {
        await gameService.resolveCloudAdjustment(input)
        await emitStateForCode(io, input.code, sessionStore, gameService)
      },
      'error.cloudAdjustmentFailed',
    )
  })

  socket.on('game:resolveJuggler', async (payload) => {
    try {
      const input = resolveJugglerSchema.parse(payload)
      const stateAfterResolution = await gameService.resolveJuggler(input)
      await resolveCompletedTrickAfterDelay(
        io,
        input.code,
        stateAfterResolution,
        sessionStore,
        gameService,
      )
    } catch (error) {
      emitError(
        socket,
        error instanceof Error
          ? error.message
          : 'error.jugglerResolutionFailed',
      )
    }
  })

  socket.on('game:selectJugglerPassCard', async (payload) => {
    await runSocketAction(
      socket,
      payload,
      selectJugglerPassCardSchema.parse,
      async (input) => {
        await gameService.selectJugglerPassCard(input)
        await emitStateForCode(io, input.code, sessionStore, gameService)
      },
      'error.jugglerPassFailed',
    )
  })

  socket.on('game:resolveWerewolfTrumpSwap', async (payload) => {
    await runSocketAction(
      socket,
      payload,
      resolveWerewolfTrumpSwapSchema.parse,
      async (input) => {
        await gameService.resolveWerewolfTrumpSwap(input)
        await emitStateForCode(io, input.code, sessionStore, gameService)
      },
      'error.werewolfTrumpSwapFailed',
    )
  })

  socket.on('game:playCard', async (payload) => {
    try {
      const input = playCardSchema.parse(payload)
      const stateAfterPlay = await gameService.playCard(input)

      const roomCode = normalizeRoomCode(input.code)
      const room = io.sockets.adapter.rooms.get(roomCode)

      if (room) {
        // Emit state with the last card played visible in the trick area.
        await emitStateToLobby(io, roomCode, room, sessionStore, gameService)

        // Check if trick was just completed (all players have played)
        const trick = stateAfterPlay.currentRound?.currentTrick
        const playerCount = stateAfterPlay.players.length
        const isTrickComplete = trick && trick.plays.length === playerCount

        if (isTrickComplete) {
          // Wait 3 seconds for players to see the last card
          await new Promise((resolve) => setTimeout(resolve, 3000))

          // Now resolve the completed trick
          await gameService.resolvePendingCompletedTrick(input.code)

          // Emit the resolved state
          await emitStateToLobby(io, roomCode, room, sessionStore, gameService)
        }
      }
    } catch (error) {
      emitError(
        socket,
        error instanceof Error ? error.message : 'error.playCardFailed',
      )
    }
  })

  socket.on('player:setAudioEnabled', async (payload) => {
    await runSocketAction(
      socket,
      payload,
      setAudioEnabledSchema.parse,
      async (input) => {
        await gameService.setAudioEnabled(input)
        await emitStateForCode(io, input.code, sessionStore, gameService)
      },
      'Audio setting failed',
    )
  })

  socket.on('disconnect', async () => {
    const session = sessionStore.get(socket.id)

    if (!session) {
      return
    }

    sessionStore.delete(socket.id)

    const updatedLobby = await lobbyService.markDisconnected({
      code: session.code,
      sessionToken: session.sessionToken,
    })

    if (updatedLobby) {
      io.to(updatedLobby.code).emit('lobby:updated', { lobby: updatedLobby })

      if (updatedLobby.status === 'running') {
        await emitStateForCode(io, updatedLobby.code, sessionStore, gameService)
      }
    }
  })
}
