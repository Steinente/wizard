import { Component, EventEmitter, Input, Output, inject } from '@angular/core'
import { Router } from '@angular/router'
import type { WizardGameViewState } from '@wizard/shared'
import { I18nService } from '../../../core/i18n/i18n.service'
import type { TranslationKey } from '../../../core/i18n/translations'
import { GameFacadeService } from '../../../core/services/game-facade.service'
import { TPipe } from '../../../shared/pipes/t.pipe'
import { SUIT_BACKGROUNDS } from '../../../shared/utils/suit-colors.util'
import { PanelSettingsComponent } from './panel-settings.component'
import {
  translateCardLabel,
  translateSuitValue,
} from '../utils/log-params.util'

const SPECIAL_TRUMP_REASON_CARDS = new Set([
  'cloud',
  'juggler',
  'shapeShifter',
  'dragon',
  'fairy',
])

@Component({
  selector: 'wiz-game-header',
  standalone: true,
  imports: [TPipe, PanelSettingsComponent],
  template: `
    <div class="panel">
      <div class="spread">
        <div>
          <h2 style="margin: 0;">{{ 'gameTable' | t }}</h2>
          <div class="muted">{{ 'lobby' | t }} {{ state.lobbyCode }}</div>
          <div class="muted">{{ 'rules' | t }}: {{ rulesText }}</div>
        </div>

        <div class="row" style="flex-wrap: wrap; justify-content: flex-end;">
          <span class="status-pill"
            >{{ 'phase' | t }} {{ translatedPhase }}</span
          >

          <span
            class="status-pill"
            [style.background]="trumpBackground"
            [style.color]="trumpForeground"
            [style.borderColor]="trumpBorder"
          >
            {{ trumpDisplayText }}
          </span>

          <span class="status-pill">{{ 'round' | t }} {{ roundLabel }}</span>
          <span class="status-pill">{{ 'trick' | t }} {{ trickLabel }}</span>
          <span
            class="status-pill"
            [class.active-turn]="spectatorCount > 0"
            role="button"
            tabindex="0"
            (click)="toggleSpectators()"
            (keydown.enter)="toggleSpectators()"
            (keydown.space)="toggleSpectators()"
            style="cursor: pointer; user-select: none;"
          >
            {{ 'spectators' | t }} {{ spectatorCount }}
          </span>
          <wiz-panel-settings
            [settingsVisible]="settingsVisible"
            [playersVisible]="playersVisible"
            [scoreboardVisible]="scoreboardVisible"
            [logVisible]="logVisible"
            (settingsChange)="panelSettingsChange.emit($event)"
            (playersChange)="panelPlayersChange.emit($event)"
            (scoreboardChange)="panelScoreboardChange.emit($event)"
            (logChange)="panelLogChange.emit($event)"
          />
          <button class="btn" type="button" (click)="confirmLeaveGame()">
            {{ 'home' | t }}
          </button>
        </div>
      </div>

      @if (showSpectators) {
        <div class="panel" style="margin-top: 10px;">
          <div class="label" style="margin-bottom: 8px;">
            {{ 'spectators' | t }}:
          </div>
          @if (!state.spectators.length) {
            <div class="muted">{{ 'noSpectators' | t }}</div>
          } @else {
            <div class="grid" style="gap: 6px;">
              @for (spectator of state.spectators; track spectator) {
                <div class="muted">{{ spectator }}</div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class GameHeaderComponent {
  private readonly i18n = inject(I18nService)
  private readonly router = inject(Router)
  private readonly facade = inject(GameFacadeService)
  private readonly t = (key: TranslationKey) => this.i18n.t(key)
  showSpectators = false

  @Input({ required: true }) state!: WizardGameViewState
  @Input({ required: true }) settingsVisible = true
  @Input({ required: true }) playersVisible = true
  @Input({ required: true }) scoreboardVisible = true
  @Input({ required: true }) logVisible = true

  @Output() readonly panelSettingsChange = new EventEmitter<boolean>()
  @Output() readonly panelPlayersChange = new EventEmitter<boolean>()
  @Output() readonly panelScoreboardChange = new EventEmitter<boolean>()
  @Output() readonly panelLogChange = new EventEmitter<boolean>()

  get translatedPhase() {
    return this.i18n.t(`phase_${this.state.phase}` as TranslationKey)
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

  get rulesText() {
    if (this.state.config.predictionVisibility !== 'open') {
      return this.predictionVisibilityText
    }

    return `${this.predictionVisibilityText} | ${this.openRestrictionText}`
  }

  private getTranslatedCardReason() {
    const card = this.state.currentRound?.trumpCard

    if (!card) {
      return ''
    }

    if (card.type === 'number') {
      return ''
    }

    return translateCardLabel(
      card.type === 'special' ? card.special : card.type,
      this.t,
    )
  }

  private appendReason(base: string, reason: string) {
    return `${base} (${reason})`
  }

  get translatedTrump() {
    const round = this.state.currentRound

    if (!round) {
      return '-'
    }

    if (!round.trumpSuit) {
      const reason = this.getTranslatedCardReason()
      return reason
        ? `${this.i18n.t('noTrump')} (${reason})`
        : this.i18n.t('noTrump')
    }

    const translatedSuit = translateSuitValue(round.trumpSuit, this.t)
    const card = round.trumpCard

    let base = translatedSuit
    if (card && card.type === 'number') {
      base = `${translatedSuit} ${card.value}`
    }

    const hasWerewolfEffect = this.state.resolvedCardEffects.some(
      (effect) => effect.special === 'werewolf',
    )

    if (hasWerewolfEffect) {
      base = this.appendReason(base, this.i18n.t('card.special.werewolf'))
    }

    // Check if trump card is a special card that required suit selection
    if (
      card &&
      card.type === 'special' &&
      SPECIAL_TRUMP_REASON_CARDS.has(card.special)
    ) {
      base = this.appendReason(base, translateCardLabel(card.special, this.t))
    }

    // Check if trump card is wizard or jester
    if (card && card.type === 'wizard') {
      base = this.appendReason(base, this.i18n.t('card.wizard'))
    }

    if (card && card.type === 'jester') {
      base = this.appendReason(base, this.i18n.t('card.jester'))
    }

    return base
  }

  get trumpDisplayText() {
    const round = this.state.currentRound

    if (!round?.trumpSuit) {
      return this.translatedTrump
    }

    return `${this.i18n.t('trump')} ${this.translatedTrump}`
  }

  get roundLabel() {
    return this.state.currentRound?.roundNumber ?? '-'
  }

  get trickLabel() {
    const round = this.state.currentRound

    if (!round) {
      return '-'
    }

    return Math.min(round.completedTricks.length + 1, round.roundNumber)
  }

  get spectatorCount() {
    return this.state.spectators.length
  }

  get trumpBackground() {
    const suit = this.state.currentRound?.trumpSuit

    if (!suit) {
      return '#334155'
    }

    return SUIT_BACKGROUNDS[suit]
  }

  get trumpForeground() {
    return this.state.currentRound?.trumpSuit === 'yellow'
      ? '#111827'
      : '#ffffff'
  }

  get trumpBorder() {
    return this.trumpBackground
  }

  toggleSpectators() {
    this.showSpectators = !this.showSpectators
  }

  isSpectator() {
    return !this.state.players.some(
      (player) => player.playerId === this.state.selfPlayerId,
    )
  }

  confirmLeaveGame() {
    const confirmed = window.confirm(this.i18n.t('confirmLeaveGame'))

    if (confirmed) {
      if (this.isSpectator()) {
        this.facade.leaveLobby(this.state.lobbyCode)
      } else {
        this.facade.setInGame(this.state.lobbyCode, false)
      }
      this.router.navigateByUrl('/')
    }
  }
}
