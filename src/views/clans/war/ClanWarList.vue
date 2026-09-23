<script setup lang="ts">
import { parseApiError } from '@/api/client'
import EmptyState from '@/components/common/EmptyState.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SearchBox from '@/components/common/SearchBox.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import { usePageableRoute } from '@/composables/usePageableRoute'
import { useSharedNow } from '@/composables/useSharedNow'
import type { ClanWarResponse } from '@/types/api/clans'
import type { Page } from '@/types/pagination'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router'
import ClanWarRow from './ClanWarRow.vue'

const PAGE_SIZE = 20

const props = defineProps<{
  clanId?: string
  latestWar?: ClanWarResponse | null
}>()

const route = useRoute()
const router = useRouter()
const now = useSharedNow()

const { currentPage, paginationParams, setPage } = usePageableRoute({
  defaultSort: 'declaredAt',
  defaultOrder: 'desc',
  defaultSize: PAGE_SIZE,
  secondarySort: null,
})

const wars = ref<Page<ClanWarResponse> | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const openOnly = computed(() => route.query.open === '1')
const search = ref(String(route.query.search ?? ''))
const totalPages = computed(() => wars.value?.totalPages ?? 0)

watch(search, (value) => {
  const query: LocationQueryRaw = { ...route.query, search: value.trim() || undefined, page: undefined }
  router.replace({ query })
})

function setOpenOnly(value: boolean) {
  const query: LocationQueryRaw = { ...route.query, open: value ? '1' : undefined, page: undefined }
  router.replace({ query })
}

async function fetchWars() {
  loading.value = true
  error.value = null
  try {
    const { getClanWars } = await import('@/api/clans')
    wars.value = await getClanWars({
      page: paginationParams.value.page,
      size: PAGE_SIZE,
      clanId: props.clanId,
      open: openOnly.value || undefined,
      search: String(route.query.search ?? '').trim() || undefined,
    })
  } catch (err) {
    error.value = parseApiError(err, 'Could not load wars.').message
  } finally {
    loading.value = false
  }
}

watch(
  () => props.latestWar,
  (war) => {
    if (!war || !wars.value) return
    const content = wars.value.content
    const index = content.findIndex((w) => w.id === war.id)
    if (index >= 0) content.splice(index, 1, war)
    else if (currentPage.value === 1 && (!openOnly.value || war.status !== 'ended')) content.unshift(war)
  },
)

watch(() => [route.query.page, route.query.open, route.query.search, props.clanId], fetchWars, { immediate: true })
</script>

<template>
  <section class="war-list">
    <div class="war-list__controls">
      <div class="war-list__toggle" role="tablist">
        <button
          type="button"
          role="tab"
          class="war-list__tab"
          :class="{ 'war-list__tab--active': !openOnly }"
          :aria-selected="!openOnly"
          @click="setOpenOnly(false)"
        >
          All
        </button>
        <button
          type="button"
          role="tab"
          class="war-list__tab"
          :class="{ 'war-list__tab--active': openOnly }"
          :aria-selected="openOnly"
          @click="setOpenOnly(true)"
        >
          Open
        </button>
      </div>
      <SearchBox v-if="!clanId" v-model="search" placeholder="Search clans at war..." />
    </div>

    <p v-if="error" class="war-list__error" role="alert">{{ error }}</p>

    <div v-if="loading && !wars" class="war-list__rows">
      <SkeletonLoader v-for="i in 3" :key="i" variant="card" height="140px" />
    </div>
    <EmptyState v-else-if="!wars?.content.length" :message="openOnly ? 'No open wars.' : 'No wars yet.'" />
    <div v-else class="war-list__rows">
      <ClanWarRow v-for="war in wars.content" :key="war.id" :war="war" :now="now" :clan-id="clanId" />
    </div>

    <PaginationControls v-if="totalPages > 1" :page="currentPage" :total-pages="totalPages" @update:page="setPage" />
  </section>
</template>

<style scoped>
.war-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.war-list__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
}

.war-list__toggle {
  display: flex;
  gap: var(--space-xs);
}

.war-list__tab {
  padding: var(--space-xs) var(--space-md);
  font: inherit;
  font-size: var(--text-caption);
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-secondary);
  background: transparent;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
  cursor: pointer;
}

.war-list__tab--active {
  color: var(--page-accent, var(--accent));
  border-color: var(--page-accent, var(--accent));
}

.war-list__rows {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.war-list__error {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--error);
}
</style>
