import { DOCUMENT } from '@angular/common'
import { Injectable, effect, inject } from '@angular/core'
import { Meta, Title } from '@angular/platform-browser'
import { NavigationEnd, Router } from '@angular/router'
import { filter } from 'rxjs'
import { I18nService } from '../i18n/i18n.service'

const FALLBACK_SITE_URL = 'https://wizard.steinente.de'
const SITE_NAME = 'Wizard Multiplayer'

type SupportedLanguage = 'de' | 'en'
type RouteSeoKey = 'home' | 'imprint' | 'privacy' | 'join' | 'lobby' | 'game'

type SeoCopy = {
  title: Record<SupportedLanguage, string>
  description: Record<SupportedLanguage, string>
}

const SEO_COPY: Record<RouteSeoKey, SeoCopy> = {
  home: {
    title: {
      de: 'Wizard online spielen',
      en: 'Play Wizard online',
    },
    description: {
      de: 'Wizard kostenlos online im Browser spielen. Erstelle private Lobbys, trete per Code bei und spiele mit Freunden auf Deutsch oder Englisch.',
      en: 'Play Wizard for free in your browser. Create private lobbies, join by code, and play with friends in German or English.',
    },
  },
  imprint: {
    title: {
      de: 'Impressum',
      en: 'Legal Notice',
    },
    description: {
      de: 'Impressum und Anbieterkennzeichnung von Wizard Multiplayer.',
      en: 'Legal notice and provider information for Wizard Multiplayer.',
    },
  },
  privacy: {
    title: {
      de: 'Datenschutzerklärung',
      en: 'Privacy Policy',
    },
    description: {
      de: 'Datenschutzhinweise zur Nutzung von Wizard Multiplayer gemäß DSGVO.',
      en: 'Privacy information for Wizard Multiplayer in accordance with GDPR.',
    },
  },
  join: {
    title: {
      de: 'Lobby beitreten',
      en: 'Join lobby',
    },
    description: {
      de: 'Tritt einer privaten Wizard-Lobby mit deinem Einladungs-Code bei.',
      en: 'Join a private Wizard lobby with your invitation code.',
    },
  },
  lobby: {
    title: {
      de: 'Wizard Lobby',
      en: 'Wizard Lobby',
    },
    description: {
      de: 'Warteraum für dein Wizard-Multiplayer-Spiel.',
      en: 'Waiting room for your Wizard multiplayer match.',
    },
  },
  game: {
    title: {
      de: 'Wizard Spiel',
      en: 'Wizard Game',
    },
    description: {
      de: 'Aktive Wizard-Spielrunde im Browser.',
      en: 'Active Wizard game round in your browser.',
    },
  },
}

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title)
  private readonly meta = inject(Meta)
  private readonly router = inject(Router)
  private readonly i18n = inject(I18nService)
  private readonly document = inject(DOCUMENT)
  private initialized = false

  constructor() {
    effect(() => {
      this.i18n.language()
      if (this.initialized) {
        this.applySeo(this.router.url)
      }
    })
  }

  init() {
    if (this.initialized) {
      return
    }

    this.initialized = true
    this.applySeo(this.router.url)

    this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd => event instanceof NavigationEnd,
        ),
      )
      .subscribe((event) => this.applySeo(event.urlAfterRedirects))
  }

  private applySeo(rawUrl: string) {
    const normalizedPath = this.normalizePath(rawUrl)
    const route = this.routeForPath(normalizedPath)
    const language = this.currentLanguage()
    const copy = SEO_COPY[route]
    const pageTitle = `${copy.title[language]} | ${SITE_NAME}`
    const title = this.isLocalMode() ? `[Local] ${pageTitle}` : pageTitle
    const canonicalUrl = this.canonicalUrlForPath(normalizedPath)
    const indexable =
      route === 'home' || route === 'imprint' || route === 'privacy'
    const robots = indexable
      ? 'index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1'
      : 'noindex,nofollow'

    this.title.setTitle(title)
    this.meta.updateTag({
      name: 'description',
      content: copy.description[language],
    })
    this.meta.updateTag({ name: 'robots', content: robots })
    this.meta.updateTag({ property: 'og:type', content: 'website' })
    this.meta.updateTag({ property: 'og:site_name', content: SITE_NAME })
    this.meta.updateTag({ property: 'og:title', content: pageTitle })
    this.meta.updateTag({
      property: 'og:description',
      content: copy.description[language],
    })
    this.meta.updateTag({ property: 'og:url', content: canonicalUrl })
    this.meta.updateTag({
      property: 'og:locale',
      content: language === 'de' ? 'de_DE' : 'en_US',
    })
    this.meta.updateTag({
      name: 'twitter:card',
      content: 'summary_large_image',
    })
    this.meta.updateTag({ name: 'twitter:title', content: pageTitle })
    this.meta.updateTag({
      name: 'twitter:description',
      content: copy.description[language],
    })
    this.meta.updateTag({
      name: 'twitter:image',
      content: `${this.siteOrigin()}/android-chrome-512x512.png`,
    })

    this.setCanonicalLink(canonicalUrl)
  }

  private setCanonicalLink(url: string) {
    const existing = this.document.head.querySelector('link[rel="canonical"]')

    if (existing instanceof HTMLLinkElement) {
      existing.href = url
      return
    }

    const link = this.document.createElement('link')
    link.rel = 'canonical'
    link.href = url
    this.document.head.appendChild(link)
  }

  private routeForPath(path: string): RouteSeoKey {
    if (path.startsWith('/imprint')) {
      return 'imprint'
    }

    if (path.startsWith('/privacy')) {
      return 'privacy'
    }

    if (path.startsWith('/join/')) {
      return 'join'
    }

    if (path.startsWith('/lobby/')) {
      return 'lobby'
    }

    if (path.startsWith('/game/')) {
      return 'game'
    }

    return 'home'
  }

  private normalizePath(url: string) {
    const [withoutHash] = url.split('#', 1)
    const [withoutQuery] = withoutHash.split('?', 1)
    return withoutQuery || '/'
  }

  private canonicalUrlForPath(path: string) {
    return `${this.siteOrigin()}${path}`
  }

  private siteOrigin() {
    if (typeof window !== 'undefined' && window.location.origin) {
      return window.location.origin
    }

    return FALLBACK_SITE_URL
  }

  private currentLanguage(): SupportedLanguage {
    return this.i18n.language() === 'de' ? 'de' : 'en'
  }

  private isLocalMode() {
    if (typeof window === 'undefined') {
      return false
    }

    const host = window.location.hostname.toLowerCase()
    return host === 'localhost' || host === '127.0.0.1' || host === '::1'
  }
}
