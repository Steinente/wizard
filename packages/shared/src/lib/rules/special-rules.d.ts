import type { Card, SpecialCard, Suit } from '../cards.js'
import type { RoundState } from '../game/round.js'
import type { TrickState } from '../game/trick.js'
export interface SpecialCardEffectContext {
  playerId: string
  card: SpecialCard
  round: RoundState
  currentTrick: TrickState | null
  trumpSuit: Suit | null
}
export interface SpecialCardEffectResult {
  leadSuitOverride?: Suit | null
  cardActsAsSuit?: Suit | null
  cardActsAsValue?: number | null
  immediateWinTrick?: boolean
  immediateLoseTrick?: boolean
  forcePredictionDelta?: number | null
  extraLogKeys?: string[]
}
export interface SpecialCardDefinition {
  key: SpecialCard['special']
  labelKey: string
  descriptionKey: string
  isPlayableAnytime: boolean
  resolveBeforeTrickWinner: boolean
}
export declare const SPECIAL_CARD_DEFINITIONS: Record<
  SpecialCard['special'],
  SpecialCardDefinition
>
export declare const getSpecialCardDefinition: (
  card: Card,
) => SpecialCardDefinition | null
