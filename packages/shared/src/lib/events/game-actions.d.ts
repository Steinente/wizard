export interface MakePredictionAction {
    type: 'makePrediction';
    playerId: string;
    value: number;
}
export interface PlayCardAction {
    type: 'playCard';
    playerId: string;
    cardId: string;
}
export interface SelectTrumpSuitAction {
    type: 'selectTrumpSuit';
    playerId: string;
    suit: 'red' | 'yellow' | 'green' | 'blue';
}
export interface ToggleAudioAction {
    type: 'toggleAudio';
    playerId: string;
    enabled: boolean;
}
export type GameAction = MakePredictionAction | PlayCardAction | SelectTrumpSuitAction | ToggleAudioAction;
