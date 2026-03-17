import { Component, Input } from '@angular/core'
import { TPipe } from '../../../shared/pipes/t.pipe'

@Component({
  selector: 'wiz-prediction-panel',
  standalone: true,
  imports: [TPipe],
  template: `
    <div class="panel">
      <h3 style="margin-top: 0;">{{ 'submitPrediction' | t }}</h3>

      <div class="prediction-grid">
        @for (value of values; track value) {
          <button class="btn prediction-btn" (click)="submit(value)">{{ value }}</button>
        }
      </div>
    </div>
  `,
})
export class PredictionPanelComponent {
  @Input({ required: true }) values: number[] = []
  @Input({ required: true }) submit!: (value: number) => void
}
