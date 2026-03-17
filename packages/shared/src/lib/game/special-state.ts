import type { SpecialCardKey, Suit } from '../cards.js'

export type PendingDecisionType =
  | 'selectTrumpSuit'
  | 'shapeShifterChoice'
  | 'cloudSuitChoice'
  | 'cloudPredictionAdjustment'
  | 'jugglerSuitChoice'
  | 'jugglerPassCard'
  | 'werewolfTrumpSwap'

export interface PendingDecisionBase {
  id: string
  type: PendingDecisionType
  playerId: string
  createdAt: string
  cardId?: string
  special?: string
}

export interface SelectTrumpSuitDecision extends PendingDecisionBase {
  type: 'selectTrumpSuit'
}

export interface ShapeShifterChoiceDecision extends PendingDecisionBase {
  type: 'shapeShifterChoice'
  modeOptions: Array<'wizard' | 'jester'>
}

export interface CloudSuitChoiceDecision extends PendingDecisionBase {
  type: 'cloudSuitChoice'
  allowedSuits: Suit[]
}

export interface CloudPredictionAdjustmentDecision extends PendingDecisionBase {
  type: 'cloudPredictionAdjustment'
  currentPrediction: number
}

export interface JugglerSuitChoiceDecision extends PendingDecisionBase {
  type: 'jugglerSuitChoice'
  allowedSuits: Suit[]
}

export interface JugglerPassCardDecision extends PendingDecisionBase {
  type: 'jugglerPassCard'
  orderedPlayerIds: string[]
  selections: Record<string, string>
  remainingPlayerIds: string[]
}

export interface WerewolfTrumpSwapDecision extends PendingDecisionBase {
  type: 'werewolfTrumpSwap'
  allowedSuits: Array<Suit | null>
}

export type PendingDecision =
  | SelectTrumpSuitDecision
  | ShapeShifterChoiceDecision
  | CloudSuitChoiceDecision
  | CloudPredictionAdjustmentDecision
  | JugglerSuitChoiceDecision
  | JugglerPassCardDecision
  | WerewolfTrumpSwapDecision

export interface ResolvedCardRuntimeEffect {
  cardId: string
  ownerPlayerId: string
  special: SpecialCardKey
  chosenSuit?: Suit | null
  chosenValue?: number | null
  shapeShifterMode?: 'wizard' | 'jester' | null
  note?: string
}
