export const SUPPORTED_LANGUAGES = ['en', 'de'] as const

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]
