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
  PANEL_SETTINGS_VISIBLE_KEY,
  PANEL_PLAYERS_VISIBLE_KEY,
  PANEL_SCOREBOARD_VISIBLE_KEY,
  PANEL_LOG_VISIBLE_KEY,
  LOG_SHOW_TIMESTAMP_KEY,
  SCOREBOARD_A11Y_MODE_KEY,
} from '../config/app.config-values'
import {
  normalizeSpeechRate,
  normalizeSpeechVolume,
} from '../config/speech.config'
import { LocalStorageService } from './local-storage.service'

const createSessionToken = () => crypto.randomUUID()

const parseStoredNumber = (
  value: string | null,
  fallback: number,
  normalize: (value: number) => number,
) => {
  if (value === null) {
    return fallback
  }

  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    return fallback
  }

  return normalize(parsed)
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
  private readonly panelSettingsVisibleSignal = signal(true)
  private readonly panelPlayersVisibleSignal = signal(true)
  private readonly panelScoreboardVisibleSignal = signal(true)
  private readonly panelLogVisibleSignal = signal(true)
  private readonly logShowTimestampSignal = signal(true)
  private readonly scoreboardA11yModeSignal = signal(true)

  readonly sessionToken = computed(() => this.sessionTokenSignal())
  readonly playerName = computed(() => this.playerNameSignal())
  readonly lastLobbyCode = computed(() => this.lastLobbyCodeSignal())
  readonly readLogEnabled = computed(() => this.readLogEnabledSignal())
  readonly speechVolume = computed(() => this.speechVolumeSignal())
  readonly speechRate = computed(() => this.speechRateSignal())
  readonly bingEnabled = computed(() => this.bingEnabledSignal())
  readonly hasReadLogPreference = computed(() =>
    this.hasReadLogPreferenceSignal(),
  )
  readonly lobbyConfig = computed(() => this.lobbyConfigSignal())
  readonly panelSettingsVisible = computed(() =>
    this.panelSettingsVisibleSignal(),
  )
  readonly panelPlayersVisible = computed(() =>
    this.panelPlayersVisibleSignal(),
  )
  readonly panelScoreboardVisible = computed(() =>
    this.panelScoreboardVisibleSignal(),
  )
  readonly panelLogVisible = computed(() => this.panelLogVisibleSignal())
  readonly logShowTimestamp = computed(() => this.logShowTimestampSignal())
  readonly scoreboardA11yMode = computed(() => this.scoreboardA11yModeSignal())

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
      parseStoredNumber(storedSpeechVolume, 1, normalizeSpeechVolume),
    )

    const storedSpeechRate = this.storage.get(SPEECH_RATE_KEY)
    this.speechRateSignal.set(
      parseStoredNumber(storedSpeechRate, 1, normalizeSpeechRate),
    )

    const storedBingEnabled = this.storage.get(BING_ENABLED_KEY)
    this.bingEnabledSignal.set(storedBingEnabled !== 'false')

    const storedPanelSettings = this.storage.get(PANEL_SETTINGS_VISIBLE_KEY)
    this.panelSettingsVisibleSignal.set(storedPanelSettings !== 'false')

    const storedPanelPlayers = this.storage.get(PANEL_PLAYERS_VISIBLE_KEY)
    this.panelPlayersVisibleSignal.set(storedPanelPlayers !== 'false')

    const storedPanelScoreboard = this.storage.get(PANEL_SCOREBOARD_VISIBLE_KEY)
    this.panelScoreboardVisibleSignal.set(storedPanelScoreboard !== 'false')

    const storedPanelLog = this.storage.get(PANEL_LOG_VISIBLE_KEY)
    this.panelLogVisibleSignal.set(storedPanelLog !== 'false')

    const storedLogShowTimestamp = this.storage.get(LOG_SHOW_TIMESTAMP_KEY)
    this.logShowTimestampSignal.set(storedLogShowTimestamp !== 'false')

    const storedScoreboardA11yMode = this.storage.get(SCOREBOARD_A11Y_MODE_KEY)
    this.scoreboardA11yModeSignal.set(storedScoreboardA11yMode !== 'false')
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
    const normalized = normalizeSpeechVolume(volume)
    this.speechVolumeSignal.set(normalized)
    this.storage.set(SPEECH_VOLUME_KEY, String(normalized))
  }

  setSpeechRate(rate: number) {
    const normalized = normalizeSpeechRate(rate)
    this.speechRateSignal.set(normalized)
    this.storage.set(SPEECH_RATE_KEY, String(normalized))
  }

  setBingEnabled(enabled: boolean) {
    this.bingEnabledSignal.set(enabled)
    this.storage.set(BING_ENABLED_KEY, String(enabled))
  }

  setPanelSettingsVisible(visible: boolean) {
    this.panelSettingsVisibleSignal.set(visible)
    this.storage.set(PANEL_SETTINGS_VISIBLE_KEY, String(visible))
  }

  setPanelPlayersVisible(visible: boolean) {
    this.panelPlayersVisibleSignal.set(visible)
    this.storage.set(PANEL_PLAYERS_VISIBLE_KEY, String(visible))
  }

  setPanelScoreboardVisible(visible: boolean) {
    this.panelScoreboardVisibleSignal.set(visible)
    this.storage.set(PANEL_SCOREBOARD_VISIBLE_KEY, String(visible))
  }

  setPanelLogVisible(visible: boolean) {
    this.panelLogVisibleSignal.set(visible)
    this.storage.set(PANEL_LOG_VISIBLE_KEY, String(visible))
  }

  setLogShowTimestamp(show: boolean) {
    this.logShowTimestampSignal.set(show)
    this.storage.set(LOG_SHOW_TIMESTAMP_KEY, String(show))
  }

  setScoreboardA11yMode(enabled: boolean) {
    this.scoreboardA11yModeSignal.set(enabled)
    this.storage.set(SCOREBOARD_A11Y_MODE_KEY, String(enabled))
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
