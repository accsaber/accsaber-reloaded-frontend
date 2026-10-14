<script setup lang="ts">
import ChartToggleGroup from '@/components/common/ChartToggleGroup.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import MissionContributorsModal from '@/components/domain/MissionContributorsModal.vue'
import SharedMissionRow from '@/components/domain/SharedMissionRow.vue'
import { usePageableRoute } from '@/composables/usePageableRoute'
import { useNow } from '@/composables/useNow'
import type { ClanResponse } from '@/types/api/clans'
import type { MissionResponse } from '@/types/api/missions'
import type { ChartToggle } from '@/types/display'
import type { Page, PaginationParams } from '@/types/pagination'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router'

const PAGE_SIZE = 20
const VIEW_TOGGLES: ChartToggle[] = [
  { key: 'active', label: 'Active' },
  { key: 'history', label: 'History' },
]

const props = defineProps<{
  clan: ClanResponse
  isMember: boolean
}>()

const route = useRoute()
const router = useRouter()
const now = useNow()

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

function setView(key: string) {
  const query: LocationQueryRaw = { ...route.query, missions: key === 'history' ? 'history' : undefined }
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
    pageData.value = await getClanMissions(props.clan.clan.id, {
      current: !showHistory.value,
      page: paginationParams.value.page,
      size: PAGE_SIZE,
    })
  } catch {
    pageData.value = null
  } finally {
    loading.value = false
  }
}

async function fetchOwnRows(member: boolean) {
  ownRows.value = member
    ? await import('@/api/missions').then((m) => m.getMyMissions({ pool: 'clan' })).catch(() => [])
    : []
}

watch(() => [route.query.page, route.query.missions], fetchMissions, { immediate: true })
watch(() => props.isMember, fetchOwnRows, { immediate: true })
</script>

<template>
  <section class="clan-missions">
    <ChartToggleGroup :toggles="VIEW_TOGGLES" :active="[showHistory ? 'history' : 'active']" label="Missions"
      @select="setView" />

    <div v-if="loading && missions.length === 0" class="clan-missions__list">
      <SkeletonLoader v-for="i in 3" :key="i" variant="card" height="96px" />
    </div>

    <EmptyState
      v-else-if="missions.length === 0"
      :message="showHistory ? 'No finished missions yet.' : 'New missions arrive with the weekly reset.'"
    />

    <div v-else class="clan-missions__list">
      <SharedMissionRow
        v-for="mission in missions"
        :key="mission.id"
        :mission="mission"
        :locked="false"
        :now="now"
        :member-row="ownByParent.get(mission.id)"
        @contributors="openId = mission.id"
      />
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

.clan-missions__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}
</style>
