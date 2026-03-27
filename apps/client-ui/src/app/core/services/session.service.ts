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
  PANEL_CHAT_VISIBLE_KEY,
  LOG_SHOW_TIMESTAMP_KEY,
  SCOREBOARD_A11Y_MODE_KEY,
  SCOREBOARD_A11Y_ROUND_SCOPE_KEY,
  CHAT_SOUND_ENABLED_KEY,
  CARD_ARTWORK_ENABLED_KEY,
  HAND_SORT_ENABLED_KEY,
  APP_FONT_KEY,
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

export type AppFontChoice = 'simple' | 'frances'

const normalizeAppFont = (value: string | null): AppFontChoice =>
  value === 'frances' ? 'frances' : 'simple'

export type ScoreboardA11yRoundScope = 'all' | 'lastRound'

const normalizeScoreboardA11yRoundScope = (
  value: string | null,
): ScoreboardA11yRoundScope => (value === 'lastRound' ? 'lastRound' : 'all')

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
  private readonly panelChatVisibleSignal = signal(true)
  private readonly logShowTimestampSignal = signal(true)
  private readonly scoreboardA11yModeSignal = signal(false)
  private readonly scoreboardA11yRoundScopeSignal =
    signal<ScoreboardA11yRoundScope>('all')
  private readonly chatSoundEnabledSignal = signal(true)
  private readonly cardArtworkEnabledSignal = signal(false)
  private readonly handSortEnabledSignal = signal(false)
  private readonly appFontSignal = signal<AppFontChoice>('simple')

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
  readonly panelChatVisible = computed(() => this.panelChatVisibleSignal())
  readonly logShowTimestamp = computed(() => this.logShowTimestampSignal())
  readonly scoreboardA11yMode = computed(() => this.scoreboardA11yModeSignal())
  readonly scoreboardA11yRoundScope = computed(() =>
    this.scoreboardA11yRoundScopeSignal(),
  )
  readonly chatSoundEnabled = computed(() => this.chatSoundEnabledSignal())
  readonly cardArtworkEnabled = computed(() => this.cardArtworkEnabledSignal())
  readonly handSortEnabled = computed(() => this.handSortEnabledSignal())
  readonly appFont = computed(() => this.appFontSignal())

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

    const storedPanelChat = this.storage.get(PANEL_CHAT_VISIBLE_KEY)
    this.panelChatVisibleSignal.set(storedPanelChat !== 'false')

    const storedLogShowTimestamp = this.storage.get(LOG_SHOW_TIMESTAMP_KEY)
    this.logShowTimestampSignal.set(storedLogShowTimestamp !== 'false')

    const storedScoreboardA11yMode = this.storage.get(SCOREBOARD_A11Y_MODE_KEY)
    this.scoreboardA11yModeSignal.set(storedScoreboardA11yMode === 'true')

    const storedScoreboardA11yRoundScope = this.storage.get(
      SCOREBOARD_A11Y_ROUND_SCOPE_KEY,
    )
    this.scoreboardA11yRoundScopeSignal.set(
      normalizeScoreboardA11yRoundScope(storedScoreboardA11yRoundScope),
    )

    const storedChatSoundEnabled = this.storage.get(CHAT_SOUND_ENABLED_KEY)
    this.chatSoundEnabledSignal.set(storedChatSoundEnabled !== 'false')

    const storedCardArtworkEnabled = this.storage.get(CARD_ARTWORK_ENABLED_KEY)
    this.cardArtworkEnabledSignal.set(storedCardArtworkEnabled === 'true')

    const storedHandSortEnabled = this.storage.get(HAND_SORT_ENABLED_KEY)
    this.handSortEnabledSignal.set(storedHandSortEnabled === 'true')

    const storedAppFont = this.storage.get(APP_FONT_KEY)
    const appFont = normalizeAppFont(storedAppFont)
    this.appFontSignal.set(appFont)
    this.applyAppFontToDocument(appFont)
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

  setPanelChatVisible(visible: boolean) {
    this.panelChatVisibleSignal.set(visible)
    this.storage.set(PANEL_CHAT_VISIBLE_KEY, String(visible))
  }

  setLogShowTimestamp(show: boolean) {
    this.logShowTimestampSignal.set(show)
    this.storage.set(LOG_SHOW_TIMESTAMP_KEY, String(show))
  }

  setScoreboardA11yMode(enabled: boolean) {
    this.scoreboardA11yModeSignal.set(enabled)
    this.storage.set(SCOREBOARD_A11Y_MODE_KEY, String(enabled))
  }

  setScoreboardA11yRoundScope(scope: ScoreboardA11yRoundScope) {
    const normalized = normalizeScoreboardA11yRoundScope(scope)
    this.scoreboardA11yRoundScopeSignal.set(normalized)
    this.storage.set(SCOREBOARD_A11Y_ROUND_SCOPE_KEY, normalized)
  }

  setChatSoundEnabled(enabled: boolean) {
    this.chatSoundEnabledSignal.set(enabled)
    this.storage.set(CHAT_SOUND_ENABLED_KEY, String(enabled))
  }

  setCardArtworkEnabled(enabled: boolean) {
    this.cardArtworkEnabledSignal.set(enabled)
    this.storage.set(CARD_ARTWORK_ENABLED_KEY, String(enabled))
  }

  setHandSortEnabled(enabled: boolean) {
    this.handSortEnabledSignal.set(enabled)
    this.storage.set(HAND_SORT_ENABLED_KEY, String(enabled))
  }

  setAppFont(font: AppFontChoice) {
    const normalized = normalizeAppFont(font)
    this.appFontSignal.set(normalized)
    this.storage.set(APP_FONT_KEY, normalized)
    this.applyAppFontToDocument(normalized)
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

  private applyAppFontToDocument(font: AppFontChoice) {
    if (typeof document === 'undefined') {
      return
    }

    document.documentElement.setAttribute('data-app-font', font)
  }
}
