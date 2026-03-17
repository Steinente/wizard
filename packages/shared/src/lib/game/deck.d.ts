import { type Card, type SpecialCardKey } from '../cards.js';
export interface DeckBuildOptions {
    includeSpecialCards?: boolean;
    includedSpecials?: ReadonlyArray<SpecialCardKey>;
}
export declare const createDeck: (options?: DeckBuildOptions) => Card[];
