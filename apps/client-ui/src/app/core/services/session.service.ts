import { Injectable, computed, signal } from '@angular/core'
import type { GameConfig } from '@wizard/shared'
import {
  AUDIO_ENABLED_KEY,
  LAST_LOBBY_CODE_KEY,
  LOBBY_CONFIG_KEY,
  PLAYER_NAME_KEY,
  SESSION_TOKEN_KEY,
} from '../config/app.config-values'
import { LocalStorageService } from './local-storage.service'

const createSessionToken = () => crypto.randomUUID()

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly sessionTokenSignal = signal('')
  private readonly playerNameSignal = signal('')
  private readonly lastLobbyCodeSignal = signal('')
  private readonly audioEnabledSignal = signal(false)
  private readonly hasAudioPreferenceSignal = signal(false)
  private readonly lobbyConfigSignal = signal<GameConfig | null>(null)

  readonly sessionToken = computed(() => this.sessionTokenSignal())
  readonly playerName = computed(() => this.playerNameSignal())
  readonly lastLobbyCode = computed(() => this.lastLobbyCodeSignal())
  readonly audioEnabled = computed(() => this.audioEnabledSignal())
  readonly hasAudioPreference = computed(() => this.hasAudioPreferenceSignal())
  readonly lobbyConfig = computed(() => this.lobbyConfigSignal())

  constructor(private readonly storage: LocalStorageService) {
    const existingToken =
      this.storage.get(SESSION_TOKEN_KEY) ?? createSessionToken()
    this.storage.set(SESSION_TOKEN_KEY, existingToken)
    this.sessionTokenSignal.set(existingToken)

    this.playerNameSignal.set(this.storage.get(PLAYER_NAME_KEY) ?? '')
    this.lastLobbyCodeSignal.set(this.storage.get(LAST_LOBBY_CODE_KEY) ?? '')

    const storedLobbyConfig = this.storage.get(LOBBY_CONFIG_KEY)
    if (storedLobbyConfig) {
      try {
        this.lobbyConfigSignal.set(JSON.parse(storedLobbyConfig) as GameConfig)
      } catch {
        this.storage.remove(LOBBY_CONFIG_KEY)
      }
    }

    const storedAudioEnabled = this.storage.get(AUDIO_ENABLED_KEY)
    this.hasAudioPreferenceSignal.set(storedAudioEnabled !== null)
    this.audioEnabledSignal.set(storedAudioEnabled === 'true')
  }

  setPlayerName(name: string) {
    this.playerNameSignal.set(name)
    this.storage.set(PLAYER_NAME_KEY, name)
  }

  setLastLobbyCode(code: string) {
    this.lastLobbyCodeSignal.set(code)
    this.storage.set(LAST_LOBBY_CODE_KEY, code)
  }

  clearLastLobbyCode() {
    this.lastLobbyCodeSignal.set('')
    this.storage.remove(LAST_LOBBY_CODE_KEY)
  }

  setAudioEnabled(enabled: boolean) {
    this.audioEnabledSignal.set(enabled)
    this.hasAudioPreferenceSignal.set(true)
    this.storage.set(AUDIO_ENABLED_KEY, String(enabled))
  }

  setLobbyConfig(config: GameConfig) {
    this.lobbyConfigSignal.set(config)
    this.storage.set(LOBBY_CONFIG_KEY, JSON.stringify(config))
  }

  mergeLobbyConfig(config: Partial<GameConfig>) {
    const nextConfig = {
      ...this.lobbyConfigSignal(),
      ...config,
    } as GameConfig

    this.setLobbyConfig(nextConfig)
  }
}
