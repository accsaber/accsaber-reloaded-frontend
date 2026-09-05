<script setup lang="ts">
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import { useNow } from '@/composables/useNow'
import type { MissionResponse, MissionStatus } from '@/types/api/missions'
import CommunityContributorsModal from '@/views/news/CommunityContributorsModal.vue'
import CommunityMissionRow from '@/views/news/CommunityMissionRow.vue'
import { computed, ref } from 'vue'

const props = defineProps<{
  missions: MissionResponse[]
  loading: boolean
  joinPrompt: boolean
}>()

const now = useNow()

const STATUS_RANK: Partial<Record<MissionStatus, number>> = { active: 0, completed: 1 }

const openId = ref<string | null>(null)

const sorted = computed(() =>
  [...props.missions].sort((a, b) => {
    const rankA = STATUS_RANK[a.status ?? 'active'] ?? 2
    const rankB = STATUS_RANK[b.status ?? 'active'] ?? 2
    if (rankA !== rankB) return rankA - rankB
    return rankA === 0 ? deadline(a) - deadline(b) : deadline(b) - deadline(a)
  }),
)

const openMission = computed(() => sorted.value.find((m) => m.id === openId.value) ?? null)

function deadline(mission: MissionResponse): number {
  return mission.expiresAt ? new Date(mission.expiresAt).getTime() : Number.POSITIVE_INFINITY
}
</script>

<template>
  <section class="community">
    <header class="community__head">
      <h2 class="community__title">Community</h2>
      <p class="community__lead">The whole playerbase chips away at these together.</p>
      <p v-if="joinPrompt" class="community__join">Join the event to contribute.</p>
    </header>

    <div v-if="loading && !missions.length" class="community__skeletons">
      <SkeletonLoader variant="card" />
      <SkeletonLoader variant="card" />
    </div>

    <div v-else class="community__list">
      <CommunityMissionRow
        v-for="mission in sorted"
        :key="mission.id"
        :mission="mission"
        :now="now"
        @contributors="openId = mission.id"
      />
    </div>

    <CommunityContributorsModal
      v-if="openMission"
      :mission="openMission"
      @close="openId = null"
      @navigate="openId = null"
    />
  </section>
</template>

<style scoped>
.community {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: var(--space-lg) var(--space-xl);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  background: var(--bg-surface);
}

.community__head {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.community__title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--text-primary);
}

.community__lead {
  margin: 0;
  font-size: 0.82rem;
  color: var(--text-tertiary);
}

.community__join {
  margin: var(--space-xs) 0 0;
  font-size: 0.82rem;
  font-style: italic;
  color: var(--warning);
}

.community__skeletons {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.community__list {
  display: flex;
  flex-direction: column;
}
</style>
