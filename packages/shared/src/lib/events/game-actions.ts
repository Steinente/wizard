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
  suit: Suit
}

export interface ToggleAudioAction {
  type: 'toggleAudio'
  playerId: string
  enabled: boolean
}

export interface ResolveShapeShifterAction {
  type: 'resolveShapeShifter'
  playerId: string
  cardId: string
  chosenSuit: Suit
  chosenValue: number
}

export interface ResolveCloudAction {
  type: 'resolveCloud'
  playerId: string
  targetPlayerId: string
}

export interface ResolveJugglerAction {
  type: 'resolveJuggler'
  playerId: string
  targetPlayerId: string
}

export type GameAction =
  | MakePredictionAction
  | PlayCardAction
  | SelectTrumpSuitAction
  | ToggleAudioAction
  | ResolveShapeShifterAction
  | ResolveCloudAction
  | ResolveJugglerAction
