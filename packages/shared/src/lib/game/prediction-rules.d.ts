import type { GameConfig } from '../game-config.js';
type PredictionLike = {
    value: number | null;
} | null;
export declare const getPredictionSum: (predictions: ReadonlyArray<PredictionLike>) => number;
export declare const validatePredictionRestriction: (input: {
    config: GameConfig;
    predictions: ReadonlyArray<PredictionLike>;
    trickCount: number;
}) => boolean;
export declare const getAllowedPredictionValues: (input: {
    config: GameConfig;
    predictions: ReadonlyArray<PredictionLike>;
    trickCount: number;
}) => number[];
export declare const applyCloudPredictionDelta: (currentPrediction: number, trickCount: number) => number;
