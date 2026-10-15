import { updatePlayerCampaign } from '@/api/campaigns'
import { parseApiError } from '@/api/client'
import type { CampaignBackgroundPlacementInput, UpdateCampaignRequest } from '@/types/api/admin'
import type { CampaignBackgroundPlacement, CampaignTagResponse } from '@/types/api/campaigns'
import { terminalNodes } from '@/utils/campaignAudit'
import { cssToken } from '@/utils/campaignLayout'
import { computed, ref, watch, type ComputedRef } from 'vue'
import { fieldPatch, type CampaignDocument } from './useCampaignDocument'

const INLINE_ERROR_FIELDS = new Set<string>(['backgroundColor'])
const CLEARABLE_META_TEXT_FIELDS = new Set<string>(['backgroundColor'])

type MetaFlagField = 'progressionAgnostic' | 'playlistExportEnabled'

interface MetaContext {
  doc: CampaignDocument
  editable: ComputedRef<boolean>
  isLiveCampaign: ComputedRef<boolean>
}

export function useCampaignMeta(ctx: MetaContext) {
  const { campaign, actionError, allTags, ensureCampaign } = ctx.doc
  const { editable, isLiveCampaign } = ctx

  const fieldErrors = ref<Record<string, string>>({})

  function clearFieldErrors(keys: string[]) {
    if (keys.length === 0) return
    const next = { ...fieldErrors.value }
    let changed = false
    for (const k of keys) {
      if (k in next) {
        delete next[k]
        changed = true
      }
    }
    if (changed) fieldErrors.value = next
  }

  function reportPatchError(err: unknown, fallback: string) {
    const parsed = parseApiError(err, fallback)
    const inline = parsed.fieldErrors.filter((f) => INLINE_ERROR_FIELDS.has(f.field))
    const other = parsed.fieldErrors.filter((f) => !INLINE_ERROR_FIELDS.has(f.field))
    if (inline.length > 0) {
      const next = { ...fieldErrors.value }
      for (const f of inline) next[f.field] = f.message
      fieldErrors.value = next
    }
    if (other.length > 0) {
      actionError.value = other.map((f) => f.message).join(' ')
    } else if (inline.length === 0) {
      actionError.value = parsed.message
    }
  }

  const formMeta = ref({
    name: '',
    slug: '',
    creatorAlias: '',
    summary: '',
    description: '',
    completionMode: 'TERMINAL' as 'TERMINAL' | 'ALL',
    progressionAgnostic: false,
    playlistExportEnabled: true,
    completionXp: 0,
    backgroundUrl: '',
    backgroundColor: '',
  })

  function syncFormFromCampaign() {
    const c = campaign.value
    if (!c) return
    formMeta.value = {
      name: c.name ?? '',
      slug: c.slug ?? '',
      creatorAlias: c.creatorAlias ?? c.creatorName ?? '',
      summary: c.summary ?? '',
      description: c.description ?? '',
      completionMode: c.completionMode,
      progressionAgnostic: c.progressionAgnostic,
      playlistExportEnabled: c.playlistExportEnabled,
      completionXp: c.completionXp ?? 0,
      backgroundUrl: c.backgroundUrl ?? '',
      backgroundColor: c.backgroundColor ?? '',
    }
  }

  watch(campaign, syncFormFromCampaign, { immediate: true })

  async function applyCampaignPatch(patch: UpdateCampaignRequest) {
    let c = campaign.value
    if (!c || c.id === '') {
      c = await ensureCampaign()
      if (!c) return
    }
    clearFieldErrors(Object.keys(patch))
    try {
      actionError.value = null
      const updated = await updatePlayerCampaign(c.id, patch)
      if (campaign.value) {
        const merged = { ...campaign.value, ...updated }
        if (patch.background !== undefined) {
          merged.background =
            Object.keys(patch.background).length > 0
              ? (patch.background as CampaignBackgroundPlacement)
              : null
        }
        campaign.value = merged
      }
    } catch (err) {
      reportPatchError(err, 'Failed to update campaign')
    }
  }

  function commitMetaField(field: keyof UpdateCampaignRequest) {
    if (!editable.value || !campaign.value) return
    const patch = fieldPatch(formMeta.value, campaign.value, field, CLEARABLE_META_TEXT_FIELDS)
    if (patch) void applyCampaignPatch(patch as UpdateCampaignRequest)
  }

  function setMetaFlag(field: MetaFlagField, value: boolean) {
    formMeta.value[field] = value
    commitMetaField(field)
  }

  function commitBackgroundColor() {
    formMeta.value.backgroundColor = formMeta.value.backgroundColor.trim()
    commitMetaField('backgroundColor')
  }

  function resetBackgroundColor() {
    formMeta.value.backgroundColor = ''
    commitMetaField('backgroundColor')
  }

  function commitBackgroundPlacement(placement: CampaignBackgroundPlacementInput) {
    if (!editable.value || !campaign.value?.backgroundUrl) return
    void applyCampaignPatch({ background: placement })
  }

  const tagsByKind = computed(() => {
    const map = new Map<string, CampaignTagResponse[]>()
    for (const t of allTags.value) {
      const arr = map.get(t.kind) ?? []
      arr.push(t)
      map.set(t.kind, arr)
    }
    return map
  })

  const campaignTagIds = computed(() => new Set(campaign.value?.tags.map((t) => t.id) ?? []))

  function toggleTag(tagId: string) {
    if (!editable.value || !campaign.value) return
    const current = new Set(campaignTagIds.value)
    if (current.has(tagId)) current.delete(tagId)
    else current.add(tagId)
    void applyCampaignPatch({ tagIds: Array.from(current) })
  }

  const completionModeOptions: Array<{ value: 'TERMINAL' | 'ALL'; label: string }> = [
    { value: 'TERMINAL', label: 'Clear a flagged ending' },
    { value: 'ALL', label: 'Clear every node' },
  ]

  const terminalMode = computed(() => campaign.value?.completionMode === 'TERMINAL')

  const terminalNodeIds = computed(() => new Set(terminalNodes(campaign.value).map((d) => d.id)))

  const completionModeBlocked = ref(false)

  function onCompletionModeChange(value: string) {
    const mode = value as 'TERMINAL' | 'ALL'
    if (mode === 'TERMINAL' && isLiveCampaign.value && terminalNodeIds.value.size === 0) {
      completionModeBlocked.value = true
      formMeta.value.completionMode = campaign.value?.completionMode ?? 'ALL'
      return
    }
    completionModeBlocked.value = false
    formMeta.value.completionMode = mode
    commitMetaField('completionMode')
  }

  const defaultColorHex = computed(() => cssToken('--accent-overall'))

  return {
    formMeta,
    fieldErrors,
    commitMetaField,
    setMetaFlag,
    commitBackgroundColor,
    resetBackgroundColor,
    commitBackgroundPlacement,
    tagsByKind,
    campaignTagIds,
    toggleTag,
    completionModeOptions,
    completionModeBlocked,
    onCompletionModeChange,
    terminalMode,
    terminalNodeIds,
    defaultColorHex,
  }
}
