import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { marked } from 'marked'
import type { GameConfig, SpecialCard, SpecialCardKey } from '@wizard/shared'
import { SPECIAL_CARD_KEY, SPECIAL_CARD_KEYS } from '@wizard/shared'
import { I18nService } from '../../core/i18n/i18n.service'
import type {
  TranslationKey,
  TranslationLanguage,
} from '../../core/i18n/translations'
import { GameFacadeService } from '../../core/services/game-facade.service'
import { SessionService } from '../../core/services/session.service'
import { AppStore } from '../../core/state/app.store'
import { CardComponent } from '../../shared/components/card.component'
import { TPipe } from '../../shared/pipes/t.pipe'
import { ChatPanelComponent } from '../game/components/chat-panel.component'
import {
  findSpecialCardFilterPreset,
  getSpecialCardFilterLabelKey,
  PresetSpecialCardFilterId,
  resolveActiveSpecialCardFilter,
  SPECIAL_CARD_FILTER_ID,
  SPECIAL_CARD_FILTER_PRESETS,
  SpecialCardFilterId,
} from './utils/lobby-special-card-filters'

type RuleInfoKey =
  | 'predictionVisibility'
  | 'openRestriction'
  | 'cloudRuleTiming'
  | 'specialCardsRandomizer'
  | 'twoPlayerMode'
  | 'specialCards'

type CombinationRuleBlockKey =
  | 'darkEyeAnySpecial'
  | 'darkEyeWerewolf'
  | 'vampireOrWitchCloud25'

@Component({
  standalone: true,
  imports: [FormsModule, TPipe, RouterLink, CardComponent, ChatPanelComponent],
  templateUrl: './lobby-page.component.html',
  styleUrl: './lobby-page.component.css',
})
export class LobbyPageComponent {
  private readonly route = inject(ActivatedRoute)
  protected readonly i18n = inject(I18nService)
  protected readonly store = inject(AppStore)
  private readonly facade = inject(GameFacadeService)
  protected readonly session = inject(SessionService)
  private readonly specialCardFilterSelect = viewChild<
    ElementRef<HTMLSelectElement>
  >('specialCardFilterSelect')

  private readonly activeRuleInfoState = signal<RuleInfoKey | null>(null)
  private readonly selectedSpecialCardFilterHintState =
    signal<PresetSpecialCardFilterId | null>(null)
  private readonly combinationRuleBlocksState = signal<
    Partial<Record<CombinationRuleBlockKey, string>>
  >({})
  readonly combinationRuleHintsExpanded = signal(false)
  readonly combinationRuleHintsLoading = signal(false)
  readonly copied = signal(false)
  readonly chatSoundEnabledSignal = signal(this.session.chatSoundEnabled())
  private copiedTimeoutId: ReturnType<typeof setTimeout> | null = null

  private readonly combinationRuleBlocksCache: Partial<
    Record<
      TranslationLanguage,
      Partial<Record<CombinationRuleBlockKey, string>>
    >
  > = {}
  private combinationRuleBlocksLanguageLoaded: TranslationLanguage | null = null

  constructor() {
    effect(() => {
      const selectElement = this.specialCardFilterSelect()?.nativeElement
      const activeFilter = this.activeSpecialCardFilter()

      if (selectElement && selectElement.value !== activeFilter) {
        selectElement.value = activeFilter
      }
    })

    effect(() => {
      const language = this.i18n.language()
      void this.loadCombinationRuleBlocks(language)
    })

    effect(() => {
      if (this.activeCombinationRuleBlockKeys().length === 0) {
        this.combinationRuleHintsExpanded.set(false)
      }
    })
  }

  routeCode = this.route.snapshot.paramMap.get('code')?.toUpperCase() ?? ''

  readonly specialCards: SpecialCard[] = SPECIAL_CARD_KEYS.map((key) => ({
    id: `special-${key}`,
    type: 'special' as const,
    special: key,
    labelKey: `card.special.${key}` as `card.special.${SpecialCardKey}`,
  }))

  readonly noopPlay = () => {}
  readonly specialCardKey = SPECIAL_CARD_KEY
  readonly specialCardFilterId = SPECIAL_CARD_FILTER_ID
  readonly specialCardFilterPresets = SPECIAL_CARD_FILTER_PRESETS

  readonly activeRuleInfo = this.activeRuleInfoState.asReadonly()
  readonly activeCombinationRuleBlockKeys = computed<CombinationRuleBlockKey[]>(
    () => {
      const lobby = this.store.lobby()

      if (!lobby) {
        return []
      }

      const includedCards = lobby.config.includedSpecialCards ?? [
        ...SPECIAL_CARD_KEYS,
      ]
      const includedCardSet = new Set<SpecialCardKey>(includedCards)
      const hasDarkEye = includedCardSet.has(SPECIAL_CARD_KEY.darkEye)
      const hasWerewolf = includedCardSet.has(SPECIAL_CARD_KEY.werewolf)
      const hasCloud = includedCardSet.has(SPECIAL_CARD_KEY.cloud)
      const hasVampireOrWitch =
        includedCardSet.has(SPECIAL_CARD_KEY.vampire) ||
        includedCardSet.has(SPECIAL_CARD_KEY.witch)
      const isTwentyFiveYearCloudTiming =
        lobby.config.cloudRuleTiming === 'endOfRound'

      const matchingKeys: CombinationRuleBlockKey[] = []

      if (
        hasDarkEye &&
        includedCards.some((cardKey) => cardKey !== SPECIAL_CARD_KEY.darkEye)
      ) {
        matchingKeys.push('darkEyeAnySpecial')
      }

      if (hasDarkEye && hasWerewolf) {
        matchingKeys.push('darkEyeWerewolf')
      }

      if (isTwentyFiveYearCloudTiming && hasCloud && hasVampireOrWitch) {
        matchingKeys.push('vampireOrWitchCloud25')
      }

      return matchingKeys
    },
  )
  readonly activeCombinationRuleHintBlocks = computed(() => {
    const loadedBlocks = this.combinationRuleBlocksState()

    return this.activeCombinationRuleBlockKeys()
      .map((key) => ({ key, html: loadedBlocks[key] ?? '' }))
      .filter((block) => block.html.length > 0)
  })
  readonly isHost = computed(() => {
    const lobby = this.store.lobby()
    const playerId = this.store.playerId()
    return !!lobby && !!playerId && lobby.hostPlayerId === playerId
  })
  readonly activeSpecialCardFilter = computed((): SpecialCardFilterId => {
    const lobby = this.store.lobby()
    if (!lobby) return SPECIAL_CARD_FILTER_ID.custom

    return resolveActiveSpecialCardFilter(
      lobby.config.includedSpecialCards,
      lobby.config.cloudRuleTiming,
      this.selectedSpecialCardFilterHintState(),
    )
  })

  lobbyStatusKey(status: string): TranslationKey {
    return `lobbyStatus.${status.toLowerCase()}` as TranslationKey
  }

  roleKey(role: string): TranslationKey {
    return `role.${role.toLowerCase()}` as TranslationKey
  }

  getSpecialCardAriaLabel(card: SpecialCard): string {
    const cardName = this.i18n.t(card.labelKey as any)
    const isEnabled = this.isSpecialCardEnabled(card.special)
    const status = isEnabled
      ? this.i18n.t('cardStatusIncluded')
      : this.i18n.t('cardStatusExcluded')
    return `${cardName}, ${status}`
  }

  toggleRuleInfo(key: RuleInfoKey) {
    this.activeRuleInfoState.update((current) => (current === key ? null : key))
  }

  copyCode() {
    const code = this.store.lobby()?.code
    if (!code) return

    this.copied.set(true)

    if (this.copiedTimeoutId) {
      clearTimeout(this.copiedTimeoutId)
    }

    this.copiedTimeoutId = setTimeout(() => {
      this.copied.set(false)
      this.copiedTimeoutId = null
    }, 2000)

    navigator.clipboard.writeText(code).catch(() => {
      this.copied.set(false)
      this.store.setError(this.i18n.t('copyFailed'))
    })
  }

  leaveLobby() {
    const code = this.store.lobby()?.code
    if (!code) return
    this.facade.leaveLobby(code)
  }

  kick(targetPlayerId: string) {
    const code = this.store.lobby()?.code
    if (!code) return
    this.facade.kickPlayer(code, targetPlayerId)
  }

  startGame() {
    const lobby = this.store.lobby()
    if (!lobby) return

    const minPlayers = lobby.config.twoPlayerModeEnabled ? 2 : 3

    if (lobby.players.length < minPlayers) {
      this.store.setError(this.i18n.t('minPlayersRequired'))
      return
    }

    const hasSelectedSpecialCards =
      lobby.config.includedSpecialCards &&
      lobby.config.includedSpecialCards.length > 0

    if (
      lobby.config.specialCardsRandomizerEnabled &&
      !hasSelectedSpecialCards
    ) {
      this.store.setError(
        this.i18n.t('specialCardsRandomizerRequiresSelection'),
      )
      return
    }

    this.facade.startGame(lobby.code)
  }

  endLobby() {
    const code = this.store.lobby()?.code
    if (!code) return
    this.facade.endLobby(code)
  }

  setPredictionVisibility(predictionVisibility: 'open' | 'hidden' | 'secret') {
    this.updateConfigIfHost({ predictionVisibility })
  }

  setPredictionRestriction(
    openPredictionRestriction:
      | 'none'
      | 'mustEqualTricks'
      | 'mustNotEqualTricks',
  ) {
    this.updateConfigIfHost({ openPredictionRestriction })
  }

  setCloudRuleTiming(cloudRuleTiming: 'endOfRound' | 'immediateAfterTrick') {
    this.selectedSpecialCardFilterHintState.set(null)
    this.updateConfigIfHost({ cloudRuleTiming })
  }

  setSpecialCardsRandomizerEnabled(specialCardsRandomizerEnabled: boolean) {
    this.updateConfigIfHost({ specialCardsRandomizerEnabled })
  }

  setTwoPlayerModeEnabled(twoPlayerModeEnabled: boolean) {
    this.updateConfigIfHost({ twoPlayerModeEnabled })
  }

  private updateConfigIfHost(patch: Partial<GameConfig>): void {
    const lobby = this.store.lobby()
    if (!lobby || !this.isHost()) return
    this.facade.updateConfig(lobby.code, patch)
  }

  isSpecialCardEnabled(key: SpecialCardKey): boolean {
    return (
      this.store.lobby()?.config.includedSpecialCards?.includes(key) ?? true
    )
  }

  toggleSpecialCard(key: SpecialCardKey) {
    const lobby = this.store.lobby()

    if (!lobby || !this.isHost()) {
      return
    }

    const current = lobby.config.includedSpecialCards ?? [...SPECIAL_CARD_KEYS]
    const next = current.includes(key)
      ? current.filter((k) => k !== key)
      : [...current, key]

    this.selectedSpecialCardFilterHintState.set(null)
    this.facade.updateConfig(lobby.code, { includedSpecialCards: next })
  }

  specialCardFilterLabelKey(id: SpecialCardFilterId): TranslationKey {
    return getSpecialCardFilterLabelKey(id)
  }

  onSpecialCardFilterChange(event: Event) {
    const selectElement = event.target as HTMLSelectElement | null

    if (!selectElement) {
      return
    }

    const id = selectElement.value as SpecialCardFilterId

    if (id === this.specialCardFilterId.custom) {
      const lobby = this.store.lobby()

      if (!lobby) {
        this.selectedSpecialCardFilterHintState.set(null)
        selectElement.value = this.specialCardFilterId.custom
        return
      }

      const resolved = resolveActiveSpecialCardFilter(
        lobby.config.includedSpecialCards,
        lobby.config.cloudRuleTiming,
        null,
      )

      if (resolved !== this.specialCardFilterId.custom) {
        selectElement.value = resolved
        this.applySpecialCardFilter(resolved as PresetSpecialCardFilterId)
        return
      }

      this.selectedSpecialCardFilterHintState.set(null)
      selectElement.value = this.specialCardFilterId.custom
      return
    }

    this.applySpecialCardFilter(id)
  }

  applySpecialCardFilter(id: PresetSpecialCardFilterId) {
    const lobby = this.store.lobby()

    if (!lobby || !this.isHost()) {
      return
    }

    const preset = findSpecialCardFilterPreset(id)

    if (!preset) {
      return
    }

    this.selectedSpecialCardFilterHintState.set(id)
    this.facade.updateConfig(lobby.code, {
      includedSpecialCards: [...preset.includedCards],
      cloudRuleTiming: preset.cloudRuleTiming,
    })
  }

  toggleCardArtworkEnabled(enabled: boolean) {
    this.session.setCardArtworkEnabled(enabled)
  }

  sendChatMessageFn(message: string) {
    const lobby = this.store.lobby()
    if (!lobby) return
    this.facade.sendLobbyChatMessage(lobby.code, message)
  }

  setChatSoundEnabledFn(enabled: boolean) {
    this.chatSoundEnabledSignal.set(enabled)
    this.session.setChatSoundEnabled(enabled)
  }

  toggleCombinationRuleHints() {
    this.combinationRuleHintsExpanded.update((isExpanded) => !isExpanded)
  }

  private async loadCombinationRuleBlocks(language: TranslationLanguage) {
    if (
      this.combinationRuleBlocksLanguageLoaded === language &&
      Object.keys(this.combinationRuleBlocksState()).length > 0
    ) {
      return
    }

    const cachedBlocks = this.combinationRuleBlocksCache[language]
    if (cachedBlocks) {
      this.combinationRuleBlocksState.set(cachedBlocks)
      this.combinationRuleBlocksLanguageLoaded = language
      return
    }

    this.combinationRuleHintsLoading.set(true)

    try {
      const markdown = await this.fetchSpecialRulesDocument(language)
      const parsedBlocks = this.parseCombinationRuleBlocks(markdown)
      this.combinationRuleBlocksCache[language] = parsedBlocks
      this.combinationRuleBlocksState.set(parsedBlocks)
      this.combinationRuleBlocksLanguageLoaded = language
    } catch {
      this.combinationRuleBlocksState.set({})
      this.combinationRuleBlocksLanguageLoaded = language
    } finally {
      this.combinationRuleHintsLoading.set(false)
    }
  }

  private parseCombinationRuleBlocks(markdown: string) {
    const sections = this.extractLevelTwoSections(markdown)
    const blockKeys: CombinationRuleBlockKey[] = [
      'darkEyeAnySpecial',
      'darkEyeWerewolf',
      'vampireOrWitchCloud25',
    ]
    const renderer = new marked.Renderer()

    renderer.link = ({ href, title, tokens }) => {
      const text = this.parseInlineMarkdownTokens(tokens)
      const titleAttribute = title ? ` title="${title}"` : ''

      return `<a href="${href}" target="_blank" rel="noreferrer noopener"${titleAttribute}>${text}</a>`
    }

    const parsedBlocks: Partial<Record<CombinationRuleBlockKey, string>> = {}

    for (
      let index = 0;
      index < sections.length && index < blockKeys.length;
      index += 1
    ) {
      parsedBlocks[blockKeys[index]] = marked.parse(sections[index], {
        gfm: true,
        breaks: true,
        renderer,
      }) as string
    }

    return parsedBlocks
  }

  private parseInlineMarkdownTokens(tokens: unknown[]) {
    return marked.parser(tokens as Parameters<typeof marked.parser>[0])
  }

  private extractLevelTwoSections(markdown: string) {
    const normalized = markdown.replace(/\r\n/g, '\n')
    const lines = normalized.split('\n')
    const sections: string[] = []
    let currentSection: string[] | null = null

    for (const line of lines) {
      if (line.startsWith('## ')) {
        if (currentSection && currentSection.length > 0) {
          sections.push(currentSection.join('\n').trim())
        }

        currentSection = [line]
        continue
      }

      if (!currentSection) {
        continue
      }

      if (line.trim() === '---') {
        continue
      }

      currentSection.push(line)
    }

    if (currentSection && currentSection.length > 0) {
      sections.push(currentSection.join('\n').trim())
    }

    return sections.filter((section) => section.length > 0)
  }

  private async fetchSpecialRulesDocument(language: TranslationLanguage) {
    const primaryUrl = `/content/special-rules.${language}.md`
    const fallbackUrl = '/content/special-rules.de.md'

    const primaryResponse = await fetch(primaryUrl)
    if (primaryResponse.ok) {
      return primaryResponse.text()
    }

    const fallbackResponse = await fetch(fallbackUrl)
    if (fallbackResponse.ok) {
      return fallbackResponse.text()
    }

    throw new Error('special-rules-fetch-failed')
  }
}
