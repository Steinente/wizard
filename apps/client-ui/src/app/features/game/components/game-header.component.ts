import { Component, Input, inject } from '@angular/core'
import { RouterLink } from '@angular/router'
import type { WizardGameViewState } from '@wizard/shared'
import { I18nService } from '../../../core/i18n/i18n.service'
import type { TranslationKey } from '../../../core/i18n/translations'
import { TPipe } from '../../../shared/pipes/t.pipe'
import { SUIT_BACKGROUNDS } from '../../../shared/utils/suit-colors.util'
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
  imports: [RouterLink, TPipe],
  template: `
    <div class="panel">
      <div class="spread">
        <div>
          <h2 style="margin: 0;">{{ 'gameTable' | t }}</h2>
          <div class="muted">{{ 'lobby' | t }} {{ state.lobbyCode }}</div>
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
          <a routerLink="/" class="btn">{{ 'home' | t }}</a>
        </div>
      </div>
    </div>
  `,
})
export class GameHeaderComponent {
  private readonly i18n = inject(I18nService)
  private readonly t = (key: TranslationKey) => this.i18n.t(key)

  @Input({ required: true }) state!: WizardGameViewState

  get translatedPhase() {
    return this.i18n.t(`phase_${this.state.phase}` as TranslationKey)
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
}
