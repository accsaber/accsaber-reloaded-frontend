export interface QuestReleaseResponse {
  tag: string
  name: string
  gameVersion: string | null
  publishedAt: string
  prerelease: boolean
  latest: boolean
}
