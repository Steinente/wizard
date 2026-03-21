export declare const GAME_PHASES: readonly [
  'waiting',
  'roundSetup',
  'trumpSelection',
  'prediction',
  'playing',
  'roundScoring',
  'finished',
]
export type GamePhase = (typeof GAME_PHASES)[number]
