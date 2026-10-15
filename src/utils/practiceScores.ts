import type { PracticeScoreSubmission } from '@/types/api/practiceScores'
import { readStored, readStoredString, writeStored, writeStoredString } from '@/utils/storage'

const SCORES_KEY = 'range:scores'
const PENDING_KEY = 'range:pending'
const NAME_KEY = 'range:name'
const MAX_LOCAL = 50
const MAX_PENDING = 20

function loadList(key: string): PracticeScoreSubmission[] {
  return readStored(key, (raw) => (Array.isArray(raw) ? (raw as PracticeScoreSubmission[]) : null), [])
}

export function loadLocalScores(): PracticeScoreSubmission[] {
  return loadList(SCORES_KEY)
}

export function addLocalScore(entry: PracticeScoreSubmission): PracticeScoreSubmission[] {
  const scores = [...loadLocalScores(), entry]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_LOCAL)
  writeStored(SCORES_KEY, scores)
  const pending = [...loadList(PENDING_KEY), entry].slice(-MAX_PENDING)
  writeStored(PENDING_KEY, pending)
  return scores
}

export function loadLastName(): string {
  return readStoredString(NAME_KEY) ?? ''
}

export function saveLastName(name: string) {
  writeStoredString(NAME_KEY, name)
}

export async function flushPendingScores(): Promise<void> {
  const pending = loadList(PENDING_KEY)
  if (pending.length === 0) return
  const { submitPracticeScores } = await import('@/api/practiceScores')
  try {
    await submitPracticeScores(pending)
    writeStoredString(PENDING_KEY, null)
  } catch {
  }
}
