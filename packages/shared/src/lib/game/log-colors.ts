export const GAME_LOG_COLOR_KEYS = [
  'red',
  'redAlt',
  'yellow',
  'yellowAlt',
  'green',
  'greenAlt',
  'blue',
  'blueAlt',
  'gray',
  'grayAlt',
] as const

export type GameLogColorKey = (typeof GAME_LOG_COLOR_KEYS)[number]
