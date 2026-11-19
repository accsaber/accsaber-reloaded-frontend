import type { Tab } from '@/types/display'
import { QUEUE_STATUSES } from '@/utils/constants'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

export type RankingTab = 'suggested' | 'queue' | 'rejected'

export const RANKING_TABS: Tab[] = [
  { key: 'suggested', label: 'Suggested' },
  { key: 'queue', label: 'Queue' },
  { key: 'rejected', label: 'Rejected' },
]

const VIEWS: Record<RankingTab, {
  list: 'queue' | 'suggested' | 'deactivated'
  params: Record<string, unknown>
  countLabel: string
  empty: string
}> = {
  suggested: { list: 'suggested', params: { status: 'SUGGESTED' }, countLabel: 'suggested maps', empty: 'No suggested maps' },
  queue: { list: 'queue', params: { status: QUEUE_STATUSES.join(',') }, countLabel: 'maps in the queue', empty: 'No maps in the queue' },
  rejected: { list: 'deactivated', params: { active: false }, countLabel: 'rejected maps', empty: 'No rejected maps' },
}

export function useRankingTabs() {
  const route = useRoute()
  const router = useRouter()

  const tab = computed<RankingTab>(() => ((route.query.tab as string) in VIEWS ? (route.query.tab as RankingTab) : 'queue'))
  const view = computed(() => VIEWS[tab.value])

  function setTab(next: string) {
    void router.replace({ query: next === 'queue' ? {} : { tab: next } })
  }

  return { tab, view, setTab }
}
