import { SPECIAL_CARD_KEY, type Card } from '@wizard/shared'
import type { TranslationKey } from '../../core/i18n/translations'
import { SUIT_BACKGROUNDS } from './suit-colors.util'

export const getCardTitleKey = (card: Card): TranslationKey | null => {
  if (card.type === 'wizard') {
    return 'card.wizard'
  }

  if (card.type === 'jester') {
    return 'card.jester'
  }

  if (card.type === 'special') {
    return `card.special.${card.special}` as TranslationKey
  }

  return null
}

export const getCardSubtitleKey = (card: Card): TranslationKey | null => {
  if (card.type === 'number') {
    return `suit.${card.suit}` as TranslationKey
  }

  return null
}

export const getCardPrimaryText = (card: Card): string => {
  if (card.type === 'number') {
    return String(card.value)
  }

  if (card.type === 'special' && card.special === SPECIAL_CARD_KEY.juggler) {
    return '7 ½'
  }

  if (card.type === 'special' && card.special === SPECIAL_CARD_KEY.cloud) {
    return '9 ¾'
  }

  return ''
}

export const getCardAccent = (card: Card): string => {
  if (card.type === 'number') {
    return SUIT_BACKGROUNDS[card.suit]
  }

  if (card.type === 'wizard') {
    return '#7c3aed'
  }

  if (card.type === 'jester') {
    return '#6b7280'
  }

  return '#d4a72c'
}
