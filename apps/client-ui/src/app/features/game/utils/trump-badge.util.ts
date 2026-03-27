import type { Card, Suit } from '@wizard/shared'
import type { TranslationKey } from '../../../core/i18n/translations'
import { SUIT_BACKGROUNDS } from '../../../shared/utils/suit-colors.util'
import { translateCardLabel, translateSuitValue } from './log-params.util'

const SPECIAL_TRUMP_REASON_CARDS = new Set([
  'cloud',
  'juggler',
  'shapeShifter',
  'dragon',
  'fairy',
  'werewolf',
])

type TranslateFn = (key: TranslationKey) => string

export interface TrumpBadgeViewModel {
  displayText: string
  background: string
  foreground: string
  border: string
}

const appendReason = (base: string, reason: string) => `${base} (${reason})`

const translatedTrumpText = (input: {
  trumpSuit: Suit | null
  trumpCard: Card | null
  t: TranslateFn
}) => {
  const { trumpSuit, trumpCard, t } = input

  if (!trumpSuit) {
    if (!trumpCard || trumpCard.type === 'number') {
      return t('noTrump')
    }

    const reason = translateCardLabel(
      trumpCard.type === 'special' ? trumpCard.special : trumpCard.type,
      t,
    )

    return appendReason(t('noTrump'), reason)
  }

  const translatedSuit = translateSuitValue(trumpSuit, t)
  let base = translatedSuit

  if (trumpCard?.type === 'number') {
    base = `${translatedSuit} ${trumpCard.value}`
  }

  if (
    trumpCard?.type === 'special' &&
    SPECIAL_TRUMP_REASON_CARDS.has(trumpCard.special)
  ) {
    base = appendReason(base, translateCardLabel(trumpCard.special, t))
  }

  if (trumpCard?.type === 'wizard') {
    base = appendReason(base, t('card.wizard'))
  }

  if (trumpCard?.type === 'jester') {
    base = appendReason(base, t('card.jester'))
  }

  return base
}

export const buildTrumpBadgeViewModel = (input: {
  trumpSuit: Suit | null
  trumpCard: Card | null
  t: TranslateFn
}): TrumpBadgeViewModel => {
  const translatedTrump = translatedTrumpText(input)
  const displayText = input.trumpSuit
    ? `${input.t('trump')} ${translatedTrump}`
    : translatedTrump
  const background = input.trumpSuit
    ? SUIT_BACKGROUNDS[input.trumpSuit]
    : '#334155'
  const foreground = input.trumpSuit === 'yellow' ? '#111827' : '#ffffff'

  return {
    displayText,
    background,
    foreground,
    border: background,
  }
}
