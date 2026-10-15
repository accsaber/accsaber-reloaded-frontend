<script setup lang="ts">
import MilestoneBadge from '@/components/domain/MilestoneBadge.vue'
import type { MilestoneResponse } from '@/types/api/milestones'
import { tierColor } from '@/utils/constants'
import { resolveMilestoneGlyph } from '@/utils/milestoneIcons'
import { formatPercent } from '@/utils/formatters'

defineProps<{ milestone: MilestoneResponse }>()
</script>

<template>
  <div class="milestone-card" :class="{ 'milestone-card--apex': milestone.tier === 'APEX' }"
    :style="{ '--tier-color': tierColor(milestone.tier) }">
    <div class="milestone-card__header">
      <MilestoneBadge :glyph="resolveMilestoneGlyph(milestone.iconGroup, milestone.querySpec)" :tier="milestone.tier"
        :size="44" />
      <span class="milestone-card__tier">{{ milestone.tier }}</span>
    </div>
    <h3 class="milestone-card__title card-title">{{ milestone.title }}</h3>
    <p class="milestone-card__desc">{{ milestone.description }}</p>
    <div class="milestone-card__footer">
      <span class="milestone-card__xp">{{ milestone.xp }} XP</span>
      <span class="milestone-card__completion">{{ formatPercent(milestone.completionPercentage) }}% of players</span>
    </div>
  </div>
</template>

<style scoped>
.milestone-card {
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  padding: var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.milestone-card__header {
  display: flex;
  align-items: flex-start;
  gap: var(--space-md);
}

.milestone-card--apex {
  border-color: color-mix(in srgb, var(--tier-color) 30%, var(--bg-overlay));
  background: color-mix(in srgb, var(--tier-color) 5%, var(--bg-surface));
}

.milestone-card--apex .milestone-card__title {
  font-size: var(--text-section-heading);
  color: var(--tier-color);
}

.milestone-card__tier {
  padding-top: var(--space-xs);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--tier-color);
}

.milestone-card__desc {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.milestone-card__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  padding-top: var(--space-sm);
}

.milestone-card__xp {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  font-weight: 500;
  color: var(--text-primary);
}

.milestone-card__completion {
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

@media (max-width: 767px) {
  .milestone-card {
    padding: var(--space-md);
    min-height: 140px;
  }

  .milestone-card__desc {
    font-size: var(--text-body);
    -webkit-line-clamp: 4;
  }

  .milestone-card__xp,
  .milestone-card__completion,
  .milestone-card__tier {
    font-size: var(--text-body);
  }
}
</style>
