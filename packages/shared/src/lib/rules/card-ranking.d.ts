import type { Card, Suit } from '../cards.js';
export interface EvaluatedCardStrength {
    card: Card;
    strength: number;
    reason: 'wizard' | 'trump' | 'leadSuit' | 'number' | 'jester' | 'special';
}
export declare const getLeadSuitFromCard: (card: Card) => Suit | null;
export declare const evaluateCardStrength: (card: Card, leadSuit: Suit | null, trumpSuit: Suit | null) => EvaluatedCardStrength;
