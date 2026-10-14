import type { MilestoneResponse } from '@/types/api/milestones'

let pending: Promise<MilestoneResponse[]> | null = null

export function loadMilestoneCatalog(): Promise<MilestoneResponse[]> {
  if (!pending) {
    pending = import('@/api/milestones')
      .then(({ getMilestones }) => getMilestones({ size: 500 }))
      .then((page) => page.content)
      .catch(() => {
        pending = null
        return []
      })
  }
  return pending
}
