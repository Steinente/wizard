import type { Card, Suit } from '../cards.js'
import type { PlayerPrediction } from './predictions.js'
import type { TrickState } from './trick.js'
export interface RoundPlayerState {
  playerId: string
  hand: Card[]
  tricksWon: number
  prediction: PlayerPrediction | null
  pendingCloudAdjustment?: boolean
}
export interface RoundState {
  roundNumber: number
  dealerIndex: number
  activePlayerId: string | null
  roundLeaderPlayerId: string | null
  trumpSuit: Suit | null
  trumpCard: Card | null
  deckRemainderCount: number
  players: RoundPlayerState[]
  currentTrick: TrickState | null
  completedTricks: TrickState[]
}
