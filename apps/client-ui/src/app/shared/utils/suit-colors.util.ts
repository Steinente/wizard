import type { GameLogColorKey, Suit } from '@wizard/shared'

export const ALL_SUITS: Suit[] = ['red', 'yellow', 'green', 'blue']

export const SUIT_BACKGROUNDS: Record<Suit, string> = {
  red: 'var(--card-red)',
  yellow: 'var(--card-yellow)',
  green: 'var(--card-green)',
  blue: 'var(--card-blue)',
}

export const getSuitBackground = (suit: Suit): string => SUIT_BACKGROUNDS[suit]

export const GAME_LOG_BACKGROUNDS: Record<GameLogColorKey, string> = {
  red: 'var(--card-red)',
  redAlt: 'var(--log-red-alt)',
  yellow: 'var(--card-yellow)',
  yellowAlt: 'var(--log-yellow-alt)',
  green: 'var(--card-green)',
  greenAlt: 'var(--log-green-alt)',
  blue: 'var(--card-blue)',
  blueAlt: 'var(--log-blue-alt)',
  gray: 'var(--log-gray)',
  grayAlt: 'var(--log-gray-alt)',
}

export const getGameLogBackground = (colorKey: GameLogColorKey): string =>
  GAME_LOG_BACKGROUNDS[colorKey]
