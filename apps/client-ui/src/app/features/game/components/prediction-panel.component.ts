import { Component, Input, inject } from '@angular/core'
import type { Suit } from '@wizard/shared'
import { I18nService } from '../../../core/i18n/i18n.service'
import type { TranslationKey } from '../../../core/i18n/translations'
import { TPipe } from '../../../shared/pipes/t.pipe'

@Component({
  selector: 'wiz-prediction-panel',
  standalone: true,
  imports: [TPipe],
  template: `
    <div class="panel">
      <h3 style="margin-top: 0;">
        {{ 'submitPrediction' | t }} - {{ trumpDisplayText }}
      </h3>

      <div class="prediction-grid">
        @for (value of values; track value) {
          <button class="btn prediction-btn" (click)="submit(value)">{{ value }}</button>
        }
      </div>
    </div>
  `,
})
export class PredictionPanelComponent {
  private readonly i18n = inject(I18nService)

  @Input({ required: true }) values: number[] = []
  @Input({ required: true }) submit!: (value: number) => void
  @Input() trumpSuit: Suit | null = null
  @Input() trumpValue: number | null = null

  get trumpDisplayText() {
    if (!this.trumpSuit) {
      return this.i18n.t('noTrump')
    }

    const translatedSuit = this.i18n.t(`suit.${this.trumpSuit}` as TranslationKey)
    const withValue =
      typeof this.trumpValue === 'number'
        ? `${translatedSuit} ${this.trumpValue}`
        : translatedSuit

    return `${this.i18n.t('trump')} ${withValue}`
  }
}
