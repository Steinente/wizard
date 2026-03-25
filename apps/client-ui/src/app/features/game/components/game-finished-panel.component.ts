import { Component, Input } from '@angular/core'
import type { WizardGameViewState } from '@wizard/shared'
import { TPipe } from '../../../shared/pipes/t.pipe'

interface RankedPlayer {
  playerId: string
  name: string
  seatIndex: number
  total: number
  tricksWonTotal: number
  isSelf: boolean
}

@Component({
  selector: 'wiz-game-finished-panel',
  standalone: true,
  imports: [TPipe],
  template: `
    <div class="panel finished-panel">
      <div class="finished-hero">
        <div class="finished-label">{{ 'phase.finished' | t }}</div>
        <h2 style="margin: 0;">{{ 'gameFinishedTitle' | t }}</h2>
        <p class="muted" style="margin: 8px 0 0;">{{ 'finalRanking' | t }}</p>
      </div>

      <div class="ranking-list">
        @for (player of ranking(); track player.playerId) {
          <div
            class="ranking-row"
            [class.ranking-row-winner]="$index === 0"
            [class.ranking-row-self]="player.isSelf"
          >
            <div class="ranking-place">{{ $index + 1 }}</div>

            <div class="ranking-player">
              <div class="ranking-name">
                {{ player.name }}
                @if (player.isSelf) {
                  <span class="muted">({{ 'self' | t }})</span>
                }
              </div>
              <div class="muted">
                {{ 'tricks' | t }} {{ player.tricksWonTotal }}
              </div>
            </div>

            <div class="ranking-score">
              {{ player.total }} {{ 'points' | t }}
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .finished-panel {
        padding: 20px;
      }

      .finished-hero {
        margin-bottom: 18px;
      }

      .finished-label {
        color: var(--accent);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        margin-bottom: 8px;
      }

      .ranking-list {
        display: grid;
        gap: 10px;
      }

      .ranking-row {
        display: grid;
        grid-template-columns: 48px minmax(0, 1fr) auto;
        gap: 12px;
        align-items: center;
        padding: 12px 14px;
        border: 1px solid var(--border);
        border-radius: 14px;
        background: rgb(15 23 42 / 0.55);
      }

      .ranking-row-winner {
        border-color: var(--accent);
        box-shadow: inset 0 0 0 1px rgb(212 167 44 / 0.35);
      }

      .ranking-row-self {
        outline: 2px solid rgb(212 167 44 / 0.45);
      }

      .ranking-place {
        display: grid;
        place-items: center;
        width: 36px;
        height: 36px;
        border-radius: 999px;
        background: #22304a;
        color: var(--text);
        font-weight: 700;
      }

      .ranking-name {
        font-weight: 700;
      }

      .ranking-score {
        font-weight: 700;
        white-space: nowrap;
      }
    `,
  ],
})
export class GameFinishedPanelComponent {
  @Input({ required: true }) state!: WizardGameViewState

  ranking(): RankedPlayer[] {
    const totals = new Map<string, number>()
    const tricksWonTotals = new Map<string, number>()

    for (const entry of this.state.scoreboard) {
      totals.set(entry.playerId, entry.total)
      tricksWonTotals.set(
        entry.playerId,
        (tricksWonTotals.get(entry.playerId) ?? 0) + entry.won,
      )
    }

    return [...this.state.players]
      .map((player) => ({
        playerId: player.playerId,
        name: player.name,
        seatIndex: player.seatIndex,
        total: totals.get(player.playerId) ?? 0,
        tricksWonTotal: tricksWonTotals.get(player.playerId) ?? 0,
        isSelf: player.playerId === this.state.selfPlayerId,
      }))
      .sort((left, right) => {
        if (right.total !== left.total) {
          return right.total - left.total
        }

        if (right.tricksWonTotal !== left.tricksWonTotal) {
          return right.tricksWonTotal - left.tricksWonTotal
        }

        return left.seatIndex - right.seatIndex
      })
  }
}
