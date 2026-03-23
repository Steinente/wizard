export declare const PREDICTION_VISIBILITIES: readonly [
  'open',
  'hidden',
  'secret',
]
export type PredictionVisibility = (typeof PREDICTION_VISIBILITIES)[number]
export declare const OPEN_PREDICTION_RESTRICTIONS: readonly [
  'none',
  'mustEqualTricks',
  'mustNotEqualTricks',
]
export type OpenPredictionRestriction =
  (typeof OPEN_PREDICTION_RESTRICTIONS)[number]
export declare const CLOUD_RULE_TIMINGS: readonly [
  'endOfRound',
  'immediateAfterTrick',
]
export type CloudRuleTiming = (typeof CLOUD_RULE_TIMINGS)[number]
export interface GameConfig {
  predictionVisibility: PredictionVisibility
  openPredictionRestriction: OpenPredictionRestriction
  cloudRuleTiming: CloudRuleTiming
  specialCardsRandomizerEnabled: boolean
  readLogEnabledByDefault: boolean
  languageDefault: 'en' | 'de'
  includedSpecialCards: import('./cards.js').SpecialCardKey[]
}
