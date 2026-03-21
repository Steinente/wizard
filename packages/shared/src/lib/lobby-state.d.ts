export declare const LOBBY_STATUSES: readonly [
  'waiting',
  'running',
  'finished',
  'closed',
]
export type LobbyStatus = (typeof LOBBY_STATUSES)[number]
