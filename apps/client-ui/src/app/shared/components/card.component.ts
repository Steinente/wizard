import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  inject,
} from '@angular/core'
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

const WILD_CARD_VARIANTS = ['red', 'yellow', 'green', 'blue'] as const

const SPECIAL_CARD_ARTWORK: Record<string, string> = {
  shapeShifter: 'shape_shifter',
  bomb: 'bomb',
  werewolf: 'werewolf',
  cloud: 'cloud',
  juggler: 'juggler',
  dragon: 'dragon',
  fairy: 'fairy',
}

@Component({
  selector: 'wiz-card',
  standalone: true,
  imports: [TPipe],
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
      [style.opacity]="disabled ? '0.45' : '1'"
      [style.filter]="disabled ? 'grayscale(0.4)' : 'none'"
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
      @if (cardInfoVisible && showSpecialInfo && specialInfoText) {
        <div
          class="wiz-card-info-popover"
          [style.left.px]="cardInfoLeftPx"
          [style.width.px]="cardInfoWidthPx"
        >
          {{ specialInfoText }}
        </div>
      }
      @if (showArtwork && artworkSrc) {
        <img class="wiz-card-artwork-image" [src]="artworkSrc" alt="" />
      } @else {
        <div class="wiz-card-value">{{ primaryText }}</div>
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
      }
    </button>
  `,
  styles: [
    `
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
        z-index: 2;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: rgb(15 23 42 / 0.9);
        color: var(--text);
        padding: 7px 8px;
        font-size: 11px;
        line-height: 1.25;
        text-align: left;
        z-index: 3;
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
        text-shadow: none;
        backdrop-filter: blur(4px);
        z-index: 1;
      }

      @media (max-width: 700px) {
        .wiz-card {
          width: 92px;
          min-height: 126px;
          padding: 8px;
          border-radius: 12px;
        }

        .wiz-card-value {
          font-size: 23px;
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
          min-height: 110px;
          padding: 7px;
        }

        .wiz-card-value {
          font-size: 19px;
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
  @Input() play!: (card: Card) => void
  @Input() resolvedEffect?: ResolvedCardRuntimeEffect
  @Input() showSpecialInfo = false
  @Input() useArtwork = false

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
      this.resolvedEffect.special === 'shapeShifter' &&
      this.resolvedEffect.shapeShifterMode
    ) {
      return this.resolvedEffect.shapeShifterMode === 'wizard'
        ? 'card.wizard'
        : 'card.jester'
    }
    return null
  }

  get artworkDetailLabel(): string {
    if (
      this.resolvedEffect?.special === 'shapeShifter' &&
      this.resolvedEffect.shapeShifterMode
    ) {
      return this.i18n.t(
        this.resolvedEffect.shapeShifterMode === 'wizard'
          ? 'card.wizard'
          : 'card.jester',
      )
    }

    if (
      this.resolvedEffect &&
      (this.resolvedEffect.special === 'cloud' ||
        this.resolvedEffect.special === 'juggler') &&
      this.resolvedEffect.chosenSuit
    ) {
      return this.i18n.t(
        `suit.${this.resolvedEffect.chosenSuit}` as TranslationKey,
      )
    }

    return ''
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
