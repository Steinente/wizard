import type { Suit } from './cards.js'
import type { GameConfig } from './game-config.js'
import type { WizardGameViewState } from './game/state-view.js'
import type { LobbySummary } from './lobby.js'

export interface ClientToServerEvents {
  'lobby:list': () => void

  'lobby:create': (payload: {
    playerName: string
    sessionToken: string
    password?: string
    config?: Partial<GameConfig>
  }) => void

  'lobby:join': (payload: {
    code: string
    playerName: string
    sessionToken: string
    password?: string
  }) => void

  'lobby:spectate': (payload: {
    code: string
    playerName: string
    sessionToken: string
    password?: string
  }) => void

  'lobby:reconnect': (payload: { code: string; sessionToken: string }) => void

  'lobby:leave': (payload: { code: string; sessionToken: string }) => void

  'lobby:updateConfig': (payload: {
    code: string
    sessionToken: string
    config: Partial<GameConfig>
  }) => void

  'lobby:kickPlayer': (payload: {
    code: string
    sessionToken: string
    targetPlayerId: string
  }) => void

  'lobby:end': (payload: { code: string; sessionToken: string }) => void

  'game:start': (payload: { code: string; sessionToken: string }) => void

  'game:makePrediction': (payload: {
    code: string
    sessionToken: string
    value: number
  }) => void

  'game:playCard': (payload: {
    code: string
    sessionToken: string
    cardId: string
  }) => void

  'game:selectTrumpSuit': (payload: {
    code: string
    sessionToken: string
    suit: Suit | null
  }) => void

  'game:resolveShapeShifter': (payload: {
    code: string
    sessionToken: string
    cardId: string
    mode: 'wizard' | 'jester'
  }) => void

  'game:resolveCloud': (payload: {
    code: string
    sessionToken: string
    cardId: string
    suit: Suit
  }) => void

  'game:resolveCloudAdjustment': (payload: {
    code: string
    sessionToken: string
    delta: 1 | -1
  }) => void

  'game:resolveJuggler': (payload: {
    code: string
    sessionToken: string
    cardId: string
    suit: Suit
  }) => void

  'game:selectJugglerPassCard': (payload: {
    code: string
    sessionToken: string
    cardId: string
  }) => void

  'game:resolveWerewolfTrumpSwap': (payload: {
    code: string
    sessionToken: string
    suit: Suit | null
  }) => void

  'player:setReadLogEnabled': (payload: {
    code: string
    sessionToken: string
    enabled: boolean
  }) => void

  'player:setInGame': (payload: {
    code: string
    sessionToken: string
    inGame: boolean
  }) => void
}

export interface ServerToClientEvents {
  'lobby:list': (payload: { lobbies: LobbySummary[] }) => void

  'lobby:created': (payload: { lobby: LobbySummary; playerId: string }) => void
  'lobby:joined': (payload: { lobby: LobbySummary; playerId: string }) => void
  'lobby:updated': (payload: { lobby: LobbySummary }) => void
  'lobby:closed': (payload: { code: string; reason: string }) => void

  'game:state': (payload: { state: WizardGameViewState }) => void
  'game:event': (payload: {
    type:
      | 'predictionAccepted'
      | 'cardPlayed'
      | 'trickResolved'
      | 'roundScored'
      | 'specialEffect'
      | 'readLogPreferenceChanged'
    messageKey: string
    params?: Record<string, string | number | boolean | null>
  }) => void

  'error:message': (payload: { message: string; code?: string }) => void
}
