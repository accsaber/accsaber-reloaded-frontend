<script setup lang="ts">
import ProgressBar from '@/components/common/ProgressBar.vue'
import MissionRewards from '@/components/domain/MissionRewards.vue'
import { formatUnlockDate, type EventMissionView, type MissionLock } from '@/utils/events'
import { missionProgressLabel } from '@/utils/missions'
import { computed } from 'vue'

const props = defineProps<{
  mission: EventMissionView
  lock: MissionLock
}>()

const state = computed<'completed' | 'locked' | 'open'>(() => {
  if (props.lock) return 'locked'
  if (props.mission.completed) return 'completed'
  return 'open'
})

const hasBar = computed(
  () => props.mission.progressTarget !== null && props.mission.progressTarget > 0,
)

const progress = computed(() =>
  hasBar.value ? (props.mission.progressCurrent ?? 0) / (props.mission.progressTarget as number) : 0,
)

const progressLabel = computed(() =>
  missionProgressLabel(
    props.mission.type,
    props.mission.progressCurrent ?? 0,
    props.mission.progressTarget ?? 0,
  ),
)

const lockHint = computed(() => {
  switch (props.lock) {
    case 'not-begun':
      return 'Begin the event to unlock'
    case 'progression':
      return props.mission.week > 1 ? `Complete week ${props.mission.week - 1} to unlock` : 'Locked'
    case 'calendar':
      return `Unlocks ${formatUnlockDate(props.mission.unlocksAt)}`
    default:
      return null
  }
})

const atMaxCompletions = computed(() => {
  const m = props.mission
  return m.maxCompletions !== null && m.completions !== null && m.completions >= m.maxCompletions
})

const showBar = computed(() => {
  if (!hasBar.value || state.value === 'locked') return false
  if (state.value !== 'completed') return true
  return props.mission.repeatable && props.mission.open && !atMaxCompletions.value
})

const doneTicks = computed(() => Math.max(1, props.mission.completions ?? 1))

const completionsLabel = computed(() => {
  const m = props.mission
  if (!m.repeatable || m.completions === null) return null
  return m.maxCompletions ? `${m.completions}/${m.maxCompletions}` : `x${m.completions}`
})

const showsCount = computed(
  () => state.value !== 'locked' && props.mission.tracked && completionsLabel.value !== null,
)

const repeatLabel = computed(() => {
  const m = props.mission
  if (!m.repeatable) return null
  if (m.maxCompletions && !showsCount.value) return `Repeatable x${m.maxCompletions}`
  return 'Repeatable'
})
</script>

<template>
  <div class="mission" :class="[`mission--${state}`]">
    <div class="mission__head">
      <span class="mission__status" :class="`mission__status--${state}`" aria-hidden="true">
        <template v-if="state === 'completed'">
          <svg v-for="n in doneTicks" :key="n" width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </template>
        <svg v-else-if="state === 'locked'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <span v-else class="mission__dot" />
      </span>

      <span class="mission__name">{{ mission.name }}</span>

      <span v-if="repeatLabel" class="mission__repeat">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"
          stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="17 1 21 5 17 9" />
          <path d="M3 11V9a4 4 0 0 1 4-4h14" />
          <polyline points="7 23 3 19 7 15" />
          <path d="M21 13v2a4 4 0 0 1-4 4H3" />
        </svg>
        {{ repeatLabel }}
      </span>

      <MissionRewards :xp-reward="mission.xpReward" :item-reward="mission.itemReward" :size="36" />
    </div>

    <p v-if="mission.description" class="mission__desc">{{ mission.description }}</p>

    <div v-if="state === 'locked'" class="mission__progress">
      <span class="mission__flag">{{ lockHint }}</span>
    </div>

    <div v-else-if="mission.tracked" class="mission__progress">
      <span v-if="state === 'completed'" class="mission__flag mission__flag--done">Completed</span>
      <template v-if="showBar">
        <ProgressBar :value="progress" />
        <span class="mission__count">{{ progressLabel }}</span>
      </template>
      <span v-else-if="state !== 'completed'" class="mission__flag">In progress</span>
      <span v-if="completionsLabel" class="mission__completions">{{ completionsLabel }}</span>
    </div>
  </div>
</template>

<style scoped>
.mission {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  padding: var(--space-md) 0;
}

.mission--locked {
  opacity: 0.5;
}

.mission__head {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.mission__status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  border-radius: var(--radius-input);
}

.mission__status--completed {
  width: auto;
  min-width: 20px;
  color: var(--success);
}

.mission__status--completed svg + svg {
  margin-left: -5px;
}

.mission__status--locked {
  color: var(--text-tertiary);
}

.mission__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 2px solid var(--page-accent, var(--accent));
}

.mission__name {
  flex: 1;
  min-width: 0;
  font-size: var(--text-card-title);
  font-weight: 600;
  color: var(--text-primary);
}

.mission__repeat {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  flex-shrink: 0;
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.mission__desc {
  margin: 0;
  padding-left: calc(20px + var(--space-sm));
  font-size: var(--text-body);
  color: var(--text-secondary);
  line-height: 1.45;
}

.mission__progress {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding-left: calc(20px + var(--space-sm));
}

.mission__count {
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.mission__flag {
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.mission__flag--done {
  color: var(--success);
  font-weight: 600;
}

.mission__completions {
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}
</style>
