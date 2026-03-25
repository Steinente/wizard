export const SUITS = ['red', 'yellow', 'green', 'blue'] as const

export type Suit = (typeof SUITS)[number]

export const CARD_TYPES = ['number', 'wizard', 'jester', 'special'] as const

export type CardType = (typeof CARD_TYPES)[number]

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
} as const

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
] as const

export type SpecialCardKey = (typeof SPECIAL_CARD_KEYS)[number]

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
] as const satisfies ReadonlyArray<SpecialCardKey>

export interface BaseCard {
  id: string
  type: CardType
  labelKey: string
}

export interface NumberCard extends BaseCard {
  type: 'number'
  suit: Suit
  value: number
}

export interface WizardCard extends BaseCard {
  type: 'wizard'
}

export interface JesterCard extends BaseCard {
  type: 'jester'
}

export interface SpecialCard extends BaseCard {
  type: 'special'
  special: SpecialCardKey
}

export type Card = NumberCard | WizardCard | JesterCard | SpecialCard

export const isNumberCard = (card: Card): card is NumberCard =>
  card.type === 'number'

export const isWizardCard = (card: Card): card is WizardCard =>
  card.type === 'wizard'

export const isJesterCard = (card: Card): card is JesterCard =>
  card.type === 'jester'

export const isSpecialCard = (card: Card): card is SpecialCard =>
  card.type === 'special'

export const isSuitCard = (card: Card): card is NumberCard =>
  card.type === 'number'
