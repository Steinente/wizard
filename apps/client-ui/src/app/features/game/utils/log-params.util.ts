import type { WizardGameViewState } from '@wizard/shared'
import type { TranslationKey } from '../../../core/i18n/translations'

type TranslateFn = (key: TranslationKey) => string

export type LogParams = Record<string, string | number | boolean | null>

type NormalizeModeBehavior = 'none' | 'translateKey' | 'wizardJesterOnly'

type NormalizeLogParamsOptions = {
  modeBehavior?: NormalizeModeBehavior
  includeSwappedCardLabel?: boolean
  includeSpecial?: boolean
}

const CARD_SPECIAL_MAP: Record<string, TranslationKey> = {
  shapeshifter: 'card.special.shapeShifter',
  bomb: 'card.special.bomb',
  werewolf: 'card.special.werewolf',
  cloud: 'card.special.cloud',
  juggler: 'card.special.juggler',
  dragon: 'card.special.dragon',
  fairy: 'card.special.fairy',
}

const isSuit = (
  value: string,
): value is 'red' | 'yellow' | 'green' | 'blue' =>
  value === 'red' || value === 'yellow' || value === 'green' || value === 'blue'

export const translateCardLabel = (value: string, t: TranslateFn): string => {
  const lower = value.toLowerCase()

  if (lower === 'wizard') {
    return t('card.wizard')
  }

  if (lower === 'jester') {
    return t('card.jester')
  }

  const specialKey = CARD_SPECIAL_MAP[lower]
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

export const translateSuitValue = (
  value: string,
  t: TranslateFn,
): string => {
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

  if (options?.includeSwappedCardLabel && typeof next.swappedCardLabel === 'string') {
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