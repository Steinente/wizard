import type { GameConfig } from '../game-config.js'
import type { PlayerPrediction } from './predictions.js'

export const getPredictionSum = (
  predictions: ReadonlyArray<PlayerPrediction | null>,
): number => predictions.reduce((sum, entry) => sum + (entry?.value ?? 0), 0)

export const validatePredictionRestriction = (input: {
  config: GameConfig
  predictions: ReadonlyArray<PlayerPrediction | null>
  trickCount: number
}): boolean => {
  if (input.config.predictionVisibility !== 'open') {
    return true
  }

  const sum = getPredictionSum(input.predictions)

  if (input.config.openPredictionRestriction === 'none') {
    return true
  }

  if (input.config.openPredictionRestriction === 'mustEqualTricks') {
    return sum === input.trickCount
  }

  if (input.config.openPredictionRestriction === 'mustNotEqualTricks') {
    return sum !== input.trickCount
  }

  return true
}

export const applyCloudPredictionDelta = (
  currentPrediction: number,
  trickCount: number,
): number => {
  if (currentPrediction <= 0) {
    return 1
  }

  if (currentPrediction >= trickCount) {
    return trickCount - 1
  }

  return currentPrediction + 1
}
