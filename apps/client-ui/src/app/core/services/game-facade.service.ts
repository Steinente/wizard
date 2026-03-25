import { Injectable } from '@angular/core'
import { Router } from '@angular/router'
import type {
  ClientToServerEvents,
  GameConfig,
  Suit,
  WizardGameViewState,
} from '@wizard/shared'
import { getLogTranslationKey } from '../../features/game/utils/log-label.util'
import {
  addDerivedCardLabelForSpecialPlay,
  normalizeLogParams,
} from '../../features/game/utils/log-params.util'
import { I18nService } from '../i18n/i18n.service'
import type { TranslationKey } from '../i18n/translations'
import { AppStore } from '../state/app.store'
import { SessionService } from './session.service'
import { SocketService } from './socket.service'
import { SpeechAnnouncementService } from './speech-announcement.service'

const INTERACTION_EVENTS = [
  'game:makePrediction',
  'game:playCard',
  'game:selectTrumpSuit',
  'game:resolveWerewolfTrumpSwap',
  'game:resolveDarkEyeChoice',
  'game:resolveShapeShifter',
  'game:resolveCloud',
  'game:resolveCloudAdjustment',
  'game:resolveJuggler',
  'game:resolveWitch',
  'game:selectJugglerPassCard',
] as const

type InteractionEvent = (typeof INTERACTION_EVENTS)[number]

@Injectable({ providedIn: 'root' })
export class GameFacadeService {
  private lastAnnouncedLogId: string | null = null
  private lastLogCursorLobbyCode: string | null = null
  private lastSeenChatMessageId: string | null = null
  private lastChatCursorLobbyCode: string | null = null
  private lastInteractionPromptKey: string | null = null
  private suppressNextSelfInteractionBing = false
  private wasConnected = false

  private readonly interactionEvents = new Set<InteractionEvent>(
    INTERACTION_EVENTS,
  )

  constructor(
    private readonly socketService: SocketService,
    private readonly store: AppStore,
    private readonly session: SessionService,
    private readonly router: Router,
    private readonly audio: SpeechAnnouncementService,
    private readonly i18n: I18nService,
  ) {
    this.syncSpeechSettings()

    const socket = this.socketService.connect()

    socket.on('connect', () => {
      this.store.setError(null)
      this.listLobbies()

      const storedCode = this.session.lastLobbyCode()
      if (this.wasConnected && storedCode) {
        this.reconnectLobby(storedCode)
      }
      this.wasConnected = true
    })

    socket.on('lobby:list', (payload) => {
      this.store.setLobbyList(payload.lobbies)
    })

    socket.on('lobby:created', (payload) => {
      this.store.setLobby(payload.lobby)
      this.store.setPlayerId(payload.playerId)
      this.session.setLastLobbyCode(payload.lobby.code)
      this.session.setLobbyConfig(payload.lobby.config)
      this.store.setError(null)
      this.store.setLoading(false)
      this.router.navigateByUrl(`/lobby/${payload.lobby.code}`)
    })

    socket.on('lobby:joined', (payload) => {
      this.store.setLobby(payload.lobby)
      this.store.setPlayerId(payload.playerId)
      this.session.setLastLobbyCode(payload.lobby.code)
      this.session.setLobbyConfig(payload.lobby.config)
      this.store.setError(null)
      this.store.setLoading(false)

      if (payload.lobby.status === 'running') {
        this.router.navigateByUrl(`/game/${payload.lobby.code}`)
        return
      }

      this.router.navigateByUrl(`/lobby/${payload.lobby.code}`)
    })

    socket.on('lobby:updated', (payload) => {
      const previousPlayers = this.store.lobby()?.players ?? []
      const currentPlayerId = this.store.playerId()

      this.store.setLobby(payload.lobby)
      this.session.setLobbyConfig(payload.lobby.config)

      const newOtherPlayers = payload.lobby.players.filter(
        (p) =>
          p.id !== currentPlayerId &&
          !previousPlayers.some((prev) => prev.id === p.id),
      )
      if (newOtherPlayers.length > 0) {
        this.audio.lobbyJoinPing()
      }
      if (
        currentPlayerId &&
        !payload.lobby.players.some((player) => player.id === currentPlayerId)
      ) {
        this.session.clearLastLobbyCode()
        this.store.reset()
        this.store.setError(this.i18n.t('info.removedFromLobby'))
        this.router.navigateByUrl('/')
        return
      }

      if (payload.lobby.status === 'running') {
        this.router.navigateByUrl(`/game/${payload.lobby.code}`)
      }
    })

    socket.on('lobby:closed', (payload) => {
      this.session.clearLastLobbyCode()
      this.store.reset()
      this.store.setError(this.translateMessage(payload.reason))
      this.router.navigateByUrl('/')
    })

    socket.on('game:state', (payload) => {
      this.store.setGameState(payload.state)
      this.store.setLoading(false)

      const self = payload.state.players.find(
        (player) => player.playerId === payload.state.selfPlayerId,
      )

      if (self) {
        if (
          this.session.hasReadLogPreference() &&
          self.readLogEnabled !== this.session.readLogEnabled()
        ) {
          this.applyReadLogEnabled(
            payload.state.lobbyCode,
            this.session.readLogEnabled(),
            true,
          )
        } else {
          this.session.setReadLogEnabled(self.readLogEnabled)
        }

        if (this.session.readLogEnabled()) {
          this.audio.unlock()
        }
      }

      this.notifySelfInteraction(payload.state)

      this.announceNewLogs(payload.state)
      this.notifyIncomingChatMessage(payload.state)
      this.router.navigateByUrl(`/game/${payload.state.lobbyCode}`)
    })

    socket.on('game:event', (payload) => {
      this.store.setError(null)
      void payload
    })

    socket.on('error:message', (payload) => {
      const shouldClearLobby =
        payload.message === 'error.lobbyNotFound' ||
        payload.message === 'error.reconnectFailed' ||
        payload.message === 'info.removedFromLobby'

      if (shouldClearLobby) {
        this.session.clearLastLobbyCode()
        this.store.reset()
        this.store.setError(this.translateMessage(payload.message))
        this.router.navigateByUrl('/')
        return
      }

      this.store.setError(this.translateMessage(payload.message))
      this.store.setLoading(false)
    })
  }

  setSpeechVolume(volume: number) {
    this.session.setSpeechVolume(volume)
    this.audio.setSpeechVolume(this.session.speechVolume())
  }

  setSpeechRate(rate: number) {
    this.session.setSpeechRate(rate)
    this.audio.setSpeechRate(this.session.speechRate())
  }

  private translateMessage(message: string): string {
    return this.i18n.t(message as TranslationKey)
  }

  private syncSpeechSettings() {
    this.audio.setSpeechVolume(this.session.speechVolume())
    this.audio.setSpeechRate(this.session.speechRate())
  }

  private beginRequest(clearError = true) {
    this.store.setLoading(true)
    if (clearError) {
      this.store.setError(null)
    }
  }

  private emitWithSessionToken<
    E extends Exclude<keyof ClientToServerEvents, 'lobby:list'>,
  >(
    event: E,
    payload: Omit<Parameters<ClientToServerEvents[E]>[0], 'sessionToken'>,
  ) {
    const args = [
      {
        ...payload,
        sessionToken: this.session.sessionToken(),
      } as Parameters<ClientToServerEvents[E]>[0],
    ] as Parameters<ClientToServerEvents[E]>

    this.socketService.getSocket().emit(event, ...args)
  }

  private emitCodeScoped<
    E extends
      | 'lobby:join'
      | 'lobby:spectate'
      | 'lobby:reconnect'
      | 'lobby:leave'
      | 'lobby:updateConfig'
      | 'lobby:kickPlayer'
      | 'lobby:end'
      | 'game:start'
      | 'game:makePrediction'
      | 'game:playCard'
      | 'game:selectTrumpSuit'
      | 'game:resolveWerewolfTrumpSwap'
      | 'game:resolveDarkEyeChoice'
      | 'game:resolveShapeShifter'
      | 'game:resolveCloud'
      | 'game:resolveCloudAdjustment'
      | 'game:resolveJuggler'
      | 'game:resolveWitch'
      | 'game:selectJugglerPassCard'
      | 'game:sendChatMessage'
      | 'player:setReadLogEnabled'
      | 'player:setInGame',
  >(
    event: E,
    code: string,
    payload: Omit<
      Omit<Parameters<ClientToServerEvents[E]>[0], 'sessionToken'>,
      'code'
    >,
  ) {
    if (this.interactionEvents.has(event as InteractionEvent)) {
      this.markOwnInteractionSubmitted()
    }

    this.emitWithSessionToken(event, {
      code,
      ...payload,
    } as Omit<Parameters<ClientToServerEvents[E]>[0], 'sessionToken'>)
  }

  private replaceParamsForSpeech(
    messageKey: string,
    params: Record<string, string | number | boolean | null> | undefined,
    state: WizardGameViewState,
  ) {
    const normalized = normalizeLogParams(
      params,
      state.players,
      (key) => this.i18n.t(key),
      {
        modeBehavior: 'wizardJesterOnly',
        includeSwappedCardLabel: true,
        includeSpecial: true,
      },
    )

    return addDerivedCardLabelForSpecialPlay(messageKey, normalized, (key) =>
      this.i18n.t(key),
    )
  }

  private interactionPromptKey(state: WizardGameViewState): string | null {
    const selfId = state.selfPlayerId
    const isPlayer = state.players.some((player) => player.playerId === selfId)

    if (!isPlayer) {
      return null
    }

    const pendingDecision = state.pendingDecision

    if (
      pendingDecision?.type === 'jugglerPassCard' &&
      pendingDecision.remainingPlayerIds.includes(selfId)
    ) {
      return `decision:${pendingDecision.id}:${selfId}`
    }

    if (pendingDecision?.playerId === selfId) {
      return `decision:${pendingDecision.id}`
    }

    const round = state.currentRound

    if (!round) {
      return null
    }

    if (state.phase === 'prediction' && round.activePlayerId === selfId) {
      return `prediction:${round.roundNumber}:${selfId}`
    }

    if (
      state.phase === 'playing' &&
      !pendingDecision &&
      round.activePlayerId === selfId
    ) {
      return `playing:${round.roundNumber}:${round.completedTricks.length}:${round.currentTrick?.plays.length ?? 0}:${selfId}`
    }

    return null
  }

  private notifySelfInteraction(state: WizardGameViewState) {
    const nextKey = this.interactionPromptKey(state)

    if (!nextKey) {
      this.lastInteractionPromptKey = null
      this.suppressNextSelfInteractionBing = false
      return
    }

    if (this.lastInteractionPromptKey === nextKey) {
      return
    }

    this.lastInteractionPromptKey = nextKey

    if (this.suppressNextSelfInteractionBing) {
      this.suppressNextSelfInteractionBing = false
      return
    }

    if (this.session.bingEnabled()) {
      this.audio.turnPing()
    }
  }

  private markOwnInteractionSubmitted() {
    this.suppressNextSelfInteractionBing = true
  }

  private announceNewLogs(state: WizardGameViewState) {
    if (!this.session.readLogEnabled() || !state.logs.length) {
      return
    }

    const isFirstStateForLobby = this.lastLogCursorLobbyCode !== state.lobbyCode

    if (isFirstStateForLobby) {
      // Baseline existing entries on first load/reload for this lobby.
      // Only logs arriving after this point should be announced.
      this.lastLogCursorLobbyCode = state.lobbyCode
      this.lastAnnouncedLogId = state.logs.at(-1)?.id ?? null
      return
    }

    let startIndex = 0

    if (this.lastAnnouncedLogId) {
      const index = state.logs.findIndex(
        (entry) => entry.id === this.lastAnnouncedLogId,
      )

      // If the previous id disappeared (e.g. state/log reset), restart from
      // current logs instead of skipping forever.
      if (index >= 0) {
        startIndex = index + 1
      } else {
        this.lastAnnouncedLogId = null
        startIndex = 0
      }
    }

    const unseen = state.logs.slice(startIndex)

    for (const entry of unseen) {
      const translationKey = getLogTranslationKey(entry.messageKey)

      if (!translationKey) {
        continue
      }

      const text = this.i18n.format(
        translationKey,
        this.replaceParamsForSpeech(
          entry.messageKey,
          entry.messageParams,
          state,
        ),
      )

      this.audio.speak(text)
      this.lastAnnouncedLogId = entry.id
    }
  }

  createLobby(
    playerName: string,
    config?: Partial<GameConfig>,
    password?: string,
  ) {
    this.beginRequest()
    this.session.setPlayerName(playerName)

    const resolvedConfig = config ?? this.session.lobbyConfig() ?? undefined

    this.emitWithSessionToken('lobby:create', {
      playerName,
      password,
      config: resolvedConfig,
    })
  }

  joinLobby(code: string, playerName: string, password?: string) {
    this.beginRequest()
    this.session.setPlayerName(playerName)
    this.session.setLastLobbyCode(code)

    this.emitCodeScoped('lobby:join', code, {
      playerName,
      password,
    })
  }

  spectateLobby(code: string, playerName: string, password?: string) {
    this.beginRequest()
    this.session.setPlayerName(playerName)
    this.session.setLastLobbyCode(code)

    this.emitCodeScoped('lobby:spectate', code, {
      playerName,
      password,
    })
  }

  listLobbies() {
    this.socketService.getSocket().emit('lobby:list')
  }

  reconnectLobby(code: string) {
    this.beginRequest()
    this.emitCodeScoped('lobby:reconnect', code, {})
  }

  leaveLobby(code: string) {
    this.emitCodeScoped('lobby:leave', code, {})
  }

  updateConfig(code: string, config: Partial<GameConfig>) {
    this.session.mergeLobbyConfig(config)
    this.store.mergeLobbyConfig(config)

    this.emitCodeScoped('lobby:updateConfig', code, {
      config,
    })
  }

  kickPlayer(code: string, targetPlayerId: string) {
    this.emitCodeScoped('lobby:kickPlayer', code, {
      targetPlayerId,
    })
  }

  endLobby(code: string) {
    this.emitCodeScoped('lobby:end', code, {})
  }

  startGame(code: string) {
    this.beginRequest(false)
    this.emitCodeScoped('game:start', code, {})
  }

  makePrediction(code: string, value: number) {
    this.emitCodeScoped('game:makePrediction', code, {
      value,
    })
  }

  playCard(code: string, cardId: string) {
    this.emitCodeScoped('game:playCard', code, {
      cardId,
    })
  }

  selectTrumpSuit(code: string, suit: Suit | null) {
    this.emitCodeScoped('game:selectTrumpSuit', code, {
      suit,
    })
  }

  resolveWerewolfTrumpSwap(code: string, suit: Suit | null) {
    this.emitCodeScoped('game:resolveWerewolfTrumpSwap', code, {
      suit,
    })
  }

  resolveDarkEyeChoice(code: string, selectedCardId: string) {
    this.emitCodeScoped('game:resolveDarkEyeChoice', code, {
      selectedCardId,
    })
  }

  resolveShapeShifter(code: string, cardId: string, mode: 'wizard' | 'jester') {
    this.emitCodeScoped('game:resolveShapeShifter', code, {
      cardId,
      mode,
    })
  }

  resolveCloud(code: string, cardId: string, suit: Suit) {
    this.emitCodeScoped('game:resolveCloud', code, {
      cardId,
      suit,
    })
  }

  resolveCloudAdjustment(code: string, delta: 1 | -1) {
    this.emitCodeScoped('game:resolveCloudAdjustment', code, {
      delta,
    })
  }

  resolveJuggler(code: string, cardId: string, suit: Suit) {
    this.emitCodeScoped('game:resolveJuggler', code, {
      cardId,
      suit,
    })
  }

  resolveWitch(
    code: string,
    payload: {
      handCardId: string
      trickCardId: string
    },
  ) {
    this.emitCodeScoped('game:resolveWitch', code, payload)
  }

  selectJugglerPassCard(code: string, cardId: string) {
    this.emitCodeScoped('game:selectJugglerPassCard', code, {
      cardId,
    })
  }

  sendChatMessage(code: string, text: string) {
    this.emitCodeScoped('game:sendChatMessage', code, {
      text,
    })
  }

  setReadLogEnabled(code: string, enabled: boolean) {
    this.applyReadLogEnabled(code, enabled, false)
  }

  setInGame(code: string, inGame: boolean) {
    this.emitCodeScoped('player:setInGame', code, {
      inGame,
    })
  }

  clearReconnectLobbyCode() {
    this.session.clearLastLobbyCode()
  }

  private applyReadLogEnabled(code: string, enabled: boolean, silent: boolean) {
    this.session.setReadLogEnabled(enabled)

    if (!silent && enabled) {
      const currentState = this.store.gameState()
      this.lastAnnouncedLogId = currentState?.logs.at(-1)?.id ?? null
      this.audio.unlock()
      this.audio.speak(this.i18n.t('readLogEnabled'))
    } else if (!silent) {
      this.audio.clear()
    }

    this.emitCodeScoped('player:setReadLogEnabled', code, {
      enabled,
    })
  }

  private notifyIncomingChatMessage(state: WizardGameViewState) {
    if (!state.chatMessages.length) {
      return
    }

    const isFirstStateForLobby =
      this.lastChatCursorLobbyCode !== state.lobbyCode

    if (isFirstStateForLobby) {
      this.lastChatCursorLobbyCode = state.lobbyCode
      this.lastSeenChatMessageId = state.chatMessages.at(-1)?.id ?? null
      return
    }

    let startIndex = 0

    if (this.lastSeenChatMessageId) {
      const index = state.chatMessages.findIndex(
        (entry) => entry.id === this.lastSeenChatMessageId,
      )

      if (index >= 0) {
        startIndex = index + 1
      }
    }

    const unseen = state.chatMessages.slice(startIndex)

    for (const entry of unseen) {
      if (
        entry.senderPlayerId !== state.selfPlayerId &&
        this.session.chatSoundEnabled()
      ) {
        this.audio.chatPing()
      }
      this.lastSeenChatMessageId = entry.id
    }
  }
}
