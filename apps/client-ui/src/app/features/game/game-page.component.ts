import { Component, computed, effect, signal } from '@angular/core'
import {
  getAllowedPredictionValues,
  isLegalPlay,
  type Card,
  type Suit,
} from '@wizard/shared'
import { CardPlayAnimationService } from './card-play-animation.service'
import { GameFacadeService } from '../../core/services/game-facade.service'
import { PwaInstallService } from '../../core/services/pwa-install.service'
import {
  SessionService,
  type ScoreboardA11yRoundScope,
} from '../../core/services/session.service'
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
import { CardComponent } from '../../shared/components/card.component'
import {
  applyManualHandOrder,
  reorderHandCards,
  sortHandCards,
} from './utils/hand-sort.util'
import {
  isPointInsideRect,
  resolveTrickGridElement,
  type PendingCardPlayAnimation,
} from './utils/card-play-animation.util'
import {
  canPlayerPredict,
  getOwnPendingDecision,
} from './utils/game-state-selectors.util'

@Component({
  standalone: true,
  imports: [
    TPipe,
    CardComponent,
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
  templateUrl: './game-page.component.html',
  styleUrl: './game-page.component.css',
  providers: [CardPlayAnimationService],
})
export class GamePageComponent {
  protected readonly store = this.appStore
  private readonly manualHandOrder = signal<string[] | null>(null)
  private readonly interactionFieldLockedSignal = signal(false)
  private readonly draggedPlayCardSignal =
    signal<PendingCardPlayAnimation | null>(null)
  private readonly trickDropPreviewActiveSignal = signal(false)
  private lastSeenRoundKey: string | null = null
  private lastFinishedGamePromptKey: string | null = null
  private pendingFinishedGamePromptKey: string | null = null
  private interactionGuardTimeoutId: ReturnType<typeof setTimeout> | null = null
  readonly gameState = computed(() => this.store.gameState())
  readonly selfPlayer = computed(() => {
    const state = this.gameState()

    if (!state) {
      return null
    }

    return (
      state.players.find((player) => player.playerId === state.selfPlayerId) ??
      null
    )
  })
  readonly currentRoundPlayer = computed(() => {
    const state = this.gameState()

    if (!state) {
      return null
    }

    return (
      state.currentRound?.players.find(
        (player) => player.playerId === state.selfPlayerId,
      ) ?? null
    )
  })
  readonly isSpectatorSignal = computed(() => {
    const state = this.gameState()

    if (!state) {
      return false
    }

    return this.selfPlayer() === null
  })
  readonly isHostSignal = computed(() => this.selfPlayer()?.isHost ?? false)
  readonly selfRoleSignal = computed<'host' | 'player' | 'spectator'>(() => {
    const selfPlayer = this.selfPlayer()

    if (!selfPlayer) {
      return this.gameState() ? 'spectator' : 'player'
    }

    return selfPlayer.isHost ? 'host' : 'player'
  })
  readonly spectatorChatAllowedSignal = computed(
    () =>
      this.store.lobby()?.config.allowSpectatorChat ??
      this.gameState()?.config.allowSpectatorChat ??
      true,
  )

  readonly readLogEnabledSignal = computed(() => {
    return this.selfPlayer()?.readLogEnabled ?? false
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
  readonly scoreboardA11yRoundScopeSignal = computed(() =>
    this.session.scoreboardA11yRoundScope(),
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
  readonly cardPlayAnimationEnabledSignal = computed(() =>
    this.animation.cardPlayAnimationEnabled(),
  )
  readonly playedCardAnimation = computed(() =>
    this.animation.playedCardAnimation(),
  )
  readonly trickDropPreviewCard = computed(() =>
    this.trickDropPreviewActiveSignal()
      ? (this.draggedPlayCardSignal()?.card ?? null)
      : null,
  )
  readonly trickDragActiveSignal = computed(
    () => this.draggedPlayCardSignal() !== null,
  )
  readonly selfPlayerNameSignal = computed(
    () => this.selfPlayer()?.name ?? null,
  )
  readonly interactionFieldLocked = computed(() =>
    this.interactionFieldLockedSignal(),
  )
  readonly interactionAvailabilityKey = computed(() => {
    const state = this.gameState()

    if (!state || this.isSpectatorSignal()) {
      return 'none'
    }

    const pendingDecision = this.myPendingDecision()
    if (pendingDecision) {
      return `decision:${pendingDecision.id}`
    }

    const roundNumber = state.currentRound?.roundNumber ?? 0

    if (this.canPredict()) {
      return `predict:${state.lobbyCode}:${roundNumber}:${state.selfPlayerId}`
    }

    if (this.isMyTurnToPlay()) {
      const trickPlayCount = state.currentRound?.currentTrick?.plays.length ?? 0
      return `play:${state.lobbyCode}:${roundNumber}:${trickPlayCount}:${state.selfPlayerId}`
    }

    return 'none'
  })

  readonly playCardFn = (card: Card) => this.playCard(card)
  readonly playCardWithSourceFn = (payload: {
    card: Card
    sourceRect: DOMRect | null
  }) => this.playCardWithSource(payload)
  readonly startPlayDragFn = (payload: { card: Card; sourceRect: DOMRect }) =>
    this.startPlayDrag(payload)
  readonly endPlayDragFn = () => this.endPlayDrag()
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
  readonly resolveWitchFn = (payload: {
    handCardId: string
    trickCardId: string
  }) => this.resolveWitch(payload)
  readonly resolveDarkEyeChoiceFn = (selectedCardId: string) =>
    this.resolveDarkEyeChoice(selectedCardId)
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
  readonly setScoreboardA11yRoundScopeFn = (v: ScoreboardA11yRoundScope) =>
    this.session.setScoreboardA11yRoundScope(v)
  readonly setCardArtworkEnabledFn = (v: boolean) =>
    this.session.setCardArtworkEnabled(v)
  readonly setHandSortEnabledFn = (v: boolean) => this.setHandSortEnabled(v)
  readonly setCardPlayAnimationEnabledFn = (v: boolean) =>
    this.session.setCardPlayAnimationEnabled(v)
  readonly setSpectatorChatAllowedFn = (enabled: boolean) =>
    this.setSpectatorChatAllowed(enabled)
  readonly sendChatMessageFn = (text: string) => this.sendChatMessage(text)

  constructor(
    private readonly appStore: AppStore,
    private readonly facade: GameFacadeService,
    protected readonly session: SessionService,
    private readonly pwaInstall: PwaInstallService,
    readonly animation: CardPlayAnimationService,
  ) {
    effect(() => {
      const state = this.gameState()
      const roundNumber = state?.currentRound?.roundNumber ?? null
      const lobbyCode = state?.lobbyCode ?? null

      if (!lobbyCode || roundNumber === null) {
        this.lastSeenRoundKey = null
        this.animation.resetRoundState()
        this.draggedPlayCardSignal.set(null)
        this.trickDropPreviewActiveSignal.set(false)
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
        this.animation.resetRoundState()
        this.draggedPlayCardSignal.set(null)
        this.trickDropPreviewActiveSignal.set(false)
      }
    })

    effect(() => {
      const state = this.gameState()

      if (!state || state.phase !== 'finished') {
        this.pendingFinishedGamePromptKey = null
        return
      }

      const finishedGameKey = `${state.lobbyCode}:${state.createdAt}`

      if (this.lastFinishedGamePromptKey === finishedGameKey) {
        return
      }

      this.lastFinishedGamePromptKey = finishedGameKey
      this.pendingFinishedGamePromptKey = finishedGameKey
    })

    effect((onCleanup) => {
      const interactionKey = this.interactionAvailabilityKey()

      if (
        interactionKey === 'none' ||
        !this.shouldUseMobileInteractionGuard()
      ) {
        this.interactionFieldLockedSignal.set(false)
        return
      }

      this.interactionFieldLockedSignal.set(true)

      if (this.interactionGuardTimeoutId) {
        clearTimeout(this.interactionGuardTimeoutId)
      }

      const timeoutId = setTimeout(() => {
        if (this.interactionGuardTimeoutId === timeoutId) {
          this.interactionFieldLockedSignal.set(false)
          this.interactionGuardTimeoutId = null
        }
      }, 200)

      this.interactionGuardTimeoutId = timeoutId

      onCleanup(() => {
        clearTimeout(timeoutId)
      })
    })
  }

  onHomeButtonUserGesture() {
    const state = this.gameState()
    if (!state || state.phase !== 'finished') {
      return
    }

    const finishedGameKey = `${state.lobbyCode}:${state.createdAt}`
    if (this.pendingFinishedGamePromptKey !== finishedGameKey) {
      return
    }

    this.pendingFinishedGamePromptKey = null
    void this.pwaInstall.promptIfEligible()
  }

  setAudioVolume(volume: number) {
    this.facade.setSpeechVolume(volume)
  }

  setAudioSpeed(speed: number) {
    this.facade.setSpeechRate(speed)
  }

  myHand() {
    return this.currentRoundPlayer()?.hand ?? []
  }

  myTricksWon() {
    return this.currentRoundPlayer()?.tricksWon ?? 0
  }

  displayHand() {
    const hand = this.myHand()
    const manualOrder = this.manualHandOrder()

    if (manualOrder?.length) {
      return applyManualHandOrder(hand, manualOrder)
    }

    if (!this.handSortEnabledSignal()) {
      return hand
    }

    const trumpSuit = this.gameState()?.currentRound?.trumpSuit ?? null

    return sortHandCards(hand, trumpSuit)
  }

  myPendingDecision() {
    return getOwnPendingDecision(this.gameState())
  }

  foreignPendingDecisionText() {
    const state = this.gameState()
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
    const state = this.gameState()
    return canPlayerPredict(state, state?.selfPlayerId ?? '')
  }

  isMyTurnToPlay() {
    return this.myHand().some((card) => this.canPlayCard(card))
  }

  predictionOptions() {
    const state = this.gameState()
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
    const code = this.gameState()?.lobbyCode

    if (!code) {
      return
    }

    this.facade.makePrediction(code, value)
  }

  canPlayCard(card: Card) {
    const state = this.gameState()

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
    const state = this.gameState()

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

  playCardWithSource(payload: { card: Card; sourceRect: DOMRect | null }) {
    if (this.animation.cardPlayAnimationEnabled() && payload.sourceRect) {
      this.animation.setPendingAnimation(payload.card, payload.sourceRect)
    }

    this.playCard(payload.card)
  }

  startPlayDrag(payload: { card: Card; sourceRect: DOMRect }) {
    if (!this.canPlayCard(payload.card)) {
      this.draggedPlayCardSignal.set(null)
      this.trickDropPreviewActiveSignal.set(false)
      return
    }

    this.draggedPlayCardSignal.set(payload)
  }

  endPlayDrag() {
    this.draggedPlayCardSignal.set(null)
    this.trickDropPreviewActiveSignal.set(false)
  }

  onTrickDragOver(event: DragEvent) {
    const draggedPlayCard = this.draggedPlayCardSignal()

    if (!draggedPlayCard) {
      return
    }

    const trickGrid = resolveTrickGridElement()

    if (!trickGrid) {
      this.trickDropPreviewActiveSignal.set(false)
      return
    }

    const clientX = event.clientX
    const clientY = event.clientY
    const isOverGrid = isPointInsideRect(
      clientX,
      clientY,
      trickGrid.getBoundingClientRect(),
    )

    if (!isOverGrid || !this.canPlayCard(draggedPlayCard.card)) {
      this.trickDropPreviewActiveSignal.set(false)
      return
    }

    event.preventDefault()

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move'
    }

    this.trickDropPreviewActiveSignal.set(true)
  }

  onTrickDragLeave() {
    this.trickDropPreviewActiveSignal.set(false)
  }

  onTrickDrop(event: DragEvent) {
    const draggedPlayCard = this.draggedPlayCardSignal()

    if (!draggedPlayCard || !this.trickDropPreviewActiveSignal()) {
      return
    }

    event.preventDefault()
    this.trickDropPreviewActiveSignal.set(false)
    this.draggedPlayCardSignal.set(null)
    this.playCardWithSource(draggedPlayCard)
  }

  selectTrump(suit: Suit | null) {
    const code = this.gameState()?.lobbyCode

    if (!code) {
      return
    }

    this.facade.selectTrumpSuit(code, suit)
  }

  resolveWerewolfTrumpSwap(suit: Suit | null) {
    const state = this.gameState()

    if (
      !state?.pendingDecision ||
      state.pendingDecision.type !== 'werewolfTrumpSwap'
    ) {
      return
    }

    this.facade.resolveWerewolfTrumpSwap(state.lobbyCode, suit)
  }

  resolveShapeShifter(mode: 'wizard' | 'jester') {
    const state = this.gameState()

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
    const state = this.gameState()

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
    const state = this.gameState()

    if (
      !state?.pendingDecision ||
      state.pendingDecision.type !== 'cloudPredictionAdjustment'
    ) {
      return
    }

    this.facade.resolveCloudAdjustment(state.lobbyCode, delta)
  }

  shouldShowCloudAdjustmentScorePreview(): boolean {
    const state = this.gameState()

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
    return this.gameState()?.currentRound?.roundNumber ?? 0
  }

  resolveJugglerSuit(suit: Suit) {
    const state = this.gameState()

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

  resolveWitch(payload: { handCardId: string; trickCardId: string }) {
    const state = this.gameState()

    if (
      !state?.pendingDecision ||
      state.pendingDecision.type !== 'witchExchange'
    ) {
      return
    }

    this.facade.resolveWitch(state.lobbyCode, payload)
  }

  resolveDarkEyeChoice(selectedCardId: string) {
    const state = this.gameState()

    if (
      !state?.pendingDecision ||
      (state.pendingDecision.type !== 'darkEyeTrumpChoice' &&
        state.pendingDecision.type !== 'darkEyePlayChoice')
    ) {
      return
    }

    this.facade.resolveDarkEyeChoice(state.lobbyCode, selectedCardId)
  }

  toggleAudio(enabled: boolean) {
    const state = this.gameState()

    if (!state) {
      return
    }

    this.facade.setReadLogEnabled(state.lobbyCode, enabled)
  }

  endLobby() {
    const state = this.gameState()

    if (!state) {
      return
    }

    this.facade.endLobby(state.lobbyCode)
  }

  setSpectatorChatAllowed(enabled: boolean) {
    if (!this.isHostSignal()) {
      return
    }

    const code = this.gameState()?.lobbyCode ?? this.store.lobby()?.code

    if (!code) {
      return
    }

    this.facade.updateConfig(code, { allowSpectatorChat: enabled })
  }

  sendChatMessage(text: string) {
    const state = this.gameState()

    if (!state) {
      return
    }

    if (
      this.selfRoleSignal() === 'spectator' &&
      !this.spectatorChatAllowedSignal()
    ) {
      return
    }

    const code = state.lobbyCode

    if (!code) {
      return
    }

    this.facade.sendChatMessage(code, text)
  }

  sortHand() {
    this.setHandSortEnabled(!this.handSortEnabledSignal())
  }

  reorderHand(draggedCardId: string, targetCardId: string) {
    const reordered = reorderHandCards(
      this.displayHand(),
      draggedCardId,
      targetCardId,
    )

    if (!reordered) {
      return
    }

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

  private shouldUseMobileInteractionGuard() {
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
      return false
    }

    return window.matchMedia('(pointer: coarse)').matches
  }

  ngOnDestroy() {
    if (this.interactionGuardTimeoutId) {
      clearTimeout(this.interactionGuardTimeoutId)
      this.interactionGuardTimeoutId = null
    }

    this.draggedPlayCardSignal.set(null)
    this.trickDropPreviewActiveSignal.set(false)
  }
}
