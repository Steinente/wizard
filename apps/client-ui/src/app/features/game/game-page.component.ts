import { Component, computed } from '@angular/core'
import { isLegalPlay, type Card, type Suit } from '@wizard/shared'
import { GameFacadeService } from '../../core/services/game-facade.service'
import { SessionService } from '../../core/services/session.service'
import { AppStore } from '../../core/state/app.store'
import { TPipe } from '../../shared/pipes/t.pipe'
import { GameControlsPanelComponent } from './components/game-controls-panel.component'
import { GameHeaderComponent } from './components/game-header.component'
import { HandAreaComponent } from './components/hand-area.component'
import { LogPanelComponent } from './components/log-panel.component'
import { PendingDecisionPanelComponent } from './components/pending-decision-panel.component'
import { PlayerListPanelComponent } from './components/player-list-panel.component'
import { PredictionPanelComponent } from './components/prediction-panel.component'
import { ScoreboardPanelComponent } from './components/scoreboard-panel.component'
import { TrickAreaComponent } from './components/trick-area.component'

@Component({
  standalone: true,
  imports: [
    TPipe,
    GameHeaderComponent,
    PlayerListPanelComponent,
    TrickAreaComponent,
    HandAreaComponent,
    ScoreboardPanelComponent,
    LogPanelComponent,
    PredictionPanelComponent,
    PendingDecisionPanelComponent,
    GameControlsPanelComponent,
  ],
  template: `
    <div class="page-shell">
      @if (!store.gameState()) {
        <div class="panel">{{ 'waitingForPlayers' | t }}</div>
      } @else {
        <div class="game-top">
          <wiz-game-header [state]="store.gameState()!" />
        </div>

        <div class="game-layout">
          <div class="game-column">
            <wiz-player-list-panel [state]="store.gameState()!" />

            <wiz-game-controls-panel
              [state]="store.gameState()!"
              [audioEnabled]="audioEnabledSignal()"
              [isHost]="isHost()"
              [onToggleAudio]="toggleAudioFn"
              [onEndLobby]="endLobbyFn"
            />
          </div>

          <div class="game-column">
            <wiz-trick-area
              [trick]="store.gameState()!.currentRound?.currentTrick ?? null"
              [players]="store.gameState()!.players"
              [resolvedCardEffects]="store.gameState()!.resolvedCardEffects"
            />

            @if (myPendingDecision()) {
              <wiz-pending-decision-panel
                [decision]="myPendingDecision()"
                [onSelectTrump]="selectTrumpFn"
                [onResolveWerewolfTrumpSwap]="resolveWerewolfTrumpSwapFn"
                [onResolveShapeShifter]="resolveShapeShifterFn"
                [onResolveCloudSuit]="resolveCloudSuitFn"
                [onResolveCloudAdjustment]="resolveCloudAdjustmentFn"
                [onResolveJugglerSuit]="resolveJugglerSuitFn"
              />
            } @else if (foreignPendingDecisionText()) {
              <div class="panel">
                <span class="muted">{{ foreignPendingDecisionText() }}</span>
              </div>
            }

            @if (canPredict()) {
              <wiz-prediction-panel
                [values]="predictionOptions()"
                [submit]="predictFn"
              />
            }

            <wiz-hand-area
              [cards]="myHand()"
              [canPlay]="canPlayCardFn"
              [play]="playCardFn"
            />
          </div>

          <div class="game-column">
            <wiz-scoreboard-panel [state]="store.gameState()!" />
            <wiz-log-panel
              [logs]="store.gameState()!.logs"
              [players]="store.gameState()!.players"
            />
          </div>
        </div>
      }
    </div>
  `,
})
export class GamePageComponent {
  protected readonly store = this.appStore

  private readonly audioEnabledFromServer = computed(() => {
    const state = this.store.gameState()
    const selfId = state?.selfPlayerId

    return (
      state?.players.find((player) => player.playerId === selfId)
        ?.audioEnabled ?? false
    )
  })

  // Use server value if available, otherwise fall back to session
  readonly audioEnabledSignal = computed(() => {
    return this.audioEnabledFromServer()
  })

  readonly playCardFn = (card: Card) => this.playCard(card)
  readonly canPlayCardFn = (card: Card) => this.canPlayCard(card)
  readonly predictFn = (value: number) => this.predict(value)
  readonly selectTrumpFn = (suit: Suit) => this.selectTrump(suit)
  readonly resolveWerewolfTrumpSwapFn = (suit: Suit | null) =>
    this.resolveWerewolfTrumpSwap(suit)
  readonly resolveShapeShifterFn = (mode: 'wizard' | 'jester') =>
    this.resolveShapeShifter(mode)
  readonly resolveCloudSuitFn = (suit: Suit) => this.resolveCloudSuit(suit)
  readonly resolveCloudAdjustmentFn = (delta: 1 | -1) =>
    this.resolveCloudAdjustment(delta)
  readonly resolveJugglerSuitFn = (suit: Suit) => this.resolveJugglerSuit(suit)
  readonly toggleAudioFn = (enabled: boolean) => this.toggleAudio(enabled)
  readonly endLobbyFn = () => this.endLobby()

  constructor(
    private readonly appStore: AppStore,
    private readonly facade: GameFacadeService,
    protected readonly session: SessionService,
  ) {}

  isHost() {
    const state = this.store.gameState()

    return !!state?.players.find(
      (entry) => entry.playerId === state.selfPlayerId && entry.isHost,
    )
  }

  myHand() {
    const state = this.store.gameState()
    const selfId = state?.selfPlayerId

    return (
      state?.currentRound?.players.find((player) => player.playerId === selfId)
        ?.hand ?? []
    )
  }

  myPendingDecision() {
    const state = this.store.gameState()

    if (!state?.pendingDecision) {
      return null
    }

    return state.pendingDecision.playerId === state.selfPlayerId
      ? state.pendingDecision
      : null
  }

  foreignPendingDecisionText() {
    const state = this.store.gameState()

    if (
      !state?.pendingDecision ||
      state.pendingDecision.playerId === state.selfPlayerId
    ) {
      return ''
    }

    const player = state.players.find(
      (p) => p.playerId === state.pendingDecision?.playerId,
    )

    if (!player) {
      return ''
    }

    if (state.pendingDecision.type === 'werewolfTrumpSwap') {
      return `${player.name} wählt gerade den Trumpf durch den Werwolf`
    }

    return `${player.name} trifft gerade eine Entscheidung`
  }

  canPredict() {
    const state = this.store.gameState()

    return (
      !!state &&
      state.phase === 'prediction' &&
      state.currentRound?.activePlayerId === state.selfPlayerId
    )
  }

  predictionOptions() {
    const roundNumber = this.store.gameState()?.currentRound?.roundNumber ?? 0
    return Array.from({ length: roundNumber + 1 }, (_, index) => index)
  }

  predict(value: number) {
    const code = this.store.gameState()?.lobbyCode

    if (!code) {
      return
    }

    this.facade.makePrediction(code, value)
  }

  canPlayCard(card: Card) {
    const state = this.store.gameState()

    if (!state) {
      return false
    }

    if (
      state.pendingDecision?.type === 'jugglerPassCard' &&
      state.pendingDecision.playerId === state.selfPlayerId
    ) {
      return this.myHand().some((entry) => entry.id === card.id)
    }

    if (
      state.phase !== 'playing' ||
      !!state.pendingDecision ||
      state.currentRound?.activePlayerId !== state.selfPlayerId
    ) {
      return false
    }

    const trick = state.currentRound?.currentTrick
    if (trick && trick.plays.length >= state.players.length) {
      return false
    }

    const leadSuit = state.currentRound.currentTrick?.leadSuit ?? null

    return isLegalPlay(this.myHand(), card, leadSuit)
  }

  playCard(card: Card) {
    const state = this.store.gameState()

    if (!state) {
      return
    }

    if (
      state.pendingDecision?.type === 'jugglerPassCard' &&
      state.pendingDecision.playerId === state.selfPlayerId
    ) {
      this.facade.selectJugglerPassCard(state.lobbyCode, card.id)
      return
    }

    if (!this.canPlayCard(card)) {
      return
    }

    this.facade.playCard(state.lobbyCode, card.id)
  }

  selectTrump(suit: Suit) {
    const code = this.store.gameState()?.lobbyCode

    if (!code) {
      return
    }

    this.facade.selectTrumpSuit(code, suit)
  }

  resolveWerewolfTrumpSwap(suit: Suit | null) {
    const state = this.store.gameState()

    if (
      !state?.pendingDecision ||
      state.pendingDecision.type !== 'werewolfTrumpSwap'
    ) {
      return
    }

    this.facade.resolveWerewolfTrumpSwap(state.lobbyCode, suit)
  }

  resolveShapeShifter(mode: 'wizard' | 'jester') {
    const state = this.store.gameState()

    if (
      !state?.pendingDecision ||
      state.pendingDecision.type !== 'shapeShifterChoice'
    ) {
      return
    }

    this.facade.resolveShapeShifter(
      state.lobbyCode,
      state.pendingDecision.cardId ?? '',
      mode,
    )
  }

  resolveCloudSuit(suit: Suit) {
    const state = this.store.gameState()

    if (
      !state?.pendingDecision ||
      state.pendingDecision.type !== 'cloudSuitChoice'
    ) {
      return
    }

    this.facade.resolveCloud(
      state.lobbyCode,
      state.pendingDecision.cardId ?? '',
      suit,
    )
  }

  resolveCloudAdjustment(delta: 1 | -1) {
    const state = this.store.gameState()

    if (
      !state?.pendingDecision ||
      state.pendingDecision.type !== 'cloudPredictionAdjustment'
    ) {
      return
    }

    this.facade.resolveCloudAdjustment(state.lobbyCode, delta)
  }

  resolveJugglerSuit(suit: Suit) {
    const state = this.store.gameState()

    if (
      !state?.pendingDecision ||
      state.pendingDecision.type !== 'jugglerSuitChoice'
    ) {
      return
    }

    this.facade.resolveJuggler(
      state.lobbyCode,
      state.pendingDecision.cardId ?? '',
      suit,
    )
  }

  toggleAudio(enabled: boolean) {
    const state = this.store.gameState()

    if (!state) {
      return
    }

    this.facade.setAudioEnabled(state.lobbyCode, enabled)
  }

  endLobby() {
    const state = this.store.gameState()

    if (!state) {
      return
    }

    this.facade.endLobby(state.lobbyCode)
  }
}
