import type { Card, Suit } from '../cards.js'
import type { GameConfig } from '../game-config.js'
import type { LobbyStatus } from '../lobby-state.js'
import type { GamePhase } from './phases.js'
import type { PredictionViewItem } from './predictions.js'
import type { PlayerScoreEntry } from './score.js'
import type { GameLogMessageKey } from './log-keys.js'
import type {
  PendingDecision,
  ResolvedCardRuntimeEffect,
} from './special-state.js'
import type { TrickState } from './trick.js'

export interface GamePlayerViewMeta {
  playerId: string
  name: string
  seatIndex: number
  connected: boolean
  isHost: boolean
  audioEnabled: boolean
}

export interface RoundPlayerViewState {
  playerId: string
  hand: Card[]
  handCount: number
  tricksWon: number
  prediction: PredictionViewItem | null
  pendingCloudAdjustment?: boolean
}

export interface RoundViewState {
  roundNumber: number
  dealerIndex: number
  activePlayerId: string | null
  roundLeaderPlayerId: string | null
  trumpSuit: Suit | null
  trumpCard: Card | null
  deckRemainderCount: number
  players: RoundPlayerViewState[]
  currentTrick: TrickState | null
  completedTricks: TrickState[]
}

export interface GameLogEntryView {
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
  messageKey: GameLogMessageKey
  messageParams?: Record<string, string | number | boolean | null>
}

export interface WizardGameViewState {
  selfPlayerId: string
  lobbyCode: string
  lobbyStatus: LobbyStatus
  config: GameConfig
  players: GamePlayerViewMeta[]
  phase: GamePhase
  maxRounds: number
  currentRound: RoundViewState | null
  scoreboard: PlayerScoreEntry[]
  logs: GameLogEntryView[]
  pendingDecision: PendingDecision | null
  resolvedCardEffects: ResolvedCardRuntimeEffect[]
  createdAt: string
  updatedAt: string
}
