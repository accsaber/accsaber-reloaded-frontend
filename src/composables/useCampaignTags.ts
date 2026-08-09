import type { CampaignTagResponse } from '@/types/api/campaigns'
import { ref } from 'vue'

const tags = ref<CampaignTagResponse[]>([])
let pending: Promise<void> | null = null

export function useCampaignTags() {
  function load(): Promise<void> {
    if (tags.value.length > 0) return Promise.resolve()
    if (pending) return pending
    pending = (async () => {
      try {
        const { getCampaignTags } = await import('@/api/campaigns')
        tags.value = await getCampaignTags()
      } catch {
        tags.value = []
      } finally {
        pending = null
      }
    })()
    return pending
  }

  return { tags, load }
}
