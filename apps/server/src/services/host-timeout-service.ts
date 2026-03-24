import type { ClientToServerEvents, ServerToClientEvents } from '@wizard/shared'
import type { Server } from 'socket.io'
import { LobbyService } from './lobby-service.js'

type WizardIoServer = Server<ClientToServerEvents, ServerToClientEvents>
type LobbyClosedReason =
  | 'info.lobbyClosedDueToHostTimeout'
  | 'info.lobbyClosedDueToInactivity'

const HOST_TIMEOUT_CHECK_INTERVAL_MS = 5000

export class HostTimeoutService {
  private intervalId: NodeJS.Timeout | null = null

  constructor(
    private readonly io: WizardIoServer,
    private readonly lobbyService: LobbyService,
  ) {}

  private emitClosedLobbies(codes: string[], reason: LobbyClosedReason) {
    for (const code of codes) {
      this.io.to(code).emit('lobby:closed', {
        code,
        reason,
      })
    }
  }

  private async closeAndEmit(
    closeLobbies: () => Promise<string[]>,
    reason: LobbyClosedReason,
  ) {
    const codes = await closeLobbies()
    this.emitClosedLobbies(codes, reason)
  }

  start() {
    if (this.intervalId) {
      return
    }

    this.intervalId = setInterval(async () => {
      try {
        await this.closeAndEmit(
          () => this.lobbyService.closeExpiredHostLobbies(),
          'info.lobbyClosedDueToHostTimeout',
        )

        await this.closeAndEmit(
          () => this.lobbyService.closeInactiveRunningGames(),
          'info.lobbyClosedDueToInactivity',
        )

        await this.closeAndEmit(
          () => this.lobbyService.closeInactiveWaitingLobbies(),
          'info.lobbyClosedDueToInactivity',
        )
      } catch (error) {
        console.error('Host timeout check failed', error)
      }
    }, HOST_TIMEOUT_CHECK_INTERVAL_MS)
  }

  stop() {
    if (!this.intervalId) {
      return
    }

    clearInterval(this.intervalId)
    this.intervalId = null
  }
}
