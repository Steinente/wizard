export const calculateRoundScore = (predicted, won) =>
  predicted === won ? 20 + won * 10 : Math.abs(predicted - won) * -10
//# sourceMappingURL=score.js.map
