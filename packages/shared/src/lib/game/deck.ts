import {
  ANNIVERSARY_SPECIALS_ENABLED_BY_DEFAULT,
  type Card,
  type SpecialCardKey,
  SUITS,
} from '../cards.js'

export interface DeckBuildOptions {
  includedSpecials?: ReadonlyArray<SpecialCardKey>
}

const createNumberCards = (): Card[] =>
  SUITS.flatMap((suit) =>
    Array.from({ length: 13 }, (_, index) => ({
      id: `${suit}-${index + 1}`,
      type: 'number' as const,
      suit,
      value: index + 1,
      labelKey: `card.number.${suit}.${index + 1}`,
    })),
  )

const createWizardCards = (): Card[] =>
  Array.from({ length: 4 }, (_, index) => ({
    id: `wizard-${index + 1}`,
    type: 'wizard' as const,
    labelKey: 'card.wizard',
  }))

const createJesterCards = (): Card[] =>
  Array.from({ length: 4 }, (_, index) => ({
    id: `jester-${index + 1}`,
    type: 'jester' as const,
    labelKey: 'card.jester',
  }))

const createSpecialCards = (specials: ReadonlyArray<SpecialCardKey>): Card[] =>
  specials.map((special) => ({
    id: `special-${special}`,
    type: 'special' as const,
    special,
    labelKey: `card.special.${special}`,
  }))

export const createDeck = (options: DeckBuildOptions = {}): Card[] => {
  const { includedSpecials = ANNIVERSARY_SPECIALS_ENABLED_BY_DEFAULT } = options

  const baseDeck = [
    ...createNumberCards(),
    ...createWizardCards(),
    ...createJesterCards(),
  ]

  if (!includedSpecials.length) {
    return baseDeck
  }

  return [...baseDeck, ...createSpecialCards(includedSpecials)]
}
