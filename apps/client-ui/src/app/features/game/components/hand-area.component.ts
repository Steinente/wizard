import { Component, Input } from '@angular/core'
import type { Card } from '@wizard/shared'
import { CardComponent } from '../../../shared/components/card.component'
import { TPipe } from '../../../shared/pipes/t.pipe'

@Component({
  selector: 'wiz-hand-area',
  standalone: true,
  imports: [CardComponent, TPipe],
  template: `
    <div class="panel">
      <h3 style="margin-top: 0;">{{ 'yourHand' | t }}</h3>

      <div class="card-grid">
        @for (card of cards; track card.id) {
          <wiz-card
            [card]="card"
            [playable]="canPlay(card)"
            [disabled]="!canPlay(card)"
            [play]="play"
          />
        }
      </div>
    </div>
  `,
})
export class HandAreaComponent {
  @Input({ required: true }) cards: Card[] = []
  @Input({ required: true }) canPlay!: (card: Card) => boolean
  @Input({ required: true }) play!: (card: Card) => void
}
