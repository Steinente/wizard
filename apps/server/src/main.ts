import type { ClientToServerEvents, ServerToClientEvents } from '@wizard/shared'
import { createServer } from 'node:http'
import { Server } from 'socket.io'
import { env } from './config/env.js'
import { prisma } from './db/prisma.js'
import { createApp } from './http/create-app.js'
import { GameService } from './services/game/game-service.js'
import { HostTimeoutService } from './services/host-timeout-service.js'
import { LobbyService } from './services/lobby-service.js'
import { registerHandlers } from './socket/handlers/register-handlers.js'
import { SocketSessionStore } from './socket/socket-session-store.js'

const bootstrap = async () => {
  const app = createApp()
  const httpServer = createServer(app)

  const io = new Server<ClientToServerEvents, ServerToClientEvents>(
    httpServer,
    {
      cors: {
        origin: env.CLIENT_UI_URL,
        credentials: true,
      },
      pingInterval: 5000,
      pingTimeout: 10000,
    },
  )

  const lobbyService = new LobbyService()
  const gameService = new GameService()
  const sessionStore = new SocketSessionStore()
  const hostTimeoutService = new HostTimeoutService(io, lobbyService)

  io.on('connection', (socket) => {
    registerHandlers(io, socket, lobbyService, gameService, sessionStore)
  })

  hostTimeoutService.start()

  httpServer.listen(env.PORT, () => {
    console.log(`Wizard server listening on port ${env.PORT}`)
  })

  const shutdown = async () => {
    hostTimeoutService.stop()
    io.close()
    httpServer.close(async () => {
      await prisma.$disconnect()
      process.exit(0)
    })
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

bootstrap().catch(async (error) => {
  console.error('Failed to start server', error)
  await prisma.$disconnect()
  process.exit(1)
})
