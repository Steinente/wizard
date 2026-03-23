import type { WizardGameState } from '@wizard/shared'
import { resolveTrickWinner } from '@wizard/shared'
import crypto from 'node:crypto'
import { beginJugglerPassDecision } from '../game-mutations.js'
import { persistState } from '../game-persistence.js'
import {
  getHypotheticalNextLeaderPlayerId,
  getNextPlayerId,
  getSeatOrderedPlayerIds,
  nowIso,
  type LobbyWithPlayers,
} from '../game-service-support.js'
import { logBombCancelledTrick } from '../specials/index.js'
import { enqueueCloudPredictionAdjustmentDecision } from '../specials/index.js'
import { finishRoundAndAdvance } from './round-lifecycle.js'

export async function continueOrResolveCurrentTrick(
  lobby: NonNullable<LobbyWithPlayers>,
  state: WizardGameState,
  playerId: string,
) {
  const playerCount = state.players.length
  const playsInCurrentTrick =
    state.currentRound?.currentTrick?.plays.length ?? 0

  if (playsInCurrentTrick < playerCount) {
    if (!state.currentRound) {
      throw new Error('Round not initialized')
    }

    state.currentRound.activePlayerId = getNextPlayerId(
      getSeatOrderedPlayerIds(state),
      playerId,
    )
    await persistState(lobby.id, state)
    return
  }

  // Mirror normal card play flow: persist the completed trick first so clients
  // can see the final card, and let the socket handler trigger delayed resolution.
  await persistState(lobby.id, state)
}

export async function resolveCompletedTrick(
  lobby: NonNullable<LobbyWithPlayers>,
  state: WizardGameState,
) {
  if (!state.currentRound?.currentTrick) {
    throw new Error('No active trick')
  }

  const trick = state.currentRound.currentTrick

  let resolvedTrick = resolveTrickWinner(
    trick,
    state.currentRound.trumpSuit,
    state.resolvedCardEffects,
  )

  if (!resolvedTrick.cancelledByBomb) {
    const fairyPlay = resolvedTrick.plays.find(
      (play) => play.card.type === 'special' && play.card.special === 'fairy',
    )
    const dragonPlay = resolvedTrick.plays.find(
      (play) => play.card.type === 'special' && play.card.special === 'dragon',
    )

    if (fairyPlay && dragonPlay) {
      resolvedTrick = {
        ...resolvedTrick,
        winnerPlayerId: fairyPlay.playerId,
        winningCard: fairyPlay.card,
      }
    } else if (!fairyPlay && dragonPlay) {
      resolvedTrick = {
        ...resolvedTrick,
        winnerPlayerId: dragonPlay.playerId,
        winningCard: dragonPlay.card,
      }
    }
  }

  state.currentRound.currentTrick = null
  state.currentRound.completedTricks.push(resolvedTrick)

  const playedJuggler = resolvedTrick.plays.find(
    (play) => play.card.type === 'special' && play.card.special === 'juggler',
  )
  const playedCloud = resolvedTrick.plays.find(
    (play) => play.card.type === 'special' && play.card.special === 'cloud',
  )
  const cloudTimingMode = state.config.cloudRuleTiming

  const hypotheticalLeaderPlayerId = getHypotheticalNextLeaderPlayerId(
    trick,
    state.currentRound.trumpSuit,
    state.resolvedCardEffects,
  )

  if (resolvedTrick.cancelledByBomb) {
    logBombCancelledTrick(state)
  } else {
    const winner = state.currentRound.players.find(
      (entry) => entry.playerId === resolvedTrick.winnerPlayerId,
    )

    if (winner) {
      winner.tricksWon += 1
    }

    state.logs.push({
      id: crypto.randomUUID(),
      createdAt: nowIso(),
      type: 'trickWon',
      messageKey: 'game.trick.won',
      messageParams: {
        playerId: resolvedTrick.winnerPlayerId ?? '',
      },
    })

    if (playedCloud && resolvedTrick.winnerPlayerId) {
      state.logs.push({
        id: crypto.randomUUID(),
        createdAt: nowIso(),
        type: 'specialEffect',
        messageKey: 'special.cloud.wonTrickNineThreeQuarters',
        messageParams: {
          playerId: resolvedTrick.winnerPlayerId,
        },
      })

      const cloudWinner = state.currentRound.players.find(
        (entry) => entry.playerId === resolvedTrick.winnerPlayerId,
      )
      if (cloudWinner) {
        // Keep the cloud indicator visible from trick end until adjustment is resolved.
        cloudWinner.pendingCloudAdjustment = true
      }
    }
  }

  state.resolvedCardEffects = []

  const isLastTrick =
    state.currentRound.completedTricks.length >= state.currentRound.roundNumber

  if (isLastTrick) {
    if (cloudTimingMode === 'immediateAfterTrick') {
      if (playedCloud && resolvedTrick.winnerPlayerId) {
        const enqueued = enqueueCloudPredictionAdjustmentDecision({
          state,
          playerId: resolvedTrick.winnerPlayerId,
          cardId: playedCloud.card.id,
        })

        if (enqueued) {
          await persistState(lobby.id, state)
          return
        }
      }
    } else {
      // End-of-round mode: check for a won cloud trick once the round is complete.
      for (const completedTrick of state.currentRound.completedTricks) {
        const cloud = completedTrick.plays.find(
          (play) =>
            play.card.type === 'special' && play.card.special === 'cloud',
        )

        if (!cloud || !completedTrick.winnerPlayerId) {
          continue
        }

        const enqueued = enqueueCloudPredictionAdjustmentDecision({
          state,
          playerId: completedTrick.winnerPlayerId,
          cardId: cloud.card.id,
        })

        if (enqueued) {
          await persistState(lobby.id, state)
          return
        }
      }
    }

    await finishRoundAndAdvance(lobby, state)
    return
  }

  state.currentRound.activePlayerId =
    hypotheticalLeaderPlayerId ??
    resolvedTrick.winnerPlayerId ??
    state.currentRound.roundLeaderPlayerId

  if (playedJuggler) {
    beginJugglerPassDecision(state)
  }

  if (
    cloudTimingMode === 'immediateAfterTrick' &&
    playedCloud &&
    resolvedTrick.winnerPlayerId &&
    !playedJuggler
  ) {
    const enqueued = enqueueCloudPredictionAdjustmentDecision({
      state,
      playerId: resolvedTrick.winnerPlayerId,
      cardId: playedCloud.card.id,
    })

    if (enqueued) {
      await persistState(lobby.id, state)
      return
    }
  }

  await persistState(lobby.id, state)
}
