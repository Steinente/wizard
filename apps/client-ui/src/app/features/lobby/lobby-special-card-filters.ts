import type { SpecialCardKey } from '@wizard/shared'
import { SPECIAL_CARD_KEY, SPECIAL_CARD_KEYS } from '@wizard/shared'
import type { TranslationKey } from '../../core/i18n/translations'

export const SPECIAL_CARD_FILTER_ID = {
  custom: 'custom',
  classic: 'classic',
  anniversary20: 'anniversary20',
  anniversary25: 'anniversary25',
  anniversary30: 'anniversary30',
  darkEyeOnly: 'darkEyeOnly',
} as const

export type SpecialCardFilterId =
  (typeof SPECIAL_CARD_FILTER_ID)[keyof typeof SPECIAL_CARD_FILTER_ID]

export type PresetSpecialCardFilterId = Exclude<
  SpecialCardFilterId,
  typeof SPECIAL_CARD_FILTER_ID.custom
>

export interface SpecialCardFilterPreset {
  id: PresetSpecialCardFilterId
  labelKey: TranslationKey
  includedCards: readonly SpecialCardKey[]
}

export const SPECIAL_CARD_FILTER_PRESETS: readonly SpecialCardFilterPreset[] = [
  {
    id: SPECIAL_CARD_FILTER_ID.classic,
    labelKey: 'specialCardsFilterClassic',
    includedCards: [],
  },
  {
    id: SPECIAL_CARD_FILTER_ID.anniversary20,
    labelKey: 'specialCardsFilterAnniversary20',
    includedCards: [
      SPECIAL_CARD_KEY.cloud,
      SPECIAL_CARD_KEY.juggler,
      SPECIAL_CARD_KEY.werewolf,
      SPECIAL_CARD_KEY.bomb,
      SPECIAL_CARD_KEY.fairy,
      SPECIAL_CARD_KEY.dragon,
    ],
  },
  {
    id: SPECIAL_CARD_FILTER_ID.anniversary25,
    labelKey: 'specialCardsFilterAnniversary25',
    includedCards: [
      SPECIAL_CARD_KEY.shapeShifter,
      SPECIAL_CARD_KEY.cloud,
      SPECIAL_CARD_KEY.juggler,
      SPECIAL_CARD_KEY.werewolf,
      SPECIAL_CARD_KEY.bomb,
      SPECIAL_CARD_KEY.fairy,
      SPECIAL_CARD_KEY.dragon,
    ],
  },
  {
    id: SPECIAL_CARD_FILTER_ID.anniversary30,
    labelKey: 'specialCardsFilterAnniversary30',
    includedCards: [
      SPECIAL_CARD_KEY.vampire,
      SPECIAL_CARD_KEY.shapeShifter,
      SPECIAL_CARD_KEY.witch,
      SPECIAL_CARD_KEY.cloud,
      SPECIAL_CARD_KEY.juggler,
      SPECIAL_CARD_KEY.werewolf,
      SPECIAL_CARD_KEY.bomb,
      SPECIAL_CARD_KEY.fairy,
      SPECIAL_CARD_KEY.dragon,
    ],
  },
  {
    id: SPECIAL_CARD_FILTER_ID.darkEyeOnly,
    labelKey: 'specialCardsFilterDarkEyeOnly',
    includedCards: [SPECIAL_CARD_KEY.darkEye],
  },
] as const

export const findSpecialCardFilterPreset = (
  id: PresetSpecialCardFilterId,
): SpecialCardFilterPreset | undefined =>
  SPECIAL_CARD_FILTER_PRESETS.find((preset) => preset.id === id)

export const normalizeIncludedSpecialCards = (
  includedSpecialCards: readonly SpecialCardKey[] | undefined,
): SpecialCardKey[] => {
  const cards = includedSpecialCards ?? SPECIAL_CARD_KEYS
  return SPECIAL_CARD_KEYS.filter((key) => cards.includes(key))
}

export const hasSameSpecialCards = (
  selected: readonly SpecialCardKey[],
  expected: readonly SpecialCardKey[],
): boolean => {
  if (selected.length !== expected.length) {
    return false
  }

  return selected.every((key) => expected.includes(key))
}

export const resolveActiveSpecialCardFilter = (
  includedSpecialCards: readonly SpecialCardKey[] | undefined,
  selectedHint: PresetSpecialCardFilterId | null,
): SpecialCardFilterId => {
  const included = normalizeIncludedSpecialCards(includedSpecialCards)

  if (selectedHint) {
    const hintedPreset = findSpecialCardFilterPreset(selectedHint)
    if (
      hintedPreset &&
      hasSameSpecialCards(included, hintedPreset.includedCards)
    ) {
      return selectedHint
    }
  }

  return (
    SPECIAL_CARD_FILTER_PRESETS.find((preset) =>
      hasSameSpecialCards(included, preset.includedCards),
    )?.id ?? SPECIAL_CARD_FILTER_ID.custom
  )
}

export const getSpecialCardFilterLabelKey = (
  id: SpecialCardFilterId,
): TranslationKey =>
  SPECIAL_CARD_FILTER_PRESETS.find((preset) => preset.id === id)?.labelKey ??
  'specialCardsFilterCustom'
