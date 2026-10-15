import { useAuthStore } from '@/stores/auth'
import type { CampaignStatus } from '@/types/enums'
import { isCurationSurface } from '@/utils/subdomain'
import { computed } from 'vue'
import { useCampaignCollaborators } from './useCampaignCollaborators'
import type { CampaignDocument } from './useCampaignDocument'

const CURATOR_EDITABLE_STATUSES = new Set<CampaignStatus>(['EDITING', 'CURATED'])

export function useCampaignAccess(doc: CampaignDocument) {
  const { campaign, isUnsavedDraft, actionPending, actionError } = doc
  const auth = useAuthStore()

  const isAdmin = computed(() => auth.hasRole('ADMIN'))
  const isCurator = computed(() => auth.hasRole('CAMPAIGN_CURATOR'))

  const isCreator = computed(() => {
    if (isUnsavedDraft.value && auth.isLoggedIn) return true
    return !!campaign.value?.creatorId && campaign.value.creatorId === auth.userId
  })

  const collaborators = useCampaignCollaborators({
    campaign,
    auth,
    isCurator,
    isCreator,
    actionPending,
    actionError,
  })
  const { isCollaborator } = collaborators

  const isDraftStatus = computed(() => campaign.value?.status === 'DRAFT')

  const curatable = computed(
    () => campaign.value?.status === 'PUBLISHED' || campaign.value?.status === 'EDITING',
  )

  const isSavedDraft = computed(
    () => !!campaign.value && !isUnsavedDraft.value && campaign.value.status === 'DRAFT',
  )

  const isLiveCampaign = computed(
    () => !!campaign.value && !isUnsavedDraft.value && campaign.value.status !== 'DRAFT',
  )

  const canAccess = computed(() => {
    if (isCreator.value || isCollaborator.value || isAdmin.value) return true
    return isCurator.value && !isSavedDraft.value
  })

  const editable = computed(() => {
    if (!campaign.value || actionPending.value) return false
    if (campaign.value.status === 'DRAFT') {
      if (isCreator.value || isCollaborator.value || isAdmin.value) return true
      return isCurator.value && isUnsavedDraft.value
    }
    return isCurator.value && CURATOR_EDITABLE_STATUSES.has(campaign.value.status)
  })

  const editingLiveCampaign = computed(() => editable.value && campaign.value?.status === 'CURATED')

  return {
    auth,
    isAdmin,
    isCurator,
    isCreator,
    isCurationRoute: isCurationSurface,
    isDraftStatus,
    curatable,
    isLiveCampaign,
    canAccess,
    editable,
    editingLiveCampaign,
    collaborators,
  }
}
