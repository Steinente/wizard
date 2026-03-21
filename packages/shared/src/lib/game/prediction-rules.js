export const getPredictionSum = (predictions) =>
  predictions.reduce((sum, entry) => sum + (entry?.value ?? 0), 0)
export const validatePredictionRestriction = (input) => {
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
export const applyCloudPredictionDelta = (currentPrediction, trickCount) => {
  if (currentPrediction <= 0) {
    return 1
  }
  if (currentPrediction >= trickCount) {
    return trickCount - 1
  }
  return currentPrediction + 1
}
//# sourceMappingURL=prediction-rules.js.map
