export const SUITS = ['red', 'yellow', 'green', 'blue']
export const CARD_TYPES = ['number', 'wizard', 'jester', 'special']
export const SPECIAL_CARD_KEY = {
  vampire: 'vampire',
  shapeShifter: 'shapeShifter',
  witch: 'witch',
  cloud: 'cloud',
  juggler: 'juggler',
  werewolf: 'werewolf',
  bomb: 'bomb',
  fairy: 'fairy',
  dragon: 'dragon',
  darkEye: 'darkEye',
}
export const SPECIAL_CARD_KEYS = [
  SPECIAL_CARD_KEY.vampire,
  SPECIAL_CARD_KEY.shapeShifter,
  SPECIAL_CARD_KEY.witch,
  SPECIAL_CARD_KEY.cloud,
  SPECIAL_CARD_KEY.juggler,
  SPECIAL_CARD_KEY.werewolf,
  SPECIAL_CARD_KEY.bomb,
  SPECIAL_CARD_KEY.fairy,
  SPECIAL_CARD_KEY.dragon,
  SPECIAL_CARD_KEY.darkEye,
]
export const ANNIVERSARY_SPECIALS_ENABLED_BY_DEFAULT = [
  SPECIAL_CARD_KEY.vampire,
  SPECIAL_CARD_KEY.shapeShifter,
  SPECIAL_CARD_KEY.witch,
  SPECIAL_CARD_KEY.cloud,
  SPECIAL_CARD_KEY.juggler,
  SPECIAL_CARD_KEY.werewolf,
  SPECIAL_CARD_KEY.bomb,
  SPECIAL_CARD_KEY.fairy,
  SPECIAL_CARD_KEY.dragon,
]
export const isNumberCard = (card) => card.type === 'number'
export const isWizardCard = (card) => card.type === 'wizard'
export const isJesterCard = (card) => card.type === 'jester'
export const isSpecialCard = (card) => card.type === 'special'
export const isSuitCard = (card) => card.type === 'number'
//# sourceMappingURL=cards.js.map
