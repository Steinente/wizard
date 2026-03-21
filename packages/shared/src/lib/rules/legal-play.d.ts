import type { Card, Suit } from '../cards.js'
export declare const playerHasSuit: (
  hand: ReadonlyArray<Card>,
  suit: Suit,
) => boolean
export declare const isLegalPlay: (
  hand: ReadonlyArray<Card>,
  cardToPlay: Card,
  leadSuit: Suit | null,
) => boolean
