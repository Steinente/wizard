import { Component, Input } from '@angular/core'
import type { WizardGameViewState } from '@wizard/shared'
import { PlayerBadgeComponent } from '../../../shared/components/player-badge.component'
import { TPipe } from '../../../shared/pipes/t.pipe'
import { isRoundPlayerActive } from '../utils/game-state-selectors.util'

@Component({
  selector: 'wiz-player-list-panel',
  standalone: true,
  imports: [PlayerBadgeComponent, TPipe],
  template: `
    <div class="panel player-panel">
      <h3 style="margin-top: 0;">{{ 'players' | t }}</h3>

      <div class="grid" style="gap: 8px;">
        @for (player of state.players; track player.playerId) {
          <wiz-player-badge
            [compact]="true"
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
              showRoundLeaderStartIndicator(player.playerId)
            "
            [showDealerIndicator]="isDealer(player.playerId)"
          />
        }
      </div>
    </div>
  `,
  styles: [
    `
      .player-panel {
        padding: 10px;
      }
    `,
  ],
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
    return isRoundPlayerActive(this.state, playerId)
  }

  hasPendingCloudAdjustment(playerId: string) {
    return (
      this.state.currentRound?.players.find(
        (player) => player.playerId === playerId,
      )?.pendingCloudAdjustment === true
    )
  }

  showRoundLeaderStartIndicator(playerId: string) {
    const decisionType = this.state.pendingDecision?.type
    const isTrumpSelectionPending =
      decisionType === 'selectTrumpSuit' || decisionType === 'werewolfTrumpSwap'
    const isPredictionPhase = this.state.phase === 'prediction'

    return (
      (isTrumpSelectionPending || isPredictionPhase) &&
      this.state.currentRound?.roundLeaderPlayerId === playerId
    )
  }

  isDealer(playerId: string) {
    const round = this.state.currentRound
    if (!round) return false
    return round.players[round.dealerIndex]?.playerId === playerId
  }
}
