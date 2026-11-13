<script setup lang="ts">
import IconButton from '@/components/common/IconButton.vue'
import ProgressBar from '@/components/common/ProgressBar.vue'
import StatusMark from '@/components/common/StatusMark.vue'
import MilestoneBadge from '@/components/domain/MilestoneBadge.vue'
import MilestoneHolderTooltip from '@/components/domain/MilestoneHolderTooltip.vue'
import MilestoneScore from '@/components/domain/MilestoneScore.vue'
import type { MilestoneCompletionResponse } from '@/types/api/milestones'
import { tierColor as getTierColor } from '@/utils/constants'
import { formatPercent, formatShortDate } from '@/utils/formatters'
import { milestoneScoreAccuracy } from '@/utils/mappers'
import { resolveMilestoneGlyph } from '@/utils/milestoneIcons'
import { computed, ref } from 'vue'

const props = defineProps<{
  milestone: MilestoneCompletionResponse
  loggedIn?: boolean
  pinnable?: boolean
  pinned?: boolean
  pinDisabled?: boolean
  pinPending?: boolean
}>()

const emit = defineEmits<{ 'pin-toggle': [milestoneId: string] }>()

const expanded = ref(false)

const done = computed(() => props.milestone.userCompleted === true)
const expandable = computed(() => milestoneScoreAccuracy(props.milestone) !== null)
const glyph = computed(() => resolveMilestoneGlyph(props.milestone.iconGroup, props.milestone.querySpec))
const isAchievement = computed(() => props.milestone.type?.toUpperCase() !== 'MILESTONE')
const progress = computed(() => (done.value ? 1 : (props.milestone.userNormalizedProgress ?? 0)))

const pinTitle = computed(() => {
  if (props.pinned) return 'Unpin milestone'
  if (props.pinDisabled) return 'No free pin slots'
  return 'Pin milestone'
})

function toggle() {
  if (expandable.value) expanded.value = !expanded.value
}
</script>

<template>
  <div class="milestone-row" :class="{
    'milestone-row--tracked': loggedIn,
    'milestone-row--pins': pinnable,
    'milestone-row--todo': loggedIn && !done,
    'milestone-row--apex': milestone.tier?.toUpperCase() === 'APEX',
    'milestone-row--expandable': expandable,
  }" :style="{ '--tier-color': getTierColor(milestone.tier) }">
    <div class="milestone-row__main" :tabindex="expandable ? 0 : undefined" :role="expandable ? 'button' : undefined"
      :aria-expanded="expandable ? expanded : undefined" @click="toggle" @keydown.enter.self="toggle"
      @keydown.space.self.prevent="toggle">
      <MilestoneBadge class="milestone-row__badge" :glyph="glyph" :tier="milestone.tier" :size="44"
        :completed="done" />

      <div class="milestone-row__text">
        <h4 class="milestone-row__title">{{ milestone.title }}</h4>
        <p class="milestone-row__desc">{{ milestone.description }}</p>
      </div>

      <div class="milestone-row__meta">
        <span class="milestone-row__kind">{{ isAchievement ? 'Achievement' : '' }}</span>
        <span class="milestone-row__xp">{{ milestone.xp }} XP</span>
        <span class="milestone-row__players">
          {{ formatPercent(milestone.completionPercentage ?? 0) }}% of players
          <MilestoneHolderTooltip :milestone-id="milestone.milestoneId" :completions="milestone.completions ?? 0" />
        </span>
        <span v-if="loggedIn" class="milestone-row__state">
          <template v-if="done">
            <StatusMark done />
            {{ formatShortDate(milestone.userCompletedAt, '') }}
          </template>
          <template v-else>
            <ProgressBar :value="progress" />
            <span class="milestone-row__percent">{{ formatPercent(progress * 100) }}%</span>
          </template>
        </span>
      </div>

      <span v-if="pinnable" class="milestone-row__pin-slot">
        <IconButton v-if="done" class="milestone-row__pin" :class="{ 'milestone-row__pin--active': pinned }"
          :label="pinTitle" :title="pinTitle" :aria-pressed="!!pinned"
          :disabled="pinPending || (!pinned && pinDisabled)" @click.stop="emit('pin-toggle', milestone.milestoneId)">
          <svg width="14" height="14" viewBox="0 0 24 24" :fill="pinned ? 'currentColor' : 'none'"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M9 4h6l-1 5 4 3v3h-5v6l-1 1-1-1v-6H6v-3l4-3-1-5z" />
          </svg>
        </IconButton>
      </span>

      <span v-if="loggedIn" class="milestone-row__chevron-slot">
        <svg v-if="expandable" class="milestone-row__chevron" :class="{ 'milestone-row__chevron--open': expanded }"
          width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="6 8 10 12 14 8" />
        </svg>
      </span>
    </div>

    <Transition name="collapse">
      <div v-if="expanded" class="collapsible">
        <div class="milestone-row__fold">
          <MilestoneScore :milestone="milestone" />
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.milestone-row {
  border-radius: var(--radius-btn);
  transition: background-color var(--dur-fast) var(--ease-out);
}

.milestone-row--apex {
  background: color-mix(in srgb, var(--tier-color) 5%, transparent);
}

.milestone-row--expandable:hover {
  background: var(--bg-elevated);
}

.milestone-row__main {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) 88px 64px 136px;
  align-items: center;
  gap: var(--space-xs) var(--space-md);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-btn);
}

.milestone-row--tracked .milestone-row__main {
  grid-template-columns: 44px minmax(0, 1fr) 88px 64px 136px 120px 16px;
}

.milestone-row--tracked.milestone-row--pins .milestone-row__main {
  grid-template-columns: 44px minmax(0, 1fr) 88px 64px 136px 120px 28px 16px;
}

.milestone-row--expandable .milestone-row__main {
  cursor: pointer;
}

.milestone-row .milestone-row__badge:not(.ms-badge--completed) {
  color: var(--ms-rim-progress);
}

.milestone-row__text {
  min-width: 0;
}

.milestone-row__title,
.milestone-row__desc {
  margin: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.milestone-row__title {
  font-size: var(--text-body);
  font-weight: 600;
  line-height: 1.4;
  color: var(--text-primary);
}

.milestone-row--todo .milestone-row__title {
  color: var(--text-secondary);
}

.milestone-row--apex .milestone-row__title {
  color: var(--tier-color);
}

.milestone-row__desc {
  font-size: var(--text-caption);
  line-height: 1.5;
  color: var(--text-secondary);
}

.milestone-row__meta {
  display: contents;
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.milestone-row__xp {
  font-family: var(--font-mono);
  font-weight: 500;
  text-align: right;
  color: var(--text-primary);
}

.milestone-row__players,
.milestone-row__state {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  white-space: nowrap;
}

.milestone-row__state {
  font-family: var(--font-mono);
  --bar-color: var(--tier-color);
  --bar-height: 2px;
}

.milestone-row__percent {
  width: 5ch;
  text-align: right;
}

.milestone-row__pin-slot,
.milestone-row__chevron-slot {
  display: flex;
  justify-content: center;
}

.milestone-row .milestone-row__pin--active {
  color: var(--page-accent, var(--accent));
}

.milestone-row__chevron {
  color: var(--text-tertiary);
  transition: transform var(--dur-fast) var(--ease-in-out);
}

.milestone-row__chevron--open {
  transform: rotate(180deg);
}

.milestone-row__fold {
  padding: var(--space-xs) var(--space-md) var(--space-md) calc(44px + var(--space-md) * 2);
}

@media (max-width: 767px) {
  .milestone-row .milestone-row__main {
    grid-template-columns: 44px minmax(0, 1fr) auto auto;
    align-items: start;
    column-gap: var(--space-sm);
  }

  .milestone-row__badge {
    grid-row: 1 / span 2;
  }

  .milestone-row__desc {
    display: -webkit-box;
    min-height: 3em;
    white-space: normal;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .milestone-row__meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs) var(--space-md);
    grid-column: 2 / -1;
    grid-row: 2;
  }

  .milestone-row__kind:empty {
    display: none;
  }

  .milestone-row__kind {
    order: 1;
  }

  .milestone-row__state {
    order: 2;
    flex-basis: 100%;
  }

  .milestone-row__fold {
    padding-left: var(--space-md);
  }
}
</style>
