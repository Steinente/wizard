import { Component, Input } from '@angular/core'
import type {
  Card,
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

      <div class="trick-cards-anchor">
        <div class="card-grid trick-cards-grid">
          @if (trick && trick.plays.length > 0) {
            @for (play of trick.plays; track play.playerId + play.card.id) {
              <wiz-card
                [card]="play.card"
                [middleLabel]="getPlayerName(play.playerId)"
                [resolvedEffect]="getResolvedEffect(play.card.id)"
                [showSpecialInfo]="true"
                [useArtwork]="useArtwork"
              />
            }
          }

          @if (dragPreviewCard) {
            <div class="trick-drag-preview-slot">
              <wiz-card
                [card]="dragPreviewCard"
                [middleLabel]="dragPreviewPlayerName"
                [showSpecialInfo]="true"
                [useArtwork]="useArtwork"
                [dimmed]="true"
              />
            </div>
          } @else if (isDragActive) {
            <div class="trick-drag-placeholder-slot"></div>
          }
        </div>

        @if (!trick || trick.plays.length === 0) {
          <p class="muted trick-empty-label">{{ 'noCardsPlayedYet' | t }}</p>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .trick-cards-anchor {
        min-height: 68px;
      }

      .trick-cards-grid {
        min-height: 154px;
        align-content: flex-start;
      }

      .trick-empty-label {
        margin: 0;
      }

      .trick-drag-preview-slot {
        border-radius: 14px;
        outline: 2px dashed rgba(212, 167, 44, 0.75);
        outline-offset: 4px;
      }

      .trick-drag-placeholder-slot {
        border-radius: 14px;
        outline: 2px dashed rgba(212, 167, 44, 0.4);
        outline-offset: 4px;
        width: 96px;
        min-height: 154px;
      }

      @media (max-width: 700px) {
        .trick-cards-grid {
          min-height: 126px;
        }
      }

      @media (max-width: 460px) {
        .trick-cards-grid {
          min-height: 110px;
        }
      }
    `,
  ],
})
export class TrickAreaComponent {
  @Input() trick: TrickState | null = null
  @Input() resolvedCardEffects: ResolvedCardRuntimeEffect[] = []
  @Input() players: WizardGameViewState['players'] = []
  @Input() useArtwork = false
  @Input() dragPreviewCard: Card | null = null
  @Input() dragPreviewPlayerName: string | null = null
  @Input() isDragActive = false

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
