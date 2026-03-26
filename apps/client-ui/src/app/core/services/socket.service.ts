import { Injectable, signal } from '@angular/core'
import type { ClientToServerEvents, ServerToClientEvents } from '@wizard/shared'
import type { Socket } from 'socket.io-client'
import { SOCKET_URL } from '../config/app.config-values'

type IoFactory = typeof import('socket.io-client').io

type OnEntry = {
  [E in keyof ServerToClientEvents]: {
    event: E
    handler: ServerToClientEvents[E]
  }
}[keyof ServerToClientEvents]

type ReservedOnEntry = {
  event: 'connect' | 'disconnect'
  handler: () => void
}

type EmitEntry = {
  [E in keyof ClientToServerEvents]: {
    event: E
    args: Parameters<ClientToServerEvents[E]>
  }
}[keyof ClientToServerEvents]

type SocketLike = {
  on(event: 'connect' | 'disconnect', handler: () => void): SocketLike
  on<E extends keyof ServerToClientEvents>(
    event: E,
    handler: ServerToClientEvents[E],
  ): SocketLike
  emit<E extends keyof ClientToServerEvents>(
    event: E,
    ...args: Parameters<ClientToServerEvents[E]>
  ): void
}

declare global {
  interface Window {
    io?: IoFactory
  }
}

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null =
    null
  private loadingSocket: Promise<void> | null = null
  private loadingScript: Promise<void> | null = null
  private readonly pendingOn: Array<OnEntry | ReservedOnEntry> = []
  private readonly pendingEmit: EmitEntry[] = []
  private readonly isBrowser = typeof window !== 'undefined'
  private readonly connectedSignal = signal(false)
  private readonly proxySocket: SocketLike = {
    on: (
      event: 'connect' | 'disconnect' | keyof ServerToClientEvents,
      handler: (() => void) | ServerToClientEvents[keyof ServerToClientEvents],
    ) => {
      if (this.socket) {
        ;(this.socket.on as (...args: unknown[]) => unknown)(event, handler)
      } else {
        this.pendingOn.push({ event, handler } as OnEntry | ReservedOnEntry)
      }

      return this.proxySocket
    },
    emit: <E extends keyof ClientToServerEvents>(
      event: E,
      ...args: Parameters<ClientToServerEvents[E]>
    ) => {
      if (this.socket) {
        ;(this.socket.emit as (...emitArgs: unknown[]) => unknown)(
          event,
          ...args,
        )
        return
      }

      this.pendingEmit.push({ event, args } as EmitEntry)
    },
  }

  readonly connected = this.connectedSignal.asReadonly()

  connect(): SocketLike {
    if (!this.isBrowser) {
      return this.proxySocket
    }

    if (this.socket) {
      return this.proxySocket
    }

    if (!this.loadingSocket) {
      this.loadingSocket = this.initSocket()
    }

    return this.proxySocket
  }

  getSocket(): SocketLike {
    return this.connect()
  }

  private async initSocket() {
    await this.ensureClientIoLoaded()

    const ioFactory = this.globalIoFactory()
    if (!ioFactory) {
      this.loadingSocket = null
      throw new Error(
        'Socket.IO client script loaded, but global io is missing.',
      )
    }

    const socket = ioFactory(SOCKET_URL, {
      transports: ['websocket'],
    }) as Socket<ServerToClientEvents, ClientToServerEvents>

    socket.on('connect', () => this.connectedSignal.set(true))
    socket.on('disconnect', () => this.connectedSignal.set(false))

    this.socket = socket
    this.loadingSocket = null

    for (const { event, handler } of this.pendingOn) {
      ;(socket.on as (...args: unknown[]) => unknown)(event, handler)
    }
    this.pendingOn.length = 0

    for (const { event, args } of this.pendingEmit) {
      ;(socket.emit as (...emitArgs: unknown[]) => unknown)(event, ...args)
    }
    this.pendingEmit.length = 0
  }

  private async ensureClientIoLoaded() {
    if (!this.isBrowser) {
      return
    }

    if (this.globalIoFactory()) {
      return
    }

    if (!this.loadingScript) {
      this.loadingScript = new Promise<void>((resolve, reject) => {
        const script = document.createElement('script')
        script.src = this.socketIoScriptUrl()
        script.async = true
        script.onload = () => resolve()
        script.onerror = () =>
          reject(new Error('Failed to load Socket.IO client script.'))
        document.head.appendChild(script)
      }).finally(() => {
        this.loadingScript = null
      })
    }

    await this.loadingScript
  }

  private globalIoFactory(): IoFactory | null {
    if (typeof globalThis === 'undefined') {
      return null
    }

    const ioFactory = (globalThis as typeof globalThis & { io?: IoFactory }).io
    return typeof ioFactory === 'function' ? ioFactory : null
  }

  private socketIoScriptUrl() {
    const trimmed = SOCKET_URL.replace(/\/$/, '')
    return `${trimmed}/socket.io/socket.io.js`
  }
}
