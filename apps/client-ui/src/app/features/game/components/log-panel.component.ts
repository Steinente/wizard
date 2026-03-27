import {
  Component,
  ElementRef,
  Input,
  OnChanges,
  ViewChild,
  inject,
} from '@angular/core'
import type { WizardGameViewState } from '@wizard/shared'
import { I18nService } from '../../../core/i18n/i18n.service'
import { TPipe } from '../../../shared/pipes/t.pipe'
import {
  ALL_SUITS,
  getSuitBackground,
} from '../../../shared/utils/suit-colors.util'
import { getLogTranslationKey } from '../utils/log-label.util'
import {
  addDerivedCardLabelForSpecialPlay,
  formatCloudPredictionAdjustedParams,
  normalizeLogParams,
} from '../utils/log-params.util'

@Component({
  selector: 'wiz-log-panel',
  standalone: true,
  imports: [TPipe],
  template: `
    <div class="panel">
      <h3 style="margin-top: 0;">{{ 'logs' | t }}</h3>

      <div
        #scrollContainer
        class="panel-scroll panel-scroll-compact"
        (scroll)="onScroll()"
      >
        <div class="grid" style="gap: 5px;">
          @for (entry of logs; track entry.id; let index = $index) {
            <div
              class="panel log-entry"
              [style.borderLeftColor]="roundAccentColor(index)"
              [style.background]="roundTintColor(index)"
            >
              <div class="log-message">
                {{ format(entry.messageKey, entry.messageParams) }}
              </div>
              @if (showTimestamp) {
                <div class="log-time">{{ formatDate(entry.createdAt) }}</div>
              }
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .log-entry {
        padding: 6px 8px;
        border-left: 3px solid transparent;
      }

      .log-message {
        font-size: 12px;
        line-height: 1.15;
      }

      .log-time {
        margin-top: 2px;
        font-size: 9px;
        color: var(--muted);
      }
    `,
  ],
})
export class LogPanelComponent implements OnChanges {
  private readonly i18n = inject(I18nService)
  private readonly roundColorIndexByLogId = new Map<string, number>()

  @ViewChild('scrollContainer')
  private scrollContainer?: ElementRef<HTMLElement>

  @Input({ required: true }) logs: WizardGameViewState['logs'] = []
  @Input({ required: true }) players: WizardGameViewState['players'] = []
  @Input({ required: true }) showTimestamp = true

  private isAtBottom = true

  onScroll() {
    const el = this.scrollContainer?.nativeElement
    if (!el) return
    const threshold = 8
    this.isAtBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight <= threshold
  }

  ngOnChanges() {
    this.recomputeRoundColorMap()

    if (!this.isAtBottom) return
    requestAnimationFrame(() => {
      const el = this.scrollContainer?.nativeElement
      if (el) {
        el.scrollTop = el.scrollHeight
      }
    })
  }

  private replacePlayerIds(
    params?: Record<string, string | number | boolean | null>,
  ) {
    return normalizeLogParams(params, this.players, (key) => this.i18n.t(key), {
      modeBehavior: 'translateKey',
      includeSwappedCardLabel: true,
      includeSpecial: true,
    })
  }

  private formatLogParams(
    messageKey: string,
    params?: Record<string, string | number | boolean | null>,
  ) {
    const normalized = formatCloudPredictionAdjustedParams(
      messageKey,
      addDerivedCardLabelForSpecialPlay(
        messageKey,
        this.replacePlayerIds(params),
        (key) => this.i18n.t(key),
      ),
      'visible',
    )

    return normalized
  }

  formatDate(value: string) {
    const date = new Date(value)
    const pad = (n: number) => String(n).padStart(2, '0')

    return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  }

  format(
    messageKey: string,
    params?: Record<string, string | number | boolean | null>,
  ) {
    const translationKey = getLogTranslationKey(messageKey)

    if (!translationKey) {
      return messageKey
    }

    return this.i18n.format(
      translationKey,
      this.formatLogParams(messageKey, params),
    )
  }

  roundAccentColor(logIndex: number) {
    const entry = this.logs[logIndex]
    if (!entry) {
      return getSuitBackground(ALL_SUITS[0])
    }

    const colorIndex = this.roundColorIndexByLogId.get(entry.id) ?? 0
    return getSuitBackground(ALL_SUITS[colorIndex])
  }

  roundTintColor(logIndex: number) {
    const accent = this.roundAccentColor(logIndex)
    return `color-mix(in srgb, ${accent} 14%, transparent)`
  }

  private recomputeRoundColorMap() {
    this.roundColorIndexByLogId.clear()

    let colorIndex = 0
    let roundNumber = 1
    let completedTricksInRound = 0

    const isTrickCompletionLog = (entry: WizardGameViewState['logs'][number]) =>
      entry.type === 'trickWon' ||
      entry.messageKey === 'game.trick.canceledByBomb'

    const previousColorIndex = () =>
      (colorIndex + ALL_SUITS.length - 1) % ALL_SUITS.length

    for (const entry of this.logs) {
      // These messages are emitted right after round completion but still
      // semantically belong to the just-finished round.
      if (
        entry.messageKey === 'special.witch.noHandCard' ||
        entry.messageKey === 'game.round.scored'
      ) {
        this.roundColorIndexByLogId.set(entry.id, previousColorIndex())
      } else {
        this.roundColorIndexByLogId.set(entry.id, colorIndex)
      }

      if (!isTrickCompletionLog(entry)) {
        continue
      }

      completedTricksInRound += 1
      if (completedTricksInRound >= roundNumber) {
        completedTricksInRound = 0
        roundNumber += 1
        colorIndex = (colorIndex + 1) % ALL_SUITS.length
      }
    }
  }
}
