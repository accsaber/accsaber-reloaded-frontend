<script setup lang="ts">
import type { CampaignDisplay } from '@/types/display';
import { computed } from 'vue';

const props = defineProps<{
  campaign: CampaignDisplay
}>()

defineEmits<{
  click: []
}>()

const progressPercent = computed(() => {
  if (props.campaign.completedMaps == null) return null
  if (props.campaign.mapCount <= 0) return 0
  return (props.campaign.completedMaps / props.campaign.mapCount) * 100
})

const progressText = computed(() => {
  if (props.campaign.completedMaps == null) return null
  return `${props.campaign.completedMaps}/${props.campaign.mapCount} maps`
})
</script>

<template>
  <div class="campaign-card" tabindex="0" role="button" @click="$emit('click')" @keydown.enter="$emit('click')">
    <div class="campaign-card__header">
      <h3 class="campaign-card__name">{{ campaign.name }}</h3>
      <span v-if="campaign.isVerified" class="campaign-card__verified" aria-label="Verified">
        &#10003;
      </span>
    </div>
    <div class="campaign-card__meta">
      <span class="campaign-card__creator">by {{ campaign.creator }}</span>
      <span class="campaign-card__difficulty">{{ campaign.difficulty }}</span>
      <span class="campaign-card__count">{{ campaign.mapCount }} maps</span>
    </div>
    <p class="campaign-card__desc">{{ campaign.description }}</p>
    <div v-if="progressPercent != null" class="campaign-card__progress">
      <div class="campaign-card__bar">
        <div class="campaign-card__fill" :style="{ width: progressPercent + '%' }" />
      </div>
      <span class="campaign-card__progress-text">{{ progressText }}</span>
    </div>
  </div>
</template>

<style scoped>
.campaign-card {
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  padding: var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  cursor: pointer;
  transition: border-color 150ms ease, transform 150ms ease;
}

.campaign-card:hover {
  border-color: var(--text-tertiary);
  transform: scale(1.01);
}

.campaign-card__header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.campaign-card__name {
  font-size: var(--text-card-title);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  flex: 1;
}

.campaign-card__verified {
  color: var(--success);
  font-size: 0.875rem;
  flex-shrink: 0;
}

.campaign-card__meta {
  display: flex;
  gap: var(--space-md);
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.campaign-card__difficulty {
  font-weight: 500;
}

.campaign-card__desc {
  font-size: var(--text-body);
  color: var(--text-secondary);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.campaign-card__progress {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-top: var(--space-xs);
}

.campaign-card__bar {
  flex: 1;
  height: 4px;
  background: var(--bg-overlay);
  border-radius: 2px;
  overflow: hidden;
}

.campaign-card__fill {
  height: 100%;
  background: var(--accent);
  border-radius: 2px;
  transition: width 300ms ease-out;
}

.campaign-card__progress-text {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-secondary);
  white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  .campaign-card:hover {
    transform: none;
  }

  .campaign-card__fill {
    transition: none;
  }
}
</style>
