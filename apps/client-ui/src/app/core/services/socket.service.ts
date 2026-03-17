import { Injectable, signal } from '@angular/core'
import type { ClientToServerEvents, ServerToClientEvents } from '@wizard/shared'
import { io, type Socket } from 'socket.io-client'
import { SOCKET_URL } from '../config/app.config-values'

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null =
    null
  private readonly connectedSignal = signal(false)

  readonly connected = this.connectedSignal.asReadonly()

  connect() {
    if (this.socket) {
      return this.socket
    }

    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
    })

    this.socket.on('connect', () => this.connectedSignal.set(true))
    this.socket.on('disconnect', () => this.connectedSignal.set(false))

    return this.socket
  }

  getSocket() {
    return this.socket ?? this.connect()
  }
}
