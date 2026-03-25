import type { GameConfig, SpecialCardKey } from '@wizard/shared'
import { SPECIAL_CARD_KEYS } from '@wizard/shared'

export type SpecialCardSettings = Pick<
  GameConfig,
  'includedSpecialCards' | 'cloudRuleTiming' | 'specialCardsRandomizerEnabled'
>

const DEFAULT_SPECIAL_CARD_SETTINGS: SpecialCardSettings = {
  includedSpecialCards: [...SPECIAL_CARD_KEYS],
  cloudRuleTiming: 'endOfRound',
  specialCardsRandomizerEnabled: false,
}

export const parseSpecialCardSettings = (
  value: string | null,
): SpecialCardSettings => {
  if (value === null) return { ...DEFAULT_SPECIAL_CARD_SETTINGS }

  try {
    const parsed = JSON.parse(value)

    if (Array.isArray(parsed)) {
      return {
        includedSpecialCards: parsed as SpecialCardKey[],
        cloudRuleTiming: DEFAULT_SPECIAL_CARD_SETTINGS.cloudRuleTiming,
        specialCardsRandomizerEnabled:
          DEFAULT_SPECIAL_CARD_SETTINGS.specialCardsRandomizerEnabled,
      }
    }

    if (parsed && typeof parsed === 'object') {
      const maybeCards = (parsed as { includedSpecialCards?: unknown })
        .includedSpecialCards
      const maybeTiming = (parsed as { cloudRuleTiming?: unknown })
        .cloudRuleTiming
      const maybeRandomizer = (
        parsed as { specialCardsRandomizerEnabled?: unknown }
      ).specialCardsRandomizerEnabled

      return {
        includedSpecialCards: Array.isArray(maybeCards)
          ? (maybeCards as SpecialCardKey[])
          : DEFAULT_SPECIAL_CARD_SETTINGS.includedSpecialCards,
        cloudRuleTiming:
          maybeTiming === 'immediateAfterTrick'
            ? 'immediateAfterTrick'
            : 'endOfRound',
        specialCardsRandomizerEnabled: maybeRandomizer === true,
      }
    }

    return { ...DEFAULT_SPECIAL_CARD_SETTINGS }
  } catch {
    return { ...DEFAULT_SPECIAL_CARD_SETTINGS }
  }
}

export const serializeSpecialCardSettings = (
  settings: SpecialCardSettings,
): string => JSON.stringify(settings)
