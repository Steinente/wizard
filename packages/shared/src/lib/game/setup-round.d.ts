import type { RoundState } from './round.js'
import type { WizardGameState } from './state.js'
export interface SetupRoundInput {
  lobbyCode: string
  players: Array<{
    playerId: string
    name: string
    connected: boolean
    isHost: boolean
    seatIndex: number
  }>
  currentRoundNumber: number
  dealerIndex: number
  includeSpecialCards: boolean
  random?: () => number
}
export declare const setupRound: (input: SetupRoundInput) => RoundState
export declare const createInitialGameState: (input: {
  lobbyCode: string
  config: WizardGameState['config']
  players: WizardGameState['players']
}) => WizardGameState
