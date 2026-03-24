import { Component, Input, inject } from '@angular/core'
import {
  calculateRoundScore,
  type PendingDecision,
  type Suit,
} from '@wizard/shared'
import { I18nService } from '../../../core/i18n/i18n.service'
import type { TranslationKey } from '../../../core/i18n/translations'
import { translateCardLabel } from '../utils/log-params.util'
import { TPipe } from '../../../shared/pipes/t.pipe'
import {
  ALL_SUITS,
  getSuitBackground,
} from '../../../shared/utils/suit-colors.util'

const NO_TRUMP_SPECIALS = new Set([
  'wizard',
  'shapeShifter',
  'juggler',
  'cloud',
  'dragon',
  'werewolf',
])

@Component({
  selector: 'wiz-pending-decision-panel',
  standalone: true,
  imports: [TPipe],
  template: `
    <div class="panel">
      <h3 style="margin-top: 0;">{{ 'pendingDecision' | t }}</h3>

      @if (!decision) {
        <p class="muted">{{ 'noPendingDecision' | t }}</p>
      } @else {
        @if (isStandardSuitDecision(decision.type)) {
          <p class="muted">{{ suitDecisionPromptKey(decision.type) | t }}</p>
          <div class="row" style="flex-wrap: wrap;">
            @for (suit of suits; track suit) {
              <button
                class="btn"
                [style.background]="getSuitColor(suit)"
                [style.color]="getTextColorForSuit(suit)"
                (click)="pickSuitForDecision(suit)"
              >
                {{ suitKey(suit) | t }}
              </button>
            }
            @if (canSelectNoTrump(decision)) {
              <button class="btn btn-outline" (click)="pickTrump(null)">
                {{ 'noTrump' | t }}
              </button>
            }
          </div>
        } @else {
          @if (isWitchExchangeDecision(decision)) {
            <p class="muted">{{ 'chooseWitchHandCard' | t }}</p>
            <div class="row" style="flex-wrap: wrap; margin-bottom: 8px;">
              @for (
                option of witchHandCardOptions(decision);
                track option.cardId
              ) {
                <button
                  class="btn"
                  [class.btn-primary]="
                    selectedWitchHandCardId === option.cardId
                  "
                  (click)="selectWitchHandCard(option.cardId)"
                >
                  {{ translateWitchCardLabel(option.cardLabel) }}
                </button>
              }
            </div>

            <p class="muted">{{ 'chooseWitchTrickCard' | t }}</p>
            <div class="row" style="flex-wrap: wrap; margin-bottom: 8px;">
              @for (
                option of witchTrickCardOptions(decision);
                track option.cardId
              ) {
                <button
                  class="btn"
                  [class.btn-primary]="
                    selectedWitchTrickCardId === option.cardId
                  "
                  (click)="selectWitchTrickCard(option.cardId)"
                >
                  {{ translateWitchCardLabel(option.cardLabel) }}
                </button>
              }
            </div>

            <div class="row" style="margin-top: 20px;">
              <button
                class="btn btn-primary"
                [disabled]="!canConfirmWitchExchange()"
                (click)="confirmWitchExchange()"
              >
                {{ 'applyWitchExchange' | t }}
              </button>
            </div>
          } @else {
            @switch (decision.type) {
              @case ('werewolfTrumpSwap') {
                <p class="muted">{{ 'chooseWerewolfTrump' | t }}</p>
                <div class="row" style="flex-wrap: wrap;">
                  @for (suit of suits; track suit) {
                    <button
                      class="btn"
                      [style.background]="getSuitColor(suit)"
                      [style.color]="getTextColorForSuit(suit)"
                      (click)="pickWerewolfTrump(suit)"
                    >
                      {{ suitKey(suit) | t }}
                    </button>
                  }
                  <button
                    class="btn btn-outline"
                    (click)="pickWerewolfTrump(null)"
                  >
                    {{ 'noTrump' | t }}
                  </button>
                </div>
              }

              @case ('shapeShifterChoice') {
                <div class="row">
                  <button class="btn" (click)="pickShapeShifter('jester')">
                    {{ 'asJester' | t }}
                  </button>
                  <button
                    class="btn btn-primary"
                    (click)="pickShapeShifter('wizard')"
                  >
                    {{ 'asWizard' | t }}
                  </button>
                </div>
              }

              @case ('cloudPredictionAdjustment') {
                <p class="muted">{{ 'chooseCloudAdjustment' | t }}</p>
                <div class="row">
                  @if (canSelectCloudAdjustment(-1)) {
                    <button class="btn" (click)="pickCloudAdjustment(-1)">
                      {{ cloudAdjustmentButtonLabel(-1) }}
                    </button>
                  }
                  @if (canSelectCloudAdjustment(1)) {
                    <button
                      class="btn btn-primary"
                      (click)="pickCloudAdjustment(1)"
                    >
                      {{ cloudAdjustmentButtonLabel(1) }}
                    </button>
                  }
                </div>
              }

              @case ('jugglerPassCard') {
                <p class="muted">{{ 'choosePassCard' | t }}</p>
              }

              @default {
                <p class="muted">{{ 'unsupportedDecision' | t }}</p>
              }
            }
          }
        }
      }
    </div>
  `,
})
export class PendingDecisionPanelComponent {
  readonly suits = ALL_SUITS
  private readonly i18n = inject(I18nService)
  protected selectedWitchHandCardId: string | null = null
  protected selectedWitchTrickCardId: string | null = null

  @Input() decision: PendingDecision | null = null
  @Input() cloudAdjustmentWonTricks = 0
  @Input() cloudAdjustmentRoundNumber = 0
  @Input() cloudAdjustmentShowScorePreview = true
  @Input({ required: true }) onSelectTrump!: (suit: Suit | null) => void
  @Input({ required: true }) onResolveWerewolfTrumpSwap!: (
    suit: Suit | null,
  ) => void
  @Input({ required: true }) onResolveShapeShifter!: (
    mode: 'wizard' | 'jester',
  ) => void
  @Input({ required: true }) onResolveCloudSuit!: (suit: Suit) => void
  @Input({ required: true }) onResolveCloudAdjustment!: (delta: 1 | -1) => void
  @Input({ required: true }) onResolveJugglerSuit!: (suit: Suit) => void
  @Input({ required: true }) onResolveWitch!: (payload: {
    handCardId: string
    trickCardId: string
  }) => void

  pickTrump(suit: Suit | null) {
    this.onSelectTrump(suit)
  }

  pickWerewolfTrump(suit: Suit | null) {
    this.onResolveWerewolfTrumpSwap(suit)
  }

  pickShapeShifter(mode: 'wizard' | 'jester') {
    this.onResolveShapeShifter(mode)
  }

  pickCloudSuit(suit: Suit) {
    this.onResolveCloudSuit(suit)
  }

  pickCloudAdjustment(delta: 1 | -1) {
    this.onResolveCloudAdjustment(delta)
  }

  cloudAdjustmentButtonLabel(delta: 1 | -1) {
    if (this.decision?.type !== 'cloudPredictionAdjustment') {
      return delta > 0 ? '+1' : '-1'
    }

    if (!this.cloudAdjustmentShowScorePreview) {
      return delta > 0 ? '+1' : '-1'
    }

    const projectedScore = calculateRoundScore(
      this.decision.currentPrediction + delta,
      this.cloudAdjustmentWonTricks,
    )

    return `${delta > 0 ? '+1' : '-1'} (${projectedScore})`
  }

  canSelectCloudAdjustment(delta: 1 | -1): boolean {
    if (this.decision?.type !== 'cloudPredictionAdjustment') {
      return false
    }

    const nextPrediction = this.decision.currentPrediction + delta

    return (
      nextPrediction >= 0 && nextPrediction <= this.cloudAdjustmentRoundNumber
    )
  }

  pickJugglerSuit(suit: Suit) {
    this.onResolveJugglerSuit(suit)
  }

  pickSuitForDecision(suit: Suit) {
    if (!this.decision) {
      return
    }

    if (this.decision.type === 'selectTrumpSuit') {
      this.pickTrump(suit)
      return
    }

    if (this.decision.type === 'cloudSuitChoice') {
      this.pickCloudSuit(suit)
      return
    }

    if (this.decision.type === 'jugglerSuitChoice') {
      this.pickJugglerSuit(suit)
    }
  }

  selectWitchHandCard(cardId: string) {
    this.selectedWitchHandCardId = cardId
  }

  selectWitchTrickCard(cardId: string) {
    this.selectedWitchTrickCardId = cardId
  }

  canConfirmWitchExchange() {
    if (this.decision?.type !== 'witchExchange') {
      return false
    }

    if (!this.selectedWitchHandCardId || !this.selectedWitchTrickCardId) {
      return false
    }

    const isHandSelectionValid = this.decision.handCardOptions.some(
      (entry) => entry.cardId === this.selectedWitchHandCardId,
    )
    const isTrickSelectionValid = this.decision.trickCardOptions.some(
      (entry) => entry.cardId === this.selectedWitchTrickCardId,
    )

    return isHandSelectionValid && isTrickSelectionValid
  }

  isWitchExchangeDecision(decision: PendingDecision): boolean {
    return (decision as { type?: string }).type === 'witchExchange'
  }

  witchHandCardOptions(decision: PendingDecision) {
    const maybeDecision = decision as {
      handCardOptions?: Array<{ cardId: string; cardLabel: string }>
    }

    return maybeDecision.handCardOptions ?? []
  }

  witchTrickCardOptions(decision: PendingDecision) {
    const maybeDecision = decision as {
      trickCardOptions?: Array<{ cardId: string; cardLabel: string }>
    }

    return maybeDecision.trickCardOptions ?? []
  }

  confirmWitchExchange() {
    if (!this.canConfirmWitchExchange()) {
      return
    }

    const handCardId = this.selectedWitchHandCardId
    const trickCardId = this.selectedWitchTrickCardId

    if (!handCardId || !trickCardId) {
      return
    }

    this.onResolveWitch({
      handCardId,
      trickCardId,
    })
  }

  canSelectNoTrump(decision: PendingDecision) {
    return (
      decision.type === 'selectTrumpSuit' &&
      !!decision.special &&
      NO_TRUMP_SPECIALS.has(decision.special)
    )
  }

  isStandardSuitDecision(
    type: PendingDecision['type'],
  ): type is 'selectTrumpSuit' | 'cloudSuitChoice' | 'jugglerSuitChoice' {
    return (
      type === 'selectTrumpSuit' ||
      type === 'cloudSuitChoice' ||
      type === 'jugglerSuitChoice'
    )
  }

  suitDecisionPromptKey(
    type: 'selectTrumpSuit' | 'cloudSuitChoice' | 'jugglerSuitChoice',
  ): TranslationKey {
    return type === 'selectTrumpSuit' ? 'chooseTrumpSuit' : 'chooseSuit'
  }

  suitKey(suit: Suit): TranslationKey {
    return `suit.${suit}` as TranslationKey
  }

  getSuitColor(suit: Suit): string {
    return getSuitBackground(suit)
  }

  getTextColorForSuit(suit: Suit): string {
    return suit === 'yellow' ? '#111827' : 'var(--text)'
  }

  translateWitchCardLabel(label: string): string {
    return translateCardLabel(label, (key) => this.i18n.t(key))
  }
}
