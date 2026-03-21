import { ANNIVERSARY_SPECIALS_ENABLED_BY_DEFAULT, SUITS } from '../cards.js'
const createNumberCards = () =>
  SUITS.flatMap((suit) =>
    Array.from({ length: 13 }, (_, index) => ({
      id: `${suit}-${index + 1}`,
      type: 'number',
      suit,
      value: index + 1,
      labelKey: `card.number.${suit}.${index + 1}`,
    })),
  )
const createWizardCards = () =>
  Array.from({ length: 4 }, (_, index) => ({
    id: `wizard-${index + 1}`,
    type: 'wizard',
    labelKey: 'card.wizard',
  }))
const createJesterCards = () =>
  Array.from({ length: 4 }, (_, index) => ({
    id: `jester-${index + 1}`,
    type: 'jester',
    labelKey: 'card.jester',
  }))
const createSpecialCards = (specials) =>
  specials.map((special) => ({
    id: `special-${special}`,
    type: 'special',
    special,
    labelKey: `card.special.${special}`,
  }))
export const createDeck = (options = {}) => {
  const {
    includeSpecialCards = true,
    includedSpecials = ANNIVERSARY_SPECIALS_ENABLED_BY_DEFAULT,
  } = options
  const baseDeck = [
    ...createNumberCards(),
    ...createWizardCards(),
    ...createJesterCards(),
  ]
  if (!includeSpecialCards) {
    return baseDeck
  }
  return [...baseDeck, ...createSpecialCards(includedSpecials)]
}
//# sourceMappingURL=deck.js.map
