import { Injectable } from '@angular/core'
import { Router } from '@angular/router'
import type { GameConfig, Suit, WizardGameViewState } from '@wizard/shared'
import {
  normalizeLogParams,
} from '../../features/game/utils/log-params.util'
import { getLogTranslationKey } from '../../features/game/utils/log-label.util'
import { I18nService } from '../i18n/i18n.service'
import { AppStore } from '../state/app.store'
import { AudioAnnouncementService } from './audio-announcement.service'
import { SessionService } from './session.service'
import { SocketService } from './socket.service'

@Injectable({ providedIn: 'root' })
export class GameFacadeService {
  private lastAnnouncedLogId: string | null = null

  constructor(
    private readonly socketService: SocketService,
    private readonly store: AppStore,
    private readonly session: SessionService,
    private readonly router: Router,
    private readonly audio: AudioAnnouncementService,
    private readonly i18n: I18nService,
  ) {
    const socket = this.socketService.connect()

    socket.on('connect', () => {
      this.store.setError(null)
    })

    socket.on('lobby:created', (payload) => {
      this.store.setLobby(payload.lobby)
      this.store.setPlayerId(payload.playerId)
      this.session.setLastLobbyCode(payload.lobby.code)
      this.store.setError(null)
      this.store.setLoading(false)
      this.router.navigateByUrl(`/lobby/${payload.lobby.code}`)
    })

    socket.on('lobby:joined', (payload) => {
      this.store.setLobby(payload.lobby)
      this.store.setPlayerId(payload.playerId)
      this.session.setLastLobbyCode(payload.lobby.code)
      this.store.setError(null)
      this.store.setLoading(false)

      if (payload.lobby.status === 'running') {
        this.router.navigateByUrl(`/game/${payload.lobby.code}`)
        return
      }

      this.router.navigateByUrl(`/lobby/${payload.lobby.code}`)
    })

    socket.on('lobby:updated', (payload) => {
      const currentPlayerId = this.store.playerId()

      this.store.setLobby(payload.lobby)

      if (
        currentPlayerId &&
        !payload.lobby.players.some((player) => player.id === currentPlayerId)
      ) {
        this.session.clearLastLobbyCode()
        this.store.reset()
        this.store.setError('You were removed from the lobby')
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
      this.store.setError(payload.reason)
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
          this.session.hasAudioPreference() &&
          self.audioEnabled !== this.session.audioEnabled()
        ) {
          this.applyAudioEnabled(
            payload.state.lobbyCode,
            this.session.audioEnabled(),
            true,
          )
        } else {
          this.session.setAudioEnabled(self.audioEnabled)
        }

        if (this.session.audioEnabled()) {
          this.audio.unlock()
        }
      }

      this.announceNewLogs(payload.state)
      this.router.navigateByUrl(`/game/${payload.state.lobbyCode}`)
    })

    socket.on('game:event', (payload) => {
      this.store.setError(null)
      void payload
    })

    socket.on('error:message', (payload) => {
      const normalized = payload.message.trim().toLowerCase()

      const shouldClearLobby =
        normalized === 'lobby not found' ||
        normalized === 'reconnect failed' ||
        normalized === 'you were removed from the lobby'

      if (shouldClearLobby) {
        this.session.clearLastLobbyCode()
        this.store.reset()
        this.store.setError(payload.message)
        this.router.navigateByUrl('/')
        return
      }

      this.store.setError(payload.message)
      this.store.setLoading(false)
    })
  }

  private replaceParamsForSpeech(
    params: Record<string, string | number | boolean | null> | undefined,
    state: WizardGameViewState,
  ) {
    return normalizeLogParams(
      params,
      state.players,
      (key) => this.i18n.t(key),
      { modeBehavior: 'wizardJesterOnly' },
    )
  }

  private announceNewLogs(state: WizardGameViewState) {
    if (!this.session.audioEnabled() || !state.logs.length) {
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
        this.replaceParamsForSpeech(entry.messageParams, state),
      )

      this.audio.speak(text)
      this.lastAnnouncedLogId = entry.id
    }
  }

  createLobby(playerName: string, config?: Partial<GameConfig>) {
    this.store.setLoading(true)
    this.store.setError(null)
    this.session.setPlayerName(playerName)

    this.socketService.getSocket().emit('lobby:create', {
      playerName,
      sessionToken: this.session.sessionToken(),
      config,
    })
  }

  joinLobby(code: string, playerName: string) {
    this.store.setLoading(true)
    this.store.setError(null)
    this.session.setPlayerName(playerName)
    this.session.setLastLobbyCode(code)

    this.socketService.getSocket().emit('lobby:join', {
      code,
      playerName,
      sessionToken: this.session.sessionToken(),
    })
  }

  reconnectLobby(code: string) {
    this.store.setLoading(true)
    this.store.setError(null)

    this.socketService.getSocket().emit('lobby:reconnect', {
      code,
      sessionToken: this.session.sessionToken(),
    })
  }

  leaveLobby(code: string) {
    this.socketService.getSocket().emit('lobby:leave', {
      code,
      sessionToken: this.session.sessionToken(),
    })
  }

  updateConfig(code: string, config: Partial<GameConfig>) {
    this.socketService.getSocket().emit('lobby:updateConfig', {
      code,
      sessionToken: this.session.sessionToken(),
      config,
    })
  }

  kickPlayer(code: string, targetPlayerId: string) {
    this.socketService.getSocket().emit('lobby:kickPlayer', {
      code,
      sessionToken: this.session.sessionToken(),
      targetPlayerId,
    })
  }

  endLobby(code: string) {
    this.socketService.getSocket().emit('lobby:end', {
      code,
      sessionToken: this.session.sessionToken(),
    })
  }

  startGame(code: string) {
    this.store.setLoading(true)

    this.socketService.getSocket().emit('game:start', {
      code,
      sessionToken: this.session.sessionToken(),
    })
  }

  makePrediction(code: string, value: number) {
    this.socketService.getSocket().emit('game:makePrediction', {
      code,
      sessionToken: this.session.sessionToken(),
      value,
    })
  }

  playCard(code: string, cardId: string) {
    this.socketService.getSocket().emit('game:playCard', {
      code,
      sessionToken: this.session.sessionToken(),
      cardId,
    })
  }

  selectTrumpSuit(code: string, suit: Suit) {
    this.socketService.getSocket().emit('game:selectTrumpSuit', {
      code,
      sessionToken: this.session.sessionToken(),
      suit,
    })
  }

  resolveWerewolfTrumpSwap(code: string, suit: Suit | null) {
    this.socketService.getSocket().emit('game:resolveWerewolfTrumpSwap', {
      code,
      sessionToken: this.session.sessionToken(),
      suit,
    })
  }

  resolveShapeShifter(code: string, cardId: string, mode: 'wizard' | 'jester') {
    this.socketService.getSocket().emit('game:resolveShapeShifter', {
      code,
      sessionToken: this.session.sessionToken(),
      cardId,
      mode,
    })
  }

  resolveCloud(code: string, cardId: string, suit: Suit) {
    this.socketService.getSocket().emit('game:resolveCloud', {
      code,
      sessionToken: this.session.sessionToken(),
      cardId,
      suit,
    })
  }

  resolveCloudAdjustment(code: string, delta: 1 | -1) {
    this.socketService.getSocket().emit('game:resolveCloudAdjustment', {
      code,
      sessionToken: this.session.sessionToken(),
      delta,
    })
  }

  resolveJuggler(code: string, cardId: string, suit: Suit) {
    this.socketService.getSocket().emit('game:resolveJuggler', {
      code,
      sessionToken: this.session.sessionToken(),
      cardId,
      suit,
    })
  }

  selectJugglerPassCard(code: string, cardId: string) {
    this.socketService.getSocket().emit('game:selectJugglerPassCard', {
      code,
      sessionToken: this.session.sessionToken(),
      cardId,
    })
  }

  setAudioEnabled(code: string, enabled: boolean) {
    this.applyAudioEnabled(code, enabled, false)
  }

  private applyAudioEnabled(code: string, enabled: boolean, silent: boolean) {
    this.session.setAudioEnabled(enabled)

    if (!silent && enabled) {
      const currentState = this.store.gameState()
      this.lastAnnouncedLogId = currentState?.logs.at(-1)?.id ?? null
      this.audio.unlock()
      this.audio.speak(this.i18n.t('audioEnabled'))
    } else if (!silent) {
      this.audio.clear()
    }

    this.socketService.getSocket().emit('player:setAudioEnabled', {
      code,
      sessionToken: this.session.sessionToken(),
      enabled,
    })
  }
}
