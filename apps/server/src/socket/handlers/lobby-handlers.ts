import {
  createLobbySchema,
  endLobbySchema,
  joinLobbySchema,
  kickPlayerSchema,
  listLobbiesSchema,
  reconnectLobbySchema,
  spectateLobbySchema,
  updateConfigSchema,
} from '../schemas/lobby-schemas.js'
import {
  emitError,
  emitLobbyList,
  emitStateForCode,
  normalizeRoomCode,
  type SocketHandlerContext,
} from '../utils/socket-handler-utils.js'

export const registerLobbyHandlers = ({
  io,
  socket,
  lobbyService,
  gameService,
  sessionStore,
}: SocketHandlerContext) => {
  socket.on('lobby:list', async () => {
    try {
      listLobbiesSchema.parse({})
      await emitLobbyList(io, lobbyService, socket)
    } catch (error) {
      emitError(
        socket,
        error instanceof Error ? error.message : 'error.lobbyListFailed',
      )
    }
  })

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
      await emitLobbyList(io, lobbyService)
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
      await emitLobbyList(io, lobbyService)
    } catch (error) {
      emitError(
        socket,
        error instanceof Error ? error.message : 'error.joinFailed',
      )
    }
  })

  socket.on('lobby:spectate', async (payload) => {
    try {
      const input = spectateLobbySchema.parse(payload)
      const result = await lobbyService.spectateLobby(input)

      sessionStore.set(socket.id, {
        code: result.lobby.code,
        sessionToken: input.sessionToken,
      })

      await socket.join(result.lobby.code)
      socket.emit('lobby:joined', {
        lobby: result.lobby,
        playerId: result.playerId,
      })
      await emitStateForCode(io, result.lobby.code, sessionStore, gameService)
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
      await emitLobbyList(io, lobbyService)
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
      await emitLobbyList(io, lobbyService)
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
      await emitLobbyList(io, lobbyService)

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
      await emitLobbyList(io, lobbyService)
    } catch (error) {
      emitError(
        socket,
        error instanceof Error ? error.message : 'error.closeLobbyFailed',
      )
    }
  })
}
