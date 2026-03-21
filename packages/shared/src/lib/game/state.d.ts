import type { GameConfig } from '../game-config.js'
import type { LobbyStatus } from '../lobby-state.js'
import type { GamePhase } from './phases.js'
import type { RoundState } from './round.js'
import type { PlayerScoreEntry } from './score.js'
export interface GamePlayerMeta {
  playerId: string
  name: string
  seatIndex: number
  connected: boolean
  isHost: boolean
}
export interface GameLogEntry {
  id: string
  createdAt: string
  type:
    | 'system'
    | 'playerJoined'
    | 'playerDisconnected'
    | 'predictionMade'
    | 'cardPlayed'
    | 'trickWon'
    | 'roundScored'
    | 'gameFinished'
    | 'specialEffect'
  messageKey: string
  messageParams?: Record<string, string | number | boolean | null>
}
export interface WizardGameState {
  lobbyCode: string
  lobbyStatus: LobbyStatus
  config: GameConfig
  players: GamePlayerMeta[]
  phase: GamePhase
  maxRounds: number
  currentRound: RoundState | null
  scoreboard: PlayerScoreEntry[]
  logs: GameLogEntry[]
  createdAt: string
  updatedAt: string
}
