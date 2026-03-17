export declare const PREDICTION_VISIBILITIES: readonly ["open", "hidden", "secret"];
export type PredictionVisibility = (typeof PREDICTION_VISIBILITIES)[number];
export declare const OPEN_PREDICTION_RESTRICTIONS: readonly ["none", "mustEqualTricks", "mustNotEqualTricks"];
export type OpenPredictionRestriction = (typeof OPEN_PREDICTION_RESTRICTIONS)[number];
export interface GameConfig {
    predictionVisibility: PredictionVisibility;
    openPredictionRestriction: OpenPredictionRestriction;
    audioEnabledByDefault: boolean;
    languageDefault: 'en' | 'de';
    allowIncludedSpecialCards: boolean;
}
