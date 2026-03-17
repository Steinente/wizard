import type { Card } from '../cards.js';
export interface DealResult {
    hands: Record<string, Card[]>;
    trumpCard: Card | null;
    remainingDeck: Card[];
}
export declare const dealCards: (deck: ReadonlyArray<Card>, playerIds: ReadonlyArray<string>, cardsPerPlayer: number) => DealResult;
