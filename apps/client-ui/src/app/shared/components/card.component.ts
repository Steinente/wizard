import { Component, Input, inject } from '@angular/core'
import type { Card, ResolvedCardRuntimeEffect } from '@wizard/shared'
import { I18nService } from '../../core/i18n/i18n.service'
import type { TranslationKey } from '../../core/i18n/translations'
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
      @if (showSpecialInfo && specialInfoText) {
        <span class="info-icon wiz-card-info" [title]="specialInfoText">?</span>
      }
      <div class="wiz-card-value">{{ primaryText }}</div>
      @if (middleLabel) {
        <div class="wiz-card-middle-label">{{ middleLabel }}</div>
      }
      <div class="wiz-card-title" [class.wiz-card-title-top]="pinTitleTop">
        {{ title }}
      </div>
      @if (subtitle) {
        <div class="wiz-card-subtitle">{{ subtitle }}</div>
      }
      @if (shapeShifterMode) {
        <div
          class="wiz-card-subtitle"
          style="margin-top: 4px; font-size: 11px; font-weight: 600;"
        >
          ({{
            shapeShifterMode === 'card.wizard'
              ? ('card.wizard' | t)
              : ('card.jester' | t)
          }})
        </div>
      }
    </button>
  `,
  styles: [
    `
      .wiz-card {
        width: 110px;
        min-height: 150px;
        position: relative;
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

      .wiz-card-info {
        position: absolute;
        top: 6px;
        right: 6px;
        width: 16px;
        height: 16px;
        margin-left: 0;
        font-size: 11px;
      }

      .wiz-card-title {
        font-size: 14px;
        font-weight: 700;
        line-height: 1.1;
        white-space: normal;
        hyphens: auto;
        overflow-wrap: break-word;
        word-break: normal;
      }

      .wiz-card-title-top {
        position: absolute;
        top: 10px;
        left: 10px;
        right: 10px;
      }

      .wiz-card-subtitle {
        font-size: 12px;
        line-height: 1.1;
        white-space: normal;
        hyphens: auto;
        overflow-wrap: break-word;
        word-break: normal;
      }

      .wiz-card-middle-label {
        position: absolute;
        left: 8px;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        text-align: center;
        font-size: 11px;
        font-weight: 700;
        line-height: 1.1;
        pointer-events: none;
        text-shadow: 0 1px 2px rgb(0 0 0 / 0.25);
      }
    `,
  ],
})
export class CardComponent {
  private readonly i18n = inject(I18nService)

  @Input({ required: true }) card!: Card
  @Input() middleLabel: string | null = null
  @Input() playable = false
  @Input() disabled = false
  @Input() play!: (card: Card) => void
  @Input() resolvedEffect?: ResolvedCardRuntimeEffect
  @Input() showSpecialInfo = false

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

  get pinTitleTop(): boolean {
    return (
      !!this.middleLabel &&
      this.card.type === 'special' &&
      this.card.special === 'shapeShifter'
    )
  }

  get specialInfoText(): string {
    if (this.card.type !== 'special') {
      return ''
    }

    const keyMap: Record<string, TranslationKey> = {
      shapeShifter: 'specialInfo.shapeShifter',
      bomb: 'specialInfo.bomb',
      werewolf: 'specialInfo.werewolf',
      cloud: 'specialInfo.cloud',
      juggler: 'specialInfo.juggler',
      dragon: 'specialInfo.dragon',
      fairy: 'specialInfo.fairy',
    }

    const key = keyMap[this.card.special]

    return key ? this.i18n.t(key) : ''
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
      return this.card.suit === 'yellow' ? '#111827' : '#ffffff'
    }

    return '#0f172a'
  }

  handlePlay() {
    if (!this.disabled) {
      this.play(this.card)
    }
  }
}
