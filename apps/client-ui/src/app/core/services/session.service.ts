import { Injectable, computed, signal } from '@angular/core'
import type { GameConfig } from '@wizard/shared'
import {
  READ_LOG_ENABLED_KEY,
  SPEECH_RATE_KEY,
  SPEECH_VOLUME_KEY,
  BING_ENABLED_KEY,
  LAST_LOBBY_CODE_KEY,
  LOBBY_CONFIG_KEY,
  PLAYER_NAME_KEY,
  SESSION_TOKEN_KEY,
} from '../config/app.config-values'
import { LocalStorageService } from './local-storage.service'

const createSessionToken = () => crypto.randomUUID()
const MIN_SPEECH_VOLUME = 0
const MAX_SPEECH_VOLUME = 1
const MIN_SPEECH_RATE = 0.6
const MAX_SPEECH_RATE = 3.0

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const parseStoredNumber = (
  value: string | null,
  fallback: number,
  min: number,
  max: number,
) => {
  if (value === null) {
    return fallback
  }

  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    return fallback
  }

  return clamp(parsed, min, max)
}

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly sessionTokenSignal = signal('')
  private readonly playerNameSignal = signal('')
  private readonly lastLobbyCodeSignal = signal('')
  private readonly readLogEnabledSignal = signal(false)
  private readonly speechVolumeSignal = signal(1)
  private readonly speechRateSignal = signal(1)
  private readonly bingEnabledSignal = signal(true)
  private readonly hasReadLogPreferenceSignal = signal(false)
  private readonly lobbyConfigSignal = signal<GameConfig | null>(null)

  readonly sessionToken = computed(() => this.sessionTokenSignal())
  readonly playerName = computed(() => this.playerNameSignal())
  readonly lastLobbyCode = computed(() => this.lastLobbyCodeSignal())
  readonly readLogEnabled = computed(() => this.readLogEnabledSignal())
  readonly speechVolume = computed(() => this.speechVolumeSignal())
  readonly speechRate = computed(() => this.speechRateSignal())
  readonly bingEnabled = computed(() => this.bingEnabledSignal())
  readonly hasReadLogPreference = computed(() => this.hasReadLogPreferenceSignal())
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

    const storedReadLogEnabled = this.storage.get(READ_LOG_ENABLED_KEY)
    this.hasReadLogPreferenceSignal.set(storedReadLogEnabled !== null)
    this.readLogEnabledSignal.set(storedReadLogEnabled === 'true')

    const storedSpeechVolume = this.storage.get(SPEECH_VOLUME_KEY)
    this.speechVolumeSignal.set(
      parseStoredNumber(
        storedSpeechVolume,
        1,
        MIN_SPEECH_VOLUME,
        MAX_SPEECH_VOLUME,
      ),
    )

    const storedSpeechRate = this.storage.get(SPEECH_RATE_KEY)
    this.speechRateSignal.set(
      parseStoredNumber(storedSpeechRate, 1, MIN_SPEECH_RATE, MAX_SPEECH_RATE),
    )

    const storedBingEnabled = this.storage.get(BING_ENABLED_KEY)
    this.bingEnabledSignal.set(storedBingEnabled !== 'false')
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

  setReadLogEnabled(enabled: boolean) {
    this.readLogEnabledSignal.set(enabled)
    this.hasReadLogPreferenceSignal.set(true)
    this.storage.set(READ_LOG_ENABLED_KEY, String(enabled))
  }

  setSpeechVolume(volume: number) {
    const normalized = clamp(volume, MIN_SPEECH_VOLUME, MAX_SPEECH_VOLUME)
    this.speechVolumeSignal.set(normalized)
    this.storage.set(SPEECH_VOLUME_KEY, String(normalized))
  }

  setSpeechRate(rate: number) {
    const normalized = clamp(rate, MIN_SPEECH_RATE, MAX_SPEECH_RATE)
    this.speechRateSignal.set(normalized)
    this.storage.set(SPEECH_RATE_KEY, String(normalized))
  }

  setBingEnabled(enabled: boolean) {
    this.bingEnabledSignal.set(enabled)
    this.storage.set(BING_ENABLED_KEY, String(enabled))
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
