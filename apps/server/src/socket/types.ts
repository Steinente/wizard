import type { ClientToServerEvents, ServerToClientEvents } from '@wizard/shared'
import type { Socket } from 'socket.io'

export type WizardSocket = Socket<ClientToServerEvents, ServerToClientEvents>
