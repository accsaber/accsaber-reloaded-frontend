import type { QuestReleaseResponse } from '@/types/api/quest'
import { get, postFile, type DownloadedFile } from './client'
import { buildQuery } from './utils'

export function getQuestReleases(): Promise<QuestReleaseResponse[]> {
  return get('/quest/releases')
}

export function downloadQuestMod(tag: string): Promise<DownloadedFile> {
  return postFile(`/quest/download${buildQuery({ tag })}`)
}
