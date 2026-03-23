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
import { AppStore } from '../../core/state/app.store'
import { TPipe } from '../../shared/pipes/t.pipe'
import {
  ChatPanelComponent,
  GameFinishedPanelComponent,
  GameHeaderComponent,
  GameSettingsPanelComponent,
  HandAreaComponent,
  LogPanelComponent,
  PendingDecisionPanelComponent,
  PlayerListPanelComponent,
  PredictionPanelComponent,
  ScoreboardPanelComponent,
  TrickAreaComponent,
} from './components'

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
    GameFinishedPanelComponent,
    ChatPanelComponent,
    PlayerListPanelComponent,
    TrickAreaComponent,
    HandAreaComponent,
    ScoreboardPanelComponent,
    LogPanelComponent,
    PredictionPanelComponent,
    PendingDecisionPanelComponent,
    GameSettingsPanelComponent,
  ],
  template: `
    <div class="page-shell">
      @if (!store.gameState()) {
        <div class="panel">{{ 'waitingForPlayers' | t }}</div>
      } @else {
        <div class="game-top">
          <wiz-game-header
            [state]="store.gameState()!"
            [settingsVisible]="panelSettingsVisibleSignal()"
            [playersVisible]="panelPlayersVisibleSignal()"
            [scoreboardVisible]="panelScoreboardVisibleSignal()"
            [logVisible]="panelLogVisibleSignal()"
            [chatVisible]="panelChatVisibleSignal()"
            (panelSettingsChange)="setPanelSettingsVisibleFn($event)"
            (panelPlayersChange)="setPanelPlayersVisibleFn($event)"
            (panelScoreboardChange)="setPanelScoreboardVisibleFn($event)"
            (panelLogChange)="setPanelLogVisibleFn($event)"
            (panelChatChange)="setPanelChatVisibleFn($event)"
          />
        </div>

        @if (store.gameState()!.phase === 'finished') {
          <div class="game-finished-layout">
            <wiz-game-finished-panel [state]="store.gameState()!" />

            <div class="game-column">
              <wiz-scoreboard-panel
                [state]="store.gameState()!"
                [a11yMode]="scoreboardA11yModeSignal()"
              />
              <wiz-log-panel
                [logs]="store.gameState()!.logs"
                [players]="store.gameState()!.players"
                [showTimestamp]="logShowTimestampSignal()"
              />
            </div>
          </div>

          @if (panelChatVisibleSignal()) {
            <div class="game-chat-finished" style="margin-top: 16px;">
              <wiz-chat-panel
                [messages]="store.gameState()!.chatMessages"
                [selfPlayerId]="store.gameState()!.selfPlayerId"
                [chatSoundEnabled]="chatSoundEnabledSignal()"
                (sendMessage)="sendChatMessageFn($event)"
                (chatSoundToggle)="setChatSoundEnabledFn($event)"
              />
            </div>
          }
        } @else {
          <div class="game-layout">
            @if (panelSettingsVisibleSignal()) {
              <div class="game-block game-settings-block">
                <wiz-game-settings-panel
                  [state]="store.gameState()!"
                  [audioEnabled]="readLogEnabledSignal()"
                  [audioVolume]="speechVolumeSignal()"
                  [audioSpeed]="speechSpeedSignal()"
                  [bingEnabled]="bingEnabledSignal()"
                  [chatSoundEnabled]="chatSoundEnabledSignal()"
                  [handSortEnabled]="handSortEnabledSignal()"
                  [isHost]="isHost()"
                  [showTimestamp]="logShowTimestampSignal()"
                  [scoreboardA11yMode]="scoreboardA11yModeSignal()"
                  [cardArtworkEnabled]="cardArtworkEnabledSignal()"
                  [onToggleAudio]="toggleReadLogFn"
                  [onBingToggle]="toggleBingFn"
                  [onChatSoundToggle]="setChatSoundEnabledFn"
                  [onHandSortToggle]="setHandSortEnabledFn"
                  [onAudioVolumeChange]="setSpeechVolumeFn"
                  [onAudioSpeedChange]="setSpeechSpeedFn"
                  [onEndLobby]="endLobbyFn"
                  [onShowTimestampChange]="setLogShowTimestampFn"
                  [onScoreboardA11yModeChange]="setScoreboardA11yModeFn"
                  [onCardArtworkEnabledChange]="setCardArtworkEnabledFn"
                />
              </div>
            }

            @if (panelPlayersVisibleSignal()) {
              <div class="game-block game-players-block">
                <wiz-player-list-panel [state]="store.gameState()!" />
              </div>
            }

            @if (panelScoreboardVisibleSignal()) {
              <div class="game-block game-scoreboard-block">
                <wiz-scoreboard-panel
                  [state]="store.gameState()!"
                  [a11yMode]="scoreboardA11yModeSignal()"
                />
              </div>
            }

            <div class="game-block game-trick-block">
              <wiz-trick-area
                [trick]="store.gameState()!.currentRound?.currentTrick ?? null"
                [players]="store.gameState()!.players"
                [resolvedCardEffects]="store.gameState()!.resolvedCardEffects"
                [useArtwork]="cardArtworkEnabledSignal()"
              />
            </div>

            <div class="game-block game-interaction-block">
              @if (!isSpectator()) {
                @if (myPendingDecision()) {
                  <wiz-pending-decision-panel
                    class="active-turn"
                    [decision]="myPendingDecision()"
                    [cloudAdjustmentWonTricks]="myTricksWon()"
                    [cloudAdjustmentRoundNumber]="cloudAdjustmentRoundNumber()"
                    [cloudAdjustmentShowScorePreview]="
                      shouldShowCloudAdjustmentScorePreview()
                    "
                    [onSelectTrump]="selectTrumpFn"
                    [onResolveWerewolfTrumpSwap]="resolveWerewolfTrumpSwapFn"
                    [onResolveShapeShifter]="resolveShapeShifterFn"
                    [onResolveCloudSuit]="resolveCloudSuitFn"
                    [onResolveCloudAdjustment]="resolveCloudAdjustmentFn"
                    [onResolveJugglerSuit]="resolveJugglerSuitFn"
                  />
                } @else if (foreignPendingDecisionText()) {
                  <div class="panel">
                    <span class="muted">{{
                      foreignPendingDecisionText()
                    }}</span>
                  </div>
                }

                @if (canPredict()) {
                  <wiz-prediction-panel
                    class="active-turn"
                    [values]="predictionOptions()"
                    [submit]="predictFn"
                    [trumpSuit]="
                      store.gameState()!.currentRound?.trumpSuit ?? null
                    "
                    [trumpValue]="trumpNumberValue()"
                  />
                }

                <wiz-hand-area
                  [class.active-turn]="isMyTurnToPlay()"
                  [cards]="displayHand()"
                  [canPlay]="canPlayCardFn"
                  [play]="playCardFn"
                  [useArtwork]="cardArtworkEnabledSignal()"
                  [isSortActive]="handSortEnabledSignal()"
                  [onSort]="sortHandFn"
                  [onReorder]="reorderHandFn"
                />
              } @else {
                <div class="panel">
                  <span class="muted">{{ 'spectatorMode' | t }}</span>
                </div>
              }
            </div>

            @if (panelLogVisibleSignal()) {
              <div class="game-block game-log-block">
                <wiz-log-panel
                  [logs]="store.gameState()!.logs"
                  [players]="store.gameState()!.players"
                  [showTimestamp]="logShowTimestampSignal()"
                />
              </div>
            }

            @if (panelChatVisibleSignal()) {
              <div class="game-block game-chat-block">
                <wiz-chat-panel
                  [messages]="store.gameState()!.chatMessages"
                  [selfPlayerId]="store.gameState()!.selfPlayerId"
                  [chatSoundEnabled]="chatSoundEnabledSignal()"
                  (sendMessage)="sendChatMessageFn($event)"
                  (chatSoundToggle)="setChatSoundEnabledFn($event)"
                />
              </div>
            }
          </div>
        }
      }
    </div>
  `,
  styles: [
    `
      .game-finished-layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 320px;
        gap: 16px;
        align-items: start;
        margin-top: 16px;
      }

      .game-block {
        min-width: 0;
      }

      .game-settings-block {
        grid-area: settings;
      }

      .game-players-block {
        grid-area: players;
      }

      .game-scoreboard-block {
        grid-area: scoreboard;
      }

      .game-trick-block {
        grid-area: trick;
      }

      .game-interaction-block {
        grid-area: interaction;
        display: grid;
        gap: 16px;
      }

      .game-log-block {
        grid-area: log;
      }

      .game-chat-block {
        grid-area: chat;
      }

      .game-layout {
        grid-template-columns: 320px minmax(0, 1fr) 320px;
        grid-template-areas:
          'settings trick scoreboard'
          'players interaction log'
          'chat chat chat';
      }

      @media (max-width: 1100px) {
        .game-finished-layout {
          grid-template-columns: 1fr;
        }

        .game-layout {
          grid-template-columns: 1fr;
          grid-template-areas:
            'settings'
            'scoreboard'
            'players'
            'trick'
            'interaction'
            'log'
            'chat';
        }
      }
    `,
  ],
})
export class GamePageComponent {
  protected readonly store = this.appStore
  private readonly manualHandOrder = signal<string[] | null>(null)
  private lastSeenRoundKey: string | null = null

  readonly readLogEnabledSignal = computed(() => {
    const state = this.store.gameState()
    const selfId = state?.selfPlayerId

    return (
      state?.players.find((player) => player.playerId === selfId)
        ?.readLogEnabled ?? false
    )
  })
  readonly speechVolumeSignal = computed(() => this.session.speechVolume())
  readonly speechSpeedSignal = computed(() => this.session.speechRate())
  readonly bingEnabledSignal = computed(() => this.session.bingEnabled())
  readonly panelSettingsVisibleSignal = computed(() =>
    this.session.panelSettingsVisible(),
  )
  readonly panelPlayersVisibleSignal = computed(() =>
    this.session.panelPlayersVisible(),
  )
  readonly panelScoreboardVisibleSignal = computed(() =>
    this.session.panelScoreboardVisible(),
  )
  readonly panelLogVisibleSignal = computed(() =>
    this.session.panelLogVisible(),
  )
  readonly panelChatVisibleSignal = computed(() =>
    this.session.panelChatVisible(),
  )
  readonly logShowTimestampSignal = computed(() =>
    this.session.logShowTimestamp(),
  )
  readonly scoreboardA11yModeSignal = computed(() =>
    this.session.scoreboardA11yMode(),
  )
  readonly chatSoundEnabledSignal = computed(() =>
    this.session.chatSoundEnabled(),
  )
  readonly cardArtworkEnabledSignal = computed(() =>
    this.session.cardArtworkEnabled(),
  )
  readonly handSortEnabledSignal = computed(() =>
    this.session.handSortEnabled(),
  )

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
  readonly setChatSoundEnabledFn = (enabled: boolean) =>
    this.session.setChatSoundEnabled(enabled)
  readonly sortHandFn = () => this.sortHand()
  readonly reorderHandFn = (draggedCardId: string, targetCardId: string) =>
    this.reorderHand(draggedCardId, targetCardId)
  readonly setSpeechVolumeFn = (volume: number) => this.setAudioVolume(volume)
  readonly setSpeechSpeedFn = (speed: number) => this.setAudioSpeed(speed)
  readonly endLobbyFn = () => this.endLobby()
  readonly setPanelSettingsVisibleFn = (v: boolean) =>
    this.session.setPanelSettingsVisible(v)
  readonly setPanelPlayersVisibleFn = (v: boolean) =>
    this.session.setPanelPlayersVisible(v)
  readonly setPanelScoreboardVisibleFn = (v: boolean) =>
    this.session.setPanelScoreboardVisible(v)
  readonly setPanelLogVisibleFn = (v: boolean) =>
    this.session.setPanelLogVisible(v)
  readonly setPanelChatVisibleFn = (v: boolean) =>
    this.session.setPanelChatVisible(v)
  readonly setLogShowTimestampFn = (v: boolean) =>
    this.session.setLogShowTimestamp(v)
  readonly setScoreboardA11yModeFn = (v: boolean) =>
    this.session.setScoreboardA11yMode(v)
  readonly setCardArtworkEnabledFn = (v: boolean) =>
    this.session.setCardArtworkEnabled(v)
  readonly setHandSortEnabledFn = (v: boolean) => this.setHandSortEnabled(v)
  readonly sendChatMessageFn = (text: string) => this.sendChatMessage(text)

  constructor(
    private readonly appStore: AppStore,
    private readonly facade: GameFacadeService,
    protected readonly session: SessionService,
  ) {
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
        this.manualHandOrder.set(null)
        this.lastSeenRoundKey = currentRoundKey
      }
    })
  }

  setAudioVolume(volume: number) {
    this.facade.setSpeechVolume(volume)
  }

  setAudioSpeed(speed: number) {
    this.facade.setSpeechRate(speed)
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

  myTricksWon() {
    const state = this.store.gameState()
    const selfId = state?.selfPlayerId

    return (
      state?.currentRound?.players.find((player) => player.playerId === selfId)
        ?.tricksWon ?? 0
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

    if (!this.handSortEnabledSignal()) {
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

    if (state.pendingDecision.type === 'jugglerPassCard') {
      return state.pendingDecision.remainingPlayerIds.includes(
        state.selfPlayerId,
      )
        ? state.pendingDecision
        : null
    }

    return state.pendingDecision.playerId === state.selfPlayerId
      ? state.pendingDecision
      : null
  }

  foreignPendingDecisionText() {
    const state = this.store.gameState()
    const pendingDecision = state?.pendingDecision

    if (
      !pendingDecision ||
      (pendingDecision.type !== 'jugglerPassCard' &&
        pendingDecision.playerId === state.selfPlayerId)
    ) {
      return ''
    }

    if (pendingDecision.type === 'jugglerPassCard') {
      const pendingPlayerNames = state.players
        .filter((player) =>
          pendingDecision.remainingPlayerIds.includes(player.playerId),
        )
        .map((player) => player.name)

      if (!pendingPlayerNames.length) {
        return ''
      }

      return `${pendingPlayerNames.join(', ')} wählen gerade eine Karte zum Weitergeben`
    }

    const player = state.players.find(
      (p) => p.playerId === pendingDecision.playerId,
    )

    if (!player) {
      return ''
    }

    if (pendingDecision.type === 'werewolfTrumpSwap') {
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

  trumpNumberValue(): number | null {
    const card = this.store.gameState()?.currentRound?.trumpCard

    return card?.type === 'number' ? card.value : null
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
      state.pendingDecision.remainingPlayerIds.includes(state.selfPlayerId)
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
      state.pendingDecision.remainingPlayerIds.includes(state.selfPlayerId)
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

  shouldShowCloudAdjustmentScorePreview(): boolean {
    const state = this.store.gameState()

    if (
      !state?.pendingDecision ||
      state.pendingDecision.type !== 'cloudPredictionAdjustment'
    ) {
      return true
    }

    if (state.config.cloudRuleTiming === 'endOfRound') {
      return true
    }

    const round = state.currentRound

    if (!round) {
      return true
    }

    const isLastTrickResolved =
      round.completedTricks.length >= round.roundNumber

    return isLastTrickResolved
  }

  cloudAdjustmentRoundNumber(): number {
    return this.store.gameState()?.currentRound?.roundNumber ?? 0
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

  sendChatMessage(text: string) {
    const code = this.store.gameState()?.lobbyCode

    if (!code) {
      return
    }

    this.facade.sendChatMessage(code, text)
  }

  sortHand() {
    const next = !this.handSortEnabledSignal()
    if (next) {
      this.setHandSortEnabled(true)
    } else {
      this.setHandSortEnabled(false)
    }
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

    this.setHandSortEnabled(false)
    this.manualHandOrder.set(reordered.map((card) => card.id))
  }

  private setHandSortEnabled(enabled: boolean) {
    if (enabled) {
      this.manualHandOrder.set(null)
    } else if (this.handSortEnabledSignal()) {
      const currentOrder = this.displayHand().map((card) => card.id)
      this.manualHandOrder.set(currentOrder)
    }

    this.session.setHandSortEnabled(enabled)
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
