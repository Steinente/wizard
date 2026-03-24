import { SUITS, type Suit, type WizardGameViewState } from '@wizard/shared'
import type { TranslationKey } from '../../../core/i18n/translations'

type TranslateFn = (key: TranslationKey) => string

export type LogParams = Record<string, string | number | boolean | null>

type NormalizeModeBehavior = 'none' | 'translateKey' | 'wizardJesterOnly'

type NormalizeLogParamsOptions = {
  modeBehavior?: NormalizeModeBehavior
  includeSwappedCardLabel?: boolean
  includeSpecial?: boolean
}

const KNOWN_SPECIALS = new Set([
  'shapeshifter',
  'bomb',
  'werewolf',
  'vampire',
  'cloud',
  'juggler',
  'dragon',
  'fairy',
  'witch',
])

const getSpecialCardTranslationKey = (value: string): TranslationKey | null => {
  const lower = value.toLowerCase()

  if (!KNOWN_SPECIALS.has(lower)) {
    return null
  }

  const keySegment = lower === 'shapeshifter' ? 'shapeShifter' : lower
  return `card.special.${keySegment}` as TranslationKey
}

const isSuit = (value: string): value is Suit =>
  (SUITS as readonly string[]).includes(value)

export const translateCardLabel = (value: string, t: TranslateFn): string => {
  const lower = value.toLowerCase()

  if (lower === 'wizard') {
    return t('card.wizard')
  }

  if (lower === 'jester') {
    return t('card.jester')
  }

  const specialKey = getSpecialCardTranslationKey(lower)
  if (specialKey) {
    return t(specialKey)
  }

  const parts = value.split(' ')

  if (parts.length === 2) {
    const suit = parts[0].toLowerCase()
    const number = parts[1]

    if (isSuit(suit)) {
      return `${t(`suit.${suit}` as TranslationKey)} ${number}`
    }
  }

  return value
}

export const replacePlayerReferences = (
  params: LogParams | undefined,
  players: WizardGameViewState['players'],
) => {
  if (!params) {
    return params
  }

  const next = { ...params }

  for (const key of ['playerId', 'targetPlayerId', 'sourcePlayerId']) {
    const value = next[key]

    if (typeof value === 'string') {
      const player = players.find((entry) => entry.playerId === value)

      if (player) {
        next[key] = player.name
      }
    }
  }

  return next
}

export const translateSuitValue = (value: string, t: TranslateFn): string => {
  const lower = value.toLowerCase()

  if (isSuit(lower)) {
    return t(`suit.${lower}` as TranslationKey)
  }

  if (lower === 'none') {
    return t('noTrump')
  }

  return value
}

export const normalizeLogParams = (
  params: LogParams | undefined,
  players: WizardGameViewState['players'],
  t: TranslateFn,
  options?: NormalizeLogParamsOptions,
) => {
  const next = replacePlayerReferences(params, players)

  if (!next) {
    return next
  }

  if (typeof next.suit === 'string') {
    next.suit = translateSuitValue(next.suit, t)
  }

  if (typeof next.cardLabel === 'string') {
    next.cardLabel = translateCardLabel(next.cardLabel, t)
  }

  if (typeof next.givenCardLabel === 'string') {
    next.givenCardLabel = translateCardLabel(next.givenCardLabel, t)
  }

  if (typeof next.takenCardLabel === 'string') {
    next.takenCardLabel = translateCardLabel(next.takenCardLabel, t)
  }

  if (typeof next.copiedCardLabel === 'string') {
    next.copiedCardLabel = translateCardLabel(next.copiedCardLabel, t)
  }

  if (typeof next.currentTrump === 'string') {
    next.currentTrump = translateCardLabel(next.currentTrump, t)
  }

  if (
    options?.includeSwappedCardLabel &&
    typeof next.swappedCardLabel === 'string'
  ) {
    next.swappedCardLabel = translateCardLabel(next.swappedCardLabel, t)
  }

  if (options?.includeSpecial && typeof next.special === 'string') {
    next.special = translateCardLabel(next.special, t)
  }

  const modeBehavior = options?.modeBehavior ?? 'none'

  if (typeof next.mode === 'string') {
    if (modeBehavior === 'translateKey') {
      next.mode = t(next.mode as TranslationKey)
    }

    if (modeBehavior === 'wizardJesterOnly') {
      const mode = next.mode.toLowerCase()

      if (mode === 'card.wizard') {
        next.mode = t('card.wizard')
      } else if (mode === 'card.jester') {
        next.mode = t('card.jester')
      }
    }
  }

  return next
}

export const addDerivedCardLabelForSpecialPlay = (
  messageKey: string,
  params: LogParams | undefined,
  t: TranslateFn,
) => {
  const canonical = messageKey.startsWith('log.')
    ? messageKey.slice(4)
    : messageKey
  const specialMatch = /^special\.([a-zA-Z]+)\.played$/.exec(canonical)
  const special = specialMatch?.[1]?.toLowerCase()
  const cardTranslationKey = special
    ? getSpecialCardTranslationKey(special)
    : null

  if (!cardTranslationKey) {
    return params
  }

  const next = { ...(params ?? {}) }

  if (typeof next.cardLabel !== 'string') {
    next.cardLabel = t(cardTranslationKey)
  }

  return next
}
