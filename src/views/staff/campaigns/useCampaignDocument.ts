import { createCampaign } from '@/api/admin/campaigns'
import { createPlayerCampaign, getCampaignByIdOrSlug } from '@/api/campaigns'
import { ApiError, parseApiError } from '@/api/client'
import { useCampaignTags } from '@/composables/useCampaignTags'
import { useAuthStore } from '@/stores/auth'
import type { CampaignDetailResponse, CampaignResponse } from '@/types/api/campaigns'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

export interface CampaignDraftFields {
  name: string
  slug: string
  completionMode: 'TERMINAL' | 'ALL'
  progressionAgnostic: boolean
}

interface DocumentContext {
  draft: () => CampaignDraftFields
  isCurator: () => boolean
  onLoaded: (c: CampaignDetailResponse) => void
  onSwitch: () => void
}

type RowKey = 'difficulties' | 'barriers' | 'texts'

export const CLEARABLE_TEXT_FIELDS = new Set<string>([
  'description',
  'checkpointLabel',
  'checkpointAvatarUrl',
  'checkpointColor',
  'borderColor',
])

export function fieldPatch(
  form: object,
  original: object,
  field: string,
  clearable: Set<string> | null,
): Record<string, unknown> | null {
  const value = (form as Record<string, unknown>)[field]
  const prev = (original as Record<string, unknown>)[field]
  if (value === prev) return null
  if (typeof value === 'string' && prev == null && value === '') return null
  return { [field]: value === '' && clearable && !clearable.has(field) ? null : value }
}

export function useCampaignDocument(ctx: DocumentContext) {
  const route = useRoute()
  const router = useRouter()
  const auth = useAuthStore()
  const { tags: allTags, load: loadTags } = useCampaignTags()

  const campaign = ref<CampaignDetailResponse | null>(null)
  const loading = ref(true)
  const error = ref<string | null>(null)
  const actionPending = ref(false)
  const actionError = ref<string | null>(null)
  const requirementDirtyIds = ref(new Set<string>())
  const editedLiveCampaign = ref(false)

  const campaignId = computed(() => String(route.params.campaignId ?? ''))
  const isNewMode = computed(() => route.name === 'campaign-new')
  const isUnsavedDraft = computed(() => campaign.value?.id === '')

  let suppressNextCampaignIdWatch = false

  function createPlaceholderCampaign(): CampaignDetailResponse {
    return {
      id: '',
      creatorId: auth.userId,
      creatorName: null,
      creatorAlias: null,
      name: '',
      slug: '',
      summary: null,
      description: null,
      status: 'DRAFT',
      official: false,
      progressionAgnostic: false,
      completionMode: 'TERMINAL',
      legacy: false,
      completionXp: 0,
      playlistExportEnabled: true,
      difficultyCount: 0,
      tags: [],
      backgroundUrl: null,
      backgroundColor: null,
      background: null,
      iconUrl: null,
      curatedAt: null,
      curatedBy: null,
      loved: false,
      lovedAt: null,
      lovedBy: null,
      createdAt: new Date().toISOString(),
      totalUpvotes: 0,
      totalDownvotes: 0,
      voteScore: 0,
      totalXp: null,
      totalRewardCount: null,
      rewards: null,
      curatorNotes: null,
      difficulties: [],
      barriers: [],
      texts: [],
      completionItems: [],
    }
  }

  let creatingCampaign: Promise<CampaignDetailResponse | null> | null = null

  async function ensureCampaign(): Promise<CampaignDetailResponse | null> {
    if (campaign.value && campaign.value.id !== '') return campaign.value
    if (creatingCampaign) return creatingCampaign
    creatingCampaign = createCampaignNow()
    try {
      return await creatingCampaign
    } finally {
      creatingCampaign = null
    }
  }

  function createRequest(): CampaignDraftFields {
    const ts = Date.now()
    const draft = ctx.draft()
    return {
      name: draft.name.trim() || `Untitled-${ts}`,
      slug: draft.slug.trim() || `untitled-${ts}`,
      completionMode: draft.completionMode,
      progressionAgnostic: draft.progressionAgnostic,
    }
  }

  async function createCampaignNow(): Promise<CampaignDetailResponse | null> {
    if (campaign.value && campaign.value.id !== '') return campaign.value
    const curator = ctx.isCurator()
    if (!auth.isLoggedIn && !curator) {
      actionError.value = 'Sign in to create a campaign.'
      return null
    }
    try {
      const req = createRequest()
      const created =
        !auth.isLoggedIn && curator ? await createCampaign(req) : await createPlayerCampaign(req)
      const detail: CampaignDetailResponse = { ...createPlaceholderCampaign(), ...created }
      campaign.value = detail
      void loadTags()
      suppressNextCampaignIdWatch = true
      await router.replace({
        name: 'campaign-editor',
        params: { campaignId: created.slug || created.id },
      })
      return detail
    } catch (err) {
      actionError.value = parseApiError(err, 'Failed to create campaign').message
      return null
    }
  }

  async function load(silent = false) {
    if (!silent) loading.value = true
    error.value = null
    requirementDirtyIds.value = new Set()
    editedLiveCampaign.value = false
    try {
      const [c] = await Promise.all([getCampaignByIdOrSlug(campaignId.value), loadTags()])
      campaign.value = c
      ctx.onLoaded(c)
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 404)) {
        error.value = parseApiError(err, 'Failed to load campaign').message
      }
    } finally {
      if (!silent) loading.value = false
    }
  }

  function applyCampaignResponse(res: CampaignResponse) {
    if (!campaign.value) return
    requirementDirtyIds.value = new Set()
    editedLiveCampaign.value = false
    campaign.value = { ...campaign.value, ...res }
  }

  function replaceRow<K extends RowKey>(
    key: K,
    id: string,
    fn: (row: CampaignDetailResponse[K][number]) => CampaignDetailResponse[K][number],
  ) {
    if (!campaign.value) return
    const rows = campaign.value[key] as CampaignDetailResponse[K][number][]
    campaign.value = { ...campaign.value, [key]: rows.map((r) => (r.id === id ? fn(r) : r)) }
  }

  function mergeDifficulty(updated: CampaignDetailResponse['difficulties'][number]) {
    replaceRow('difficulties', updated.id, () => updated)
  }

  let changeBroadcaster: (() => void) | null = null
  let applyingRemote = 0
  let broadcastTimer: ReturnType<typeof setTimeout> | null = null

  function setChangeBroadcaster(fn: (() => void) | null) {
    changeBroadcaster = fn
  }

  async function guardedLoad(silent = false) {
    applyingRemote++
    try {
      await load(silent)
    } finally {
      await nextTick()
      applyingRemote--
    }
  }

  function scheduleBroadcast() {
    if (applyingRemote > 0 || !changeBroadcaster) return
    if (broadcastTimer) clearTimeout(broadcastTimer)
    broadcastTimer = setTimeout(() => {
      broadcastTimer = null
      changeBroadcaster?.()
    }, 400)
  }

  watch(campaign, scheduleBroadcast, { immediate: true })

  onBeforeUnmount(() => {
    if (broadcastTimer) clearTimeout(broadcastTimer)
  })

  onMounted(() => {
    if (isNewMode.value) {
      campaign.value = createPlaceholderCampaign()
      void loadTags()
      loading.value = false
      return
    }
    void guardedLoad()
  })

  watch(campaignId, (next, prev) => {
    if (next === prev) return
    if (suppressNextCampaignIdWatch) {
      suppressNextCampaignIdWatch = false
      return
    }
    ctx.onSwitch()
    void guardedLoad()
  })

  watch(
    () => campaign.value?.slug,
    (slug) => {
      if (!slug || isNewMode.value || isUnsavedDraft.value) return
      if (campaignId.value === slug) return
      suppressNextCampaignIdWatch = true
      void router.replace({ name: 'campaign-editor', params: { campaignId: slug } })
    },
  )

  return {
    campaign,
    loading,
    error,
    actionPending,
    actionError,
    requirementDirtyIds,
    editedLiveCampaign,
    allTags,
    isUnsavedDraft,
    load,
    reloadFromRemote: () => guardedLoad(true),
    applyCampaignResponse,
    ensureCampaign,
    setChangeBroadcaster,
    replaceRow,
    mergeDifficulty,
  }
}

export type CampaignDocument = ReturnType<typeof useCampaignDocument>
