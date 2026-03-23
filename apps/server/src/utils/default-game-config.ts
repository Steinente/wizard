import { SPECIAL_CARD_KEYS } from '@wizard/shared'
import type { GameConfig } from '@wizard/shared'

export const defaultGameConfig: GameConfig = {
  predictionVisibility: 'open',
  openPredictionRestriction: 'none',
  cloudRuleTiming: 'endOfRound',
  specialCardsRandomizerEnabled: false,
  readLogEnabledByDefault: false,
  languageDefault: 'en',
  includedSpecialCards: [...SPECIAL_CARD_KEYS],
}
