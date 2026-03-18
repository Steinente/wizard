import type { GameConfig } from '../game-config.js'

type PredictionLike = {
  value: number | null
} | null

export const getPredictionSum = (
  predictions: ReadonlyArray<PredictionLike>,
): number => predictions.reduce((sum, entry) => sum + (entry?.value ?? 0), 0)

export const validatePredictionRestriction = (input: {
  config: GameConfig
  predictions: ReadonlyArray<PredictionLike>
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

export const getAllowedPredictionValues = (input: {
  config: GameConfig
  predictions: ReadonlyArray<PredictionLike>
  trickCount: number
}): number[] => {
  const values = Array.from(
    { length: input.trickCount + 1 },
    (_, index) => index,
  )

  if (input.config.predictionVisibility !== 'open') {
    return values
  }

  if (input.config.openPredictionRestriction === 'mustNotEqualTricks') {
    const lockedSum = getPredictionSum(input.predictions)
    const remainingPlayers = input.predictions.filter((entry) => !entry).length

    // Only the last predictor is constrained in mustNotEqual mode.
    if (remainingPlayers === 1) {
      const forbiddenValue = input.trickCount - lockedSum

      return values.filter((value) => value !== forbiddenValue)
    }

    return values
  }

  if (input.config.openPredictionRestriction !== 'mustEqualTricks') {
    return values
  }

  const lockedSum = getPredictionSum(input.predictions)
  const remainingPlayers = input.predictions.filter((entry) => !entry).length

  if (remainingPlayers <= 0) {
    return values
  }

  const remainingAfterCurrent = remainingPlayers - 1

  return values.filter((value) => {
    const minReachable = lockedSum + value
    const maxReachable =
      lockedSum + value + remainingAfterCurrent * input.trickCount

    return input.trickCount >= minReachable && input.trickCount <= maxReachable
  })
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
