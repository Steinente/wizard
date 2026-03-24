import type { Suit } from '../cards.js'

export interface MakePredictionAction {
  type: 'makePrediction'
  playerId: string
  value: number
}
export interface PlayCardAction {
  type: 'playCard'
  playerId: string
  cardId: string
}
export interface SelectTrumpSuitAction {
  type: 'selectTrumpSuit'
  playerId: string
  suit: Suit | null
}
export interface ToggleReadLogAction {
  type: 'toggleReadLog'
  playerId: string
  enabled: boolean
}
export type GameAction =
  | MakePredictionAction
  | PlayCardAction
  | SelectTrumpSuitAction
  | ToggleReadLogAction
