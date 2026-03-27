import { Component, EventEmitter, Input, Output, inject } from '@angular/core'
import { Router } from '@angular/router'
import type { SpecialCardKey, WizardGameViewState } from '@wizard/shared'
import { I18nService } from '../../../core/i18n/i18n.service'
import type { TranslationKey } from '../../../core/i18n/translations'
import { GameFacadeService } from '../../../core/services/game-facade.service'
import { TPipe } from '../../../shared/pipes/t.pipe'
import { PanelSettingsComponent } from './panel-settings.component'
import { translateCardLabel } from '../utils/log-params.util'
import { TrumpBadgeComponent } from './trump-badge.component'

type HeaderRuleItem = {
  id: 'predictionVisibility' | 'openPredictionRestriction' | 'cloudRuleTiming'
  label: string
  value: string
}

@Component({
  selector: 'wiz-game-header',
  standalone: true,
  imports: [TPipe, PanelSettingsComponent, TrumpBadgeComponent],
  templateUrl: './game-header.component.html',
  styleUrls: ['./game-header.component.css'],
})
export class GameHeaderComponent {
  private readonly i18n = inject(I18nService)
  private readonly router = inject(Router)
  private readonly facade = inject(GameFacadeService)
  private readonly t = (key: TranslationKey) => this.i18n.t(key)
  showSpectators = false
  activeSpecialCardInfo: string | null = null

  @Input({ required: true }) state!: WizardGameViewState
  @Input({ required: true }) settingsVisible = true
  @Input({ required: true }) playersVisible = true
  @Input({ required: true }) scoreboardVisible = true
  @Input({ required: true }) logVisible = true
  @Input({ required: true }) chatVisible = true

  @Output() readonly panelSettingsChange = new EventEmitter<boolean>()
  @Output() readonly panelPlayersChange = new EventEmitter<boolean>()
  @Output() readonly panelScoreboardChange = new EventEmitter<boolean>()
  @Output() readonly panelLogChange = new EventEmitter<boolean>()
  @Output() readonly panelChatChange = new EventEmitter<boolean>()
  @Output() readonly homeButtonUserGesture = new EventEmitter<void>()

  private get currentRound() {
    return this.state.currentRound
  }

  get translatedPhase() {
    return this.i18n.t(`phase.${this.state.phase}` as TranslationKey)
  }

  get predictionVisibilityText() {
    const key =
      this.state.config.predictionVisibility === 'open'
        ? 'predictionOpen'
        : this.state.config.predictionVisibility === 'hidden'
          ? 'predictionHidden'
          : 'predictionSecret'

    return this.i18n.t(key as TranslationKey)
  }

  get openRestrictionText() {
    const key =
      this.state.config.openPredictionRestriction === 'mustEqualTricks'
        ? 'predictionRestrictionMustEqual'
        : this.state.config.openPredictionRestriction === 'mustNotEqualTricks'
          ? 'predictionRestrictionMustNotEqual'
          : 'predictionRestrictionNone'

    return this.i18n.t(key as TranslationKey)
  }

  get cloudRuleTimingText() {
    const key =
      this.state.config.cloudRuleTiming === 'immediateAfterTrick'
        ? 'cloudRuleTimingImmediateAfterTrick'
        : 'cloudRuleTimingEndOfRound'

    return this.i18n.t(key as TranslationKey)
  }

  get isCloudEnabled() {
    return this.state.config.includedSpecialCards.includes('cloud')
  }

  get ruleItems(): HeaderRuleItem[] {
    const items: HeaderRuleItem[] = [
      {
        id: 'predictionVisibility',
        label: this.i18n.t('predictionVisibilityLabel'),
        value: this.predictionVisibilityText,
      },
    ]

    if (this.state.config.predictionVisibility === 'open') {
      items.push({
        id: 'openPredictionRestriction',
        label: this.i18n.t('openRestrictionLabel'),
        value: this.openRestrictionText,
      })
    }

    if (this.isCloudEnabled) {
      items.push({
        id: 'cloudRuleTiming',
        label: this.i18n.t('cloudRuleTimingLabel'),
        value: this.cloudRuleTimingText,
      })
    }

    return items
  }

  get includedSpecialCardItems() {
    return this.state.config.includedSpecialCards.map((specialCardKey) => ({
      key: specialCardKey,
      label: translateCardLabel(specialCardKey, this.t),
      info: this.getSpecialCardInfoText(specialCardKey),
    }))
  }

  private getSpecialCardInfoText(specialCardKey: SpecialCardKey): string {
    const key = `card.special.${specialCardKey}.info` as TranslationKey
    return this.i18n.t(key)
  }

  get roundLabel() {
    return this.currentRound?.roundNumber ?? '-'
  }

  get deckLabel() {
    return this.currentRound?.deckRemainderCount ?? '-'
  }

  get trickLabel() {
    const round = this.currentRound

    if (!round) {
      return '-'
    }

    return Math.min(round.completedTricks.length + 1, round.roundNumber)
  }

  get spectatorCount() {
    return this.state.spectators.length
  }

  get spectatorNames() {
    return this.state.spectators.join(', ')
  }

  toggleSpectators() {
    this.showSpectators = !this.showSpectators
  }

  toggleSpecialCardInfo(info: string) {
    this.activeSpecialCardInfo =
      this.activeSpecialCardInfo === info ? null : info
  }

  clearSpecialCardInfo() {
    this.activeSpecialCardInfo = null
  }

  isSpectator() {
    return !this.state.players.some(
      (player) => player.playerId === this.state.selfPlayerId,
    )
  }

  confirmLeaveGame() {
    if (this.isSpectator()) {
      this.facade.leaveLobby(this.state.lobbyCode)
      this.router.navigateByUrl('/')
      return
    }

    if (this.state.phase === 'finished') {
      this.facade.setInGame(this.state.lobbyCode, false)
      this.facade.leaveLobby(this.state.lobbyCode)
      this.facade.clearReconnectLobbyCode()
      this.router.navigateByUrl('/')
      return
    }

    const confirmed = window.confirm(this.i18n.t('confirmLeaveGame'))

    if (confirmed) {
      this.facade.setInGame(this.state.lobbyCode, false)
      this.router.navigateByUrl('/')
    }
  }
}
