import { evaluateCardStrength, getLeadSuitFromCard, } from '../rules/card-ranking.js';
export const resolveTrickWinner = (trick, trumpSuit) => {
    const derivedLeadSuit = trick.leadSuit ??
        trick.plays.map((play) => getLeadSuitFromCard(play.card)).find(Boolean) ??
        null;
    let winnerPlayerId = null;
    let winningCard = null;
    let winningStrength = -1;
    for (const play of trick.plays) {
        const evaluated = evaluateCardStrength(play.card, derivedLeadSuit, trumpSuit);
        if (evaluated.strength > winningStrength) {
            winningStrength = evaluated.strength;
            winnerPlayerId = play.playerId;
            winningCard = play.card;
        }
    }
    return {
        ...trick,
        leadSuit: derivedLeadSuit,
        winnerPlayerId,
        winningCard,
    };
};
//# sourceMappingURL=trick-resolution.js.map