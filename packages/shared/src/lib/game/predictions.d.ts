export type VisiblePredictionValue = number | null;
export interface PlayerPrediction {
    playerId: string;
    value: number;
    revealed: boolean;
    changedByCloud: boolean;
}
export interface PredictionViewItem {
    playerId: string;
    value: VisiblePredictionValue;
    revealed: boolean;
}
