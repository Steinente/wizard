import {
  gameStartSchema,
  makePredictionSchema,
  playCardSchema,
  resolveCloudAdjustmentSchema,
  resolveCloudSchema,
  resolveJugglerSchema,
  resolveShapeShifterSchema,
  resolveWerewolfTrumpSwapSchema,
  selectJugglerPassCardSchema,
  selectTrumpSuitSchema,
} from './game-schemas.js'
import {
  emitError,
  emitLobbyList,
  emitStateForCode,
  emitStateToLobby,
  normalizeRoomCode,
  resolveCompletedTrickAfterDelay,
  runSocketAction,
  type SocketHandlerContext,
} from './socket-handler-utils.js'

export const registerGameHandlers = ({
  io,
  socket,
  lobbyService,
  gameService,
  sessionStore,
}: SocketHandlerContext) => {
  socket.on('game:start', async (payload) => {
    await runSocketAction(
      socket,
      payload,
      gameStartSchema.parse,
      async (input) => {
        const { lobby } = await gameService.startGame(input)

        io.to(lobby.code).emit('lobby:updated', { lobby })
        await emitLobbyList(io, lobbyService)
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
        error instanceof Error ? error.message : 'error.jugglerResolutionFailed',
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

      if (!room) {
        return
      }

      await emitStateToLobby(io, roomCode, room, sessionStore, gameService)

      const trick = stateAfterPlay.currentRound?.currentTrick
      const playerCount = stateAfterPlay.players.length
      const isTrickComplete = !!trick && trick.plays.length === playerCount

      if (!isTrickComplete) {
        return
      }

      await new Promise((resolve) => setTimeout(resolve, 3000))
      await gameService.resolvePendingCompletedTrick(input.code)
      await emitStateToLobby(io, roomCode, room, sessionStore, gameService)
    } catch (error) {
      emitError(
        socket,
        error instanceof Error ? error.message : 'error.playCardFailed',
      )
    }
  })
}