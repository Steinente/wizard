import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  inject,
} from '@angular/core'
import {
  SPECIAL_CARD_KEY,
  type Card,
  type ResolvedCardRuntimeEffect,
  type Suit,
} from '@wizard/shared'
import { I18nService } from '../../core/i18n/i18n.service'
import type { TranslationKey } from '../../core/i18n/translations'
import {
  getCardAccent,
  getCardPrimaryText,
  getCardSubtitleKey,
  getCardTitleKey,
} from '../utils/card-label.util'
import { SUIT_BACKGROUNDS } from '../utils/suit-colors.util'

const WILD_CARD_VARIANTS = ['red', 'yellow', 'green', 'blue'] as const

const SPECIAL_CARD_ARTWORK: Record<string, string> = {
  shapeShifter: 'shape_shifter',
  [SPECIAL_CARD_KEY.bomb]: SPECIAL_CARD_KEY.bomb,
  [SPECIAL_CARD_KEY.werewolf]: SPECIAL_CARD_KEY.werewolf,
  [SPECIAL_CARD_KEY.vampire]: SPECIAL_CARD_KEY.vampire,
  darkEye: 'the_dark_eye',
  [SPECIAL_CARD_KEY.cloud]: SPECIAL_CARD_KEY.cloud,
  [SPECIAL_CARD_KEY.juggler]: SPECIAL_CARD_KEY.juggler,
  [SPECIAL_CARD_KEY.dragon]: SPECIAL_CARD_KEY.dragon,
  [SPECIAL_CARD_KEY.fairy]: SPECIAL_CARD_KEY.fairy,
  [SPECIAL_CARD_KEY.witch]: SPECIAL_CARD_KEY.witch,
}

@Component({
  selector: 'wiz-card',
  standalone: true,
  host: {
    '[class.wiz-card-host-showing-info]': 'cardInfoVisible',
  },
  template: `
    <button
      class="wiz-card"
      [class.wiz-card-showing-info]="cardInfoVisible"
      [class.wiz-card-artwork-mode]="showArtwork"
      type="button"
      [attr.aria-disabled]="disabled"
      [attr.aria-label]="cardAriaLabel"
      [style.border-color]="accent"
      [style.background]="background"
      [style.color]="foreground"
      [style.opacity]="disabled || dimmed ? '0.45' : '1'"
      [style.filter]="disabled || dimmed ? 'grayscale(0.4)' : 'none'"
      [style.box-shadow]="playable ? '0 0 0 2px rgba(212,167,44,0.4)' : 'none'"
      (pointerdown)="onCardPointerDown($event)"
      (pointerup)="onCardPointerRelease()"
      (pointercancel)="onCardPointerRelease()"
      (pointerleave)="onCardPointerRelease()"
      (click)="handlePlay($event)"
    >
      @if (showSpecialInfo && specialInfoText) {
        <span class="info-icon wiz-card-info" [title]="specialInfoText">?</span>
      }
      @if (showArtwork && artworkSrc) {
        <img class="wiz-card-artwork-image" [src]="artworkSrc" alt="" />
      } @else {
        <div
          class="wiz-card-value"
          [class.wiz-card-value-compact]="isCompactSpecialValue"
        >
          {{ primaryText }}
        </div>
      }
      @if (middleLabel) {
        <div
          class="wiz-card-middle-label"
          [class.wiz-card-middle-label-artwork]="showArtwork"
        >
          {{ middleLabel }}
        </div>
      }
      @if (showArtwork && artworkDetailLabel) {
        <div class="wiz-card-artwork-detail">
          {{ artworkDetailLabel }}
        </div>
      }
      @if (!showArtwork || !artworkSrc) {
        <div
          class="wiz-card-bottom-text"
          [class.wiz-card-bottom-text-centered]="shouldCenterBottomText"
        >
          <div
            class="wiz-card-title"
            [class.wiz-card-title-top]="pinTitleTop"
            [class.wiz-card-title-top-left]="isTopTitleLeftAligned"
          >
            {{ title }}
          </div>
          @if (pinTitleTop && vampireCopiedValueLabel) {
            <div class="wiz-card-top-value">{{ vampireCopiedValueLabel }}</div>
          }
          @if (subtitle) {
            <div class="wiz-card-subtitle">
              {{ subtitle }}
            </div>
          }
          @if (selectedOptionLabel) {
            <div
              class="wiz-card-subtitle"
              style="margin-top: 4px; font-size: 11px; font-weight: 600;"
            >
              ({{ selectedOptionLabel }})
            </div>
          }
          @if (vampireCopiedBaseLabel) {
            <div
              class="wiz-card-title wiz-card-copied-title"
              style="margin-top: 4px;"
            >
              {{ vampireCopiedBaseLabel }}
            </div>
          }
          @if (vampireCopiedOptionLabel) {
            <div
              class="wiz-card-subtitle"
              style="margin-top: 2px; font-size: 11px; font-weight: 600;"
            >
              ({{ vampireCopiedOptionLabel }})
            </div>
          }
        </div>
      }
    </button>
    @if (showSpecialInfo && specialInfoText) {
      @if (cardInfoVisible) {
        <div
          class="wiz-card-info-popover"
          [style.left.px]="cardInfoLeftPx"
          [style.width.px]="cardInfoWidthPx"
        >
          {{ specialInfoText }}
        </div>
      }
    }
  `,
  styles: [
    `
      :host {
        position: relative;
        display: inline-block;
        z-index: 0;
      }

      :host(.wiz-card-host-showing-info) {
        z-index: 40;
      }

      .wiz-card {
        width: 96px;
        min-height: 150px;
        position: relative;
        overflow: visible;
        border: 2px solid var(--border);
        border-radius: 14px;
        padding: 10px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        text-align: left;
        transition: opacity 0.15s ease;
        touch-action: manipulation;
      }

      .wiz-card-showing-info {
        z-index: 20;
      }

      .wiz-card-artwork-mode {
        background: #f8fafc !important;
      }

      .wiz-card-artwork-image {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 12px;
        z-index: 0;
        pointer-events: none;
      }

      .wiz-card-value {
        font-size: 28px;
        font-weight: 700;
        line-height: 1;
      }

      .wiz-card-value-compact {
        font-size: 24px;
      }

      .wiz-card-info {
        position: absolute;
        top: 6px;
        right: 6px;
        width: 22px;
        height: 22px;
        margin-left: 0;
        font-size: 18px;
        font-weight: bold;
        color: #fff;
        background: #1e293bcc;
        border-radius: 50%;
        box-shadow: 0 2px 6px 0 #0008;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid #fbbf24;
        z-index: 2;
        text-shadow:
          0 1px 4px #000a,
          0 0 2px #fbbf24;
        transition:
          background 0.2s,
          color 0.2s,
          border 0.2s;
      }
      .wiz-card-artwork-mode .wiz-card-info {
        background: #fff8;
        color: #1e293b;
        border: 2px solid #1e293b;
        text-shadow:
          0 1px 4px #fff,
          0 0 2px #1e293b;
      }

      .wiz-card-info-popover {
        position: absolute;
        left: 0;
        bottom: 8px;
        transform: none;
        max-width: 260px;
        min-width: 170px;
        z-index: 50;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: rgb(15 23 42 / 0.9);
        color: var(--text);
        padding: 7px 8px;
        font-size: 11px;
        line-height: 1.25;
        text-align: left;
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

      .wiz-card-top-value {
        position: absolute;
        top: 26px;
        left: 10px;
        right: 10px;
        font-size: 16px;
        font-weight: 600;
        line-height: 1.1;
        text-align: left;
      }

      .wiz-card-title-top-left {
        text-align: left;
      }

      .wiz-card-subtitle {
        font-size: 12px;
        line-height: 1.1;
        white-space: normal;
        hyphens: auto;
        overflow-wrap: break-word;
        word-break: normal;
      }

      .wiz-card-bottom-text {
        margin-top: auto;
      }

      .wiz-card-bottom-text-centered {
        text-align: center;
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
        z-index: 1;
      }

      .wiz-card-middle-label-artwork {
        left: 50%;
        right: auto;
        transform: translate(-50%, -50%);
        width: max-content;
        max-width: calc(100% - 12px);
        padding: 4px 7px;
        border-radius: 999px;
        background: rgb(15 23 42 / 0.82);
        border: 1px solid rgb(229 238 252 / 0.18);
        color: #f8fafc;
        text-shadow: none;
        backdrop-filter: blur(4px);
      }

      .wiz-card-artwork-detail {
        position: absolute;
        left: 50%;
        bottom: 10px;
        transform: translateX(-50%);
        width: max-content;
        max-width: calc(100% - 14px);
        padding: 4px 8px;
        border-radius: 999px;
        background: rgb(15 23 42 / 0.82);
        border: 1px solid rgb(229 238 252 / 0.18);
        color: #f8fafc;
        font-size: 11px;
        font-weight: 700;
        line-height: 1.1;
        text-align: center;
        white-space: normal;
        hyphens: auto;
        overflow-wrap: break-word;
        word-break: normal;
        text-shadow: none;
        backdrop-filter: blur(4px);
        z-index: 1;
      }

      @media (max-width: 700px) {
        .wiz-card {
          width: 92px;
          min-height: 144px;
          padding: 8px;
          border-radius: 12px;
        }

        .wiz-card-value {
          font-size: 23px;
        }

        .wiz-card-value-compact {
          font-size: 20px;
        }

        .wiz-card-title {
          font-size: 12px;
        }

        .wiz-card-subtitle {
          font-size: 10px;
        }

        .wiz-card-middle-label {
          font-size: 10px;
        }

        .wiz-card-artwork-detail {
          bottom: 8px;
          font-size: 10px;
        }
      }

      @media (max-width: 460px) {
        .wiz-card {
          width: 78px;
          min-height: 122px;
          padding: 7px;
        }

        .wiz-card-value {
          font-size: 19px;
        }

        .wiz-card-value-compact {
          font-size: 17px;
        }

        .wiz-card-title {
          font-size: 11px;
        }

        .wiz-card-subtitle {
          font-size: 9px;
        }

        .wiz-card-middle-label {
          font-size: 9px;
        }

        .wiz-card-artwork-detail {
          bottom: 7px;
          font-size: 9px;
          max-width: calc(100% - 10px);
          padding: 3px 6px;
        }

        .wiz-card-title-top {
          top: 8px;
          left: 8px;
          right: 8px;
        }

        .wiz-card-top-value {
          top: 22px;
          left: 8px;
          right: 8px;
          font-size: 14px;
        }

        .wiz-card-info {
          width: 14px;
          height: 14px;
          font-size: 10px;
        }

        .wiz-card-info-popover {
          max-width: 230px;
          min-width: 150px;
          font-size: 10px;
        }
      }
    `,
  ],
})
export class CardComponent {
  private readonly i18n = inject(I18nService)
  private readonly hostElement =
    inject<ElementRef<HTMLButtonElement>>(ElementRef)
  private readonly cdr = inject(ChangeDetectorRef)
  private longPressTimerId: ReturnType<typeof setTimeout> | null = null
  private hideInfoTimerId: ReturnType<typeof setTimeout> | null = null
  private longPressHandled = false
  private readonly dismissPopover = () => {
    this.hideInfo()
    this.cdr.detectChanges()
  }
  cardInfoVisible = false
  cardInfoLeftPx = 0
  cardInfoWidthPx = 260

  @Input({ required: true }) card!: Card
  @Input() middleLabel: string | null = null
  @Input() playable = false
  @Input() disabled = false
  @Input() dimmed = false
  @Input() play!: (card: Card) => void
  @Input() resolvedEffect?: ResolvedCardRuntimeEffect
  @Input() showSpecialInfo = false
  @Input() useArtwork = false

  get accent() {
    if (this.displaySuit) {
      return SUIT_BACKGROUNDS[this.displaySuit]
    }

    return getCardAccent(this.card)
  }

  get primaryText() {
    return getCardPrimaryText(this.card)
  }

  get isCompactSpecialValue(): boolean {
    return (
      this.card.type === 'special' &&
      (this.card.special === SPECIAL_CARD_KEY.cloud ||
        this.card.special === SPECIAL_CARD_KEY.juggler)
    )
  }

  get title() {
    const key = getCardTitleKey(this.card)
    return key ? this.i18n.t(key) : ''
  }

  get subtitle() {
    const key = getCardSubtitleKey(this.card)
    return key ? this.i18n.t(key) : ''
  }

  get cardAriaLabel() {
    return [
      this.title,
      this.primaryText,
      this.subtitle,
      this.artworkDetailLabel,
    ]
      .filter((value) => value.trim().length > 0)
      .join(' ')
  }

  get showArtwork() {
    return this.useArtwork && !!this.artworkSrc
  }

  get artworkSrc(): string | null {
    if (!this.useArtwork) {
      return null
    }

    if (this.card.type === 'number') {
      return `/cards/${this.card.suit}_${this.card.value}.png`
    }

    if (this.card.type === 'special') {
      const artworkName = SPECIAL_CARD_ARTWORK[this.card.special]
      return artworkName ? `/cards/${artworkName}.png` : null
    }

    if (this.card.type === 'wizard' || this.card.type === 'jester') {
      const variant = this.cardVariantFromId(this.card.id)
      return `/cards/${this.card.type}_${variant}.png`
    }

    return null
  }

  get shapeShifterMode(): string | null {
    if (
      this.resolvedEffect &&
      this.resolvedEffect.special === SPECIAL_CARD_KEY.shapeShifter &&
      this.resolvedEffect.shapeShifterMode
    ) {
      return this.getShapeShifterModeLabel(this.resolvedEffect.shapeShifterMode)
    }

    if (
      this.resolvedEffect &&
      this.resolvedEffect.special === SPECIAL_CARD_KEY.vampire &&
      this.resolvedEffect.copiedCard?.type === 'special' &&
      this.resolvedEffect.copiedCard.special ===
        SPECIAL_CARD_KEY.shapeShifter &&
      this.resolvedEffect.shapeShifterMode
    ) {
      return this.getShapeShifterModeLabel(this.resolvedEffect.shapeShifterMode)
    }

    return null
  }

  get artworkDetailLabel(): string {
    if (this.vampireCopiedBaseLabel) {
      if (this.vampireCopiedOptionLabel) {
        return `${this.vampireCopiedBaseLabel} (${this.vampireCopiedOptionLabel})`
      }

      return this.vampireCopiedBaseLabel
    }

    if (
      this.resolvedEffect?.special === SPECIAL_CARD_KEY.shapeShifter &&
      this.resolvedEffect.shapeShifterMode
    ) {
      return this.i18n.t(
        this.getShapeShifterModeLabel(
          this.resolvedEffect.shapeShifterMode,
        ) as TranslationKey,
      )
    }

    if (
      this.resolvedEffect &&
      this.isCloudOrJugglerSpecial(this.resolvedEffect.special) &&
      this.resolvedEffect.chosenSuit
    ) {
      return this.getSuitLabel(this.resolvedEffect.chosenSuit)
    }

    return ''
  }

  get vampireCopiedLabel(): string | null {
    if (
      this.resolvedEffect?.special === SPECIAL_CARD_KEY.vampire &&
      this.resolvedEffect.copiedCard
    ) {
      return this.translateCard(this.resolvedEffect.copiedCard)
    }

    return null
  }

  get selectedOptionLabel(): string | null {
    if (!this.resolvedEffect) {
      return null
    }

    if (
      this.resolvedEffect.special === SPECIAL_CARD_KEY.shapeShifter &&
      this.resolvedEffect.shapeShifterMode
    ) {
      return this.i18n.t(
        this.getShapeShifterModeLabel(
          this.resolvedEffect.shapeShifterMode,
        ) as TranslationKey,
      )
    }

    if (
      this.isCloudOrJugglerSpecial(this.resolvedEffect.special) &&
      this.resolvedEffect.chosenSuit
    ) {
      return this.getSuitLabel(this.resolvedEffect.chosenSuit)
    }

    return null
  }

  get vampireCopiedBaseLabel(): string | null {
    return this.vampireCopiedLabel
  }

  get vampireCopiedOptionLabel(): string | null {
    if (this.resolvedEffect?.special !== SPECIAL_CARD_KEY.vampire) {
      return null
    }

    if (
      this.vampireCopiedSpecial === SPECIAL_CARD_KEY.shapeShifter &&
      this.resolvedEffect.shapeShifterMode
    ) {
      return this.i18n.t(
        this.getShapeShifterModeLabel(
          this.resolvedEffect.shapeShifterMode,
        ) as TranslationKey,
      )
    }

    if (
      this.isCloudOrJugglerSpecial(this.vampireCopiedSpecial) &&
      this.resolvedEffect.chosenSuit
    ) {
      return this.getSuitLabel(this.resolvedEffect.chosenSuit)
    }

    return null
  }

  get vampireCopiedValueLabel(): string | null {
    if (
      this.resolvedEffect?.special !== 'vampire' ||
      this.resolvedEffect.copiedCard?.type !== 'special'
    ) {
      return null
    }

    if (this.isCloudOrJugglerSpecial(this.vampireCopiedSpecial)) {
      return getCardPrimaryText(this.resolvedEffect.copiedCard)
    }

    return null
  }

  get shouldCenterBottomText(): boolean {
    return !!this.selectedOptionLabel || !!this.vampireCopiedBaseLabel
  }

  private get vampireCopiedSpecial(): string | null {
    if (
      this.resolvedEffect?.special === SPECIAL_CARD_KEY.vampire &&
      this.resolvedEffect.copiedCard?.type === 'special'
    ) {
      return this.resolvedEffect.copiedCard.special
    }

    return null
  }

  private get displaySuit(): Suit | null {
    if (
      this.resolvedEffect &&
      this.isCloudOrJugglerSpecial(this.resolvedEffect.special) &&
      this.resolvedEffect.chosenSuit
    ) {
      return this.resolvedEffect.chosenSuit
    }

    if (this.resolvedEffect?.special !== SPECIAL_CARD_KEY.vampire) {
      return null
    }

    if (
      this.isCloudOrJugglerSpecial(this.vampireCopiedSpecial) &&
      this.resolvedEffect.chosenSuit
    ) {
      return this.resolvedEffect.chosenSuit
    }

    if (this.resolvedEffect.copiedCard?.type === 'number') {
      return this.resolvedEffect.copiedCard.suit
    }

    return null
  }

  private isCloudOrJugglerSpecial(special: string | null | undefined): boolean {
    return (
      special === SPECIAL_CARD_KEY.cloud || special === SPECIAL_CARD_KEY.juggler
    )
  }

  private getSuitLabel(suit: string): string {
    return this.i18n.t(`suit.${suit}` as TranslationKey)
  }

  private getShapeShifterModeLabel(
    mode: 'wizard' | 'jester',
  ): 'card.wizard' | 'card.jester' {
    return mode === 'wizard' ? 'card.wizard' : 'card.jester'
  }

  get isTopTitleLeftAligned(): boolean {
    return (
      this.pinTitleTop &&
      ((this.card.type === 'special' &&
        this.card.special === SPECIAL_CARD_KEY.shapeShifter) ||
        !!this.vampireCopiedBaseLabel)
    )
  }

  get pinTitleTop(): boolean {
    if (!this.middleLabel || this.card.type !== 'special') {
      return false
    }

    return (
      this.card.special === SPECIAL_CARD_KEY.shapeShifter ||
      !!this.vampireCopiedLabel
    )
  }

  get specialInfoText(): string {
    if (this.card.type !== 'special') {
      return ''
    }

    const key = `card.special.${this.card.special}.info` as TranslationKey
    return this.i18n.t(key)
  }

  get background() {
    if (this.displaySuit) {
      return SUIT_BACKGROUNDS[this.displaySuit] ?? this.accent
    }

    if (this.card.type === 'number') {
      return this.accent
    }

    return '#f8fafc'
  }

  get foreground() {
    if (this.displaySuit) {
      if (this.displaySuit === 'yellow') {
        return '#0f172a'
      }

      return '#ffffff'
    }

    if (this.card.type === 'number') {
      return this.card.suit === 'yellow' ? '#111827' : '#ffffff'
    }

    return '#0f172a'
  }

  private translateCard(card: Card): string {
    if (card.type === 'number') {
      return `${this.i18n.t(`suit.${card.suit}` as TranslationKey)} ${card.value}`
    }

    if (card.type === 'wizard') {
      return this.i18n.t('card.wizard')
    }

    if (card.type === 'jester') {
      return this.i18n.t('card.jester')
    }

    return this.i18n.t(`card.special.${card.special}` as TranslationKey)
  }

  private cardVariantFromId(cardId: string) {
    const match = cardId.match(/-(\d+)$/)
    const index = match ? Number(match[1]) - 1 : 0

    return WILD_CARD_VARIANTS[index] ?? WILD_CARD_VARIANTS[0]
  }

  ngOnDestroy() {
    this.clearLongPressTimer()
    this.hideInfo()
  }

  onCardPointerDown(event: PointerEvent) {
    if (!this.showSpecialInfo || !this.specialInfoText) {
      return
    }

    if (event.pointerType !== 'touch') {
      return
    }

    this.longPressHandled = false
    this.clearLongPressTimer()
    this.longPressTimerId = setTimeout(() => {
      this.longPressHandled = true
      this.showInfoTemporarily()
    }, 500)
  }

  onCardPointerRelease() {
    this.clearLongPressTimer()
  }

  handlePlay(event: MouseEvent) {
    if (this.longPressHandled) {
      event.preventDefault()
      event.stopPropagation()
      this.longPressHandled = false
      return
    }

    if (!this.disabled) {
      this.play(this.card)
    }
  }

  private showInfoTemporarily() {
    this.updateCardInfoLayout()
    this.cardInfoVisible = true
    this.clearHideInfoTimer()
    this.hideInfoTimerId = setTimeout(() => this.hideInfo(), 2600)
    document.addEventListener('touchstart', this.dismissPopover, {
      capture: true,
    })
    window.addEventListener('scroll', this.dismissPopover, {
      capture: true,
      passive: true,
    })
  }

  private hideInfo() {
    this.clearHideInfoTimer()
    this.cardInfoVisible = false
    document.removeEventListener('touchstart', this.dismissPopover, {
      capture: true,
    })
    window.removeEventListener('scroll', this.dismissPopover, { capture: true })
  }

  private clearLongPressTimer() {
    if (this.longPressTimerId) {
      clearTimeout(this.longPressTimerId)
      this.longPressTimerId = null
    }
  }

  private clearHideInfoTimer() {
    if (this.hideInfoTimerId) {
      clearTimeout(this.hideInfoTimerId)
      this.hideInfoTimerId = null
    }
  }

  private updateCardInfoLayout() {
    const viewportWidth = window.innerWidth
    const viewportMargin = viewportWidth <= 460 ? 10 : 12
    const preferredWidth = viewportWidth <= 460 ? 230 : 260
    const minWidth = viewportWidth <= 460 ? 150 : 170
    const maxAllowedWidth = Math.max(
      minWidth,
      viewportWidth - viewportMargin * 2,
    )
    const tooltipWidth = Math.min(preferredWidth, maxAllowedWidth)
    const cardRect = this.hostElement.nativeElement.getBoundingClientRect()
    const centeredLeft = cardRect.width / 2 - tooltipWidth / 2
    const minLeft = viewportMargin - cardRect.left
    const maxLeft =
      viewportWidth - viewportMargin - cardRect.left - tooltipWidth

    this.cardInfoWidthPx = tooltipWidth
    this.cardInfoLeftPx = Math.min(Math.max(centeredLeft, minLeft), maxLeft)
  }
}
