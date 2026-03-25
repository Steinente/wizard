export declare const SUITS: readonly ['red', 'yellow', 'green', 'blue']
export type Suit = (typeof SUITS)[number]
export declare const CARD_TYPES: readonly [
  'number',
  'wizard',
  'jester',
  'special',
]
export type CardType = (typeof CARD_TYPES)[number]
export declare const SPECIAL_CARD_KEY: {
  readonly vampire: 'vampire'
  readonly shapeShifter: 'shapeShifter'
  readonly witch: 'witch'
  readonly cloud: 'cloud'
  readonly juggler: 'juggler'
  readonly werewolf: 'werewolf'
  readonly bomb: 'bomb'
  readonly fairy: 'fairy'
  readonly dragon: 'dragon'
  readonly darkEye: 'darkEye'
}
export declare const SPECIAL_CARD_KEYS: readonly [
  'vampire',
  'shapeShifter',
  'witch',
  'cloud',
  'juggler',
  'werewolf',
  'bomb',
  'fairy',
  'dragon',
  'darkEye',
]
export type SpecialCardKey = (typeof SPECIAL_CARD_KEYS)[number]
export declare const ANNIVERSARY_SPECIALS_ENABLED_BY_DEFAULT: ReadonlyArray<SpecialCardKey>
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
export declare const isNumberCard: (card: Card) => card is NumberCard
export declare const isWizardCard: (card: Card) => card is WizardCard
export declare const isJesterCard: (card: Card) => card is JesterCard
export declare const isSpecialCard: (card: Card) => card is SpecialCard
export declare const isSuitCard: (card: Card) => card is NumberCard
