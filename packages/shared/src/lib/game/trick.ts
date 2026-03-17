import type { Card, Suit } from '../cards.js'

export interface TrickPlay {
  playerId: string
  card: Card
  playedAt: string
}

export interface TrickState {
  leadPlayerId: string
  leadSuit: Suit | null
  plays: TrickPlay[]
  winnerPlayerId: string | null
  winningCard: Card | null
  cancelledByBomb?: boolean
}
