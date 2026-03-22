import { Component, Input } from '@angular/core'
import type {
  ResolvedCardRuntimeEffect,
  TrickState,
  WizardGameViewState,
} from '@wizard/shared'
import { CardComponent } from '../../../shared/components/card.component'
import { TPipe } from '../../../shared/pipes/t.pipe'

@Component({
  selector: 'wiz-trick-area',
  standalone: true,
  imports: [CardComponent, TPipe],
  template: `
    <div class="panel">
      <h3 style="margin-top: 0;">{{ 'currentTrick' | t }}</h3>

      @if (!trick || trick.plays.length === 0) {
        <p class="muted">{{ 'noCardsPlayedYet' | t }}</p>
      } @else {
        <div class="card-grid">
          @for (play of trick.plays; track play.playerId + play.card.id) {
            <wiz-card
              [card]="play.card"
              [middleLabel]="getPlayerName(play.playerId)"
              [resolvedEffect]="getResolvedEffect(play.card.id)"
              [showSpecialInfo]="true"
              [useArtwork]="useArtwork"
            />
          }
        </div>
      }
    </div>
  `,
})
export class TrickAreaComponent {
  @Input() trick: TrickState | null = null
  @Input() resolvedCardEffects: ResolvedCardRuntimeEffect[] = []
  @Input() players: WizardGameViewState['players'] = []
  @Input() useArtwork = false

  getResolvedEffect(cardId: string): ResolvedCardRuntimeEffect | undefined {
    return this.resolvedCardEffects.find((effect) => effect.cardId === cardId)
  }

  getPlayerName(playerId: string): string {
    return (
      this.players.find((player) => player.playerId === playerId)?.name ??
      playerId
    )
  }
}
