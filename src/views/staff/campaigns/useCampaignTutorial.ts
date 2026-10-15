import { readStoredString, writeStoredString } from '@/utils/storage'
import { ref } from 'vue'
import { useRoute } from 'vue-router'

const STORAGE_KEY = 'campaign-tutorial:state'

export type CampaignTutorialOutcome = 'done' | 'skipped'

export function useCampaignTutorial() {
  const route = useRoute()
  const showTutorial = ref(false)

  function openTutorial() {
    showTutorial.value = true
  }

  function closeTutorial(outcome: CampaignTutorialOutcome) {
    showTutorial.value = false
    writeStoredString(STORAGE_KEY, outcome)
  }

  async function maybeAutoShow(userId: string | null) {
    if (route.name !== 'campaign-new') return
    if (!userId) return
    if (readStoredString(STORAGE_KEY) != null) return
    if (window.matchMedia('(max-width: 860px)').matches) return
    try {
      const { getCampaigns } = await import('@/api/campaigns')
      const page = await getCampaigns({ creatorId: userId, page: 0, size: 1 })
      if (page.totalElements === 0) showTutorial.value = true
    } catch {}
  }

  return { showTutorial, openTutorial, closeTutorial, maybeAutoShow }
}
