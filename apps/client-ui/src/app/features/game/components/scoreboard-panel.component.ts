import {
  Component,
  ElementRef,
  Input,
  OnChanges,
  ViewChild,
} from '@angular/core'
import type { WizardGameViewState } from '@wizard/shared'
import { TPipe } from '../../../shared/pipes/t.pipe'

@Component({
  selector: 'wiz-scoreboard-panel',
  standalone: true,
  imports: [TPipe],
  template: `
    <div class="panel score-panel">
      <h3 style="margin-top: 0;">{{ 'scoreboard' | t }}</h3>

      <div
        #scrollContainer
        class="panel-scroll panel-scroll-compact score-scroll"
        (scroll)="onScroll()"
      >
        @if (a11yMode) {
          <ul class="rounds-list" [attr.aria-label]="'scoreboard' | t">
            @for (round of playedRoundNumbers(); track round) {
              <li class="round-item">
                <div class="round-label">{{ 'round' | t }} {{ round }}</div>
                <ul class="players-list">
                  @for (player of orderedPlayers(); track player.playerId) {
                    <li class="player-score-item">
                      <span class="player-name-score">{{ player.name }}:</span>
                      <span class="bid-score">
                        {{ 'bid' | t }}:
                        {{ bidDisplayValue(player.playerId, round) }}
                      </span>
                      <span class="points-score">
                        {{ 'points' | t }}:
                        {{ pointsValue(player.playerId, round) || '–' }}
                      </span>
                    </li>
                  }
                </ul>
              </li>
            }
          </ul>
        } @else {
          <table class="score-table">
            <thead>
              <tr>
                <th></th>
                @for (
                  player of orderedPlayers();
                  track player.playerId;
                  let playerIndex = $index
                ) {
                  <th colspan="2" [class.player-divider]="playerIndex > 0">
                    {{ player.name }}
                  </th>
                }
              </tr>
            </thead>

            <tbody>
              @for (round of roundNumbers(); track round) {
                <tr>
                  <td>{{ round }}</td>

                  @for (
                    player of orderedPlayers();
                    track player.playerId;
                    let playerIndex = $index
                  ) {
                    <td [class.player-divider]="playerIndex > 0">
                      {{ pointsValue(player.playerId, round) }}
                    </td>
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
        }
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

      .score-table .player-divider {
        border-left-width: 3px;
      }

      .score-table thead th {
        position: sticky;
        top: 0;
        background: #162033;
        z-index: 1;
      }

      .rounds-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .round-item {
        border: 1px solid var(--border);
        border-radius: 14px;
        overflow: hidden;
      }

      .round-label {
        background: #162033;
        font-size: 11px;
        font-weight: 600;
        padding: 4px 8px;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .players-list {
        list-style: none;
        margin: 0;
        padding: 4px 8px;
        display: flex;
        flex-direction: column;
        gap: 3px;
      }

      .player-score-item {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        font-size: 12px;
        align-items: baseline;
      }

      .player-name-score {
        font-weight: 600;
        flex-shrink: 0;
      }

      .bid-score,
      .points-score {
        color: var(--muted);
        white-space: nowrap;
      }
    `,
  ],
})
export class ScoreboardPanelComponent implements OnChanges {
  @ViewChild('scrollContainer')
  private scrollContainer?: ElementRef<HTMLElement>

  @Input({ required: true }) state!: WizardGameViewState
  @Input({ required: true }) a11yMode = true

  private isAtBottom = true

  onScroll() {
    const el = this.scrollContainer?.nativeElement
    if (!el) return

    const threshold = 8
    this.isAtBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight <= threshold
  }

  ngOnChanges() {
    if (!this.a11yMode) return

    if (!this.isAtBottom) return

    requestAnimationFrame(() => {
      const el = this.scrollContainer?.nativeElement
      if (el) {
        el.scrollTop = el.scrollHeight
      }
    })
  }

  orderedPlayers() {
    return [...this.state.players].sort((a, b) => a.seatIndex - b.seatIndex)
  }

  roundNumbers() {
    return Array.from({ length: this.state.maxRounds }, (_, index) => index + 1)
  }

  playedRoundNumbers() {
    const maxRound =
      this.state.phase === 'finished'
        ? this.state.maxRounds
        : (this.state.currentRound?.roundNumber ?? 0)
    return Array.from({ length: maxRound }, (_, i) => i + 1)
  }

  private scoreEntry(playerId: string, round: number) {
    return this.state.scoreboard.find(
      (item) => item.playerId === playerId && item.roundNumber === round,
    )
  }

  private livePrediction(playerId: string, round: number) {
    if (this.state.currentRound?.roundNumber !== round) {
      return null
    }

    const prediction =
      this.state.currentRound.players.find(
        (player) => player.playerId === playerId,
      )?.prediction ?? null

    if (!prediction?.revealed) {
      return null
    }

    return prediction
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

    if (!live || live.value === null) {
      return ''
    }

    const cloudDelta = live.cloudDelta ?? 0
    return live.value - cloudDelta
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

  bidDisplayValue(playerId: string, round: number) {
    const saved = this.scoreEntry(playerId, round)

    if (saved) {
      const adj = saved.predictionAdjustment
      return adj
        ? `${saved.predicted} (${adj > 0 ? '+1' : '-1'})`
        : String(saved.predicted)
    }

    const live = this.livePrediction(playerId, round)

    if (!live || live.value === null) {
      return '–'
    }

    const cloudDelta = live.cloudDelta ?? 0
    const base = live.value - cloudDelta
    return cloudDelta
      ? `${base} (${cloudDelta > 0 ? '+1' : '-1'})`
      : String(base)
  }
}
