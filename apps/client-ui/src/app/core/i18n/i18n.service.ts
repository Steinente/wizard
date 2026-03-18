import { Injectable, computed, signal } from '@angular/core'
import { APP_DEFAULT_LANGUAGE, LANGUAGE_KEY } from '../config/app.config-values'
import { LocalStorageService } from '../services/local-storage.service'
import {
  type TranslationKey,
  type TranslationLanguage,
  translations,
} from './translations'

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly languageSignal = signal<TranslationLanguage>(
    APP_DEFAULT_LANGUAGE as TranslationLanguage,
  )

  readonly language = computed(() => this.languageSignal())

  constructor(private readonly storage: LocalStorageService) {
    const stored = this.storage.get(LANGUAGE_KEY)

    if (stored === 'en' || stored === 'de') {
      this.languageSignal.set(stored)
    }

    this.syncDocumentLanguage(this.languageSignal())
  }

  setLanguage(language: TranslationLanguage) {
    this.languageSignal.set(language)
    this.storage.set(LANGUAGE_KEY, language)
    this.syncDocumentLanguage(language)
  }

  private syncDocumentLanguage(language: TranslationLanguage) {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language
    }
  }

  t(key: TranslationKey): string {
    return translations[this.languageSignal()][key] ?? key
  }

  format(
    key: TranslationKey,
    params?: Record<string, string | number | boolean | null>,
  ): string {
    let template = this.t(key)

    if (!params) {
      return template
    }

    for (const [paramKey, value] of Object.entries(params)) {
      template = template.replaceAll(`{${paramKey}}`, String(value))
    }

    return template
  }
}
