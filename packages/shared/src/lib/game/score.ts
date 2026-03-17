export interface PlayerScoreEntry {
  playerId: string
  roundNumber: number
  predicted: number
  won: number
  delta: number
  total: number
  predictionAdjustment?: 1 | -1 | 0 | null
}

export const calculateRoundScore = (predicted: number, won: number): number => {
  if (predicted === won) {
    return 20 + won * 10
  }

  return Math.abs(predicted - won) * -10
}
