import type { ClientToServerEvents, ServerToClientEvents } from '@wizard/shared'
import type { Server } from 'socket.io'
import { LobbyService } from './lobby-service.js'

type WizardIoServer = Server<ClientToServerEvents, ServerToClientEvents>

export class HostTimeoutService {
  private intervalId: NodeJS.Timeout | null = null

  constructor(
    private readonly io: WizardIoServer,
    private readonly lobbyService: LobbyService,
  ) {}

  start() {
    if (this.intervalId) {
      return
    }

    this.intervalId = setInterval(async () => {
      try {
        const expiredCodes = await this.lobbyService.closeExpiredHostLobbies()

        for (const code of expiredCodes) {
          this.io.to(code).emit('lobby:closed', {
            code,
            reason: 'info.lobbyClosedDueToHostTimeout',
          })
        }

        const inactiveRunningCodes =
          await this.lobbyService.closeInactiveRunningGames()

        for (const code of inactiveRunningCodes) {
          this.io.to(code).emit('lobby:closed', {
            code,
            reason: 'info.lobbyClosedDueToInactivity',
          })
        }
      } catch (error) {
        console.error('Host timeout check failed', error)
      }
    }, 5000)
  }

  stop() {
    if (!this.intervalId) {
      return
    }

    clearInterval(this.intervalId)
    this.intervalId = null
  }
}
