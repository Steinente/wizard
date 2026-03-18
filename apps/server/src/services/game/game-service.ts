import type {
  Card,
  GameConfig,
  PlayerPrediction,
  Suit,
  WizardGameState,
} from '@wizard/shared'
import {
  calculateRoundScore,
  createInitialGameState,
  isLegalPlay,
  resolveTrickWinner,
  setupRound,
  validatePredictionRestriction,
} from '@wizard/shared'
import crypto from 'node:crypto'
import { prisma } from '../../db/prisma.js'
import type { Prisma } from '../../generated/prisma/client.js'
import {
  LobbyStatus,
  OpenPredictionRestriction,
  PlayerRole,
  PredictionVisibility,
} from '../../generated/prisma/client.js'
import { mapLobbyToSummary } from '../lobby-mapper.js'
import { createGameStateView } from './game-state-view.js'
import { handleShapeShifterBeforePlay } from './specials/index.js'

type LobbyWithPlayers = Awaited<ReturnType<typeof loadLobbyByCode>>

const normalizeCode = (code: string) => code.trim().toUpperCase()

const toPredictionVisibility = (
  value: PredictionVisibility,
): GameConfig['predictionVisibility'] =>
  value === PredictionVisibility.HIDDEN
    ? 'hidden'
    : value === PredictionVisibility.SECRET
      ? 'secret'
      : 'open'

const toOpenPredictionRestriction = (
  value: OpenPredictionRestriction,
): GameConfig['openPredictionRestriction'] =>
  value === OpenPredictionRestriction.MUST_EQUAL_TRICKS
    ? 'mustEqualTricks'
    : value === OpenPredictionRestriction.MUST_NOT_EQUAL_TRICKS
      ? 'mustNotEqualTricks'
      : 'none'

const lobbyConfigToShared = (
  lobby: NonNullable<LobbyWithPlayers>,
): GameConfig => ({
  predictionVisibility: toPredictionVisibility(lobby.predictionVisibility),
  openPredictionRestriction: toOpenPredictionRestriction(
    lobby.openPredictionRestriction,
  ),
  audioEnabledByDefault: lobby.audioEnabledByDefault,
  languageDefault: lobby.languageDefault === 'de' ? 'de' : 'en',
  allowIncludedSpecialCards: lobby.allowIncludedSpecialCards,
})

const loadLobbyByCode = async (code: string) =>
  prisma.lobby.findUnique({
    where: { code: normalizeCode(code) },
    include: {
      players: {
        orderBy: {
          joinedAt: 'asc',
        },
      },
      gameState: true,
    },
  })

const toJson = (value: WizardGameState): Prisma.JsonObject =>
  JSON.parse(JSON.stringify(value)) as Prisma.JsonObject

const fromJson = (value: unknown): WizardGameState => value as WizardGameState

const nowIso = () => new Date().toISOString()

const getPlayerBySessionToken = (
  lobby: NonNullable<LobbyWithPlayers>,
  sessionToken: string,
) => {
  const player = lobby.players.find(
    (entry) => entry.sessionToken === sessionToken,
  )

  if (!player) {
    throw new Error('Player not found in lobby')
  }

  return player
}

const getSeatOrderedPlayerIds = (state: WizardGameState) =>
  state.players
    .slice()
    .sort((a, b) => a.seatIndex - b.seatIndex)
    .map((player) => player.playerId)

const getNextPlayerId = (
  orderedPlayerIds: string[],
  currentPlayerId: string,
): string | null => {
  const index = orderedPlayerIds.findIndex(
    (playerId) => playerId === currentPlayerId,
  )

  if (index === -1) {
    return null
  }

  return orderedPlayerIds[(index + 1) % orderedPlayerIds.length] ?? null
}

const ensurePredictionRevealedForScoring = (state: WizardGameState) => {
  if (!state.currentRound) {
    return
  }

  for (const player of state.currentRound.players) {
    if (player.prediction) {
      player.prediction.revealed = true
    }
  }
}

const getReadableCardLabel = (card: Card): string => {
  if (card.type === 'number') {
    return `${card.suit} ${card.value}`
  }

  if (card.type === 'wizard') {
    return 'wizard'
  }

  if (card.type === 'jester') {
    return 'jester'
  }

  return card.special
}

const getResolvedEffectForCard = (state: WizardGameState, cardId: string) =>
  state.resolvedCardEffects.find((entry) => entry.cardId === cardId)

const disablesFollowSuitAsLeadCard = (
  card: Card,
  state: WizardGameState,
): boolean => {
  if (card.type === 'wizard') {
    return true
  }

  if (card.type === 'special' && card.special === 'dragon') {
    return true
  }

  if (card.type === 'special' && card.special === 'shapeShifter') {
    return (
      getResolvedEffectForCard(state, card.id)?.shapeShifterMode === 'wizard'
    )
  }

  return false
}

const isFollowSuitDisabledInTrick = (
  trick: NonNullable<WizardGameState['currentRound']>['currentTrick'] | null,
  state: WizardGameState,
): boolean => {
  const firstPlay = trick?.plays[0]

  if (!firstPlay) {
    return false
  }

  return disablesFollowSuitAsLeadCard(firstPlay.card, state)
}

const getHypotheticalNextLeaderPlayerId = (
  trick: NonNullable<WizardGameState['currentRound']>['currentTrick'],
  trumpSuit: Suit | null,
  resolvedEffects: WizardGameState['resolvedCardEffects'],
): string | null => {
  if (!trick) {
    return null
  }

  const filteredPlays = trick.plays.filter(
    (play) => !(play.card.type === 'special' && play.card.special === 'bomb'),
  )

  if (!filteredPlays.length) {
    return trick.leadPlayerId
  }

  const simulated = resolveTrickWinner(
    {
      ...trick,
      plays: filteredPlays,
      cancelledByBomb: false,
    },
    trumpSuit,
    resolvedEffects,
  )

  return simulated.winnerPlayerId
}

const getWerewolfOwnerPlayerId = (state: WizardGameState): string | null => {
  if (!state.currentRound) {
    return null
  }

  const owner = state.currentRound.players.find((player) =>
    player.hand.some(
      (card) => card.type === 'special' && card.special === 'werewolf',
    ),
  )

  return owner?.playerId ?? null
}

const SPECIAL_TRUMP_CARDS = [
  'shapeShifter',
  'dragon',
  'werewolf',
  'juggler',
  'cloud',
] as const

const getPlayerBeforeRoundLeader = (state: WizardGameState): string | null => {
  if (!state.currentRound) {
    return null
  }

  const players = state.players
  const roundLeaderPlayerId = state.currentRound.roundLeaderPlayerId
  const roundLeaderIndex = players.findIndex(
    (player) => player.playerId === roundLeaderPlayerId,
  )

  if (roundLeaderIndex === -1) {
    return null
  }

  const previousIndex =
    roundLeaderIndex === 0 ? players.length - 1 : roundLeaderIndex - 1
  return players[previousIndex].playerId
}

export class GameService {
  private async persistState(lobbyId: string, state: WizardGameState) {
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

  // Centralizes start-of-round decision flow so initial setup and next rounds stay in sync.
  private applyRoundStartState(state: WizardGameState) {
    if (!state.currentRound) {
      throw new Error('Round not initialized')
    }

    const round = state.currentRound
    const werewolfOwnerPlayerId = getWerewolfOwnerPlayerId(state)

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
      return
    }

    if (round.trumpCard?.type === 'wizard') {
      state.phase = 'trumpSelection'
      round.activePlayerId = getPlayerBeforeRoundLeader(state)
      state.pendingDecision = round.activePlayerId
        ? {
            id: crypto.randomUUID(),
            type: 'selectTrumpSuit',
            playerId: round.activePlayerId,
            createdAt: nowIso(),
            special: 'wizard',
          }
        : null
      return
    }

    if (
      round.trumpCard?.type === 'special' &&
      SPECIAL_TRUMP_CARDS.includes(round.trumpCard.special as any)
    ) {
      state.phase = 'trumpSelection'
      round.activePlayerId = getPlayerBeforeRoundLeader(state)
      state.pendingDecision = round.activePlayerId
        ? {
            id: crypto.randomUUID(),
            type: 'selectTrumpSuit',
            playerId: round.activePlayerId,
            createdAt: nowIso(),
            special: round.trumpCard.special,
          }
        : null
      return
    }

    state.phase = 'prediction'
    round.activePlayerId = round.roundLeaderPlayerId
    state.pendingDecision = null

    if (round.trumpSuit === null && round.trumpCard !== null) {
      state.logs.push({
        id: crypto.randomUUID(),
        createdAt: nowIso(),
        type: 'system',
        messageKey: 'game.trump.noTrumpDueToCard',
        messageParams: {
          cardLabel: getReadableCardLabel(round.trumpCard),
        },
      })
    } else {
      state.logs.push({
        id: crypto.randomUUID(),
        createdAt: nowIso(),
        type: 'system',
        messageKey: 'game.trump.roundStart',
        messageParams: {
          suit: round.trumpSuit ?? 'none',
        },
      })
    }
  }

  private async continueOrResolveCurrentTrick(
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
      await this.persistState(lobby.id, state)
      return
    }

    // Mirror normal card play flow: persist the completed trick first so clients
    // can see the final card, and let the socket handler trigger delayed resolution.
    await this.persistState(lobby.id, state)
  }

  private buildInitialState(
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
      audioEnabled: player.audioEnabled ?? config.audioEnabledByDefault,
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
      includeSpecialCards: config.allowIncludedSpecialCards,
    })

    state.currentRound = round

    state.logs.push({
      id: crypto.randomUUID(),
      createdAt: nowIso(),
      type: 'system',
      messageKey: 'game.started',
    })

    this.applyRoundStartState(state)

    return state
  }

  private async loadStateOrThrow(code: string) {
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

  private registerResolvedEffect(
    state: WizardGameState,
    effect: WizardGameState['resolvedCardEffects'][number],
  ) {
    state.resolvedCardEffects = state.resolvedCardEffects.filter(
      (entry) => entry.cardId !== effect.cardId,
    )
    state.resolvedCardEffects.push(effect)
  }

  private removeCardFromHand(
    state: WizardGameState,
    playerId: string,
    cardId: string,
  ): Card {
    const roundPlayer = state.currentRound?.players.find(
      (entry) => entry.playerId === playerId,
    )

    if (!roundPlayer) {
      throw new Error('Player is not part of the round')
    }

    const card = roundPlayer.hand.find((entry) => entry.id === cardId)

    if (!card) {
      throw new Error('Card not found in hand')
    }

    roundPlayer.hand = roundPlayer.hand.filter((entry) => entry.id !== cardId)

    return card
  }

  private appendCardToCurrentTrick(
    state: WizardGameState,
    playerId: string,
    card: Card,
  ) {
    if (!state.currentRound) {
      throw new Error('Round not initialized')
    }

    const trick = state.currentRound.currentTrick ?? {
      leadPlayerId: playerId,
      leadSuit: null,
      plays: [],
      winnerPlayerId: null,
      winningCard: null,
      cancelledByBomb: false,
    }

    trick.plays.push({
      playerId,
      card,
      playedAt: nowIso(),
    })

    if (!trick.leadSuit && !isFollowSuitDisabledInTrick(trick, state)) {
      if (card.type === 'number') {
        trick.leadSuit = card.suit
      } else if (card.type === 'special') {
        const effect = getResolvedEffectForCard(state, card.id)
        if (effect?.chosenSuit) {
          trick.leadSuit = effect.chosenSuit
        }
      }
    }

    state.currentRound.currentTrick = trick

    // Don't log shape shifter, juggler or cloud plays here - the detailed logs are created when resolving special effects
    if (
      card.type !== 'special' ||
      (card.special !== 'shapeShifter' &&
        card.special !== 'juggler' &&
        card.special !== 'cloud')
    ) {
      state.logs.push({
        id: crypto.randomUUID(),
        createdAt: nowIso(),
        type: 'cardPlayed',
        messageKey: 'game.card.played',
        messageParams: {
          playerId,
          cardLabel: getReadableCardLabel(card),
        },
      })
    }
  }

  private async finishRoundAndAdvance(
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
      const predicted = player.prediction?.value ?? 0
      const won = player.tricksWon
      const delta = calculateRoundScore(predicted, won)
      const previousTotal = totals.get(player.playerId) ?? 0
      const nextTotal = previousTotal + delta

      totals.set(player.playerId, nextTotal)

      state.scoreboard.push({
        playerId: player.playerId,
        roundNumber: state.currentRound.roundNumber,
        predicted,
        won,
        delta,
        total: nextTotal,
        predictionAdjustment: player.prediction?.cloudDelta ?? 0,
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

      await this.persistState(lobby.id, state)
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
      includeSpecialCards: state.config.allowIncludedSpecialCards,
    })

    state.currentRound = nextRound
    this.applyRoundStartState(state)

    await this.persistState(lobby.id, state)
  }

  private beginJugglerPassDecision(state: WizardGameState) {
    if (!state.currentRound) {
      return
    }

    const orderedPlayerIds = getSeatOrderedPlayerIds(state)
    const eligible = orderedPlayerIds.filter((playerId) => {
      const roundPlayer = state.currentRound?.players.find(
        (entry) => entry.playerId === playerId,
      )
      return !!roundPlayer && roundPlayer.hand.length > 0
    })

    if (!eligible.length) {
      return
    }

    state.logs.push({
      id: crypto.randomUUID(),
      createdAt: nowIso(),
      type: 'specialEffect',
      messageKey: 'special.juggler.pass.started',
    })

    state.pendingDecision = {
      id: crypto.randomUUID(),
      type: 'jugglerPassCard',
      playerId: eligible[0],
      createdAt: nowIso(),
      special: 'juggler',
      orderedPlayerIds: eligible,
      selections: {},
      remainingPlayerIds: eligible,
    }
  }

  private async resolveCompletedTrick(
    lobby: NonNullable<LobbyWithPlayers>,
    state: WizardGameState,
  ) {
    if (!state.currentRound?.currentTrick) {
      throw new Error('No active trick')
    }

    const trick = state.currentRound.currentTrick

    const resolvedTrick = resolveTrickWinner(
      trick,
      state.currentRound.trumpSuit,
      state.resolvedCardEffects,
    )

    state.currentRound.currentTrick = null
    state.currentRound.completedTricks.push(resolvedTrick)

    const playedJuggler = resolvedTrick.plays.find(
      (play) => play.card.type === 'special' && play.card.special === 'juggler',
    )
    const playedCloud = resolvedTrick.plays.find(
      (play) => play.card.type === 'special' && play.card.special === 'cloud',
    )

    const hypotheticalLeaderPlayerId = getHypotheticalNextLeaderPlayerId(
      trick,
      state.currentRound.trumpSuit,
      state.resolvedCardEffects,
    )

    if (resolvedTrick.cancelledByBomb) {
      state.logs.push({
        id: crypto.randomUUID(),
        createdAt: nowIso(),
        type: 'specialEffect',
        messageKey: 'game.trick.canceledByBomb',
      })
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
          cloudWinner.pendingCloudAdjustment = true
        }
      }
    }

    state.resolvedCardEffects = []

    const isLastTrick =
      state.currentRound.completedTricks.length >=
      state.currentRound.roundNumber

    if (isLastTrick) {
      // Look for cloud in ANY completed trick of this round, not just the last one
      let cloudTrickWinner: string | null = null
      let cloudCardId: string | null = null

      for (const completedTrick of state.currentRound.completedTricks) {
        const cloud = completedTrick.plays.find(
          (play) =>
            play.card.type === 'special' && play.card.special === 'cloud',
        )

        if (cloud && completedTrick.winnerPlayerId) {
          cloudTrickWinner = completedTrick.winnerPlayerId
          cloudCardId = cloud.card.id
          break
        }
      }

      if (cloudTrickWinner && cloudCardId) {
        const winnerState = state.currentRound.players.find(
          (entry) => entry.playerId === cloudTrickWinner,
        )

        if (winnerState?.prediction) {
          state.pendingDecision = {
            id: crypto.randomUUID(),
            type: 'cloudPredictionAdjustment',
            playerId: cloudTrickWinner,
            createdAt: nowIso(),
            cardId: cloudCardId,
            special: 'cloud',
            currentPrediction: winnerState.prediction.value,
          }

          // Keep the current phase as 'playing' but with pending decision
          await this.persistState(lobby.id, state)
          return
        }
      }

      await this.finishRoundAndAdvance(lobby, state)
      return
    }

    state.currentRound.activePlayerId =
      hypotheticalLeaderPlayerId ??
      resolvedTrick.winnerPlayerId ??
      state.currentRound.roundLeaderPlayerId

    if (playedJuggler) {
      this.beginJugglerPassDecision(state)
    }

    await this.persistState(lobby.id, state)
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

    const state = this.buildInitialState(lobby)

    await prisma.lobby.update({
      where: { id: lobby.id },
      data: {
        status: LobbyStatus.RUNNING,
        hostDisconnectedAt: null,
        hostDisconnectDeadline: null,
      },
    })

    await this.persistState(lobby.id, state)

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
    const { lobby, state } = await this.loadStateOrThrow(input.code)

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

    await this.persistState(lobby.id, state)

    return state
  }

  async selectTrumpSuit(input: {
    code: string
    sessionToken: string
    suit: Suit
  }) {
    const { lobby, state } = await this.loadStateOrThrow(input.code)

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

    state.currentRound.trumpSuit = input.suit
    state.phase = 'prediction'
    state.currentRound.activePlayerId = state.currentRound.roundLeaderPlayerId
    const triggeringSpecial = state.pendingDecision.special
    state.pendingDecision = null

    state.logs.push({
      id: crypto.randomUUID(),
      createdAt: nowIso(),
      type: 'system',
      messageKey: triggeringSpecial
        ? 'game.trump.selected.bySpecial'
        : 'game.trump.selected',
      messageParams: {
        suit: input.suit,
        ...(triggeringSpecial && { special: triggeringSpecial }),
      },
    })

    await this.persistState(lobby.id, state)

    return state
  }

  async resolveWerewolfTrumpSwap(input: {
    code: string
    sessionToken: string
    suit: Suit | null
  }) {
    const { lobby, state } = await this.loadStateOrThrow(input.code)

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
    this.registerResolvedEffect(state, {
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

    await this.persistState(lobby.id, state)

    return state
  }

  async resolveShapeShifter(input: {
    code: string
    sessionToken: string
    cardId: string
    mode: 'wizard' | 'jester'
  }) {
    const { lobby, state } = await this.loadStateOrThrow(input.code)
    const player = getPlayerBySessionToken(lobby, input.sessionToken)

    if (
      !state.pendingDecision ||
      state.pendingDecision.type !== 'shapeShifterChoice' ||
      state.pendingDecision.playerId !== player.id ||
      state.pendingDecision.cardId !== input.cardId
    ) {
      throw new Error('No matching shape shifter decision pending')
    }

    this.registerResolvedEffect(state, {
      cardId: input.cardId,
      ownerPlayerId: player.id,
      special: 'shapeShifter',
      shapeShifterMode: input.mode,
      note: 'chosen by player',
    })

    state.pendingDecision = null

    const card = this.removeCardFromHand(state, player.id, input.cardId)
    this.appendCardToCurrentTrick(state, player.id, card)

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

    await this.continueOrResolveCurrentTrick(lobby, state, player.id)
    return state
  }

  async resolveCloud(input: {
    code: string
    sessionToken: string
    cardId: string
    suit: Suit
  }) {
    const { lobby, state } = await this.loadStateOrThrow(input.code)
    const player = getPlayerBySessionToken(lobby, input.sessionToken)

    if (
      !state.pendingDecision ||
      state.pendingDecision.type !== 'cloudSuitChoice' ||
      state.pendingDecision.playerId !== player.id ||
      state.pendingDecision.cardId !== input.cardId
    ) {
      throw new Error('No matching cloud decision pending')
    }

    this.registerResolvedEffect(state, {
      cardId: input.cardId,
      ownerPlayerId: player.id,
      special: 'cloud',
      chosenSuit: input.suit,
      chosenValue: 9.75,
      note: 'cloud suit chosen',
    })

    state.pendingDecision = null

    const card = this.removeCardFromHand(state, player.id, input.cardId)
    this.appendCardToCurrentTrick(state, player.id, card)

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

    await this.continueOrResolveCurrentTrick(lobby, state, player.id)
    return state
  }

  async resolveCloudAdjustment(input: {
    code: string
    sessionToken: string
    delta: 1 | -1
  }) {
    const { lobby, state } = await this.loadStateOrThrow(input.code)
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

    await this.finishRoundAndAdvance(lobby, state)

    return state
  }

  async resolveJuggler(input: {
    code: string
    sessionToken: string
    cardId: string
    suit: Suit
  }) {
    const { lobby, state } = await this.loadStateOrThrow(input.code)
    const player = getPlayerBySessionToken(lobby, input.sessionToken)

    if (
      !state.pendingDecision ||
      state.pendingDecision.type !== 'jugglerSuitChoice' ||
      state.pendingDecision.playerId !== player.id ||
      state.pendingDecision.cardId !== input.cardId
    ) {
      throw new Error('No matching juggler decision pending')
    }

    this.registerResolvedEffect(state, {
      cardId: input.cardId,
      ownerPlayerId: player.id,
      special: 'juggler',
      chosenSuit: input.suit,
      chosenValue: 7.5,
      note: 'juggler suit chosen',
    })

    state.pendingDecision = null

    const card = this.removeCardFromHand(state, player.id, input.cardId)
    this.appendCardToCurrentTrick(state, player.id, card)

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

    await this.continueOrResolveCurrentTrick(lobby, state, player.id)
    return state
  }

  async selectJugglerPassCard(input: {
    code: string
    sessionToken: string
    cardId: string
  }) {
    const { lobby, state } = await this.loadStateOrThrow(input.code)
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
      await this.persistState(lobby.id, state)
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
        card: this.removeCardFromHand(state, playerId, selectedCardId),
      }
    })

    removedCards.forEach((entry, index) => {
      const receiverPlayerId = ordered[(index + 1) % ordered.length]
      const receiver = state.currentRound?.players.find(
        (player) => player.playerId === receiverPlayerId,
      )

      if (receiver) {
        receiver.hand.push(entry.card)
      }
    })

    state.logs.push({
      id: crypto.randomUUID(),
      createdAt: nowIso(),
      type: 'specialEffect',
      messageKey: 'special.juggler.pass.completed',
    })

    state.pendingDecision = null

    await this.persistState(lobby.id, state)

    return state
  }

  async playCard(input: {
    code: string
    sessionToken: string
    cardId: string
  }) {
    const { lobby, state } = await this.loadStateOrThrow(input.code)

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
          await this.persistState(lobby.id, state)
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

        await this.persistState(lobby.id, state)
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

        await this.persistState(lobby.id, state)
        return state
      }
    }

    const playedCard = this.removeCardFromHand(state, player.id, card.id)
    this.appendCardToCurrentTrick(state, player.id, playedCard)

    const playerCount = state.players.length

    if ((state.currentRound.currentTrick?.plays.length ?? 0) < playerCount) {
      state.currentRound.activePlayerId = getNextPlayerId(
        getSeatOrderedPlayerIds(state),
        player.id,
      )

      await this.persistState(lobby.id, state)
      return state
    }

    // Trick resolution is triggered by a dedicated follow-up event to keep socket flow deterministic.
    await this.persistState(lobby.id, state)

    return state
  }

  async setAudioEnabled(input: {
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
      data: { audioEnabled: input.enabled },
    })

    // If game is running, also update the game state
    if (lobby.gameState) {
      const state = fromJson(lobby.gameState.stateJson)
      const gamePlayer = state.players.find(
        (entry) => entry.playerId === player.id,
      )

      if (gamePlayer) {
        gamePlayer.audioEnabled = input.enabled
        await this.persistState(lobby.id, state)
        return state
      }
    }

    return null
  }

  async getViewState(input: { code: string; sessionToken: string }) {
    const { lobby, state } = await this.loadStateOrThrow(input.code)
    const player = getPlayerBySessionToken(lobby, input.sessionToken)

    // Sync player connection status from lobby to state
    for (const statePlayer of state.players) {
      const lobbyPlayer = lobby.players.find(
        (p) => p.id === statePlayer.playerId,
      )
      if (lobbyPlayer) {
        statePlayer.connected = lobbyPlayer.connected
      }
    }

    return createGameStateView(state, player.id)
  }

  async resolvePendingCompletedTrick(code: string) {
    const { lobby, state } = await this.loadStateOrThrow(code)

    if (!state.currentRound) {
      return
    }

    const trick = state.currentRound.currentTrick
    const playerCount = state.players.length

    // Only resolve if currentTrick exists and is complete (has all plays)
    if (trick && trick.plays.length === playerCount) {
      // All players have played - resolve the trick
      await this.resolveCompletedTrick(lobby, state)
    }
  }
}
