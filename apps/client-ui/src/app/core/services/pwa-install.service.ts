import { Injectable } from '@angular/core'
import { LocalStorageService } from './local-storage.service'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
}

const PROMPT_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000
const PROMPT_DISMISSED_AT_KEY = 'wizard.pwaInstallPromptDismissedAt'

@Injectable({ providedIn: 'root' })
export class PwaInstallService {
  private initialized = false
  private deferredPrompt: BeforeInstallPromptEvent | null = null

  constructor(private readonly storage: LocalStorageService) {}

  init() {
    if (this.initialized || typeof window === 'undefined') {
      return
    }

    this.initialized = true

    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault()
      this.deferredPrompt = event as BeforeInstallPromptEvent
    })

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null
      this.storage.remove(PROMPT_DISMISSED_AT_KEY)
    })
  }

  async promptIfEligible(): Promise<boolean> {
    if (
      !this.deferredPrompt ||
      this.isInstalled() ||
      this.isInDismissCooldown()
    ) {
      return false
    }

    const installPrompt = this.deferredPrompt
    this.deferredPrompt = null

    await installPrompt.prompt()
    const choice = await installPrompt.userChoice

    if (choice.outcome === 'accepted') {
      this.storage.remove(PROMPT_DISMISSED_AT_KEY)
      return true
    }

    this.storage.set(PROMPT_DISMISSED_AT_KEY, String(Date.now()))
    return false
  }

  private isInDismissCooldown() {
    const storedTimestamp = this.storage.get(PROMPT_DISMISSED_AT_KEY)

    if (!storedTimestamp) {
      return false
    }

    const dismissedAt = Number(storedTimestamp)

    if (!Number.isFinite(dismissedAt)) {
      this.storage.remove(PROMPT_DISMISSED_AT_KEY)
      return false
    }

    return Date.now() - dismissedAt < PROMPT_COOLDOWN_MS
  }

  private isInstalled() {
    if (typeof window === 'undefined') {
      return false
    }

    const nav = navigator as Navigator & { standalone?: boolean }
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      nav.standalone === true
    )
  }
}
