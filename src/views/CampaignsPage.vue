<script setup lang="ts">
import { getApiErrorMessage } from '@/api/client'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PageHeaderBleed from '@/components/common/PageHeaderBleed.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SearchBox from '@/components/common/SearchBox.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import CampaignFilterBar from '@/components/domain/CampaignFilterBar.vue'
import CampaignRow from '@/components/domain/CampaignRow.vue'
import UserCampaignsPanel from '@/components/domain/UserCampaignsPanel.vue'
import { useCampaignTags } from '@/composables/useCampaignTags'
import { usePageableRoute } from '@/composables/usePageableRoute'
import { useAuthStore } from '@/stores/auth'
import type {
  CampaignCollaboratorResponse,
  CampaignDetailResponse,
  CampaignProgressSummary,
  CampaignResponse,
} from '@/types/api/campaigns'
import type { Page } from '@/types/pagination'
import type { CampaignStatus } from '@/types/enums'
import type { CampaignFilterState } from '@/utils/campaignFilters'
import { BROWSE_SORT_OPTIONS } from '@/utils/campaignFilters'
import { isCurationSubdomain, isCurationSurface } from '@/utils/subdomain'
import { usePageMeta } from '@/composables/usePageMeta'
import { computed, onMounted, ref, watch } from 'vue'
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

const SEARCHABLE_PANES = new Set<Pane>(['all', 'review', 'drafts'])

const searchablePane = computed(() => SEARCHABLE_PANES.has(pane.value))

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
const rulesOpen = ref(false)

const CAMPAIGN_RULES = [
  {
    title: 'No impersonation.',
    text: 'Do not use aliases to pass yourself off as another person.',
  },
  {
    title: 'Keep artwork clean.',
    text: 'No NSFW or questionable imagery in campaign icons or backgrounds.',
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

function goToNewCampaign() {
  router.push({ name: 'campaign-new' })
}

const items = ref<CampaignResponse[]>([])
const totalPages = ref(1)
const loading = ref(false)
const error = ref<string | null>(null)

const progressMap = ref(new Map<string, CampaignProgressSummary>())

const pendingInvites = ref<CampaignCollaboratorResponse[]>([])
const invitesLoading = ref(false)
const respondingId = ref<string | null>(null)
const mineCollabs = ref<CampaignDetailResponse[]>([])

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

const statusFilter = computed<CampaignStatus[]>(() => {
  if (pane.value === 'review') return ['PUBLISHED']
  return curatedOnly.value ? ['CURATED'] : ['PUBLISHED', 'CURATED']
})

async function loadInvites() {
  if (!auth.isLoggedIn) {
    pendingInvites.value = []
    return
  }
  invitesLoading.value = true
  try {
    const { getMyCollaborations } = await import('@/api/campaigns')
    const page = await getMyCollaborations({ status: 'PENDING', size: 50 })
    pendingInvites.value = page.content
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

const acceptInvite = (inv: CampaignCollaboratorResponse) => respondToInvite(inv, true)
const declineInvite = (inv: CampaignCollaboratorResponse) => respondToInvite(inv, false)

async function loadMineCollabs() {
  if (!auth.isLoggedIn) {
    mineCollabs.value = []
    return
  }
  try {
    const { getMyCollaborations, getCampaign } = await import('@/api/campaigns')
    const page = await getMyCollaborations({ status: 'ACCEPTED', size: 50 })
    const details = await Promise.all(
      page.content.map((c) => getCampaign(c.campaignId).catch(() => null)),
    )
    mineCollabs.value = details.filter((c): c is CampaignDetailResponse => !!c)
  } catch {
    mineCollabs.value = []
  }
}

async function loadCampaigns() {
  if (pane.value === 'runs') return
  if (pane.value === 'invites') {
    void loadInvites()
    return
  }
  loading.value = true
  error.value = null
  mineCollabs.value = []
  try {
    if (pane.value === 'mine') {
      if (!auth.isLoggedIn || !auth.userId) {
        items.value = []
        totalPages.value = 1
        return
      }
      const { getCampaigns: fetchCampaigns } = await import('@/api/campaigns')
      const page: Page<CampaignResponse> = await fetchCampaigns({
        page: paginationParams.value.page,
        size: paginationParams.value.size,
        sort: 'createdAt,desc',
        creatorId: auth.userId,
      })
      items.value = page.content
      totalPages.value = page.totalPages || 1
      if (currentPage.value === 1) await loadMineCollabs()
    } else if (pane.value === 'drafts') {
      if (!canSeeDrafts.value) {
        items.value = []
        totalPages.value = 1
        return
      }
      const { getCampaigns: fetchCampaigns } = await import('@/api/campaigns')
      const page: Page<CampaignResponse> = await fetchCampaigns({
        page: paginationParams.value.page,
        size: paginationParams.value.size,
        sort: 'createdAt,desc',
        status: ['DRAFT'],
        search: searchTerm.value || undefined,
      })
      items.value = page.content
      totalPages.value = page.totalPages || 1
    } else {
      if (pane.value === 'review' && !canReview.value) {
        items.value = []
        totalPages.value = 1
        return
      }
      const { getCampaigns: fetchCampaigns, getMyCampaignProgressBulk } = await import('@/api/campaigns')
      const page: Page<CampaignResponse> = await fetchCampaigns({
        page: paginationParams.value.page,
        size: paginationParams.value.size,
        sort: paginationParams.value.sort,
        tagIds: selectedTagIds.value.length > 0 ? selectedTagIds.value : undefined,
        status: statusFilter.value,
        search: searchTerm.value || undefined,
        official: officialOnly.value || undefined,
        loved: lovedOnly.value || undefined,
      })
      items.value = page.content
      totalPages.value = page.totalPages || 1

      if (pane.value === 'all' && auth.isLoggedIn && items.value.length > 0) {
        const ids = items.value.map((c) => c.id)
        const progressList = await getMyCampaignProgressBulk(ids)
        const nextMap = new Map(progressMap.value)
        for (const p of progressList) nextMap.set(p.campaign.id, p)
        progressMap.value = nextMap
      }
    }
  } catch (err) {
    error.value = getApiErrorMessage(err, 'Failed to load campaigns')
    items.value = []
  } finally {
    loading.value = false
  }
}

function setPane(next: Pane) {
  if (next === pane.value) return
  const query = { ...route.query }
  if (next === defaultPane.value) {
    delete query.pane
  } else {
    query.pane = next
  }
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

onMounted(() => {
  void loadTags()
  void loadCampaigns()
  void loadInvites()
})

watch(
  () => [
    pane.value,
    curatedOnly.value,
    officialOnly.value,
    lovedOnly.value,
    selectedTagIds.value.join(','),
    searchTerm.value,
    paginationParams.value.page,
    String(paginationParams.value.sort),
  ],
  () => {
    void loadCampaigns()
  },
)

watch(
  () => auth.isLoggedIn,
  (next, prev) => {
    if (next !== prev) {
      void loadCampaigns()
      void loadInvites()
    }
  },
)
</script>

<template>
  <div class="campaigns-page" style="--page-accent: var(--accent-overall);">
    <PageHeaderBleed title="Campaigns" subtitle="custom journeys through ranked maps" />

    <div class="campaigns-page__bar">
      <nav class="campaigns-page__panes" aria-label="Campaign panes">
        <button class="campaigns-page__pane" :class="{ 'campaigns-page__pane--active': pane === 'all' }"
          @click="setPane('all')">
          Browse
        </button>
        <button v-if="auth.isLoggedIn" class="campaigns-page__pane"
          :class="{ 'campaigns-page__pane--active': pane === 'runs' }" @click="setPane('runs')">
          My Runs
        </button>
        <button v-if="auth.isLoggedIn" class="campaigns-page__pane"
          :class="{ 'campaigns-page__pane--active': pane === 'mine' }" @click="setPane('mine')">
          Mine
        </button>
        <button v-if="auth.isLoggedIn" class="campaigns-page__pane"
          :class="{ 'campaigns-page__pane--active': pane === 'invites' }" @click="setPane('invites')">
          Invites
          <span v-if="pendingInvites.length > 0" class="campaigns-page__pane-badge">
            {{ pendingInvites.length }}
          </span>
        </button>
        <button v-if="canReview" class="campaigns-page__pane"
          :class="{ 'campaigns-page__pane--active': pane === 'review' }" @click="setPane('review')">
          Review
        </button>
        <button v-if="canSeeDrafts" class="campaigns-page__pane"
          :class="{ 'campaigns-page__pane--active': pane === 'drafts' }" @click="setPane('drafts')">
          Drafts
        </button>
      </nav>

      <SearchBox v-if="searchablePane" class="campaigns-page__search" :model-value="searchTerm"
        placeholder="Search title or creator..." @update:model-value="setSearch" />

      <div class="campaigns-page__bar-actions">
        <button type="button" class="campaigns-page__rules-btn" @click="rulesOpen = true">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Rules
        </button>
        <button v-if="auth.isLoggedIn || isCurator" type="button" class="campaigns-page__new"
          @click="goToNewCampaign">
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
      <EmptyState v-if="!auth.isLoggedIn" message="Sign in to see your collaboration invites." />
      <div v-else-if="invitesLoading" class="campaigns-page__list">
        <SkeletonLoader v-for="i in 3" :key="i" variant="card" />
      </div>
      <EmptyState v-else-if="pendingInvites.length === 0"
        message="No pending invites. When someone invites you to collaborate, it lands here." />
      <ul v-else class="campaigns-page__invites">
        <li v-for="inv in pendingInvites" :key="inv.id" class="campaigns-page__invite">
          <router-link class="campaigns-page__invite-main"
            :to="{ name: 'campaign-detail', params: { campaignId: inv.campaignSlug || inv.campaignId } }">
            <span class="campaigns-page__invite-name">{{ inv.campaignName }}</span>
            <span class="campaigns-page__invite-sub">Invitation to collaborate</span>
          </router-link>
          <div class="campaigns-page__invite-actions">
            <BaseButton size="sm" variant="primary" :loading="respondingId === inv.id"
              @click="acceptInvite(inv)">
              Accept
            </BaseButton>
            <BaseButton size="sm" :disabled="respondingId === inv.id" @click="declineInvite(inv)">
              Decline
            </BaseButton>
          </div>
        </li>
      </ul>
    </template>

    <template v-else-if="pane === 'runs'">
      <EmptyState v-if="!auth.isLoggedIn" message="Sign in to track campaigns you've started." />
      <UserCampaignsPanel v-else
        empty-message="You haven't started any campaigns yet. Browse the catalogue to begin one." />
    </template>

    <template v-else>
      <div v-if="loading" class="campaigns-page__list">
        <SkeletonLoader v-for="i in 4" :key="i" variant="card" />
      </div>

      <EmptyState v-else-if="pane === 'mine' && !auth.isLoggedIn"
        message="Sign in to see your created campaigns." />

      <EmptyState v-else-if="pane === 'mine' && items.length === 0 && mineCollabs.length === 0"
        message="You haven't drafted any campaigns yet. Use New campaign to start one." />

      <EmptyState v-else-if="pane === 'review' && items.length === 0"
        message="No published campaigns are waiting on curation right now." />

      <EmptyState v-else-if="pane === 'drafts' && items.length === 0"
        message="No draft campaigns match this search." />

      <EmptyState v-else-if="pane !== 'mine' && items.length === 0"
        message="No campaigns match these filters." />

      <div v-else class="campaigns-page__list">
        <CampaignRow v-for="c in (pane === 'mine' ? mineCollabs : [])" :key="`collab-${c.id}`"
          :campaign="c" :editor-link="true" collab />
        <CampaignRow v-for="campaign in items" :key="campaign.id" :campaign="campaign"
          :progress="progressMap.get(campaign.id) ?? null"
          :editor-link="pane === 'mine' || pane === 'review' || pane === 'drafts'" />
      </div>

      <div v-if="totalPages > 1 && !loading" class="campaigns-page__pagination">
        <PaginationControls :page="currentPage" :total-pages="totalPages" @update:page="setPage" />
      </div>
    </template>

    <BaseModal :open="rulesOpen" title="Campaign rules" max-width="480px" @close="rulesOpen = false">
      <div class="campaigns-page__rules">
        <p class="campaigns-page__rules-lead">
          Campaigns are player-made and public. Keep yours within these rules:
        </p>
        <ol class="campaigns-page__rules-list">
          <li v-for="(rule, i) in CAMPAIGN_RULES" :key="rule.title" class="campaigns-page__rule">
            <span class="campaigns-page__rule-num" aria-hidden="true">{{ i + 1 }}</span>
            <span class="campaigns-page__rule-text">
              <strong>{{ rule.title }}</strong> {{ rule.text }}
            </span>
          </li>
        </ol>
        <p class="campaigns-page__rules-note">
          By creating a campaign, you agree to these rules. Breaking them results in an automatic,
          indefinite suspension from every AccSaber feature.
        </p>

        <div class="campaigns-page__rules-aside">
          <h3 class="campaigns-page__rules-aside-title">What curation means</h3>
          <p>
            Unlike BeatSaver, curation here does not mean a campaign is objectively good. It means
            rewards-eligible: the rewards are well laid out and the paths through the campaign are
            clear rather than confusing. Only curated campaigns pay out XP and items.
          </p>
        </div>
      </div>
    </BaseModal>
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
  border-radius: 4px;
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
  border-radius: 3px;
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
  border-radius: 2px;
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
  border-radius: 999px;
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
  border-radius: 4px;
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
  border-radius: 4px;
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

.campaigns-page__rules-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: transparent;
  border: none;
  border-radius: 3px;
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: color 120ms ease;
}

.campaigns-page__rules-btn:hover {
  color: var(--text-primary);
}

.campaigns-page__rules {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.campaigns-page__rules-lead {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--text-secondary);
}

.campaigns-page__rules-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.campaigns-page__rule {
  display: flex;
  gap: var(--space-sm);
  align-items: baseline;
}

.campaigns-page__rule-num {
  flex-shrink: 0;
  min-width: 16px;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  color: var(--text-tertiary);
  text-align: right;
}

.campaigns-page__rule-text {
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--text-secondary);
}

.campaigns-page__rule-text strong {
  font-weight: 600;
  color: var(--text-primary);
}

.campaigns-page__rules-note {
  margin: var(--space-sm) 0 0;
  padding: var(--space-md);
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--text-primary);
  background: color-mix(in srgb, var(--error) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--error) 40%, transparent);
  border-radius: 4px;
}

.campaigns-page__rules-aside {
  margin-top: var(--space-sm);
  padding-top: var(--space-md);
  border-top: 1px solid var(--bg-overlay);
}

.campaigns-page__rules-aside p {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--text-secondary);
}

.campaigns-page__rules-aside-title {
  margin: 0 0 var(--space-xs);
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-primary);
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
