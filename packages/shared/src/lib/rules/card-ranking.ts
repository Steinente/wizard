import type { Card, SpecialCardKey, Suit } from '../cards.js'
import {
  SPECIAL_CARD_KEY,
  isJesterCard,
  isNumberCard,
  isSpecialCard,
  isWizardCard,
} from '../cards.js'
import { compareDragonFairyDuel } from './special-duels.js'

export interface RuntimeCardEffectLookup {
  copiedCard?: Card
  chosenSuit?: Suit | null
  chosenValue?: number | null
  shapeShifterMode?: 'wizard' | 'jester' | null
  special?: SpecialCardKey
}

export const CARD_CLASS = {
  dragon: 'dragon',
  wizard: 'wizard',
  trump: 'trump',
  leadSuit: 'leadSuit',
  number: 'number',
  jester: 'jester',
  fairy: 'fairy',
  witch: 'witch',
  otherSpecial: 'otherSpecial',
} as const

export type CardClass = (typeof CARD_CLASS)[keyof typeof CARD_CLASS]

export interface ClassifiedCard {
  card: Card
  className: CardClass
  numericStrength: number
  effectiveSuit: Suit | null
}

export const getLeadSuitFromCard = (
  card: Card,
  runtimeEffect?: RuntimeCardEffectLookup | null,
): Suit | null => {
  if (
    isSpecialCard(card) &&
    card.special === SPECIAL_CARD_KEY.vampire &&
    runtimeEffect?.copiedCard
  ) {
    return getLeadSuitFromCard(runtimeEffect.copiedCard, runtimeEffect)
  }

  if (isNumberCard(card)) {
    return card.suit
  }

  if (
    isSpecialCard(card) &&
    (card.special === SPECIAL_CARD_KEY.juggler ||
      card.special === SPECIAL_CARD_KEY.cloud) &&
    runtimeEffect?.chosenSuit
  ) {
    return runtimeEffect.chosenSuit
  }

  return null
}

const getShapeShifterMode = (
  runtimeEffect?: RuntimeCardEffectLookup | null,
): 'wizard' | 'jester' => runtimeEffect?.shapeShifterMode ?? 'jester'

const classified = (
  card: Card,
  className: CardClass,
  numericStrength: number,
  effectiveSuit: Suit | null,
): ClassifiedCard => ({ card, className, numericStrength, effectiveSuit })

const classifySuitBasedSpecial = (
  card: Card,
  leadSuit: Suit | null,
  trumpSuit: Suit | null,
  runtimeEffect: RuntimeCardEffectLookup | null | undefined,
  defaultValue: number,
): ClassifiedCard => {
  const suit = runtimeEffect?.chosenSuit ?? null
  const value = runtimeEffect?.chosenValue ?? defaultValue

  if (suit && trumpSuit && suit === trumpSuit) {
    return classified(card, CARD_CLASS.trump, 700 + value, suit)
  }

  if (suit && leadSuit && suit === leadSuit) {
    return classified(card, CARD_CLASS.leadSuit, 300 + value, suit)
  }

  return classified(card, CARD_CLASS.otherSpecial, 100 + value, suit)
}

export const classifyCard = (
  card: Card,
  leadSuit: Suit | null,
  trumpSuit: Suit | null,
  runtimeEffect?: RuntimeCardEffectLookup | null,
): ClassifiedCard => {
  if (
    isSpecialCard(card) &&
    card.special === SPECIAL_CARD_KEY.vampire &&
    runtimeEffect?.copiedCard
  ) {
    return classifyCard(
      runtimeEffect.copiedCard,
      leadSuit,
      trumpSuit,
      runtimeEffect,
    )
  }

  if (isWizardCard(card)) return classified(card, CARD_CLASS.wizard, 1000, null)
  if (isJesterCard(card)) return classified(card, CARD_CLASS.jester, 10, null)

  if (isSpecialCard(card)) {
    if (card.special === SPECIAL_CARD_KEY.dragon)
      return classified(card, CARD_CLASS.dragon, 1100, null)
    if (card.special === SPECIAL_CARD_KEY.fairy)
      return classified(card, CARD_CLASS.fairy, -10, null)
    if (card.special === SPECIAL_CARD_KEY.witch)
      return classified(card, CARD_CLASS.witch, -20, null)

    if (card.special === SPECIAL_CARD_KEY.shapeShifter) {
      const mode = getShapeShifterMode(runtimeEffect)
      return mode === 'wizard'
        ? classified(card, CARD_CLASS.wizard, 1000, null)
        : classified(card, CARD_CLASS.jester, 10, null)
    }

    if (card.special === SPECIAL_CARD_KEY.juggler) {
      return classifySuitBasedSpecial(
        card,
        leadSuit,
        trumpSuit,
        runtimeEffect,
        7.5,
      )
    }

    if (card.special === SPECIAL_CARD_KEY.cloud) {
      return classifySuitBasedSpecial(
        card,
        leadSuit,
        trumpSuit,
        runtimeEffect,
        9.75,
      )
    }

    return classified(card, CARD_CLASS.otherSpecial, 500, null)
  }

  if (trumpSuit && card.suit === trumpSuit) {
    return classified(card, CARD_CLASS.trump, 700 + card.value, card.suit)
  }

  if (leadSuit && card.suit === leadSuit) {
    return classified(card, CARD_CLASS.leadSuit, 300 + card.value, card.suit)
  }

  return classified(card, CARD_CLASS.number, 100 + card.value, card.suit)
}

export const compareCards = (
  left: ClassifiedCard,
  right: ClassifiedCard,
): number => {
  const dragonFairyDuelResult = compareDragonFairyDuel(
    left.className,
    right.className,
  )

  if (dragonFairyDuelResult !== null) {
    return dragonFairyDuelResult
  }

  if (left.numericStrength > right.numericStrength) {
    return 1
  }

  if (left.numericStrength < right.numericStrength) {
    return -1
  }

  return 0
}
