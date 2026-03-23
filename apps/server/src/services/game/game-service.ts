import type { PlayerPrediction, SpecialCardKey, Suit } from '@wizard/shared'
import {
  getAllowedPredictionValues,
  isLegalPlay,
  SPECIAL_CARD_KEYS,
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
  parseSpecialCardSettings,
  serializeSpecialCardSettings,
} from './game-service-support.js'
import { createGameStateView } from './game-state-view.js'
import {
  buildInitialState,
  continueOrResolveCurrentTrick,
  finishRoundAndAdvance,
  resolveCompletedTrick,
} from './lifecycle/index.js'
import {
  enqueueCloudPredictionAdjustmentDecision,
  resolveCloudAdjustmentDecision,
  handleCloudBeforePlay,
  handleJugglerBeforePlay,
  handleShapeShifterBeforePlay,
  resolveCloudDecision,
  resolveJugglerDecision,
  resolveShapeShifterDecision,
  resolveWerewolfTrumpSwapDecision,
  selectJugglerPassCardSelection,
} from './specials/index.js'

export class GameService {
  private static readonly CHAT_MESSAGE_LIMIT = 200

  private randomizeSpecialCards(): SpecialCardKey[] {
    const shuffled = [...SPECIAL_CARD_KEYS].sort(() => Math.random() - 0.5)
    const count = Math.floor(Math.random() * SPECIAL_CARD_KEYS.length) + 1
    return shuffled.slice(0, count)
  }

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

    const specialCardSettings = parseSpecialCardSettings(
      lobby.includedSpecialCards,
    )

    const randomizedIncludedSpecialCards =
      specialCardSettings.specialCardsRandomizerEnabled
        ? this.randomizeSpecialCards()
        : null

    if (randomizedIncludedSpecialCards) {
      lobby.includedSpecialCards = serializeSpecialCardSettings({
        includedSpecialCards: randomizedIncludedSpecialCards,
        cloudRuleTiming: specialCardSettings.cloudRuleTiming,
        specialCardsRandomizerEnabled:
          specialCardSettings.specialCardsRandomizerEnabled,
      })
    }

    const state = buildInitialState(lobby)

    await prisma.lobby.update({
      where: { id: lobby.id },
      data: {
        status: LobbyStatus.RUNNING,
        hostDisconnectedAt: null,
        hostDisconnectDeadline: null,
        includedSpecialCards: randomizedIncludedSpecialCards
          ? lobby.includedSpecialCards
          : undefined,
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

    const player = getPlayerBySessionToken(lobby, input.sessionToken)

    resolveWerewolfTrumpSwapDecision({
      state,
      playerId: player.id,
      suit: input.suit,
      registerResolvedEffect: (effect) => registerResolvedEffect(state, effect),
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

    resolveShapeShifterDecision({
      state,
      playerId: player.id,
      cardId: input.cardId,
      mode: input.mode,
      registerResolvedEffect: (effect) => registerResolvedEffect(state, effect),
      removeCardFromHand: (targetPlayerId, cardId) =>
        removeCardFromHand(state, targetPlayerId, cardId),
      appendCardToCurrentTrick: (targetPlayerId, card) =>
        appendCardToCurrentTrick(state, targetPlayerId, card),
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

    resolveCloudDecision({
      state,
      playerId: player.id,
      cardId: input.cardId,
      suit: input.suit,
      registerResolvedEffect: (effect) => registerResolvedEffect(state, effect),
      removeCardFromHand: (targetPlayerId, cardId) =>
        removeCardFromHand(state, targetPlayerId, cardId),
      appendCardToCurrentTrick: (targetPlayerId, card) =>
        appendCardToCurrentTrick(state, targetPlayerId, card),
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

    await resolveCloudAdjustmentDecision({
      state,
      playerId: player.id,
      delta: input.delta,
      continueAfterAdjustment: async () => {
        if (!state.currentRound) {
          await persistState(lobby.id, state)
          return
        }

        const isRoundComplete =
          state.currentRound.completedTricks.length >=
          state.currentRound.roundNumber

        if (isRoundComplete) {
          await finishRoundAndAdvance(lobby, state)
          return
        }

        await persistState(lobby.id, state)
      },
    })

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

    resolveJugglerDecision({
      state,
      playerId: player.id,
      cardId: input.cardId,
      suit: input.suit,
      registerResolvedEffect: (effect) => registerResolvedEffect(state, effect),
      removeCardFromHand: (targetPlayerId, cardId) =>
        removeCardFromHand(state, targetPlayerId, cardId),
      appendCardToCurrentTrick: (targetPlayerId, card) =>
        appendCardToCurrentTrick(state, targetPlayerId, card),
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

    const result = selectJugglerPassCardSelection({
      state,
      playerId: player.id,
      cardId: input.cardId,
      removeCardFromHand: (targetPlayerId, cardId) =>
        removeCardFromHand(state, targetPlayerId, cardId),
      getReadableCardLabel,
    })

    await persistState(lobby.id, state)

    if (!result.completed) {
      return state
    }

    if (state.config.cloudRuleTiming === 'immediateAfterTrick') {
      const roundPlayerWithPendingCloud = state.currentRound?.players.find(
        (entry) => entry.pendingCloudAdjustment,
      )

      if (roundPlayerWithPendingCloud) {
        enqueueCloudPredictionAdjustmentDecision({
          state,
          playerId: roundPlayerWithPendingCloud.playerId,
        })
        await persistState(lobby.id, state)
      }
    }

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
        const before = handleCloudBeforePlay({
          state,
          playerId: player.id,
          card,
        })

        if (before.requiresDecision) {
          await persistState(lobby.id, state)
          return state
        }
      }

      if (card.special === 'juggler') {
        const before = handleJugglerBeforePlay({
          state,
          playerId: player.id,
          card,
        })

        if (before.requiresDecision) {
          await persistState(lobby.id, state)
          return state
        }
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

  async sendChatMessage(input: {
    code: string
    sessionToken: string
    text: string
  }) {
    const { lobby, state } = await loadStateOrThrow(input.code)
    const player = getPlayerBySessionToken(lobby, input.sessionToken)
    const text = input.text.trim()

    if (!text.length) {
      throw new Error('error.chatMessageEmpty')
    }

    if (text.length > 300) {
      throw new Error('error.chatMessageTooLong')
    }

    const senderRole: 'host' | 'player' | 'spectator' =
      player.role === PlayerRole.HOST
        ? 'host'
        : player.role === PlayerRole.SPECTATOR
          ? 'spectator'
          : 'player'

    state.chatMessages.push({
      id: crypto.randomUUID(),
      createdAt: nowIso(),
      senderPlayerId: player.id,
      senderName: player.name,
      senderRole,
      text,
    })

    if (state.chatMessages.length > GameService.CHAT_MESSAGE_LIMIT) {
      state.chatMessages.splice(
        0,
        state.chatMessages.length - GameService.CHAT_MESSAGE_LIMIT,
      )
    }

    await persistState(lobby.id, state)

    return state
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
