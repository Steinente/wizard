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
      <div
        style="display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px;"
      >
        <h3 style="margin: 0;">{{ 'yourHand' | t }}</h3>
        <button
          class="btn"
          [class.btn-active]="isSortActive"
          type="button"
          (click)="sortCards()"
        >
          {{ 'sortHand' | t }}
        </button>
      </div>

      <div class="card-grid">
        @for (card of cards; track card.id) {
          <div
            class="hand-card"
            draggable="true"
            [class.hand-card-dragging]="draggedCardId === card.id"
            [class.hand-card-drop-target]="dropTargetCardId === card.id"
            (dragstart)="startDrag(card.id, $event)"
            (dragend)="endDrag()"
            (dragover)="allowDrop(card.id, $event)"
            (dragleave)="leaveDropTarget(card.id)"
            (drop)="dropOnCard(card.id, $event)"
          >
            <wiz-card
              [card]="card"
              [playable]="canPlay(card)"
              [disabled]="!canPlay(card)"
              [showSpecialInfo]="true"
              [useArtwork]="useArtwork"
              [play]="play"
            />
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .hand-card {
        border-radius: 14px;
        transition:
          transform 0.15s ease,
          opacity 0.15s ease,
          box-shadow 0.15s ease;
      }

      .hand-card-dragging {
        opacity: 0.4;
        transform: scale(0.98);
      }

      .hand-card-drop-target {
        box-shadow: 0 0 0 3px rgba(212, 167, 44, 0.45);
      }
    `,
  ],
})
export class HandAreaComponent {
  @Input({ required: true }) cards: Card[] = []
  @Input({ required: true }) canPlay!: (card: Card) => boolean
  @Input({ required: true }) play!: (card: Card) => void
  @Input({ required: true }) onSort!: () => void
  @Input() isSortActive = false
  @Input({ required: true }) onReorder!: (
    draggedCardId: string,
    targetCardId: string,
  ) => void
  @Input() useArtwork = false

  draggedCardId: string | null = null
  dropTargetCardId: string | null = null

  sortCards() {
    this.onSort()
  }

  startDrag(cardId: string, event: DragEvent) {
    this.draggedCardId = cardId
    this.dropTargetCardId = null

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', cardId)
    }
  }

  endDrag() {
    this.draggedCardId = null
    this.dropTargetCardId = null
  }

  allowDrop(cardId: string, event: DragEvent) {
    if (!this.draggedCardId || this.draggedCardId === cardId) {
      return
    }

    event.preventDefault()
    this.dropTargetCardId = cardId
  }

  leaveDropTarget(cardId: string) {
    if (this.dropTargetCardId === cardId) {
      this.dropTargetCardId = null
    }
  }

  dropOnCard(targetCardId: string, event: DragEvent) {
    event.preventDefault()

    const draggedCardId = this.draggedCardId

    this.endDrag()

    if (!draggedCardId || draggedCardId === targetCardId) {
      return
    }

    this.onReorder(draggedCardId, targetCardId)
  }
}
