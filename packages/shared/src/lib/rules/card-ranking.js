import {
  isJesterCard,
  isNumberCard,
  isSpecialCard,
  isWizardCard,
} from '../cards.js'
export const getLeadSuitFromCard = (card) => {
  if (isNumberCard(card)) {
    return card.suit
  }
  return null
}
export const evaluateCardStrength = (card, leadSuit, trumpSuit) => {
  if (isWizardCard(card)) {
    return {
      card,
      strength: 1000,
      reason: 'wizard',
    }
  }
  if (isJesterCard(card)) {
    return {
      card,
      strength: 0,
      reason: 'jester',
    }
  }
  if (isSpecialCard(card)) {
    return {
      card,
      strength: 500,
      reason: 'special',
    }
  }
  if (trumpSuit && card.suit === trumpSuit) {
    return {
      card,
      strength: 700 + card.value,
      reason: 'trump',
    }
  }
  if (leadSuit && card.suit === leadSuit) {
    return {
      card,
      strength: 300 + card.value,
      reason: 'leadSuit',
    }
  }
  return {
    card,
    strength: 100 + card.value,
    reason: 'number',
  }
}
//# sourceMappingURL=card-ranking.js.map
