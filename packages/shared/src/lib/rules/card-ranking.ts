import type { Card, SpecialCardKey, Suit } from '../cards.js'
import {
  isJesterCard,
  isNumberCard,
  isSpecialCard,
  isWizardCard,
} from '../cards.js'
import { compareDragonFairyDuel } from './special-duels.js'

export interface RuntimeCardEffectLookup {
  chosenSuit?: Suit | null
  chosenValue?: number | null
  shapeShifterMode?: 'wizard' | 'jester' | null
  special?: SpecialCardKey
}

export type CardClass =
  | 'dragon'
  | 'wizard'
  | 'trump'
  | 'leadSuit'
  | 'number'
  | 'jester'
  | 'fairy'
  | 'witch'
  | 'otherSpecial'

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
  if (isNumberCard(card)) {
    return card.suit
  }

  if (
    isSpecialCard(card) &&
    (card.special === 'juggler' || card.special === 'cloud') &&
    runtimeEffect?.chosenSuit
  ) {
    return runtimeEffect.chosenSuit
  }

  return null
}

const getShapeShifterMode = (
  runtimeEffect?: RuntimeCardEffectLookup | null,
): 'wizard' | 'jester' => runtimeEffect?.shapeShifterMode ?? 'jester'

export const classifyCard = (
  card: Card,
  leadSuit: Suit | null,
  trumpSuit: Suit | null,
  runtimeEffect?: RuntimeCardEffectLookup | null,
): ClassifiedCard => {
  if (isWizardCard(card)) {
    return {
      card,
      className: 'wizard',
      numericStrength: 1000,
      effectiveSuit: null,
    }
  }

  if (isJesterCard(card)) {
    return {
      card,
      className: 'jester',
      numericStrength: 10,
      effectiveSuit: null,
    }
  }

  if (isSpecialCard(card)) {
    if (card.special === 'dragon') {
      return {
        card,
        className: 'dragon',
        numericStrength: 1100,
        effectiveSuit: null,
      }
    }

    if (card.special === 'fairy') {
      return {
        card,
        className: 'fairy',
        numericStrength: -10,
        effectiveSuit: null,
      }
    }

    if (card.special === 'witch') {
      return {
        card,
        className: 'witch',
        numericStrength: -20,
        effectiveSuit: null,
      }
    }

    if (card.special === 'shapeShifter') {
      const mode = getShapeShifterMode(runtimeEffect)

      if (mode === 'wizard') {
        return {
          card,
          className: 'wizard',
          numericStrength: 1000,
          effectiveSuit: null,
        }
      }

      return {
        card,
        className: 'jester',
        numericStrength: 10,
        effectiveSuit: null,
      }
    }

    if (card.special === 'juggler') {
      const suit = runtimeEffect?.chosenSuit ?? null
      const value = runtimeEffect?.chosenValue ?? 7.5

      if (suit && trumpSuit && suit === trumpSuit) {
        return {
          card,
          className: 'trump',
          numericStrength: 700 + value,
          effectiveSuit: suit,
        }
      }

      if (suit && leadSuit && suit === leadSuit) {
        return {
          card,
          className: 'leadSuit',
          numericStrength: 300 + value,
          effectiveSuit: suit,
        }
      }

      return {
        card,
        className: 'otherSpecial',
        numericStrength: 100 + value,
        effectiveSuit: suit,
      }
    }

    if (card.special === 'cloud') {
      const suit = runtimeEffect?.chosenSuit ?? null
      const value = runtimeEffect?.chosenValue ?? 9.75

      if (suit && trumpSuit && suit === trumpSuit) {
        return {
          card,
          className: 'trump',
          numericStrength: 700 + value,
          effectiveSuit: suit,
        }
      }

      if (suit && leadSuit && suit === leadSuit) {
        return {
          card,
          className: 'leadSuit',
          numericStrength: 300 + value,
          effectiveSuit: suit,
        }
      }

      return {
        card,
        className: 'otherSpecial',
        numericStrength: 100 + value,
        effectiveSuit: suit,
      }
    }

    return {
      card,
      className: 'otherSpecial',
      numericStrength: 500,
      effectiveSuit: null,
    }
  }

  if (trumpSuit && card.suit === trumpSuit) {
    return {
      card,
      className: 'trump',
      numericStrength: 700 + card.value,
      effectiveSuit: card.suit,
    }
  }

  if (leadSuit && card.suit === leadSuit) {
    return {
      card,
      className: 'leadSuit',
      numericStrength: 300 + card.value,
      effectiveSuit: card.suit,
    }
  }

  return {
    card,
    className: 'number',
    numericStrength: 100 + card.value,
    effectiveSuit: card.suit,
  }
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
