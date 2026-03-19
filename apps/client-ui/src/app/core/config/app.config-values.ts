export const APP_DEFAULT_LANGUAGE = 'en'

const resolveSocketUrl = () => {
	if (typeof window === 'undefined') {
		return 'http://localhost:3000'
	}

	// Keep local dev working with ng serve on :4200 and server on :3000.
	if (window.location.hostname === 'localhost' && window.location.port === '4200') {
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
