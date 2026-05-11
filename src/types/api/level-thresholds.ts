export interface LevelThresholdResponse {
  level: number
  title: string | null
  awardsItemId: string | null
  createdAt: string
  updatedAt: string
}

export interface UpsertLevelThresholdRequest {
  title?: string
  awardsItemId?: string
}
