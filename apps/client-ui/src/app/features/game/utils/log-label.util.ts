import {
  type TranslationKey,
  translations,
} from '../../../core/i18n/translations'

export const getLogTranslationKey = (
  messageKey: string,
): TranslationKey | null => {
  const canonical = messageKey.startsWith('log.')
    ? messageKey.slice(4)
    : messageKey
  const key = `log.${canonical}` as TranslationKey

  return Object.prototype.hasOwnProperty.call(translations.en, key) ? key : null
}
