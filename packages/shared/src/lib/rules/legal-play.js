import { isNumberCard } from '../cards.js';
export const playerHasSuit = (hand, suit) => hand.some((card) => isNumberCard(card) && card.suit === suit);
export const isLegalPlay = (hand, cardToPlay, leadSuit) => {
    if (!leadSuit) {
        return hand.some((card) => card.id === cardToPlay.id);
    }
    const hasLeadSuit = playerHasSuit(hand, leadSuit);
    if (!hasLeadSuit) {
        return hand.some((card) => card.id === cardToPlay.id);
    }
    if (!isNumberCard(cardToPlay)) {
        return true;
    }
    return cardToPlay.suit === leadSuit;
};
//# sourceMappingURL=legal-play.js.map