import { ANNIVERSARY_SPECIALS_ENABLED_BY_DEFAULT } from '@wizard/shared'
import type { GameConfig } from '@wizard/shared'

export const defaultGameConfig: GameConfig = {
  predictionVisibility: 'open',
  openPredictionRestriction: 'none',
  cloudRuleTiming: 'immediateAfterTrick',
  specialCardsRandomizerEnabled: false,
  twoPlayerModeEnabled: false,
  readLogEnabledByDefault: false,
  languageDefault: 'en',
  includedSpecialCards: [...ANNIVERSARY_SPECIALS_ENABLED_BY_DEFAULT],
}
