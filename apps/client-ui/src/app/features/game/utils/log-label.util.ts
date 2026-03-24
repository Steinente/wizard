import {
  type TranslationKey,
  translations,
} from '../../../core/i18n/translations'

const LOG_TRANSLATION_ALIASES: Record<string, TranslationKey> = {
  'special.bomb.played': 'log.game.card.played',
  'special.dragon.played': 'log.game.card.played',
  'special.fairy.played': 'log.game.card.played',
  'special.witch.played': 'log.game.card.played',
  'special.cloud.played': 'log.game.card.played.asSuit',
  'special.juggler.played': 'log.game.card.played.asSuit',
}

export const getLogTranslationKey = (
  messageKey: string,
): TranslationKey | null => {
  const canonical = messageKey.startsWith('log.')
    ? messageKey.slice(4)
    : messageKey
  const alias = LOG_TRANSLATION_ALIASES[canonical]

  if (alias) {
    return alias
  }

  const key = `log.${canonical}` as TranslationKey

  return Object.prototype.hasOwnProperty.call(translations.en, key) ? key : null
}
