<script setup lang="ts">
import { getApiErrorMessage } from '@/api/client'
import BaseButton from '@/components/common/BaseButton.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PageHeaderBleed from '@/components/common/PageHeaderBleed.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SearchBox from '@/components/common/SearchBox.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import CampaignFilterBar from '@/components/domain/CampaignFilterBar.vue'
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
const loading = ref(false)
const error = ref<string | null>(null)

const pendingInvites = ref<CampaignCollaboratorResponse[]>([])
const invitesLoading = ref(false)
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
  if (pane.value === 'mine') return auth.isLoggedIn ? 'No campaigns yet' : 'Sign in to see your campaigns'
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
    error.value = getApiErrorMessage(err, 'Failed to load campaigns')
    items.value = []
  }
  loading.value = false
}

async function loadInvites() {
  if (!auth.isLoggedIn) {
    pendingInvites.value = []
    return
  }
  invitesLoading.value = true
  try {
    const { getMyCollaborations } = await import('@/api/campaigns')
    pendingInvites.value = (await getMyCollaborations({ status: 'PENDING', size: 50 })).content
  } catch {
    pendingInvites.value = []
  } finally {
    invitesLoading.value = false
  }
}

async function respondToInvite(inv: CampaignCollaboratorResponse, accept: boolean) {
  respondingId.value = inv.id
  error.value = null
  try {
    const { respondToCampaignCollaboration } = await import('@/api/campaigns')
    await respondToCampaignCollaboration(inv.campaignId, accept)
    pendingInvites.value = pendingInvites.value.filter((i) => i.id !== inv.id)
  } catch (err) {
    error.value = getApiErrorMessage(err, `Failed to ${accept ? 'accept' : 'decline'} invite`)
  } finally {
    respondingId.value = null
  }
}

function setPane(next: Pane) {
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
</script>

<template>
  <div class="campaigns-page" style="--page-accent: var(--accent-overall);">
    <PageHeaderBleed title="Campaigns" />

    <div class="campaigns-page__bar">
      <nav class="campaigns-page__panes" aria-label="Campaign panes">
        <button v-for="p in panes" :key="p.key" class="campaigns-page__pane"
          :class="{ 'campaigns-page__pane--active': pane === p.key }" @click="setPane(p.key)">
          {{ p.label }}
          <span v-if="p.key === 'invites' && pendingInvites.length > 0" class="campaigns-page__pane-badge">
            {{ pendingInvites.length }}
          </span>
        </button>
      </nav>

      <SearchBox v-if="searchablePane" class="campaigns-page__search" :model-value="searchTerm"
        placeholder="Search title or creator..." @update:model-value="setSearch" />

      <div class="campaigns-page__bar-actions">
        <RulesButton
          title="Campaign rules"
          lead="Campaigns are player-made and public. Keep yours within these rules:"
          :rules="CAMPAIGN_RULES"
          note="By creating a campaign, you agree to these rules. Breaking them results in an automatic, indefinite suspension from every AccSaber feature."
        />
        <button v-if="auth.isLoggedIn || isCurator" type="button" class="campaigns-page__new"
          @click="router.push({ name: 'campaign-new' })">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New campaign
        </button>
      </div>
    </div>

    <CampaignFilterBar v-if="filterablePane" class="campaigns-page__toolbar"
      :model-value="browseFilters" :tags="tags" :sort-options="BROWSE_SORT_OPTIONS"
      :show-curated="pane === 'all'" @update:model-value="applyBrowseFilters" />

    <div v-if="error" class="campaigns-page__error" role="alert">{{ error }}</div>

    <template v-if="pane === 'invites'">
      <div v-if="invitesLoading" class="campaigns-page__list">
        <SkeletonLoader v-for="i in 3" :key="i" variant="card" />
      </div>
      <EmptyState v-else-if="pendingInvites.length === 0" message="No pending invites" />
      <ul v-else class="campaigns-page__invites">
        <li v-for="inv in pendingInvites" :key="inv.id" class="campaigns-page__invite">
          <router-link class="campaigns-page__invite-main"
            :to="{ name: 'campaign-detail', params: { campaignId: inv.campaignSlug || inv.campaignId } }">
            <span class="campaigns-page__invite-name">{{ inv.campaignName }}</span>
            <span class="campaigns-page__invite-sub">Invitation to collaborate</span>
          </router-link>
          <div class="campaigns-page__invite-actions">
            <BaseButton size="sm" variant="primary" :loading="respondingId === inv.id"
              @click="respondToInvite(inv, true)">
              Accept
            </BaseButton>
            <BaseButton size="sm" :disabled="respondingId === inv.id" @click="respondToInvite(inv, false)">
              Decline
            </BaseButton>
          </div>
        </li>
      </ul>
    </template>

    <template v-else-if="pane === 'runs'">
      <EmptyState v-if="!auth.isLoggedIn" message="Sign in to see your runs" />
      <UserCampaignsPanel v-else empty-message="No runs yet" />
    </template>

    <template v-else>
      <div v-if="loading" class="campaigns-page__list">
        <SkeletonLoader v-for="i in 4" :key="i" variant="card" />
      </div>

      <EmptyState v-else-if="items.length === 0" :message="emptyMessage" />

      <div v-else class="campaigns-page__list">
        <CampaignRow v-for="campaign in items" :key="campaign.id" :campaign="campaign"
          :collab="pane === 'mine' && campaign.creatorId !== auth.userId"
          :editor-link="pane === 'mine' || pane === 'review' || pane === 'drafts'" />
      </div>

      <div v-if="totalPages > 1 && !loading" class="campaigns-page__pagination">
        <PaginationControls :page="currentPage" :total-pages="totalPages" @update:page="setPage" />
      </div>
    </template>
  </div>
</template>

<style scoped>
.campaigns-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  max-width: 1080px;
  margin: 0 auto;
  padding: 0 var(--space-md) var(--space-2xl);
}

.campaigns-page__bar {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: var(--space-md);
}

.campaigns-page__panes {
  display: flex;
  gap: 2px;
  padding: 2px;
  background: var(--bg-base);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  grid-column: 1;
  justify-self: start;
}

.campaigns-page__new {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--page-accent);
  background: transparent;
  border: 1px solid var(--page-accent);
  border-radius: var(--radius-btn);
  cursor: pointer;
  transition: color 120ms ease, background 120ms ease;
}

.campaigns-page__new:hover {
  background: color-mix(in srgb, var(--page-accent) 12%, transparent);
}

.campaigns-page__pane {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px var(--space-md);
  background: none;
  border: none;
  border-radius: var(--radius-pill);
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-secondary);
  cursor: pointer;
  transition: color 120ms ease, background 120ms ease;
}

.campaigns-page__pane-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  font-family: var(--font-mono);
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0;
  color: var(--page-accent);
  background: color-mix(in srgb, var(--page-accent) 16%, transparent);
  border-radius: var(--radius-pill);
}

.campaigns-page__pane:hover {
  color: var(--text-primary);
}

.campaigns-page__pane--active {
  color: var(--text-primary);
  background: var(--bg-elevated);
}

.campaigns-page__bar-actions {
  grid-column: 3;
  justify-self: end;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-sm);
}

.campaigns-page__search {
  grid-column: 2;
  justify-self: center;
  width: 320px;
  max-width: 100%;
}

.campaigns-page__toolbar {
  margin-top: calc(-1 * var(--space-sm));
}

.campaigns-page__list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--space-md);
}

.campaigns-page__pagination {
  display: flex;
  justify-content: center;
}

.campaigns-page__error {
  padding: var(--space-md);
  font-size: var(--text-caption);
  color: var(--error);
  background: color-mix(in srgb, var(--error) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--error) 40%, transparent);
  border-radius: var(--radius-card);
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
  justify-content: space-between;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
}

.campaigns-page__invite-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  text-decoration: none;
  color: inherit;
}

.campaigns-page__invite-name {
  font-family: var(--font-sans);
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 120ms ease;
}

.campaigns-page__invite-main:hover .campaigns-page__invite-name {
  color: var(--page-accent);
}

.campaigns-page__invite-sub {
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.campaigns-page__invite-actions {
  display: inline-flex;
  gap: var(--space-sm);
  flex-shrink: 0;
}

@media (max-width: 860px) {
  .campaigns-page__bar {
    grid-template-columns: 1fr;
  }

  .campaigns-page__panes {
    grid-column: 1;
    justify-self: start;
  }

  .campaigns-page__search,
  .campaigns-page__bar-actions {
    grid-column: 1;
    justify-self: stretch;
  }

  .campaigns-page__search {
    width: 100%;
  }

  .campaigns-page__bar-actions {
    justify-content: flex-start;
  }
}

@media (max-width: 560px) {
  .campaigns-page__invite {
    flex-direction: column;
    align-items: stretch;
  }

  .campaigns-page__invite-actions {
    justify-content: flex-end;
  }
}
</style>
