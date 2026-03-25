import { Component, EventEmitter, Input, Output, inject } from '@angular/core'
import { Router } from '@angular/router'
import type { SpecialCardKey, WizardGameViewState } from '@wizard/shared'
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

type HeaderRuleItem = {
  id: 'predictionVisibility' | 'openPredictionRestriction' | 'cloudRuleTiming'
  label: string
  value: string
}

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
              @for (rule of ruleItems; track rule.id) {
                <span class="header-rule-chip">
                  <span class="header-rule-chip-label">{{ rule.label }}:</span>
                  <span class="header-rule-chip-value">{{ rule.value }}</span>
                </span>
              }

              @if (
                !state.config.specialCardsRandomizerEnabled &&
                includedSpecialCardItems.length
              ) {
                <details
                  class="header-rule-details"
                  name="special-cards-summary"
                >
                  <summary class="header-rule-chip-toggle">
                    <span class="header-rule-chip-toggle-text">
                      <span class="header-rule-chip-label"
                        >{{ 'specialCardsInMatch' | t }}:</span
                      >
                      <span class="header-rule-chip-value">{{
                        includedSpecialCardItems.length
                      }}</span>
                    </span>
                  </summary>
                  <div class="header-special-cards-list" role="list">
                    @for (item of includedSpecialCardItems; track item.key) {
                      <span
                        class="header-special-card-chip"
                        role="listitem"
                        [attr.title]="item.info"
                      >
                        {{ item.label }}
                      </span>
                    }
                  </div>
                </details>
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
        display: inline-grid;
        grid-template-columns: auto 1fr;
        gap: 6px;
        align-items: baseline;
        min-height: 28px;
        padding: 5px 11px;
        border: 1px solid rgb(148 163 184 / 0.24);
        border-radius: 999px;
        background: rgb(15 23 42 / 0.5);
        color: var(--text);
        font-size: 12px;
        line-height: 1.25;
        white-space: normal;
      }

      .header-rule-chip-label {
        color: rgb(148 163 184);
        font-weight: 600;
      }

      .header-rule-chip-value {
        font-weight: 700;
      }

      .header-rule-details {
        display: inline-block;
        max-width: 100%;
        min-height: 28px;
        padding: 5px 11px;
        border: 1px solid rgb(148 163 184 / 0.24);
        border-radius: 16px;
        background: rgb(15 23 42 / 0.5);
        color: var(--text);
        font-size: 12px;
        line-height: 1.25;
      }

      .header-rule-chip-toggle {
        cursor: pointer;
        list-style: none;
        display: block;
        width: fit-content;
      }

      .header-rule-chip-toggle-text {
        display: inline-grid;
        grid-template-columns: auto auto;
        align-items: baseline;
        gap: 6px;
      }

      .header-rule-details[open] .header-rule-chip-toggle {
        width: 100%;
      }

      .header-rule-details[open] .header-rule-chip-toggle-text {
        display: flex;
        justify-content: center;
        width: 100%;
      }

      .header-rule-chip-toggle::-webkit-details-marker {
        display: none;
      }

      .header-rule-chip-toggle::marker {
        display: none;
      }

      .header-special-cards-list {
        margin-top: 8px;
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        max-width: 100%;
      }

      .header-special-card-chip {
        display: inline-flex;
        align-items: center;
        min-height: 26px;
        padding: 4px 10px;
        border: 1px solid rgb(148 163 184 / 0.22);
        border-radius: 999px;
        background: rgb(2 6 23 / 0.45);
        color: var(--text);
        font-size: 12px;
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
    const items: Array<HeaderRuleItem & { enabled: boolean }> = [
      {
        id: 'predictionVisibility',
        label: this.i18n.t('predictionVisibilityLabel'),
        value: this.predictionVisibilityText,
        enabled: true,
      },
      {
        id: 'openPredictionRestriction',
        label: this.i18n.t('openRestrictionLabel'),
        value: this.openRestrictionText,
        enabled: this.state.config.predictionVisibility === 'open',
      },
      {
        id: 'cloudRuleTiming',
        label: this.i18n.t('cloudRuleTimingLabel'),
        value: this.cloudRuleTimingText,
        enabled: this.isCloudEnabled,
      },
    ]

    return items
      .filter((item) => item.enabled)
      .map(({ enabled: _enabled, ...item }) => item)
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
