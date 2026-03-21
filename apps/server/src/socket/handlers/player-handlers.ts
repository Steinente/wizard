import {
  setInGameSchema,
  setReadLogEnabledSchema,
} from '../schemas/player-schemas.js'
import {
  emitStateForCode,
  normalizeRoomCode,
  runSocketAction,
  type SocketHandlerContext,
} from '../utils/socket-handler-utils.js'

export const registerPlayerHandlers = ({
  socket,
  lobbyService,
  gameService,
  sessionStore,
  io,
}: SocketHandlerContext) => {
  socket.on('player:setReadLogEnabled', async (payload) => {
    await runSocketAction(
      socket,
      payload,
      setReadLogEnabledSchema.parse,
      async (input) => {
        await gameService.setReadLogEnabled(input)
        await emitStateForCode(io, input.code, sessionStore, gameService)
      },
      'Log reading setting failed',
    )
  })

  socket.on('player:setInGame', async (payload) => {
    await runSocketAction(
      socket,
      payload,
      setInGameSchema.parse,
      async (input) => {
        await lobbyService.setPlayerInGame(input)

        if (!input.inGame) {
          await socket.leave(normalizeRoomCode(input.code))
        }

        await emitStateForCode(io, input.code, sessionStore, gameService)
      },
      'Player in-game setting failed',
    )
  })
}
