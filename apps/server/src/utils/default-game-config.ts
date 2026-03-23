import { SPECIAL_CARD_KEYS } from '@wizard/shared'
import type { GameConfig } from '@wizard/shared'

export const defaultGameConfig: GameConfig = {
  predictionVisibility: 'open',
  openPredictionRestriction: 'none',
  cloudRuleTiming: 'endOfRound',
  readLogEnabledByDefault: false,
  languageDefault: 'en',
  includedSpecialCards: [...SPECIAL_CARD_KEYS],
}
