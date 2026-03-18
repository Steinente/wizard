import { Component, Input } from '@angular/core'
import type { PendingDecision, Suit } from '@wizard/shared'
import type { TranslationKey } from '../../../core/i18n/translations'
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
              <button class="btn btn-outline" (click)="pickWerewolfTrump(null)">
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
              <button class="btn" (click)="pickCloudAdjustment(-1)">
                {{ 'minusOne' | t }}
              </button>
              <button class="btn btn-primary" (click)="pickCloudAdjustment(1)">
                {{ 'plusOne' | t }}
              </button>
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
    </div>
  `,
})
export class PendingDecisionPanelComponent {
  readonly suits = ALL_SUITS

  @Input() decision: PendingDecision | null = null
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
}
