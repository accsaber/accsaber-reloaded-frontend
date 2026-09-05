<script setup lang="ts">
import { getApiErrorMessage } from '@/api/client'
import BaseModal from '@/components/common/BaseModal.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import CountryFlag from '@/components/domain/CountryFlag.vue'
import { onAvatarError, pickAvatarFallback, pickAvatarUrl } from '@/composables/useAvatarFallback'
import type { CommunityContributorResponse, MissionResponse } from '@/types/api/missions'
import { getRankClass } from '@/utils/ranking'
import { missionUnitLabel } from '@/utils/missions'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  mission: MissionResponse
}>()

const emit = defineEmits<{
  close: []
  navigate: []
}>()

interface ContributorRow {
  rank: number
  userId: string
  userName: string
  userCountry: string
  avatarUrl: string
  avatarFallbackUrl: string | null
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

function toRow(row: CommunityContributorResponse): ContributorRow {
  const source = { avatarUrl: row.userAvatarUrl, cdnAvatarUrl: row.userCdnAvatarUrl }
  return {
    rank: row.rank,
    userId: row.userId,
    userName: row.userName,
    userCountry: row.userCountry,
    avatarUrl: pickAvatarUrl(source),
    avatarFallbackUrl: pickAvatarFallback(source),
    rewarded: row.rewardedAt != null,
    amount: missionUnitLabel(props.mission.type, row.contribution),
  }
}

async function load(missionId: string, target: number) {
  loading.value = true
  error.value = null
  try {
    const { getCommunityContributors } = await import('@/api/missions')
    const res = await getCommunityContributors(missionId, { page: target - 1, size: PAGE_SIZE })
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
      <li v-for="row in rows" :key="row.userId" class="contrib__row">
        <span class="contrib__rank" :class="getRankClass(row.rank)">#{{ row.rank }}</span>
        <img class="contrib__avatar" :src="row.avatarUrl" :alt="row.userName" loading="lazy"
          decoding="async" @error="onAvatarError(row.avatarFallbackUrl)($event)" />
        <router-link class="contrib__name" :to="{ name: 'player-profile', params: { userId: row.userId } }"
          @click="emit('navigate')">
          {{ row.userName }}
          <CountryFlag v-if="row.userCountry" :country="row.userCountry" />
        </router-link>
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

.contrib__avatar {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-avatar);
  object-fit: cover;
  background: var(--bg-overlay);
  flex-shrink: 0;
}

.contrib__name {
  flex: 1;
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--text-body);
  font-weight: 500;
  color: var(--text-primary);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.contrib__name:hover {
  color: var(--page-accent, var(--accent));
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
