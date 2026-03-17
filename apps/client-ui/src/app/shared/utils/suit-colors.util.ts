import type { Suit } from '@wizard/shared'

export const ALL_SUITS: Suit[] = ['red', 'yellow', 'green', 'blue']

export const SUIT_BACKGROUNDS: Record<Suit, string> = {
  red: 'var(--card-red)',
  yellow: 'var(--card-yellow)',
  green: 'var(--card-green)',
  blue: 'var(--card-blue)',
}

export const getSuitBackground = (suit: Suit): string =>
  SUIT_BACKGROUNDS[suit]