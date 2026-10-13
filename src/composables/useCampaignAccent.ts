import { useCategoryStore } from '@/stores/categories'
import type { CampaignDifficultyResponse, CampaignTagResponse } from '@/types/api/campaigns'

export function useCampaignAccent() {
  const categoryStore = useCategoryStore()

  function categoryAccent(categoryId: string | null | undefined): string | null {
    const code = categoryId ? categoryStore.getCategoryCode(categoryId) : undefined
    return (code && categoryStore.getCategoryInfo(code)?.accent) || null
  }

  function campaignAccent(tags: CampaignTagResponse[] | undefined): string {
    const cats = tags?.filter((t) => t.kind === 'CATEGORY') ?? []
    return (cats.length === 1 && categoryAccent(cats[0].categoryId)) || 'var(--accent-overall)'
  }

  function nodeAccent(node: CampaignDifficultyResponse | undefined): string | null {
    if (!node) return null
    return node.checkpointColor || node.borderColor || categoryAccent(node.categoryId)
  }

  return { campaignAccent, nodeAccent }
}
