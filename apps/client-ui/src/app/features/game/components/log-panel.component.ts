import { Component, Input, inject } from '@angular/core'
import type { WizardGameViewState } from '@wizard/shared'
import { I18nService } from '../../../core/i18n/i18n.service'
import { TPipe } from '../../../shared/pipes/t.pipe'
import {
  normalizeLogParams,
} from '../utils/log-params.util'
import { getLogTranslationKey } from '../utils/log-label.util'

@Component({
  selector: 'wiz-log-panel',
  standalone: true,
  imports: [TPipe],
  template: `
    <div class="panel">
      <h3 style="margin-top: 0;">{{ 'logs' | t }}</h3>

      <div class="panel-scroll panel-scroll-compact">
        <div class="grid" style="gap: 5px;">
          @for (entry of logs; track entry.id) {
            <div class="panel log-entry">
              <div class="log-message">
                {{ format(entry.messageKey, entry.messageParams) }}
              </div>
              <div class="log-time">{{ formatDate(entry.createdAt) }}</div>
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
export class LogPanelComponent {
  private readonly i18n = inject(I18nService)

  @Input({ required: true }) logs: WizardGameViewState['logs'] = []
  @Input({ required: true }) players: WizardGameViewState['players'] = []

  private replacePlayerIds(
    params?: Record<string, string | number | boolean | null>,
  ) {
    return normalizeLogParams(params, this.players, (key) => this.i18n.t(key), {
      modeBehavior: 'translateKey',
      includeSwappedCardLabel: true,
      includeSpecial: true,
    })
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

    return this.i18n.format(translationKey, this.replacePlayerIds(params))
  }
}
