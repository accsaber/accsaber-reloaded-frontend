<script setup lang="ts">
import { getApiErrorMessage } from '@/api/client'
import BaseModal from '@/components/common/BaseModal.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import UserChip from '@/components/domain/UserChip.vue'
import type { MissionContributorResponse, MissionResponse } from '@/types/api/missions'
import type { UserRefDisplay } from '@/types/display'
import type { Page, PaginationParams } from '@/types/pagination'
import { getRankClass } from '@/utils/ranking'
import { missionUnitLabel } from '@/utils/missions'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  mission: MissionResponse
  loadPage: (missionId: string, params: PaginationParams) => Promise<Page<MissionContributorResponse>>
}>()

const emit = defineEmits<{
  close: []
  navigate: []
}>()

interface ContributorRow {
  rank: number
  player: UserRefDisplay
  rewarded: boolean
  amount: string
}

const PAGE_SIZE = 20

const rows = ref<ContributorRow[]>([])
const page = ref(1)
const totalPages = ref(0)
const loading = ref(false)
const error = ref<string | null>(null)

const paid = computed(() => props.mission.status === 'completed')

function toRow(row: MissionContributorResponse): ContributorRow {
  return {
    rank: row.rank,
    player: row.player,
    rewarded: row.rewardedAt != null,
    amount: missionUnitLabel(props.mission.type, row.contribution),
  }
}

async function load(missionId: string, target: number) {
  loading.value = true
  error.value = null
  try {
    const res = await props.loadPage(missionId, { page: target - 1, size: PAGE_SIZE })
    rows.value = res.content.map(toRow)
    totalPages.value = res.totalPages
  } catch (err) {
    rows.value = []
    totalPages.value = 0
    error.value = getApiErrorMessage(err, 'Could not load contributors')
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.mission.id, page.value] as const,
  ([id, target]) => load(id, target),
  { immediate: true },
)
</script>

<template>
  <BaseModal open :title="mission.name" max-width="620px" @close="emit('close')">
    <p class="contrib__lead">
      Every contributor earns the full reward, however small their share.
    </p>

    <div v-if="loading && !rows.length" class="contrib__skeletons">
      <SkeletonLoader v-for="n in 6" :key="n" variant="table-row" />
    </div>

    <p v-else-if="error" class="contrib__error" role="alert">{{ error }}</p>

    <EmptyState v-else-if="!rows.length" icon="🤝" message="Nobody has contributed yet." />

    <ol v-else class="contrib__list">
      <li v-for="row in rows" :key="row.player.id" class="contrib__row">
        <span class="contrib__rank" :class="getRankClass(row.rank)">#{{ row.rank }}</span>
        <UserChip :user="row.player" link class="contrib__player" @click="emit('navigate')" />
        <span v-if="paid" class="contrib__reward" :class="{ 'contrib__reward--pending': !row.rewarded }">
          {{ row.rewarded ? 'Rewarded' : 'Paying out' }}
        </span>
        <span class="contrib__value">{{ row.amount }}</span>
      </li>
    </ol>

    <template v-if="totalPages > 1" #footer>
      <PaginationControls :page="page" :total-pages="totalPages" @update:page="page = $event" />
    </template>
  </BaseModal>
</template>

<style scoped>
.contrib__lead {
  margin: 0 0 var(--space-md);
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.contrib__skeletons {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.contrib__error {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--error);
}

.contrib__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.contrib__row {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-sm) 0;
  border-bottom: 1px solid var(--bg-overlay);
}

.contrib__row:last-child {
  border-bottom: none;
}

.contrib__rank {
  min-width: 40px;
  text-align: right;
  font-family: var(--font-mono);
  font-size: var(--text-body);
  color: var(--text-secondary);
}

.contrib__rank.rank--gold { color: var(--tier-gold); font-weight: 700; }
.contrib__rank.rank--silver { color: var(--tier-silver); font-weight: 700; }
.contrib__rank.rank--bronze { color: var(--tier-bronze); font-weight: 700; }

.contrib__player {
  flex: 1;
}

.contrib__reward {
  flex-shrink: 0;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--success);
}

.contrib__reward--pending {
  color: var(--text-tertiary);
}

.contrib__value {
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: var(--text-body);
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}
</style>
