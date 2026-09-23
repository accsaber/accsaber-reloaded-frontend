<script setup lang="ts">
import EmptyState from '@/components/common/EmptyState.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import MissionCard from '@/components/domain/MissionCard.vue'
import MissionContributorsModal from '@/components/domain/MissionContributorsModal.vue'
import SharedMissionRow from '@/components/domain/SharedMissionRow.vue'
import { usePageableRoute } from '@/composables/usePageableRoute'
import { useSharedNow } from '@/composables/useSharedNow'
import type { ClanResponse } from '@/types/api/clans'
import type { MissionResponse } from '@/types/api/missions'
import type { Page, PaginationParams } from '@/types/pagination'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router'

const PAGE_SIZE = 20

const props = defineProps<{
  clan: ClanResponse
  isMember: boolean
}>()

const route = useRoute()
const router = useRouter()
const now = useSharedNow()

const { currentPage, paginationParams, setPage } = usePageableRoute({
  defaultSort: 'createdAt',
  defaultOrder: 'desc',
  defaultSize: PAGE_SIZE,
  secondarySort: null,
})

const pageData = ref<Page<MissionResponse> | null>(null)
const ownRows = ref<MissionResponse[]>([])
const loading = ref(true)
const openId = ref<string | null>(null)

const showHistory = computed(() => route.query.missions === 'history')
const missions = computed(() => pageData.value?.content ?? [])
const totalPages = computed(() => pageData.value?.totalPages ?? 0)
const openMission = computed(() => missions.value.find((m) => m.id === openId.value) ?? null)
const ownByParent = computed(() => {
  const map = new Map<string, MissionResponse>()
  for (const row of ownRows.value) if (row.parentMissionId) map.set(row.parentMissionId, row)
  return map
})

function setView(history: boolean) {
  const query: LocationQueryRaw = { ...route.query, missions: history ? 'history' : undefined }
  delete query.page
  router.replace({ query })
}

function loadContributors(missionId: string, params: PaginationParams) {
  return import('@/api/clans').then((m) => m.getClanMissionContributors(props.clan.clan.id, missionId, params))
}

async function fetchMissions() {
  loading.value = true
  try {
    const { getClanMissions } = await import('@/api/clans')
    const [page, own] = await Promise.all([
      getClanMissions(props.clan.clan.id, {
        current: !showHistory.value,
        page: paginationParams.value.page,
        size: PAGE_SIZE,
      }),
      props.isMember && !showHistory.value
        ? import('@/api/missions').then((m) => m.getMyMissions({ pool: 'clan' })).catch(() => [])
        : Promise.resolve([]),
    ])
    pageData.value = page
    ownRows.value = own
  } catch {
    pageData.value = null
    ownRows.value = []
  } finally {
    loading.value = false
  }
}

watch(() => [route.query.page, route.query.missions, props.isMember], fetchMissions, { immediate: true })
</script>

<template>
  <section class="clan-missions">
    <div class="clan-missions__toggle" role="tablist">
      <button
        type="button"
        role="tab"
        class="clan-missions__tab"
        :class="{ 'clan-missions__tab--active': !showHistory }"
        :aria-selected="!showHistory"
        @click="setView(false)"
      >
        Active
      </button>
      <button
        type="button"
        role="tab"
        class="clan-missions__tab"
        :class="{ 'clan-missions__tab--active': showHistory }"
        :aria-selected="showHistory"
        @click="setView(true)"
      >
        History
      </button>
    </div>

    <div v-if="loading && missions.length === 0" class="clan-missions__list">
      <SkeletonLoader v-for="i in 3" :key="i" variant="card" height="96px" />
    </div>

    <EmptyState
      v-else-if="missions.length === 0"
      :message="showHistory ? 'No finished missions yet.' : 'No missions running.'"
    />

    <div v-else class="clan-missions__list">
      <div v-for="mission in missions" :key="mission.id" class="clan-missions__item">
        <SharedMissionRow :mission="mission" :locked="false" :now="now" @contributors="openId = mission.id" />
        <div v-if="ownByParent.get(mission.id)" class="clan-missions__own">
          <span class="clan-missions__own-label">Your part</span>
          <MissionCard :mission="ownByParent.get(mission.id)!" />
        </div>
      </div>
    </div>

    <PaginationControls v-if="totalPages > 1" :page="currentPage" :total-pages="totalPages" @update:page="setPage" />

    <MissionContributorsModal
      v-if="openMission"
      :mission="openMission"
      :load-page="loadContributors"
      @close="openId = null"
      @navigate="openId = null"
    />
  </section>
</template>

<style scoped>
.clan-missions {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.clan-missions__toggle {
  display: flex;
  gap: var(--space-xs);
}

.clan-missions__tab {
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

.clan-missions__tab--active {
  color: var(--page-accent, var(--accent));
  border-color: var(--page-accent, var(--accent));
}

.clan-missions__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.clan-missions__item {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.clan-missions__own {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  margin-left: var(--space-lg);
  padding-left: var(--space-md);
  border-left: 1px solid var(--bg-overlay);
}

.clan-missions__own-label {
  font-size: var(--text-caption);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-secondary);
}
</style>
