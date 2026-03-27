import { Component, Input, inject } from '@angular/core'
import type { Card, Suit } from '@wizard/shared'
import { I18nService } from '../../../core/i18n/i18n.service'
import type { TranslationKey } from '../../../core/i18n/translations'
import { buildTrumpBadgeViewModel } from '../utils/trump-badge.util'

@Component({
  selector: 'wiz-trump-badge',
  standalone: true,
  template: `
    <span
      class="status-pill"
      [style.background]="badge.background"
      [style.color]="badge.foreground"
      [style.borderColor]="badge.border"
    >
      {{ badge.displayText }}
    </span>
  `,
})
export class TrumpBadgeComponent {
  private readonly i18n = inject(I18nService)
  private readonly t = (key: TranslationKey) => this.i18n.t(key)

  @Input() trumpSuit: Suit | null = null
  @Input() trumpCard: Card | null = null

  get badge() {
    return buildTrumpBadgeViewModel({
      trumpSuit: this.trumpSuit,
      trumpCard: this.trumpCard,
      t: this.t,
    })
  }
}
