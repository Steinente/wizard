import type { WizardGameState } from '@wizard/shared'
import {
  calculateRoundScore,
  createInitialGameState,
  setupRound,
} from '@wizard/shared'
import crypto from 'node:crypto'
import { prisma } from '../../../db/prisma.js'
import { LobbyStatus, PlayerRole } from '../../../generated/prisma/client.js'
import { persistState } from '../game-persistence.js'
import {
  SPECIAL_TRUMP_CARDS,
  ensurePredictionRevealedForScoring,
  getPlayerBeforeRoundLeader,
  getReadableCardLabel,
  getWerewolfOwnerPlayerId,
  lobbyConfigToShared,
  nowIso,
  type LobbyWithPlayers,
} from '../game-service-support.js'
import { enqueueDarkEyeTrumpChoice } from '../specials/index.js'

// Centralizes start-of-round decision flow so initial setup and next rounds stay in sync.
export function applyRoundStartState(state: WizardGameState) {
  if (!state.currentRound) {
    throw new Error('Round not initialized')
  }

  const round = state.currentRound
  const playerBeforeRoundLeaderId = getPlayerBeforeRoundLeader(state)
  const werewolfOwnerPlayerId = getWerewolfOwnerPlayerId(state)

  const pushSystemLog = (
    messageKey: WizardGameState['logs'][number]['messageKey'],
    messageParams?: Record<string, string | number | null>,
  ) => {
    state.logs.push({
      id: crypto.randomUUID(),
      createdAt: nowIso(),
      type: 'system',
      messageKey,
      ...(messageParams ? { messageParams } : {}),
    })
  }

  const beginSelectTrumpSuitDecision = (
    special: string,
    pendingLogKey: WizardGameState['logs'][number]['messageKey'],
    pendingLogParams?: Record<string, string>,
  ) => {
    state.phase = 'trumpSelection'
    round.activePlayerId = playerBeforeRoundLeaderId
    state.pendingDecision = round.activePlayerId
      ? {
          id: crypto.randomUUID(),
          type: 'selectTrumpSuit',
          playerId: round.activePlayerId,
          createdAt: nowIso(),
          special,
        }
      : null

    if (round.activePlayerId) {
      pushSystemLog(pendingLogKey, {
        playerId: round.activePlayerId,
        ...(pendingLogParams ?? {}),
      })
    }
  }

  if (
    round.trumpCard?.type === 'special' &&
    round.trumpCard.special === 'darkEye'
  ) {
    const drawnCards = enqueueDarkEyeTrumpChoice({
      state,
      playerId: playerBeforeRoundLeaderId,
      getReadableCardLabel,
    })

    if (!drawnCards.length) {
      state.phase = 'prediction'
      round.activePlayerId = round.roundLeaderPlayerId
      state.pendingDecision = null
      round.trumpSuit = null

      pushSystemLog('game.trump.noTrumpDueToCard', {
        cardLabel: getReadableCardLabel(round.trumpCard),
      })
      return
    }

    state.phase = 'trumpSelection'
    round.activePlayerId = playerBeforeRoundLeaderId

    if (round.activePlayerId) {
      pushSystemLog('game.trump.selection.pending.darkEye', {
        playerId: round.activePlayerId,
      })
    }

    return
  }

  if (werewolfOwnerPlayerId && round.trumpCard) {
    state.phase = 'trumpSelection'
    round.activePlayerId = werewolfOwnerPlayerId
    state.pendingDecision = {
      id: crypto.randomUUID(),
      type: 'werewolfTrumpSwap',
      playerId: werewolfOwnerPlayerId,
      createdAt: nowIso(),
      allowedSuits: ['red', 'yellow', 'green', 'blue', null],
    }

    pushSystemLog('game.trump.selection.pending.werewolfInHand', {
      playerId: werewolfOwnerPlayerId,
    })
    return
  }

  if (round.trumpCard?.type === 'wizard') {
    beginSelectTrumpSuitDecision('wizard', 'game.trump.selection.pending')
    return
  }

  if (
    round.trumpCard?.type === 'special' &&
    SPECIAL_TRUMP_CARDS.includes(round.trumpCard.special as any)
  ) {
    const trumpSpecialCard = round.trumpCard
    const isWerewolfRevealed = trumpSpecialCard.special === 'werewolf'

    beginSelectTrumpSuitDecision(
      trumpSpecialCard.special,
      isWerewolfRevealed
        ? 'game.trump.selection.pending.werewolfRevealed'
        : 'game.trump.selection.pending',
      isWerewolfRevealed
        ? { currentTrump: getReadableCardLabel(trumpSpecialCard) }
        : undefined,
    )
    return
  }

  state.phase = 'prediction'
  round.activePlayerId = round.roundLeaderPlayerId
  state.pendingDecision = null

  if (round.trumpSuit === null && round.trumpCard !== null) {
    pushSystemLog('game.trump.noTrumpDueToCard', {
      cardLabel: getReadableCardLabel(round.trumpCard),
    })
  } else {
    const trumpNumberValue =
      round.trumpCard?.type === 'number' ? round.trumpCard.value : null
    const hasTrumpNumber = typeof trumpNumberValue === 'number'

    pushSystemLog(
      hasTrumpNumber
        ? 'game.trump.roundStart.withValue'
        : 'game.trump.roundStart',
      {
        suit: round.trumpSuit ?? 'none',
        ...(hasTrumpNumber ? { value: trumpNumberValue } : {}),
      },
    )
  }
}

export function buildInitialState(
  lobby: NonNullable<LobbyWithPlayers>,
): WizardGameState {
  const config = lobbyConfigToShared(lobby)

  // Shuffle players for random seating order instead of join order
  const shuffledPlayers = [...lobby.players].sort(() => Math.random() - 0.5)

  const players = shuffledPlayers.map((player, index) => ({
    playerId: player.id,
    name: player.name,
    seatIndex: index,
    connected: player.connected,
    isHost: player.role === PlayerRole.HOST,
    readLogEnabled: player.readLogEnabled ?? config.readLogEnabledByDefault,
  }))

  const state = createInitialGameState({
    lobbyCode: lobby.code,
    config,
    players,
  })

  const round = setupRound({
    lobbyCode: lobby.code,
    players,
    currentRoundNumber: 1,
    // Start with seatIndex 0 by placing the dealer one seat before the top seat.
    dealerIndex: players.length - 1,
    includedSpecialCards: config.includedSpecialCards,
  })

  state.currentRound = round

  state.logs.push({
    id: crypto.randomUUID(),
    createdAt: nowIso(),
    type: 'system',
    messageKey: 'game.started',
  })

  applyRoundStartState(state)

  return state
}

export async function finishRoundAndAdvance(
  lobby: NonNullable<LobbyWithPlayers>,
  state: WizardGameState,
) {
  if (!state.currentRound) {
    throw new Error('Round state missing')
  }

  ensurePredictionRevealedForScoring(state)

  const totals = new Map<string, number>()

  for (const entry of state.scoreboard) {
    const previous = totals.get(entry.playerId) ?? 0
    totals.set(entry.playerId, previous + entry.delta)
  }

  for (const player of state.currentRound.players) {
    const cloudDelta = player.prediction?.cloudDelta ?? 0
    const effectivePredicted = player.prediction?.value ?? 0
    const originalPredicted = effectivePredicted - cloudDelta
    const won = player.tricksWon
    const delta = calculateRoundScore(effectivePredicted, won)
    const previousTotal = totals.get(player.playerId) ?? 0
    const nextTotal = previousTotal + delta

    totals.set(player.playerId, nextTotal)

    state.scoreboard.push({
      playerId: player.playerId,
      roundNumber: state.currentRound.roundNumber,
      predicted: originalPredicted,
      won,
      delta,
      total: nextTotal,
      predictionAdjustment: cloudDelta,
    })
  }

  state.pendingDecision = null
  state.resolvedCardEffects = []

  if (state.currentRound.roundNumber >= state.maxRounds) {
    state.logs.push({
      id: crypto.randomUUID(),
      createdAt: nowIso(),
      type: 'roundScored',
      messageKey: 'game.round.scored',
      messageParams: {
        roundNumber: state.currentRound.roundNumber,
      },
    })

    state.phase = 'finished'
    state.lobbyStatus = 'finished'

    state.logs.push({
      id: crypto.randomUUID(),
      createdAt: nowIso(),
      type: 'gameFinished',
      messageKey: 'game.finished',
    })

    await prisma.lobby.update({
      where: { id: lobby.id },
      data: {
        status: LobbyStatus.FINISHED,
      },
    })

    await persistState(lobby.id, state)
    return
  }

  const nextRoundNumber = state.currentRound.roundNumber + 1
  const nextDealerIndex =
    (state.currentRound.dealerIndex + 1) % state.players.length

  const nextRound = setupRound({
    lobbyCode: state.lobbyCode,
    players: state.players,
    currentRoundNumber: nextRoundNumber,
    dealerIndex: nextDealerIndex,
    includedSpecialCards: state.config.includedSpecialCards,
  })

  state.currentRound = nextRound
  applyRoundStartState(state)

  await persistState(lobby.id, state)
}
