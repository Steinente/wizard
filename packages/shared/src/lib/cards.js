export const SUITS = ['red', 'yellow', 'green', 'blue']
export const CARD_TYPES = ['number', 'wizard', 'jester', 'special']
export const SPECIAL_CARD_KEYS = [
  'shapeShifter',
  'bomb',
  'werewolf',
  'cloud',
  'juggler',
  'dragon',
  'fairy',
]
export const ANNIVERSARY_SPECIALS_ENABLED_BY_DEFAULT = [
  'shapeShifter',
  'bomb',
  'werewolf',
  'cloud',
  'juggler',
  'dragon',
  'fairy',
]
export const isNumberCard = (card) => card.type === 'number'
export const isWizardCard = (card) => card.type === 'wizard'
export const isJesterCard = (card) => card.type === 'jester'
export const isSpecialCard = (card) => card.type === 'special'
export const isSuitCard = (card) => card.type === 'number'
//# sourceMappingURL=cards.js.map
