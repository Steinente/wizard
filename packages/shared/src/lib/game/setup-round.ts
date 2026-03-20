import type { Card, SpecialCardKey, Suit } from '../cards.js'
import { isNumberCard } from '../cards.js'
import { dealCards } from './deal.js'
import { createDeck } from './deck.js'
import { shuffleArray } from './random.js'
import type { RoundPlayerState, RoundState } from './round.js'
import type { WizardGameState } from './state.js'

export interface SetupRoundInput {
  lobbyCode: string
  players: Array<{
    playerId: string
    name: string
    connected: boolean
    isHost: boolean
    readLogEnabled: boolean
    seatIndex: number
  }>
  currentRoundNumber: number
  dealerIndex: number
  includedSpecialCards: ReadonlyArray<SpecialCardKey>
  random?: () => number
}

const getTrumpSuit = (trumpCard: Card | null): Suit | null => {
  if (!trumpCard) {
    return null
  }

  if (isNumberCard(trumpCard)) {
    return trumpCard.suit
  }

  return null
}

export const setupRound = (input: SetupRoundInput): RoundState => {
  const cardsPerPlayer = input.currentRoundNumber
  const playerIds = input.players
    .slice()
    .sort((a, b) => a.seatIndex - b.seatIndex)
    .map((player) => player.playerId)

  const deck = shuffleArray(
    createDeck({
      includedSpecials: input.includedSpecialCards,
    }),
    input.random,
  )

  const dealResult = dealCards(deck, playerIds, cardsPerPlayer)

  const players: RoundPlayerState[] = playerIds.map((playerId) => ({
    playerId,
    hand: dealResult.hands[playerId],
    tricksWon: 0,
    prediction: null,
  }))

  const roundLeaderIndex = (input.dealerIndex + 1) % playerIds.length
  const roundLeaderPlayerId = playerIds[roundLeaderIndex] ?? null

  return {
    roundNumber: input.currentRoundNumber,
    dealerIndex: input.dealerIndex,
    activePlayerId: roundLeaderPlayerId,
    roundLeaderPlayerId,
    trumpSuit: getTrumpSuit(dealResult.trumpCard),
    trumpCard: dealResult.trumpCard,
    deckRemainderCount: dealResult.remainingDeck.length,
    players,
    currentTrick: null,
    completedTricks: [],
  }
}

export const createInitialGameState = (input: {
  lobbyCode: string
  config: WizardGameState['config']
  players: WizardGameState['players']
}): WizardGameState => ({
  lobbyCode: input.lobbyCode,
  lobbyStatus: 'running',
  config: input.config,
  players: input.players,
  phase: 'roundSetup',
  maxRounds: Math.floor(60 / input.players.length),
  currentRound: null,
  scoreboard: [],
  logs: [],
  pendingDecision: null,
  resolvedCardEffects: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})
