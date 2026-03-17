export interface PlayerScoreEntry {
    playerId: string;
    roundNumber: number;
    predicted: number;
    won: number;
    delta: number;
    total: number;
}
export declare const calculateRoundScore: (predicted: number, won: number) => number;
