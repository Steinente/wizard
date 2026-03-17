export const GAME_PHASES = [
  'waiting',
  'roundSetup',
  'trumpSelection',
  'prediction',
  'playing',
  'roundScoring',
  'finished',
] as const

export type GamePhase = (typeof GAME_PHASES)[number]
