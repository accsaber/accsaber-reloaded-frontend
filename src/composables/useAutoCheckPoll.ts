import type { AutoCriteriaStatus } from '@/types/api/maps'
import { onUnmounted } from 'vue'

interface Checked {
  id: string
  autoCriteriaStatus: AutoCriteriaStatus | null
  createdAt: string
}

const INTERVAL_MS = 3000
const LIMIT_MS = 30000
const FRESH_MS = 120000

export function useAutoCheckPoll() {
  const timers = new Map<string, ReturnType<typeof setTimeout>>()

  function stop(id: string) {
    clearTimeout(timers.get(id))
    timers.delete(id)
  }

  function poll<T extends Checked>(created: T, fetch: () => Promise<T>, apply: (fresh: T) => void) {
    const { id } = created
    stop(id)
    if (created.autoCriteriaStatus !== 'PENDING' || Date.now() - Date.parse(created.createdAt) > FRESH_MS) return
    const deadline = Date.now() + LIMIT_MS
    const tick = async () => {
      const fresh = await fetch().catch(() => null)
      if (!timers.has(id)) return
      if (fresh) apply(fresh)
      const settled = !!fresh && fresh.autoCriteriaStatus !== 'PENDING'
      if (settled || Date.now() + INTERVAL_MS > deadline) stop(id)
      else timers.set(id, setTimeout(tick, INTERVAL_MS))
    }
    timers.set(id, setTimeout(tick, INTERVAL_MS))
  }

  onUnmounted(() => {
    for (const id of [...timers.keys()]) stop(id)
  })

  return poll
}
