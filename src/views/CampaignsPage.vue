<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import BaseTabs from '@/components/common/BaseTabs.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SearchBox from '@/components/common/SearchBox.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import SwapList from '@/components/common/SwapList.vue'
import CampaignFilterBar from '@/components/domain/CampaignFilterBar.vue'
import CampaignGrid from '@/components/domain/CampaignGrid.vue'
import CampaignRow from '@/components/domain/CampaignRow.vue'
import RulesButton from '@/components/domain/RulesButton.vue'
import UserCampaignsPanel from '@/components/domain/UserCampaignsPanel.vue'
import { useCampaignTags } from '@/composables/useCampaignTags'
import { usePageMeta } from '@/composables/usePageMeta'
import { usePageableRoute } from '@/composables/usePageableRoute'
import { useAuthStore } from '@/stores/auth'
import type { CampaignCollaboratorResponse, CampaignListParams, CampaignResponse } from '@/types/api/campaigns'
import type { Rule } from '@/types/display'
import type { CampaignFilterState } from '@/utils/campaignFilters'
import { BROWSE_SORT_OPTIONS } from '@/utils/campaignFilters'
import { isCurationSubdomain, isCurationSurface } from '@/utils/subdomain'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter, type LocationQuery } from 'vue-router'
import { parseApiError } from '@/api/client'

type Pane = 'all' | 'mine' | 'runs' | 'review' | 'drafts' | 'invites'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

usePageMeta({
  title: 'Campaigns | AccSaber',
  description: 'Community-made map progression campaigns on AccSaber.',
})

const isCurator = computed(() => auth.hasRole('CAMPAIGN_CURATOR'))
const canReview = computed(() => isCurator.value && isCurationSurface)
const canSeeDrafts = computed(() => auth.hasRole('ADMIN') && isCurationSurface)

const defaultPane = computed<Pane>(() =>
  isCurationSubdomain && canReview.value ? 'review' : 'all',
)

const pane = computed<Pane>(() => {
  const v = route.query.pane as string | undefined
  if (v === 'runs' || v === 'started') return 'runs'
  if (v === 'mine') return v
  if (v === 'invites' && auth.isLoggedIn) return 'invites'
  if (v === 'review' && canReview.value) return v
  if (v === 'drafts' && canSeeDrafts.value) return v
  if (v === 'all') return 'all'
  return defaultPane.value
})

const panes = computed(() => [
  { key: 'all' as const, label: 'Browse', show: true },
  { key: 'runs' as const, label: 'My Runs', show: auth.isLoggedIn },
  { key: 'mine' as const, label: 'Mine', show: auth.isLoggedIn },
  { key: 'invites' as const, label: 'Invites', show: auth.isLoggedIn },
  { key: 'review' as const, label: 'Review', show: canReview.value },
  { key: 'drafts' as const, label: 'Drafts', show: canSeeDrafts.value },
].filter((p) => p.show))

const searchablePane = computed(() => pane.value === 'all' || pane.value === 'review' || pane.value === 'drafts')
const filterablePane = computed(() => pane.value === 'all' || pane.value === 'review')

const curatedOnly = computed(() => route.query.curated === '1')
const officialOnly = computed(() => route.query.official === '1')
const lovedOnly = computed(() => route.query.loved === '1')

const searchTerm = computed(() => {
  const raw = route.query.q
  return typeof raw === 'string' ? raw.trim() : ''
})

const selectedTagIds = computed<string[]>(() => {
  const raw = route.query.tags
  if (!raw) return []
  if (Array.isArray(raw)) return raw.filter(Boolean) as string[]
  return String(raw).split(',').filter(Boolean)
})

const { tags, load: loadTags } = useCampaignTags()
void loadTags()

const CAMPAIGN_RULES: Rule[] = [
  {
    title: 'No impersonation.',
    text: 'Do not use aliases to pass yourself off as another person.',
  },
  {
    title: 'Keep artwork clean.',
    text: 'No NSFW or questionable imagery in campaign icons or backgrounds.',
  },
  {
    title: 'No AI.',
    text: 'No AI-generated icons, backgrounds, or text.',
  },
  {
    title: 'No discriminatory language.',
    text: 'Anywhere: names, summaries, descriptions, or text labels.',
  },
  {
    title: 'No harassment.',
    text: 'Do not use a campaign to target, call out, or shame other players.',
  },
  {
    title: 'No spam or advertising.',
    text: 'Campaigns are for playing, not for promoting unrelated services or links.',
  },
  {
    title: 'No plagiarism.',
    text: "Do not republish another creator's campaign or artwork as your own.",
  },
]

const items = ref<CampaignResponse[]>([])
const totalPages = ref(1)
const loading = ref(true)
const error = ref<string | null>(null)

const pendingInvites = ref<CampaignCollaboratorResponse[]>([])
const invitesLoading = ref(true)
const respondingId = ref<string | null>(null)

const { currentPage, paginationParams, setPage, sortState } = usePageableRoute({
  defaultSort: 'publishedAt',
  defaultSize: 20,
  secondarySort: null,
})

const browseFilters = computed<CampaignFilterState>(() => ({
  search: searchTerm.value,
  sort: sortState.value.key,
  order: sortState.value.direction,
  official: officialOnly.value,
  curated: curatedOnly.value,
  loved: lovedOnly.value,
  tagIds: selectedTagIds.value,
  progressStatus: [],
}))

const emptyMessage = computed(() => {
  if (pane.value === 'mine') return auth.isLoggedIn ? 'No campaigns yet' : 'Log in to see your campaigns'
  if (pane.value === 'review') return 'Nothing to review'
  if (pane.value === 'drafts') return 'No drafts'
  return 'No campaigns found'
})

function setQueryFlag(query: LocationQuery, key: string, on: boolean) {
  if (on) query[key] = '1'
  else delete query[key]
}

function applyBrowseFilters(next: CampaignFilterState) {
  const query = { ...route.query }
  if (next.sort === 'publishedAt') {
    delete query.sort
    delete query.order
  } else {
    query.sort = next.sort
    query.order = next.order
  }
  setQueryFlag(query, 'official', next.official)
  setQueryFlag(query, 'curated', next.curated)
  setQueryFlag(query, 'loved', next.loved)
  if (next.tagIds.length > 0) query.tags = next.tagIds.join(',')
  else delete query.tags
  delete query.page
  router.replace({ query })
}

const firstLoad = computed(() => loading.value && items.value.length === 0)

function listParams(): CampaignListParams | null {
  const paging = { page: paginationParams.value.page, size: paginationParams.value.size }
  const search = searchTerm.value || undefined
  switch (pane.value) {
    case 'mine':
      return auth.userId ? { ...paging, sort: 'createdAt,desc', memberId: auth.userId } : null
    case 'drafts':
      return canSeeDrafts.value ? { ...paging, sort: 'createdAt,desc', status: ['DRAFT'], search } : null
    case 'review':
    case 'all':
      if (pane.value === 'review' && !canReview.value) return null
      return {
        ...paging,
        sort: paginationParams.value.sort,
        tagIds: selectedTagIds.value.length > 0 ? selectedTagIds.value : undefined,
        status: pane.value === 'review' ? ['PUBLISHED'] : curatedOnly.value ? ['CURATED'] : ['PUBLISHED', 'CURATED'],
        search,
        official: officialOnly.value || undefined,
        loved: lovedOnly.value || undefined,
      }
    default:
      return null
  }
}

let campaignRequest = 0

async function loadCampaigns() {
  if (pane.value === 'runs' || pane.value === 'invites') return
  const id = ++campaignRequest
  const params = listParams()
  if (!params) {
    items.value = []
    totalPages.value = 1
    loading.value = false
    return
  }
  loading.value = true
  error.value = null
  try {
    const { getCampaigns } = await import('@/api/campaigns')
    const page = await getCampaigns(params)
    if (id !== campaignRequest) return
    items.value = page.content
    totalPages.value = page.totalPages || 1
  } catch (err) {
    if (id !== campaignRequest) return
    error.value = parseApiError(err, 'Failed to load campaigns').message
    items.value = []
  }
  loading.value = false
}

let inviteRequest = 0

async function loadInvites() {
  const id = ++inviteRequest
  if (!auth.isLoggedIn) {
    pendingInvites.value = []
    invitesLoading.value = false
    return
  }
  invitesLoading.value = true
  let invites: CampaignCollaboratorResponse[] = []
  try {
    const { getMyCollaborations } = await import('@/api/campaigns')
    invites = (await getMyCollaborations({ status: 'PENDING', size: 50 })).content
  } catch {
    invites = []
  }
  if (id !== inviteRequest) return
  pendingInvites.value = invites
  invitesLoading.value = false
}

async function respondToInvite(inv: CampaignCollaboratorResponse, accept: boolean) {
  respondingId.value = inv.id
  error.value = null
  try {
    const { respondToCampaignCollaboration } = await import('@/api/campaigns')
    await respondToCampaignCollaboration(inv.campaignId, accept)
    pendingInvites.value = pendingInvites.value.filter((i) => i.id !== inv.id)
  } catch (err) {
    error.value = parseApiError(err, `Failed to ${accept ? 'accept' : 'decline'} invite`).message
  } finally {
    respondingId.value = null
  }
}

function setPane(next: string) {
  if (next === pane.value) return
  const query = { ...route.query }
  if (next === defaultPane.value) delete query.pane
  else query.pane = next
  delete query.page
  router.replace({ query })
}

function setSearch(value: string) {
  const trimmed = value.trim()
  const query = { ...route.query }
  if (trimmed) query.q = trimmed
  else delete query.q
  delete query.page
  router.replace({ query })
}

watch(() => `${pane.value}|${JSON.stringify(listParams())}`, loadCampaigns, { immediate: true })
watch(() => auth.isLoggedIn, loadInvites, { immediate: true })
watch(() => pane.value === 'invites', (open) => { if (open) loadInvites() })
</script>

<template>
  <div class="campaigns-page">
    <h1>Campaigns</h1>

    <div class="campaigns-page__controls">
      <div class="campaigns-page__controls-left">
        <BaseTabs v-if="panes.length > 1" variant="segmented" label="Campaign lists" :tabs="panes"
          :model-value="pane" @update:model-value="setPane">
          <template #tab="{ tab }">
            {{ tab.label }}
            <span v-if="tab.key === 'invites' && pendingInvites.length > 0" class="campaigns-page__count">
              {{ pendingInvites.length }}
            </span>
          </template>
        </BaseTabs>
        <SearchBox v-if="searchablePane" :model-value="searchTerm" placeholder="Search title or creator..."
          @update:model-value="setSearch" />
      </div>

      <div class="campaigns-page__controls-right">
        <CampaignFilterBar v-if="filterablePane" :model-value="browseFilters" :tags="tags"
          :sort-options="BROWSE_SORT_OPTIONS" :show-curated="pane === 'all'"
          @update:model-value="applyBrowseFilters" />
        <RulesButton
          title="Campaign rules"
          lead="Campaigns are player-made and public. Keep yours within these rules:"
          :rules="CAMPAIGN_RULES"
          note="By creating a campaign, you agree to these rules. Breaking them results in an automatic, indefinite suspension from every AccSaber feature."
        />
        <BaseButton v-if="auth.isLoggedIn || isCurator" variant="primary"
          @click="router.push({ name: 'campaign-new' })">
          New Campaign
        </BaseButton>
      </div>
    </div>

    <p v-if="error" class="caption campaigns-page__error" role="alert">{{ error }}</p>

    <template v-if="pane === 'invites'">
      <EmptyState v-if="!invitesLoading && pendingInvites.length === 0" message="No pending invites" />
      <SwapList v-else as="ul" class="campaigns-page__invites" :items="pendingInvites" :item-key="(inv) => inv.id"
        :loading="invitesLoading">
        <template #placeholder>
          <li class="placeholder">
            <SkeletonLoader height="68px" />
          </li>
        </template>
        <template #default="{ item: inv, swap }">
          <li class="campaigns-page__invite" v-bind="swap">
            <router-link class="campaigns-page__invite-name card-title"
              :to="{ name: 'campaign-detail', params: { campaignId: inv.campaignSlug || inv.campaignId } }">
              {{ inv.campaignName }}
            </router-link>
            <BaseButton size="sm" variant="primary" :loading="respondingId === inv.id"
              @click="respondToInvite(inv, true)">
              Accept
            </BaseButton>
            <BaseButton size="sm" :disabled="respondingId === inv.id" @click="respondToInvite(inv, false)">
              Decline
            </BaseButton>
          </li>
        </template>
      </SwapList>
    </template>

    <template v-else-if="pane === 'runs'">
      <EmptyState v-if="!auth.isLoggedIn" message="Log in to see your runs" />
      <UserCampaignsPanel v-else empty-message="No runs yet" />
    </template>

    <template v-else>
      <EmptyState v-if="!loading && items.length === 0" :message="emptyMessage" />
      <CampaignGrid v-else :items="items" :item-key="(campaign) => campaign.id" :loading="firstLoad"
        :refreshing="loading && !firstLoad">
        <template #default="{ item, swap }">
          <CampaignRow :campaign="item" :collab="pane === 'mine' && item.creatorId !== auth.userId"
            :editor-link="pane === 'mine' || pane === 'review' || pane === 'drafts'" v-bind="swap" />
        </template>
      </CampaignGrid>

      <PaginationControls v-if="totalPages > 1" :page="currentPage" :total-pages="totalPages"
        @update:page="setPage" />
    </template>
  </div>
</template>

<style scoped>
.campaigns-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  --page-accent: var(--accent-overall);
}

.campaigns-page__controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-md);
}

.campaigns-page__controls-left {
  display: flex;
  align-items: center;
  flex: 1;
  flex-wrap: wrap;
  gap: var(--space-md);
  min-width: 0;
}

.campaigns-page__controls-left :deep(.search-box) {
  flex: 0 1 320px;
}

.campaigns-page__controls-right {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.campaigns-page__count {
  margin-left: var(--space-xs);
  color: var(--page-accent);
}

.campaigns-page__error {
  color: var(--error);
}

.campaigns-page__invites {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.campaigns-page__invite {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md);
  background: var(--bg-surface);
  border-radius: var(--radius-card);
}

.campaigns-page__invite-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-decoration: none;
}

.campaigns-page__invite-name:hover {
  color: var(--page-accent);
}

@media (max-width: 767px) {
  .campaigns-page__controls-left {
    flex-basis: 100%;
  }

  .campaigns-page__controls-left :deep(.search-box) {
    flex: 1 1 100%;
  }
}
</style>
