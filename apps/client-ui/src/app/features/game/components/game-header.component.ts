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
  'werewolf',
])

@Component({
  selector: 'wiz-game-header',
  standalone: true,
  imports: [TPipe, PanelSettingsComponent],
  template: `
    <div class="panel">
      <div class="spread">
        <div class="header-meta">
          <h2 style="margin: 0;">{{ 'gameTable' | t }}</h2>
          <div class="muted">{{ 'lobby' | t }} {{ state.lobbyCode }}</div>
          <div class="header-rules" aria-label="Game rules summary">
            <span class="header-rules-label">{{ 'rules' | t }}</span>
            <div class="header-rules-list">
              @for (rule of ruleItems; track rule) {
                <span class="header-rule-chip">{{ rule }}</span>
              }
            </div>
          </div>
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
            [chatVisible]="chatVisible"
            (settingsChange)="panelSettingsChange.emit($event)"
            (playersChange)="panelPlayersChange.emit($event)"
            (scoreboardChange)="panelScoreboardChange.emit($event)"
            (logChange)="panelLogChange.emit($event)"
            (chatChange)="panelChatChange.emit($event)"
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
  styles: [
    `
      .header-meta {
        display: flex;
        flex-direction: column;
        gap: 6px;
        min-width: 0;
      }

      .header-rules {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        min-width: 0;
      }

      .header-rules-label {
        color: var(--muted);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        padding-top: 4px;
        flex: 0 0 auto;
      }

      .header-rules-list {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        min-width: 0;
      }

      .header-rule-chip {
        display: inline-flex;
        align-items: center;
        min-height: 28px;
        padding: 4px 10px;
        border: 1px solid rgb(148 163 184 / 0.24);
        border-radius: 999px;
        background: rgb(15 23 42 / 0.5);
        color: var(--text);
        font-size: 12px;
        line-height: 1.25;
        white-space: normal;
      }

      @media (max-width: 900px) {
        .header-rules {
          flex-direction: column;
          gap: 6px;
        }

        .header-rules-label {
          padding-top: 0;
        }
      }
    `,
  ],
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
  @Input({ required: true }) chatVisible = true

  @Output() readonly panelSettingsChange = new EventEmitter<boolean>()
  @Output() readonly panelPlayersChange = new EventEmitter<boolean>()
  @Output() readonly panelScoreboardChange = new EventEmitter<boolean>()
  @Output() readonly panelLogChange = new EventEmitter<boolean>()
  @Output() readonly panelChatChange = new EventEmitter<boolean>()

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

  get ruleItems() {
    const rules = [this.predictionVisibilityText]

    if (this.state.config.predictionVisibility !== 'open') {
      if (this.isCloudEnabled) {
        rules.push(this.cloudRuleTimingText)
      }

      return rules
    }

    rules.push(this.openRestrictionText)

    if (this.isCloudEnabled) {
      rules.push(this.cloudRuleTimingText)
    }

    return rules
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
    if (this.isSpectator()) {
      this.facade.leaveLobby(this.state.lobbyCode)
      this.router.navigateByUrl('/')
      return
    }

    if (this.state.phase === 'finished') {
      this.facade.setInGame(this.state.lobbyCode, false)
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
