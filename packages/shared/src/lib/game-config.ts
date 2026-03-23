import type { SpecialCardKey } from './cards.js'

export const PREDICTION_VISIBILITIES = ['open', 'hidden', 'secret'] as const

export type PredictionVisibility = (typeof PREDICTION_VISIBILITIES)[number]

export const OPEN_PREDICTION_RESTRICTIONS = [
  'none',
  'mustEqualTricks',
  'mustNotEqualTricks',
] as const

export type OpenPredictionRestriction =
  (typeof OPEN_PREDICTION_RESTRICTIONS)[number]

export const CLOUD_RULE_TIMINGS = ['endOfRound', 'immediateAfterTrick'] as const

export type CloudRuleTiming = (typeof CLOUD_RULE_TIMINGS)[number]

export interface GameConfig {
  predictionVisibility: PredictionVisibility
  openPredictionRestriction: OpenPredictionRestriction
  cloudRuleTiming: CloudRuleTiming
  specialCardsRandomizerEnabled: boolean
  readLogEnabledByDefault: boolean
  languageDefault: 'en' | 'de'
  includedSpecialCards: SpecialCardKey[]
}
