import { Component, Input } from '@angular/core'
import type { WizardGameViewState } from '@wizard/shared'
import { PlayerBadgeComponent } from '../../../shared/components/player-badge.component'
import { TPipe } from '../../../shared/pipes/t.pipe'

@Component({
  selector: 'wiz-player-list-panel',
  standalone: true,
  imports: [PlayerBadgeComponent, TPipe],
  template: `
    <div class="panel">
      <h3 style="margin-top: 0;">{{ 'players' | t }}</h3>

      <div class="grid" style="gap: 12px;">
        @for (player of state.players; track player.playerId) {
          <wiz-player-badge
            [name]="
              player.name +
              (player.playerId === state.selfPlayerId
                ? ' (' + ('self' | t) + ')'
                : '')
            "
            [presence]="player.presence"
            [seatIndex]="player.seatIndex"
            [tricksWon]="getTricksWon(player.playerId)"
            [prediction]="getPrediction(player.playerId)"
            [active]="isActive(player.playerId)"
            [showCloudIndicator]="hasPendingCloudAdjustment(player.playerId)"
            [showPredictionStartIndicator]="
              state.pendingDecision?.type === 'werewolfTrumpSwap' &&
              state.currentRound?.roundLeaderPlayerId === player.playerId
            "
          />
        }
      </div>
    </div>
  `,
})
export class PlayerListPanelComponent {
  @Input({ required: true }) state!: WizardGameViewState

  getTricksWon(playerId: string) {
    return (
      this.state.currentRound?.players.find(
        (player) => player.playerId === playerId,
      )?.tricksWon ?? 0
    )
  }

  getPrediction(playerId: string) {
    return (
      this.state.currentRound?.players.find(
        (player) => player.playerId === playerId,
      )?.prediction?.value ?? null
    )
  }

  isActive(playerId: string) {
    if (this.state.pendingDecision) {
      if (this.state.pendingDecision.type === 'jugglerPassCard') {
        return this.state.pendingDecision.remainingPlayerIds.includes(playerId)
      }

      return this.state.pendingDecision.playerId === playerId
    }

    return this.state.currentRound?.activePlayerId === playerId
  }

  hasPendingCloudAdjustment(playerId: string) {
    return (
      this.state.currentRound?.players.find(
        (player) => player.playerId === playerId,
      )?.pendingCloudAdjustment === true
    )
  }
}
