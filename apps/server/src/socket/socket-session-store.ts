type SocketSessionEntry = {
  code: string
  sessionToken: string
}

export class SocketSessionStore {
  private readonly entries = new Map<string, SocketSessionEntry>()

  set(socketId: string, entry: SocketSessionEntry) {
    this.entries.set(socketId, entry)
  }

  get(socketId: string) {
    return this.entries.get(socketId) ?? null
  }

  delete(socketId: string) {
    this.entries.delete(socketId)
  }
}
