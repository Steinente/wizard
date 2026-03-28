import { Injectable } from '@angular/core'
import type { Suit } from '@wizard/shared'
import { GameFacadeService } from '../../../core/services/game-facade.service'
import { AppStore } from '../../../core/state/app.store'

@Injectable()
export class GamePageActionsService {
  constructor(
    private readonly store: AppStore,
    private readonly facade: GameFacadeService,
  ) {}

  setAudioVolume(volume: number) {
    this.facade.setSpeechVolume(volume)
  }

  setAudioSpeed(speed: number) {
    this.facade.setSpeechRate(speed)
  }

  playCard(code: string, cardId: string) {
    this.facade.playCard(code, cardId)
  }

  selectJugglerPassCard(code: string, cardId: string) {
    this.facade.selectJugglerPassCard(code, cardId)
  }

  predict(value: number) {
    const code = this.store.gameState()?.lobbyCode

    if (!code) {
      return
    }

    this.facade.makePrediction(code, value)
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

  resolveWitch(payload: { handCardId: string; trickCardId: string }) {
    const state = this.store.gameState()

    if (
      !state?.pendingDecision ||
      state.pendingDecision.type !== 'witchExchange'
    ) {
      return
    }

    this.facade.resolveWitch(state.lobbyCode, payload)
  }

  resolveDarkEyeChoice(selectedCardId: string) {
    const state = this.store.gameState()

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

  setSpectatorChatAllowed(enabled: boolean, isHost: boolean) {
    if (!isHost) {
      return
    }

    const code = this.store.gameState()?.lobbyCode ?? this.store.lobby()?.code

    if (!code) {
      return
    }

    this.facade.updateConfig(code, { allowSpectatorChat: enabled })
  }

  sendChatMessage(
    text: string,
    selfRole: 'host' | 'player' | 'spectator',
    spectatorChatAllowed: boolean,
  ) {
    const state = this.store.gameState()

    if (!state) {
      return
    }

    if (selfRole === 'spectator' && !spectatorChatAllowed) {
      return
    }

    const code = state.lobbyCode

    if (!code) {
      return
    }

    this.facade.sendChatMessage(code, text)
  }
}
