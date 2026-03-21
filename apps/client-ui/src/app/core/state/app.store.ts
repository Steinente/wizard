import { Injectable, computed, signal } from '@angular/core'
import type {
  GameConfig,
  LobbySummary,
  WizardGameViewState,
} from '@wizard/shared'

@Injectable({ providedIn: 'root' })
export class AppStore {
  private readonly lobbySignal = signal<LobbySummary | null>(null)
  private readonly lobbyListSignal = signal<LobbySummary[]>([])
  private readonly gameStateSignal = signal<WizardGameViewState | null>(null)
  private readonly playerIdSignal = signal<string | null>(null)
  private readonly errorSignal = signal<string | null>(null)
  private readonly loadingSignal = signal(false)

  readonly lobby = computed(() => this.lobbySignal())
  readonly lobbyList = computed(() => this.lobbyListSignal())
  readonly gameState = computed(() => this.gameStateSignal())
  readonly playerId = computed(() => this.playerIdSignal())
  readonly error = computed(() => this.errorSignal())
  readonly loading = computed(() => this.loadingSignal())

  setLobby(lobby: LobbySummary | null) {
    this.lobbySignal.set(lobby)
  }

  mergeLobbyConfig(config: Partial<GameConfig>) {
    const lobby = this.lobbySignal()

    if (!lobby) {
      return
    }

    this.lobbySignal.set({
      ...lobby,
      config: {
        ...lobby.config,
        ...config,
      },
    })
  }

  setLobbyList(lobbies: LobbySummary[]) {
    this.lobbyListSignal.set(lobbies)
  }

  setGameState(state: WizardGameViewState | null) {
    this.gameStateSignal.set(state)
  }

  setPlayerId(playerId: string | null) {
    this.playerIdSignal.set(playerId)
  }

  setError(message: string | null) {
    this.errorSignal.set(message)
  }

  setLoading(loading: boolean) {
    this.loadingSignal.set(loading)
  }

  clearLobby() {
    this.lobbySignal.set(null)
    this.playerIdSignal.set(null)
  }

  clearGame() {
    this.gameStateSignal.set(null)
  }

  reset() {
    this.clearLobby()
    this.clearGame()
    this.setError(null)
    this.setLoading(false)
  }
}
