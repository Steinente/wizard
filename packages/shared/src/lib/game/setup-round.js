import { isNumberCard } from '../cards.js';
import { dealCards } from './deal.js';
import { createDeck } from './deck.js';
import { shuffleArray } from './random.js';
const getTrumpSuit = (trumpCard) => {
    if (!trumpCard) {
        return null;
    }
    if (isNumberCard(trumpCard)) {
        return trumpCard.suit;
    }
    return null;
};
export const setupRound = (input) => {
    const cardsPerPlayer = input.currentRoundNumber;
    const playerIds = input.players
        .slice()
        .sort((a, b) => a.seatIndex - b.seatIndex)
        .map((player) => player.playerId);
    const deck = shuffleArray(createDeck({
        includeSpecialCards: input.includeSpecialCards,
    }), input.random);
    const dealResult = dealCards(deck, playerIds, cardsPerPlayer);
    const players = playerIds.map((playerId) => ({
        playerId,
        hand: dealResult.hands[playerId],
        tricksWon: 0,
        prediction: null,
    }));
    const roundLeaderIndex = (input.dealerIndex + 1) % playerIds.length;
    const roundLeaderPlayerId = playerIds[roundLeaderIndex] ?? null;
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
    };
};
export const createInitialGameState = (input) => ({
    lobbyCode: input.lobbyCode,
    lobbyStatus: 'running',
    config: input.config,
    players: input.players,
    phase: 'roundSetup',
    maxRounds: Math.floor(60 / input.players.length),
    currentRound: null,
    scoreboard: [],
    logs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
});
//# sourceMappingURL=setup-round.js.map