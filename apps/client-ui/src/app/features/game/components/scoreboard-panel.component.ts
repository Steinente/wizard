import { Component, Input } from '@angular/core'
import type { WizardGameViewState } from '@wizard/shared'
import { TPipe } from '../../../shared/pipes/t.pipe'

@Component({
  selector: 'wiz-scoreboard-panel',
  standalone: true,
  imports: [TPipe],
  template: `
    <div class="panel score-panel">
      <h3 style="margin-top: 0;">{{ 'scoreboard' | t }}</h3>

      <div class="panel-scroll panel-scroll-compact score-scroll">
        <table class="score-table">
          <thead>
            <tr>
              <th></th>
              @for (player of orderedPlayers(); track player.playerId) {
                <th colspan="2">{{ player.name }}</th>
              }
            </tr>
          </thead>

          <tbody>
            @for (round of roundNumbers(); track round) {
              <tr>
                <td>{{ round }}</td>

                @for (player of orderedPlayers(); track player.playerId) {
                  <td>{{ pointsValue(player.playerId, round) }}</td>
                  <td>
                    <div>{{ bidValue(player.playerId, round) }}</div>
                    @if (bidAdjustment(player.playerId, round)) {
                      <div class="muted" style="font-size: 10px;">
                        {{ bidAdjustment(player.playerId, round) }}
                      </div>
                    }
                  </td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [
    `
      .score-panel {
        padding: 10px;
      }

      .score-scroll {
        max-height: 260px;
      }

      .score-table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        font-size: 12px;
      }

      .score-table th,
      .score-table td {
        border: 1px solid var(--border);
        padding: 5px;
        text-align: center;
        vertical-align: middle;
      }

      .score-table thead th {
        position: sticky;
        top: 0;
        background: #162033;
        z-index: 1;
      }
    `,
  ],
})
export class ScoreboardPanelComponent {
  @Input({ required: true }) state!: WizardGameViewState

  orderedPlayers() {
    return [...this.state.players].sort((a, b) => a.seatIndex - b.seatIndex)
  }

  roundNumbers() {
    return Array.from({ length: this.state.maxRounds }, (_, index) => index + 1)
  }

  private scoreEntry(playerId: string, round: number) {
    return this.state.scoreboard.find(
      (item) => item.playerId === playerId && item.roundNumber === round,
    )
  }

  private livePrediction(playerId: string, round: number) {
    if (this.state.config.predictionVisibility !== 'open') {
      return null
    }

    if (this.state.currentRound?.roundNumber !== round) {
      return null
    }

    return (
      this.state.currentRound.players.find(
        (player) => player.playerId === playerId,
      )?.prediction ?? null
    )
  }

  pointsValue(playerId: string, round: number) {
    return this.scoreEntry(playerId, round)?.total ?? ''
  }

  bidValue(playerId: string, round: number) {
    const saved = this.scoreEntry(playerId, round)

    if (saved) {
      return saved.predicted
    }

    const live = this.livePrediction(playerId, round)
    return live?.value ?? ''
  }

  bidAdjustment(playerId: string, round: number) {
    const saved = this.scoreEntry(playerId, round)?.predictionAdjustment

    if (saved) {
      return saved > 0 ? '+1' : '-1'
    }

    const live = this.livePrediction(playerId, round)?.cloudDelta ?? 0

    if (!live) {
      return ''
    }

    return live > 0 ? '+1' : '-1'
  }
}
