import type { WizardGameState } from '@wizard/shared'
import { prisma } from '../../db/prisma.js'
import {
  fromJson,
  loadLobbyByCode,
  nowIso,
  toJson,
} from './game-service-support.js'
import { syncActionableInteractionTimers } from './player-interaction-timing.js'

export async function persistState(lobbyId: string, state: WizardGameState) {
  syncActionableInteractionTimers(state)
  state.updatedAt = nowIso()

  await prisma.gameState.upsert({
    where: { lobbyId },
    update: {
      roundNumber: state.currentRound?.roundNumber ?? 0,
      dealerIndex: state.currentRound?.dealerIndex ?? 0,
      currentPlayerId: state.currentRound?.activePlayerId ?? null,
      phase: state.phase,
      stateJson: toJson(state),
    },
    create: {
      lobbyId,
      roundNumber: state.currentRound?.roundNumber ?? 0,
      dealerIndex: state.currentRound?.dealerIndex ?? 0,
      currentPlayerId: state.currentRound?.activePlayerId ?? null,
      phase: state.phase,
      stateJson: toJson(state),
    },
  })
}

export async function loadStateOrThrow(code: string) {
  const lobby = await loadLobbyByCode(code)

  if (!lobby) {
    throw new Error('error.lobbyNotFound')
  }

  if (!lobby.gameState) {
    throw new Error('Game state not found')
  }

  return {
    lobby,
    state: fromJson(lobby.gameState.stateJson),
  }
}
