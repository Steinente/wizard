export const APP_DEFAULT_LANGUAGE = 'en'

const resolveSocketUrl = () => {
  if (typeof window === 'undefined') {
    return 'http://localhost:3000'
  }

  // Keep local dev working with ng serve on :4200 and server on :3000.
  if (
    window.location.hostname === 'localhost' &&
    window.location.port === '4200'
  ) {
    return 'http://localhost:3000'
  }

  // In Docker/prod we use same-origin and let nginx proxy /socket.io to the server.
  return window.location.origin
}

export const SOCKET_URL = resolveSocketUrl()
export const SESSION_TOKEN_KEY = 'wizard.sessionToken'
export const PLAYER_NAME_KEY = 'wizard.playerName'
export const LAST_LOBBY_CODE_KEY = 'wizard.lastLobbyCode'
export const LOBBY_CONFIG_KEY = 'wizard.lobbyConfig'
export const READ_LOG_ENABLED_KEY = 'wizard.readLogEnabled'
export const SPEECH_VOLUME_KEY = 'wizard.speechVolume'
export const SPEECH_RATE_KEY = 'wizard.speechRate'
export const BING_ENABLED_KEY = 'wizard.bingEnabled'
export const LANGUAGE_KEY = 'wizard.language'
export const PANEL_SETTINGS_VISIBLE_KEY = 'wizard.panelSettingsVisible'
export const PANEL_PLAYERS_VISIBLE_KEY = 'wizard.panelPlayersVisible'
export const PANEL_SCOREBOARD_VISIBLE_KEY = 'wizard.panelScoreboardVisible'
export const PANEL_LOG_VISIBLE_KEY = 'wizard.panelLogVisible'
export const PANEL_CHAT_VISIBLE_KEY = 'wizard.panelChatVisible'
export const LOG_SHOW_TIMESTAMP_KEY = 'wizard.logShowTimestamp'
export const SCOREBOARD_A11Y_MODE_KEY = 'wizard.scoreboardA11yMode'
export const CHAT_SOUND_ENABLED_KEY = 'wizard.chatSoundEnabled'
