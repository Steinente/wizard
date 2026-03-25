import { de } from './translations.de'
import { en } from './translations.en'

export const translations = {
  en,
  de,
} as const

export type TranslationLanguage = keyof typeof translations
export type TranslationKey = keyof typeof en
