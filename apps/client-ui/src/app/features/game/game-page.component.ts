import { Component, computed, effect, signal } from '@angular/core'
import {
  getAllowedPredictionValues,
  isLegalPlay,
  SUITS,
  type Card,
  type Suit,
} from '@wizard/shared'
import { GameFacadeService } from '../../core/services/game-facade.service'
import { SessionService } from '../../core/services/session.service'
import { SpeechAnnouncementService } from '../../core/services/speech-announcement.service'
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

const SPECIAL_SORT_PRIORITY: Record<string, number> = {
  dragon: 90,
  shapeShifter: 80,
  wizard: 70,
  werewolf: 60,
  cloud: 50,
  juggler: 40,
  bomb: 30,
  jester: 20,
  fairy: 10,
}

const SUIT_SORT_PRIORITY = [...SUITS].reverse().reduce(
  (priority, suit, index) => {
    priority[suit] = SUITS.length - index
    return priority
  },
  {} as Record<Suit, number>,
)

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
              [audioEnabled]="readLogEnabledSignal()"
              [audioVolume]="speechVolumeSignal()"
              [audioSpeed]="speechSpeedSignal()"
              [bingEnabled]="bingEnabledSignal()"
              [isHost]="isHost()"
              [onToggleAudio]="toggleReadLogFn"
              [onBingToggle]="toggleBingFn"
              [onAudioVolumeChange]="setSpeechVolumeFn"
              [onAudioSpeedChange]="setSpeechSpeedFn"
              [onEndLobby]="endLobbyFn"
            />
          </div>

          <div class="game-column">
            <wiz-trick-area
              [trick]="store.gameState()!.currentRound?.currentTrick ?? null"
              [players]="store.gameState()!.players"
              [resolvedCardEffects]="store.gameState()!.resolvedCardEffects"
            />

            @if (!isSpectator()) {
              @if (myPendingDecision()) {
                <wiz-pending-decision-panel
                  class="active-turn"
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
                  class="active-turn"
                  [values]="predictionOptions()"
                  [submit]="predictFn"
                />
              }

              <wiz-hand-area
                [class.active-turn]="isMyTurnToPlay()"
                [cards]="displayHand()"
                [canPlay]="canPlayCardFn"
                [play]="playCardFn"
                [onSort]="sortHandFn"
                [onReorder]="reorderHandFn"
              />
            } @else {
              <div class="panel">
                <span class="muted">{{ 'spectatorMode' | t }}</span>
              </div>
            }
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
  private readonly handSortEnabled = signal(false)
  private readonly manualHandOrder = signal<string[] | null>(null)
  private lastSeenRoundKey: string | null = null

  private readonly readLogEnabledFromServer = computed(() => {
    const state = this.store.gameState()
    const selfId = state?.selfPlayerId

    return (
      state?.players.find((player) => player.playerId === selfId)
        ?.readLogEnabled ?? false
    )
  })

  readonly readLogEnabledSignal = computed(() =>
    this.readLogEnabledFromServer(),
  )
  readonly speechVolumeSignal = computed(() => this.session.speechVolume())
  readonly speechSpeedSignal = computed(() => this.session.speechRate())
  readonly bingEnabledSignal = computed(() => this.session.bingEnabled())

  readonly playCardFn = (card: Card) => this.playCard(card)
  readonly canPlayCardFn = (card: Card) => this.canPlayCard(card)
  readonly predictFn = (value: number) => this.predict(value)
  readonly selectTrumpFn = (suit: Suit | null) => this.selectTrump(suit)
  readonly resolveWerewolfTrumpSwapFn = (suit: Suit | null) =>
    this.resolveWerewolfTrumpSwap(suit)
  readonly resolveShapeShifterFn = (mode: 'wizard' | 'jester') =>
    this.resolveShapeShifter(mode)
  readonly resolveCloudSuitFn = (suit: Suit) => this.resolveCloudSuit(suit)
  readonly resolveCloudAdjustmentFn = (delta: 1 | -1) =>
    this.resolveCloudAdjustment(delta)
  readonly resolveJugglerSuitFn = (suit: Suit) => this.resolveJugglerSuit(suit)
  readonly toggleReadLogFn = (enabled: boolean) => this.toggleAudio(enabled)
  readonly toggleBingFn = (enabled: boolean) =>
    this.session.setBingEnabled(enabled)
  readonly sortHandFn = () => this.sortHand()
  readonly reorderHandFn = (draggedCardId: string, targetCardId: string) =>
    this.reorderHand(draggedCardId, targetCardId)
  readonly setSpeechVolumeFn = (volume: number) => this.setAudioVolume(volume)
  readonly setSpeechSpeedFn = (speed: number) => this.setAudioSpeed(speed)
  readonly endLobbyFn = () => this.endLobby()

  constructor(
    private readonly appStore: AppStore,
    private readonly facade: GameFacadeService,
    protected readonly session: SessionService,
    private readonly audio: SpeechAnnouncementService,
  ) {
    this.audio.setSpeechVolume(this.session.speechVolume())
    this.audio.setSpeechRate(this.session.speechRate())

    effect(() => {
      const state = this.store.gameState()
      const roundNumber = state?.currentRound?.roundNumber ?? null
      const lobbyCode = state?.lobbyCode ?? null

      if (!lobbyCode || roundNumber === null) {
        this.lastSeenRoundKey = null
        return
      }

      const currentRoundKey = `${lobbyCode}:${roundNumber}`

      if (this.lastSeenRoundKey === null) {
        this.lastSeenRoundKey = currentRoundKey
        return
      }

      if (this.lastSeenRoundKey !== currentRoundKey) {
        this.handSortEnabled.set(false)
        this.manualHandOrder.set(null)
        this.lastSeenRoundKey = currentRoundKey
      }
    })
  }

  setAudioVolume(volume: number) {
    this.session.setSpeechVolume(volume)
    this.audio.setSpeechVolume(this.session.speechVolume())
  }

  setAudioSpeed(speed: number) {
    this.session.setSpeechRate(speed)
    this.audio.setSpeechRate(this.session.speechRate())
  }

  isHost() {
    const state = this.store.gameState()

    return !!state?.players.find(
      (entry) => entry.playerId === state.selfPlayerId && entry.isHost,
    )
  }

  isSpectator() {
    const state = this.store.gameState()

    if (!state) return false
    return !state.players.some((p) => p.playerId === state.selfPlayerId)
  }

  myHand() {
    const state = this.store.gameState()
    const selfId = state?.selfPlayerId

    return (
      state?.currentRound?.players.find((player) => player.playerId === selfId)
        ?.hand ?? []
    )
  }

  displayHand() {
    const hand = this.myHand()
    const manualOrder = this.manualHandOrder()

    if (manualOrder?.length) {
      const orderIndex = new Map(
        manualOrder.map((cardId, index) => [cardId, index] as const),
      )

      return [...hand].sort((left, right) => {
        const leftIndex = orderIndex.get(left.id) ?? Number.MAX_SAFE_INTEGER
        const rightIndex = orderIndex.get(right.id) ?? Number.MAX_SAFE_INTEGER

        return leftIndex - rightIndex
      })
    }

    if (!this.handSortEnabled()) {
      return hand
    }

    const trumpSuit = this.store.gameState()?.currentRound?.trumpSuit ?? null

    return [...hand].sort((left, right) =>
      this.compareCardsForHandSort(left, right, trumpSuit),
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

  isMyTurnToPlay() {
    return this.myHand().some((card) => this.canPlayCard(card))
  }

  predictionOptions() {
    const state = this.store.gameState()
    const round = state?.currentRound

    if (!state || !round) {
      return []
    }

    return getAllowedPredictionValues({
      config: state.config,
      predictions: round.players.map((player) => player.prediction),
      trickCount: round.roundNumber,
    })
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

  selectTrump(suit: Suit | null) {
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

    this.facade.setReadLogEnabled(state.lobbyCode, enabled)
  }

  endLobby() {
    const state = this.store.gameState()

    if (!state) {
      return
    }

    this.facade.endLobby(state.lobbyCode)
  }

  sortHand() {
    this.manualHandOrder.set(null)
    this.handSortEnabled.set(true)
  }

  reorderHand(draggedCardId: string, targetCardId: string) {
    const hand = this.displayHand()
    const draggedIndex = hand.findIndex((card) => card.id === draggedCardId)
    const targetIndex = hand.findIndex((card) => card.id === targetCardId)

    if (draggedIndex < 0 || targetIndex < 0 || draggedIndex === targetIndex) {
      return
    }

    const reordered = [...hand]
    const [draggedCard] = reordered.splice(draggedIndex, 1)

    if (!draggedCard) {
      return
    }

    reordered.splice(targetIndex, 0, draggedCard)

    this.handSortEnabled.set(false)
    this.manualHandOrder.set(reordered.map((card) => card.id))
  }

  private compareCardsForHandSort(
    left: Card,
    right: Card,
    trumpSuit: Suit | null,
  ) {
    const leftIsNumber = left.type === 'number'
    const rightIsNumber = right.type === 'number'

    if (leftIsNumber !== rightIsNumber) {
      return leftIsNumber ? 1 : -1
    }

    if (!leftIsNumber && !rightIsNumber) {
      return this.specialSortPriority(right) - this.specialSortPriority(left)
    }

    if (left.type !== 'number' || right.type !== 'number') {
      return 0
    }

    const leftSuitPriority = this.numberSuitPriority(left.suit, trumpSuit)
    const rightSuitPriority = this.numberSuitPriority(right.suit, trumpSuit)

    if (leftSuitPriority !== rightSuitPriority) {
      return rightSuitPriority - leftSuitPriority
    }

    return right.value - left.value
  }

  private specialSortPriority(card: Exclude<Card, { type: 'number' }>) {
    if (card.type === 'wizard') {
      return SPECIAL_SORT_PRIORITY.wizard
    }

    if (card.type === 'jester') {
      return SPECIAL_SORT_PRIORITY.jester
    }

    return SPECIAL_SORT_PRIORITY[card.special] ?? 0
  }

  private numberSuitPriority(suit: Suit, trumpSuit: Suit | null) {
    if (suit === trumpSuit) {
      return 100
    }

    return SUIT_SORT_PRIORITY[suit]
  }
}
