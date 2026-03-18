export interface PlayerPrediction {
  playerId: string
  value: number
  revealed: boolean
  changedByCloud: boolean
  cloudDelta?: 1 | -1 | 0 | null
}

export interface PredictionViewItem {
  playerId: string
  value: number | null
  revealed: boolean
  changedByCloud: boolean
  cloudDelta?: 1 | -1 | 0 | null
}
