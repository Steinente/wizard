import { Component, computed, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, RouterLink } from '@angular/router'
import type { GameConfig, SpecialCard, SpecialCardKey } from '@wizard/shared'
import { SPECIAL_CARD_KEY, SPECIAL_CARD_KEYS } from '@wizard/shared'
import { I18nService } from '../../core/i18n/i18n.service'
import type { TranslationKey } from '../../core/i18n/translations'
import { GameFacadeService } from '../../core/services/game-facade.service'
import { SessionService } from '../../core/services/session.service'
import { AppStore } from '../../core/state/app.store'
import { CardComponent } from '../../shared/components/card.component'
import { TPipe } from '../../shared/pipes/t.pipe'
import {
  findSpecialCardFilterPreset,
  getSpecialCardFilterLabelKey,
  PresetSpecialCardFilterId,
  resolveActiveSpecialCardFilter,
  SPECIAL_CARD_FILTER_ID,
  SPECIAL_CARD_FILTER_PRESETS,
  SpecialCardFilterId,
} from './lobby-special-card-filters'

type RuleInfoKey =
  | 'predictionVisibility'
  | 'openRestriction'
  | 'cloudRuleTiming'
  | 'specialCardsRandomizer'
  | 'specialCards'

@Component({
  standalone: true,
  imports: [FormsModule, TPipe, RouterLink, CardComponent],
  templateUrl: './lobby-page.component.html',
  styleUrl: './lobby-page.component.css',
})
export class LobbyPageComponent {
  private readonly route = inject(ActivatedRoute)
  protected readonly i18n = inject(I18nService)
  protected readonly store = inject(AppStore)
  private readonly facade = inject(GameFacadeService)
  protected readonly session = inject(SessionService)

  private readonly activeRuleInfoState = signal<RuleInfoKey | null>(null)
  private readonly specialCardFilterMenuOpenState = signal(false)
  private readonly selectedSpecialCardFilterHintState =
    signal<PresetSpecialCardFilterId | null>(null)
  readonly copied = signal(false)
  private copiedTimeoutId: ReturnType<typeof setTimeout> | null = null

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
  readonly isSpecialCardFilterMenuOpen =
    this.specialCardFilterMenuOpenState.asReadonly()
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
      this.selectedSpecialCardFilterHintState(),
    )
  })

  lobbyStatusKey(status: string): TranslationKey {
    return `lobbyStatus.${status.toLowerCase()}` as TranslationKey
  }

  roleKey(role: string): TranslationKey {
    return `role.${role.toLowerCase()}` as TranslationKey
  }

  toggleRuleInfo(key: RuleInfoKey) {
    this.activeRuleInfoState.update((current) => (current === key ? null : key))
  }

  toggleSpecialCardFilterMenu() {
    if (
      !this.isHost() ||
      this.store.lobby()?.config.specialCardsRandomizerEnabled
    ) {
      return
    }

    this.specialCardFilterMenuOpenState.update((isOpen) => !isOpen)
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

    if (lobby.players.length < 3) {
      this.store.setError(this.i18n.t('minPlayersRequired'))
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
    this.updateConfigIfHost({ cloudRuleTiming })
  }

  setSpecialCardsRandomizerEnabled(specialCardsRandomizerEnabled: boolean) {
    this.updateConfigIfHost({ specialCardsRandomizerEnabled })
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

    if (
      !lobby ||
      !this.isHost() ||
      lobby.config.specialCardsRandomizerEnabled
    ) {
      return
    }

    const current = lobby.config.includedSpecialCards ?? [...SPECIAL_CARD_KEYS]
    const next = current.includes(key)
      ? current.filter((k) => k !== key)
      : [...current, key]

    this.specialCardFilterMenuOpenState.set(false)
    this.selectedSpecialCardFilterHintState.set(null)
    this.facade.updateConfig(lobby.code, { includedSpecialCards: next })
  }

  specialCardFilterLabelKey(id: SpecialCardFilterId): TranslationKey {
    return getSpecialCardFilterLabelKey(id)
  }

  applySpecialCardFilter(id: PresetSpecialCardFilterId) {
    const lobby = this.store.lobby()

    if (
      !lobby ||
      !this.isHost() ||
      lobby.config.specialCardsRandomizerEnabled
    ) {
      return
    }

    const preset = findSpecialCardFilterPreset(id)

    if (!preset) {
      return
    }

    this.specialCardFilterMenuOpenState.set(false)
    this.selectedSpecialCardFilterHintState.set(id)
    this.facade.updateConfig(lobby.code, {
      includedSpecialCards: [...preset.includedCards],
    })
  }

  toggleCardArtworkEnabled(enabled: boolean) {
    this.session.setCardArtworkEnabled(enabled)
  }
}
