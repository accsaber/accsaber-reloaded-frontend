<script lang="ts">
export type MilestoneIndexEntry =
  | { key: string; heading: string }
  | { key: string; title: string; total: number; completed: number }
</script>

<script setup lang="ts">
import ProgressBar from '@/components/common/ProgressBar.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import StatBlock from '@/components/common/StatBlock.vue'
import StatusMark from '@/components/common/StatusMark.vue'
import SwapList from '@/components/common/SwapList.vue'
import MilestoneBadge from '@/components/domain/MilestoneBadge.vue'
import MilestoneHolderTooltip from '@/components/domain/MilestoneHolderTooltip.vue'
import MilestoneScore from '@/components/domain/MilestoneScore.vue'
import ProgressStat from '@/components/domain/ProgressStat.vue'
import MilestoneRewards from '@/views/milestones/MilestoneRewards.vue'
import type { MilestoneCompletionResponse, MilestoneSetResponse } from '@/types/api/milestones'
import { tierColor } from '@/utils/constants'
import { formatFullDate, formatPercent } from '@/utils/formatters'
import { resolveMilestoneGlyph } from '@/utils/milestoneIcons'
import { computed } from 'vue'

const props = defineProps<{
  milestone: MilestoneCompletionResponse | null
  set: MilestoneSetResponse | null
  setStats: { total: number; completed: number } | null
  index: MilestoneIndexEntry[]
  loading: boolean
  loggedIn: boolean
}>()

const emit = defineEmits<{ 'focus-set': [setId: string] }>()

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
}

const done = computed(() => props.milestone?.userCompleted === true)
const progress = computed(() => (done.value ? 1 : (props.milestone?.userNormalizedProgress ?? 0)))
</script>

<template>
  <aside class="ms-inspector" aria-label="Milestone details">
    <Transition name="fade" mode="out-in">
      <div :key="milestone?.milestoneId ?? set?.id ?? 'overview'" class="ms-inspector__content">
        <template v-if="milestone">
          <header class="ms-inspector__head">
            <MilestoneBadge :glyph="resolveMilestoneGlyph(milestone.iconGroup, milestone.querySpec)"
              :tier="milestone.tier" :size="52" :completed="done" />
            <div>
              <h2 class="card-title">{{ milestone.title }}</h2>
              <p class="caption">
                <span :style="{ color: tierColor(milestone.tier) }">{{ titleCase(milestone.tier) }}</span>
                {{ titleCase(milestone.type) }}
              </p>
            </div>
          </header>

          <p class="ms-inspector__desc">{{ milestone.description }}</p>

          <div class="ms-inspector__stats">
            <StatBlock class="ms-inspector__stat" label="XP" :value="milestone.xp" :decimals="0" />
            <StatBlock class="ms-inspector__stat" label="Of Players"
              :value="`${formatPercent(milestone.completionPercentage ?? 0)}%`">
              <template #label-suffix>
                <MilestoneHolderTooltip :milestone-id="milestone.milestoneId"
                  :completions="milestone.completions ?? 0" />
              </template>
            </StatBlock>
          </div>

          <div v-if="loggedIn && !done" class="ms-inspector__progress" :style="{ '--bar-color': tierColor(milestone.tier) }">
            <ProgressBar :value="progress" />
            <span class="caption">{{ formatPercent(progress * 100) }}%</span>
          </div>

          <p v-if="done && milestone.userCompletedAt" class="ms-inspector__done">
            <StatusMark done />
            Completed {{ formatFullDate(milestone.userCompletedAt) }}
          </p>

          <MilestoneScore :milestone="milestone" />
          <MilestoneRewards :rewards="milestone.rewards ?? []" />
          <slot name="actions" />
        </template>

        <template v-else-if="set && setStats">
          <header>
            <h2 class="card-title">{{ set.title }}</h2>
            <p v-if="set.description" class="ms-inspector__desc">{{ set.description }}</p>
          </header>
          <ProgressStat :label="loggedIn ? `Completed of ${setStats.total}` : 'Milestones'"
            :value="loggedIn ? setStats.completed : setStats.total"
            :ratio="loggedIn ? setStats.completed / setStats.total : null"
            :note="set.setBonusXp > 0 ? `+${set.setBonusXp.toLocaleString()} XP for finishing the set` : undefined" />
          <MilestoneRewards :rewards="set.rewards ?? []" label="Set Reward" ceremonial />
        </template>

        <template v-else>
          <slot name="overview" />
          <SwapList as="nav" class="ms-inspector__index" aria-label="Sets" :items="index" :item-key="(e) => e.key"
            :loading="loading" :placeholders="15">
            <template #placeholder>
              <SkeletonLoader class="placeholder" height="var(--control-h)" />
            </template>
            <template #default="{ item, swap }">
              <h3 v-if="'heading' in item" class="field-label ms-inspector__index-heading" v-bind="swap">
                {{ item.heading }}
              </h3>
              <button v-else type="button" class="ms-inspector__index-row" v-bind="swap"
                @click="emit('focus-set', item.key)">
                <span>{{ item.title }}</span>
                <span class="caption">{{ loggedIn ? `${item.completed} of ${item.total}` : item.total }}</span>
              </button>
            </template>
          </SwapList>
        </template>
      </div>
    </Transition>
  </aside>
</template>

<style scoped>
.ms-inspector {
  padding: var(--space-md);
  background: var(--bg-surface);
  border-radius: var(--radius-card);
  overflow-y: auto;
  scrollbar-width: thin;
}

.ms-inspector__content {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.ms-inspector__head {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.ms-inspector__desc {
  margin: 0;
  font-size: var(--text-body);
  line-height: 1.5;
  color: var(--text-secondary);
}

header > .ms-inspector__desc {
  margin-top: var(--space-xs);
}

.ms-inspector__stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-md);
}

.ms-inspector .ms-inspector__stat {
  padding: 0;
}

.ms-inspector__progress {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.ms-inspector__progress .caption {
  width: 5ch;
  text-align: right;
}

.ms-inspector__index {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ms-inspector__index-heading,
.ms-inspector__index-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  height: var(--control-h);
  margin: 0;
}

.ms-inspector__index-row {
  margin: 0 calc(-1 * var(--space-sm));
  padding: 0 var(--space-sm);
  border: none;
  border-radius: var(--radius-btn);
  background: none;
  font-family: inherit;
  font-size: var(--text-body);
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
  transition: background-color var(--dur-fast) var(--ease-out);
}

.ms-inspector__index-row:hover {
  background: var(--bg-elevated);
}

.ms-inspector__done {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  margin: 0;
  font-size: var(--text-body);
  color: var(--text-secondary);
}
</style>
