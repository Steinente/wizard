import { Component, Input } from '@angular/core'
import type { Card, Suit } from '@wizard/shared'
import { TPipe } from '../../../shared/pipes/t.pipe'
import { TrumpBadgeComponent } from './trump-badge.component'

@Component({
  selector: 'wiz-prediction-panel',
  standalone: true,
  imports: [TPipe, TrumpBadgeComponent],
  template: `
    <div class="panel">
      <div
        style="display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px;"
      >
        <h3 style="margin: 0;">{{ 'submitPrediction' | t }}</h3>
        <wiz-trump-badge [trumpSuit]="trumpSuit" [trumpCard]="trumpCard" />
      </div>

      <div class="prediction-grid">
        @for (value of values; track value) {
          <button class="btn prediction-btn" (click)="submit(value)">
            {{ value }}
          </button>
        }
      </div>
    </div>
  `,
})
export class PredictionPanelComponent {
  @Input({ required: true }) values: number[] = []
  @Input({ required: true }) submit!: (value: number) => void
  @Input() trumpSuit: Suit | null = null
  @Input() trumpCard: Card | null = null
}
