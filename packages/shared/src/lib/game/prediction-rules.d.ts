import type { GameConfig } from '../game-config.js';
import type { PlayerPrediction } from './predictions.js';
export declare const getPredictionSum: (predictions: ReadonlyArray<PlayerPrediction | null>) => number;
export declare const validatePredictionRestriction: (input: {
    config: GameConfig;
    predictions: ReadonlyArray<PlayerPrediction | null>;
    trickCount: number;
}) => boolean;
export declare const applyCloudPredictionDelta: (currentPrediction: number, trickCount: number) => number;
