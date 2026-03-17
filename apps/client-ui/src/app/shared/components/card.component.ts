import { Component, Input, inject } from '@angular/core'
import type { Card, ResolvedCardRuntimeEffect } from '@wizard/shared'
import { I18nService } from '../../core/i18n/i18n.service'
import { TPipe } from '../../shared/pipes/t.pipe'
import {
  getCardAccent,
  getCardPrimaryText,
  getCardSubtitleKey,
  getCardTitleKey,
} from '../utils/card-label.util'
import { SUIT_BACKGROUNDS } from '../utils/suit-colors.util'

@Component({
  selector: 'wiz-card',
  standalone: true,
  imports: [TPipe],
  template: `
    <button
      class="wiz-card"
      type="button"
      [disabled]="disabled"
      [style.border-color]="accent"
      [style.background]="background"
      [style.color]="foreground"
      [style.opacity]="disabled ? '0.45' : '1'"
      [style.filter]="disabled ? 'grayscale(0.4)' : 'none'"
      [style.box-shadow]="playable ? '0 0 0 2px rgba(212,167,44,0.4)' : 'none'"
      (click)="handlePlay()"
    >
      <div class="wiz-card-value">{{ primaryText }}</div>
      <div class="wiz-card-title">{{ title }}</div>
      @if (subtitle) {
        <div class="wiz-card-subtitle">{{ subtitle }}</div>
      }
      @if (shapeShifterMode) {
        <div class="wiz-card-subtitle" style="margin-top: 4px; font-size: 11px; font-weight: 600;">
          ({{ shapeShifterMode === 'card.wizard' ? ('card.wizard' | t) : ('card.jester' | t) }})
        </div>
      }
    </button>
  `,
  styles: [
    `
      .wiz-card {
        width: 110px;
        min-height: 150px;
        border: 2px solid var(--border);
        border-radius: 14px;
        padding: 10px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        text-align: left;
        transition: opacity 0.15s ease;
      }

      .wiz-card-value {
        font-size: 28px;
        font-weight: 700;
        line-height: 1;
      }

      .wiz-card-title {
        font-size: 14px;
        font-weight: 700;
        line-height: 1.1;
        white-space: normal;
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      .wiz-card-subtitle {
        font-size: 12px;
        line-height: 1.1;
        white-space: normal;
        overflow-wrap: anywhere;
        word-break: break-word;
      }
    `,
  ],
})
export class CardComponent {
  private readonly i18n = inject(I18nService)

  @Input({ required: true }) card!: Card
  @Input() playable = false
  @Input() disabled = false
  @Input() play!: (card: Card) => void
  @Input() resolvedEffect?: ResolvedCardRuntimeEffect

  get accent() {
    return getCardAccent(this.card)
  }

  get primaryText() {
    return getCardPrimaryText(this.card)
  }

  get title() {
    const key = getCardTitleKey(this.card)
    return key ? this.i18n.t(key) : ''
  }

  get subtitle() {
    const key = getCardSubtitleKey(this.card)
    return key ? this.i18n.t(key) : ''
  }

  get shapeShifterMode(): string | null {
    if (
      this.resolvedEffect &&
      this.resolvedEffect.special === 'shapeShifter' &&
      this.resolvedEffect.shapeShifterMode
    ) {
      return this.resolvedEffect.shapeShifterMode === 'wizard'
        ? 'card.wizard'
        : 'card.jester'
    }
    return null
  }

  get background() {
    // Check if this is a cloud or juggler card with a chosen suit
    if (
      this.resolvedEffect &&
      (this.resolvedEffect.special === 'cloud' ||
        this.resolvedEffect.special === 'juggler') &&
      this.resolvedEffect.chosenSuit
    ) {
      return SUIT_BACKGROUNDS[this.resolvedEffect.chosenSuit] ?? this.accent
    }

    if (this.card.type === 'number') {
      return this.accent
    }

    return '#f8fafc'
  }

  get foreground() {
    // Check if background is the yellow color
    if (
      this.resolvedEffect &&
      (this.resolvedEffect.special === 'cloud' ||
        this.resolvedEffect.special === 'juggler')
    ) {
      // Yellow needs dark text, other colors need light text
      if (this.resolvedEffect.chosenSuit === 'yellow') {
        return '#0f172a'
      }
      return '#ffffff'
    }

    if (this.card.type === 'number') {
      return '#ffffff'
    }

    return '#0f172a'
  }

  handlePlay() {
    if (!this.disabled) {
      this.play(this.card)
    }
  }
}
