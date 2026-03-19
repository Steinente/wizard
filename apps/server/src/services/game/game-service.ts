import type {
  PlayerPrediction,
  Suit
} from '@wizard/shared'
import {
  getAllowedPredictionValues,
  isLegalPlay,
  validatePredictionRestriction,
} from '@wizard/shared'
import crypto from 'node:crypto'
import { prisma } from '../../db/prisma.js'
import { LobbyStatus, PlayerRole } from '../../generated/prisma/client.js'
import { mapLobbyToSummary } from '../lobby-mapper.js'
import {
  appendCardToCurrentTrick,
  registerResolvedEffect,
  removeCardFromHand,
} from './game-mutations.js'
import { loadStateOrThrow, persistState } from './game-persistence.js'
import {
  NO_TRUMP_SELECTABLE_SPECIALS,
  fromJson,
  getNextPlayerId,
  getPlayerBySessionToken,
  getReadableCardLabel,
  getSeatOrderedPlayerIds,
  isFollowSuitDisabledInTrick,
  loadLobbyByCode,
  nowIso,
} from './game-service-support.js'
import { createGameStateView } from './game-state-view.js'
import {
  buildInitialState,
  continueOrResolveCurrentTrick,
  finishRoundAndAdvance,
  resolveCompletedTrick,
} from './lifecycle/index.js'
import { handleShapeShifterBeforePlay } from './specials/index.js'

export class GameService {
  async startGame(input: { code: string; sessionToken: string }) {
    const lobby = await loadLobbyByCode(input.code)

    if (!lobby) {
      throw new Error('error.lobbyNotFound')
    }

    const player = getPlayerBySessionToken(lobby, input.sessionToken)

    if (player.id !== lobby.hostPlayerId) {
      throw new Error('error.onlyHostCanStart')
    }

    if (lobby.players.length < 3 || lobby.players.length > 6) {
      throw new Error('error.wizardMinPlayers')
    }

    const state = buildInitialState(lobby)

    await prisma.lobby.update({
      where: { id: lobby.id },
      data: {
        status: LobbyStatus.RUNNING,
        hostDisconnectedAt: null,
        hostDisconnectDeadline: null,
      },
    })

    await prisma.player.updateMany({
      where: {
        lobbyId: lobby.id,
        role: {
          not: PlayerRole.SPECTATOR,
        },
      },
      data: {
        inGame: true,
      },
    })

    await persistState(lobby.id, state)

    const updatedLobby = await prisma.lobby.findUniqueOrThrow({
      where: { id: lobby.id },
      include: {
        players: {
          orderBy: {
            joinedAt: 'asc',
          },
        },
      },
    })

    return {
      lobby: mapLobbyToSummary(updatedLobby),
      state,
    }
  }

  async makePrediction(input: {
    code: string
    sessionToken: string
    value: number
  }) {
    const { lobby, state } = await loadStateOrThrow(input.code)

    if (!state.currentRound) {
      throw new Error('Round not initialized')
    }

    if (state.phase !== 'prediction') {
      throw new Error('error.predictionsNotOpen')
    }

    if (input.value < 0 || input.value > state.currentRound.roundNumber) {
      throw new Error('error.predictionOutOfRange')
    }

    const player = getPlayerBySessionToken(lobby, input.sessionToken)

    if (state.currentRound.activePlayerId !== player.id) {
      throw new Error('error.notYourTurnToPredict')
    }

    const roundPlayer = state.currentRound.players.find(
      (entry) => entry.playerId === player.id,
    )

    if (!roundPlayer) {
      throw new Error('Player is not part of the current round')
    }

    if (roundPlayer.prediction) {
      throw new Error('error.predictionAlreadySubmitted')
    }

    const allowedPredictionValues = getAllowedPredictionValues({
      config: state.config,
      predictions: state.currentRound.players.map((entry) => entry.prediction),
      trickCount: state.currentRound.roundNumber,
    })

    if (!allowedPredictionValues.includes(input.value)) {
      throw new Error('error.predictionViolatesRestriction')
    }

    const simulatedPredictions: Array<PlayerPrediction | null> =
      state.currentRound.players.map((entry) =>
        entry.playerId === player.id
          ? {
              playerId: player.id,
              value: input.value,
              revealed: state.config.predictionVisibility === 'open',
              changedByCloud: false,
              cloudDelta: 0,
            }
          : entry.prediction,
      )

    const remainingWithoutCurrent = state.currentRound.players.filter(
      (entry) => !entry.prediction && entry.playerId !== player.id,
    )

    if (remainingWithoutCurrent.length === 0) {
      const valid = validatePredictionRestriction({
        config: state.config,
        predictions: simulatedPredictions,
        trickCount: state.currentRound.roundNumber,
      })

      if (!valid) {
        throw new Error('error.predictionViolatesRestriction')
      }
    }

    roundPlayer.prediction = {
      playerId: player.id,
      value: input.value,
      revealed: state.config.predictionVisibility === 'open',
      changedByCloud: false,
      cloudDelta: 0,
    }

    state.logs.push({
      id: crypto.randomUUID(),
      createdAt: nowIso(),
      type: 'predictionMade',
      messageKey: 'game.prediction.made',
      messageParams: {
        playerId: player.id,
        value: input.value,
      },
    })

    const orderedPlayerIds = getSeatOrderedPlayerIds(state)
    const allPredicted = state.currentRound.players.every(
      (entry) => !!entry.prediction,
    )

    if (!allPredicted) {
      state.currentRound.activePlayerId = getNextPlayerId(
        orderedPlayerIds,
        player.id,
      )
    } else {
      if (state.config.predictionVisibility === 'hidden') {
        for (const entry of state.currentRound.players) {
          if (entry.prediction) {
            entry.prediction.revealed = true
          }
        }
      }

      state.phase = 'playing'
      state.currentRound.activePlayerId = state.currentRound.roundLeaderPlayerId
    }

    await persistState(lobby.id, state)

    return state
  }

  async selectTrumpSuit(input: {
    code: string
    sessionToken: string
    suit: Suit | null
  }) {
    const { lobby, state } = await loadStateOrThrow(input.code)

    if (!state.currentRound) {
      throw new Error('Round not initialized')
    }

    if (state.phase !== 'trumpSelection') {
      throw new Error('error.trumpNotSelectable')
    }

    const player = getPlayerBySessionToken(lobby, input.sessionToken)

    if (state.currentRound.activePlayerId !== player.id) {
      throw new Error('error.notYourTurnForTrump')
    }

    if (
      !state.pendingDecision ||
      state.pendingDecision.type !== 'selectTrumpSuit'
    ) {
      throw new Error('No trump selection pending')
    }

    const triggeringSpecial = state.pendingDecision.special

    if (
      input.suit === null &&
      (!triggeringSpecial ||
        !NO_TRUMP_SELECTABLE_SPECIALS.has(triggeringSpecial))
    ) {
      throw new Error('error.trumpNotSelectable')
    }

    state.currentRound.trumpSuit = input.suit
    state.phase = 'prediction'
    state.currentRound.activePlayerId = state.currentRound.roundLeaderPlayerId
    state.pendingDecision = null

    state.logs.push({
      id: crypto.randomUUID(),
      createdAt: nowIso(),
      type: 'system',
      messageKey: triggeringSpecial
        ? 'game.trump.selected.bySpecial'
        : 'game.trump.selected',
      messageParams: {
        ...(triggeringSpecial && { playerId: player.id }),
        suit: input.suit ?? 'none',
        ...(triggeringSpecial && { special: triggeringSpecial }),
      },
    })

    await persistState(lobby.id, state)

    return state
  }

  async resolveWerewolfTrumpSwap(input: {
    code: string
    sessionToken: string
    suit: Suit | null
  }) {
    const { lobby, state } = await loadStateOrThrow(input.code)

    if (!state.currentRound) {
      throw new Error('Round not initialized')
    }

    const player = getPlayerBySessionToken(lobby, input.sessionToken)

    if (
      !state.pendingDecision ||
      state.pendingDecision.type !== 'werewolfTrumpSwap' ||
      state.pendingDecision.playerId !== player.id
    ) {
      throw new Error('No werewolf trump swap pending')
    }

    const roundPlayer = state.currentRound.players.find(
      (entry) => entry.playerId === player.id,
    )

    if (!roundPlayer) {
      throw new Error('Player is not part of the round')
    }

    const werewolfCard = roundPlayer.hand.find(
      (entry) => entry.type === 'special' && entry.special === 'werewolf',
    )

    if (!werewolfCard) {
      throw new Error('Werewolf is not in hand')
    }

    const currentTrumpCard = state.currentRound.trumpCard

    if (!currentTrumpCard) {
      throw new Error('No trump card available to swap')
    }

    roundPlayer.hand = roundPlayer.hand.filter(
      (entry) => entry.id !== werewolfCard.id,
    )
    roundPlayer.hand.push(currentTrumpCard)

    state.currentRound.trumpCard = werewolfCard
    state.currentRound.trumpSuit = input.suit
    state.currentRound.activePlayerId = state.currentRound.roundLeaderPlayerId
    state.phase = 'prediction'
    state.pendingDecision = null

    // Register the werewolf effect so it displays in the trump display
    registerResolvedEffect(state, {
      cardId: werewolfCard.id,
      ownerPlayerId: player.id,
      special: 'werewolf',
      note: 'trump swapped',
    })

    state.logs.push({
      id: crypto.randomUUID(),
      createdAt: nowIso(),
      type: 'specialEffect',
      messageKey: 'special.werewolf.pendingTrumpEffect',
      messageParams: {
        playerId: player.id,
        suit: input.suit ?? 'none',
        swappedCardLabel:
          currentTrumpCard.type === 'number'
            ? `${currentTrumpCard.suit} ${currentTrumpCard.value}`
            : currentTrumpCard.type === 'wizard'
              ? 'wizard'
              : currentTrumpCard.type === 'jester'
                ? 'jester'
                : currentTrumpCard.special,
      },
    })

    await persistState(lobby.id, state)

    return state
  }

  async resolveShapeShifter(input: {
    code: string
    sessionToken: string
    cardId: string
    mode: 'wizard' | 'jester'
  }) {
    const { lobby, state } = await loadStateOrThrow(input.code)
    const player = getPlayerBySessionToken(lobby, input.sessionToken)

    if (
      !state.pendingDecision ||
      state.pendingDecision.type !== 'shapeShifterChoice' ||
      state.pendingDecision.playerId !== player.id ||
      state.pendingDecision.cardId !== input.cardId
    ) {
      throw new Error('No matching shape shifter decision pending')
    }

    registerResolvedEffect(state, {
      cardId: input.cardId,
      ownerPlayerId: player.id,
      special: 'shapeShifter',
      shapeShifterMode: input.mode,
      note: 'chosen by player',
    })

    state.pendingDecision = null

    const card = removeCardFromHand(state, player.id, input.cardId)
    appendCardToCurrentTrick(state, player.id, card)

    state.logs.push({
      id: crypto.randomUUID(),
      createdAt: nowIso(),
      type: 'specialEffect',
      messageKey: 'special.shapeShifter.resolved',
      messageParams: {
        playerId: player.id,
        mode: input.mode === 'wizard' ? 'card.wizard' : 'card.jester',
      },
    })

    await continueOrResolveCurrentTrick(lobby, state, player.id)
    return state
  }

  async resolveCloud(input: {
    code: string
    sessionToken: string
    cardId: string
    suit: Suit
  }) {
    const { lobby, state } = await loadStateOrThrow(input.code)
    const player = getPlayerBySessionToken(lobby, input.sessionToken)

    if (
      !state.pendingDecision ||
      state.pendingDecision.type !== 'cloudSuitChoice' ||
      state.pendingDecision.playerId !== player.id ||
      state.pendingDecision.cardId !== input.cardId
    ) {
      throw new Error('No matching cloud decision pending')
    }

    registerResolvedEffect(state, {
      cardId: input.cardId,
      ownerPlayerId: player.id,
      special: 'cloud',
      chosenSuit: input.suit,
      chosenValue: 9.75,
      note: 'cloud suit chosen',
    })

    state.pendingDecision = null

    const card = removeCardFromHand(state, player.id, input.cardId)
    appendCardToCurrentTrick(state, player.id, card)

    state.logs.push({
      id: crypto.randomUUID(),
      createdAt: nowIso(),
      type: 'specialEffect',
      messageKey: 'special.cloud.played',
      messageParams: {
        playerId: player.id,
        suit: input.suit,
      },
    })

    await continueOrResolveCurrentTrick(lobby, state, player.id)
    return state
  }

  async resolveCloudAdjustment(input: {
    code: string
    sessionToken: string
    delta: 1 | -1
  }) {
    const { lobby, state } = await loadStateOrThrow(input.code)
    const player = getPlayerBySessionToken(lobby, input.sessionToken)

    if (
      !state.pendingDecision ||
      state.pendingDecision.type !== 'cloudPredictionAdjustment' ||
      state.pendingDecision.playerId !== player.id
    ) {
      throw new Error('No cloud prediction adjustment pending')
    }

    const roundPlayer = state.currentRound?.players.find(
      (entry) => entry.playerId === player.id,
    )

    if (!roundPlayer?.prediction || !state.currentRound) {
      throw new Error('Prediction not found')
    }

    const nextValue = roundPlayer.prediction.value + input.delta

    if (nextValue < 0 || nextValue > state.currentRound.roundNumber) {
      throw new Error('Adjusted prediction is out of range')
    }

    roundPlayer.prediction.value = nextValue
    roundPlayer.prediction.changedByCloud = true
    roundPlayer.prediction.cloudDelta = input.delta
    roundPlayer.prediction.revealed = true
    roundPlayer.pendingCloudAdjustment = false
    state.pendingDecision = null

    state.logs.push({
      id: crypto.randomUUID(),
      createdAt: nowIso(),
      type: 'specialEffect',
      messageKey: 'special.cloud.predictionAdjusted',
      messageParams: {
        playerId: player.id,
        delta: input.delta,
      },
    })

    await finishRoundAndAdvance(lobby, state)

    return state
  }

  async resolveJuggler(input: {
    code: string
    sessionToken: string
    cardId: string
    suit: Suit
  }) {
    const { lobby, state } = await loadStateOrThrow(input.code)
    const player = getPlayerBySessionToken(lobby, input.sessionToken)

    if (
      !state.pendingDecision ||
      state.pendingDecision.type !== 'jugglerSuitChoice' ||
      state.pendingDecision.playerId !== player.id ||
      state.pendingDecision.cardId !== input.cardId
    ) {
      throw new Error('No matching juggler decision pending')
    }

    registerResolvedEffect(state, {
      cardId: input.cardId,
      ownerPlayerId: player.id,
      special: 'juggler',
      chosenSuit: input.suit,
      chosenValue: 7.5,
      note: 'juggler suit chosen',
    })

    state.pendingDecision = null

    const card = removeCardFromHand(state, player.id, input.cardId)
    appendCardToCurrentTrick(state, player.id, card)

    state.logs.push({
      id: crypto.randomUUID(),
      createdAt: nowIso(),
      type: 'specialEffect',
      messageKey: 'special.juggler.played',
      messageParams: {
        playerId: player.id,
        suit: input.suit,
      },
    })

    await continueOrResolveCurrentTrick(lobby, state, player.id)
    return state
  }

  async selectJugglerPassCard(input: {
    code: string
    sessionToken: string
    cardId: string
  }) {
    const { lobby, state } = await loadStateOrThrow(input.code)
    const player = getPlayerBySessionToken(lobby, input.sessionToken)

    if (
      !state.pendingDecision ||
      state.pendingDecision.type !== 'jugglerPassCard' ||
      state.pendingDecision.playerId !== player.id
    ) {
      throw new Error('No juggler pass selection pending')
    }

    const roundPlayer = state.currentRound?.players.find(
      (entry) => entry.playerId === player.id,
    )

    if (!roundPlayer?.hand.some((card) => card.id === input.cardId)) {
      throw new Error('Card not found in hand')
    }

    state.pendingDecision.selections[player.id] = input.cardId
    state.pendingDecision.remainingPlayerIds =
      state.pendingDecision.remainingPlayerIds.filter(
        (entry) => entry !== player.id,
      )

    if (state.pendingDecision.remainingPlayerIds.length > 0) {
      state.pendingDecision.playerId =
        state.pendingDecision.remainingPlayerIds[0]
      await persistState(lobby.id, state)
      return state
    }

    const ordered = state.pendingDecision.orderedPlayerIds
    const selections = state.pendingDecision.selections

    const removedCards = ordered.map((playerId) => {
      const selectedCardId = selections[playerId]

      if (!selectedCardId) {
        throw new Error('Missing juggler selection')
      }

      return {
        fromPlayerId: playerId,
        card: removeCardFromHand(state, playerId, selectedCardId),
      }
    })

    removedCards.forEach((entry, index) => {
      const receiverPlayerId = ordered[(index + 1) % ordered.length]
      const receiver = state.currentRound?.players.find(
        (player) => player.playerId === receiverPlayerId,
      )

      if (receiver) {
        receiver.hand.push(entry.card)

        state.logs.push({
          id: crypto.randomUUID(),
          createdAt: nowIso(),
          type: 'specialEffect',
          messageKey: 'special.juggler.pass.receivedCard',
          messageParams: {
            cardLabel: getReadableCardLabel(entry.card),
          },
          visibleToPlayerId: receiverPlayerId,
        })
      }
    })

    state.logs.push({
      id: crypto.randomUUID(),
      createdAt: nowIso(),
      type: 'specialEffect',
      messageKey: 'special.juggler.pass.completed',
    })

    state.pendingDecision = null

    await persistState(lobby.id, state)

    return state
  }

  async playCard(input: {
    code: string
    sessionToken: string
    cardId: string
  }) {
    const { lobby, state } = await loadStateOrThrow(input.code)

    if (!state.currentRound) {
      throw new Error('Round not initialized')
    }

    if (state.phase !== 'playing') {
      throw new Error('Cards cannot be played right now')
    }

    const player = getPlayerBySessionToken(lobby, input.sessionToken)

    if (state.pendingDecision) {
      if (
        state.pendingDecision.type === 'jugglerPassCard' &&
        state.pendingDecision.playerId === player.id
      ) {
        throw new Error('Use the juggler pass action for this selection')
      }

      throw new Error('error.pendingDecision')
    }

    if (state.currentRound.activePlayerId !== player.id) {
      throw new Error('error.notYourTurn')
    }

    const currentTrickPlays = state.currentRound.currentTrick?.plays.length ?? 0
    if (currentTrickPlays >= state.players.length) {
      throw new Error('error.notYourTurn')
    }

    const roundPlayer = state.currentRound.players.find(
      (entry) => entry.playerId === player.id,
    )

    if (!roundPlayer) {
      throw new Error('Player is not part of the round')
    }

    const card = roundPlayer.hand.find((entry) => entry.id === input.cardId)

    if (!card) {
      throw new Error('Card not found in hand')
    }

    const currentTrick = state.currentRound.currentTrick ?? null
    const leadSuit = isFollowSuitDisabledInTrick(currentTrick, state)
      ? null
      : (currentTrick?.leadSuit ?? null)

    if (!isLegalPlay(roundPlayer.hand, card, leadSuit)) {
      throw new Error('error.illegalCardPlay')
    }

    if (card.type === 'special') {
      if (card.special === 'shapeShifter') {
        const before = handleShapeShifterBeforePlay({
          state,
          playerId: player.id,
          card,
        })

        if (before.requiresDecision) {
          await persistState(lobby.id, state)
          return state
        }
      }

      if (card.special === 'cloud') {
        state.pendingDecision = {
          id: crypto.randomUUID(),
          type: 'cloudSuitChoice',
          playerId: player.id,
          createdAt: nowIso(),
          cardId: card.id,
          special: 'cloud',
          allowedSuits: ['red', 'yellow', 'green', 'blue'],
        }

        await persistState(lobby.id, state)
        return state
      }

      if (card.special === 'juggler') {
        state.pendingDecision = {
          id: crypto.randomUUID(),
          type: 'jugglerSuitChoice',
          playerId: player.id,
          createdAt: nowIso(),
          cardId: card.id,
          special: 'juggler',
          allowedSuits: ['red', 'yellow', 'green', 'blue'],
        }

        await persistState(lobby.id, state)
        return state
      }
    }

    const playedCard = removeCardFromHand(state, player.id, card.id)
    appendCardToCurrentTrick(state, player.id, playedCard)

    const playerCount = state.players.length

    if ((state.currentRound.currentTrick?.plays.length ?? 0) < playerCount) {
      state.currentRound.activePlayerId = getNextPlayerId(
        getSeatOrderedPlayerIds(state),
        player.id,
      )

      await persistState(lobby.id, state)
      return state
    }

    // Trick resolution is triggered by a dedicated follow-up event to keep socket flow deterministic.
    await persistState(lobby.id, state)

    return state
  }

  async setReadLogEnabled(input: {
    code: string
    sessionToken: string
    enabled: boolean
  }) {
    const lobby = await loadLobbyByCode(input.code)

    if (!lobby) {
      throw new Error('error.lobbyNotFound')
    }

    const player = getPlayerBySessionToken(lobby, input.sessionToken)

    // Persist to database so setting is remembered for future sessions
    await prisma.player.update({
      where: { id: player.id },
      data: { readLogEnabled: input.enabled },
    })

    // If game is running, also update the game state
    if (lobby.gameState) {
      const state = fromJson(lobby.gameState.stateJson)
      const gamePlayer = state.players.find(
        (entry) => entry.playerId === player.id,
      )

      if (gamePlayer) {
        gamePlayer.readLogEnabled = input.enabled
        await persistState(lobby.id, state)
        return state
      }
    }

    return null
  }

  async getViewState(input: { code: string; sessionToken: string }) {
    const { lobby, state } = await loadStateOrThrow(input.code)
    const player = getPlayerBySessionToken(lobby, input.sessionToken)
    const spectators = lobby.players
      .filter((entry) => entry.role === PlayerRole.SPECTATOR && entry.connected)
      .map((entry) => entry.name)
    const playerPresence: Record<string, 'online' | 'away' | 'offline'> = {}

    // Sync player connection status from lobby to state
    for (const statePlayer of state.players) {
      const lobbyPlayer = lobby.players.find(
        (p) => p.id === statePlayer.playerId,
      )
      if (lobbyPlayer) {
        statePlayer.connected = lobbyPlayer.connected
        playerPresence[statePlayer.playerId] = !lobbyPlayer.connected
          ? 'offline'
          : lobbyPlayer.inGame
            ? 'online'
            : 'away'
      }
    }

    return createGameStateView(state, player.id, spectators, playerPresence)
  }

  async resolvePendingCompletedTrick(code: string) {
    const { lobby, state } = await loadStateOrThrow(code)

    if (!state.currentRound) {
      return
    }

    const trick = state.currentRound.currentTrick
    const playerCount = state.players.length

    // Only resolve if currentTrick exists and is complete (has all plays)
    if (trick && trick.plays.length === playerCount) {
      // All players have played - resolve the trick
      await resolveCompletedTrick(lobby, state)
    }
  }
}
