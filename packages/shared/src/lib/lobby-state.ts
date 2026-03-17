export const LOBBY_STATUSES = [
  'waiting',
  'running',
  'finished',
  'closed',
] as const

export type LobbyStatus = (typeof LOBBY_STATUSES)[number]
