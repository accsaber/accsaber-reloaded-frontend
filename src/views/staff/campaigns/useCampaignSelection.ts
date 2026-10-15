import type { CampaignDetailResponse } from '@/types/api/campaigns'
import { readStored, writeStored } from '@/utils/storage'
import { computed, ref, watch, type Ref } from 'vue'

const SELECTION_STORAGE_PREFIX = 'campaign-editor:selection:'

export function useCampaignSelection(campaign: Ref<CampaignDetailResponse | null>) {
  const selectedIds = ref<Set<string>>(new Set())

  const selectedId = computed<string | null>(() =>
    selectedIds.value.size === 1 ? (selectedIds.value.values().next().value ?? null) : null,
  )
  const selectedIdList = computed<string[]>(() => Array.from(selectedIds.value))
  const selectedCount = computed(() => selectedIds.value.size)
  const isMultiSelect = computed(() => selectedIds.value.size > 1)

  function selectOnly(id: string) {
    selectedIds.value = new Set([id])
  }

  function setSelection(ids: string[]) {
    selectedIds.value = new Set(ids)
  }

  function toggleInSelection(id: string) {
    const next = new Set(selectedIds.value)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    selectedIds.value = next
  }

  function clearSelection() {
    selectedIds.value = new Set()
  }

  function persistSelection() {
    const id = campaign.value?.id
    if (!id || selectedIds.value.size === 0) return
    writeStored(SELECTION_STORAGE_PREFIX + id, [...selectedIds.value])
  }

  function storedSelection(c: CampaignDetailResponse): string[] {
    const existing = new Set<string>([
      ...c.difficulties.map((d) => d.id),
      ...c.barriers.map((b) => b.id),
      ...c.texts.map((t) => t.id),
    ])
    return readStored<string[]>(
      SELECTION_STORAGE_PREFIX + c.id,
      (raw) =>
        Array.isArray(raw)
          ? raw.filter((x): x is string => typeof x === 'string' && existing.has(x))
          : null,
      [],
    )
  }

  function restoreSelection(c: CampaignDetailResponse) {
    if (selectedIds.value.size > 0) return
    const restored = storedSelection(c)
    if (restored.length > 0) setSelection(restored)
    else if (c.difficulties.length > 0) selectOnly(c.difficulties[0].id)
  }

  watch(selectedIds, persistSelection)

  return {
    selectedIds,
    selectedId,
    selectedIdList,
    selectedCount,
    isMultiSelect,
    selectOnly,
    setSelection,
    toggleInSelection,
    clearSelection,
    restoreSelection,
  }
}

export type CampaignSelection = ReturnType<typeof useCampaignSelection>
