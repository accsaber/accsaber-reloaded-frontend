<script setup lang="ts">
import type { ClanWarResponse, ClanWarTeam } from '@/types/api/clans'
import { warClock, warHeadline, warModeLine } from '@/utils/clans'
import { computed } from 'vue'

const props = defineProps<{
  war: ClanWarResponse
  now: number
  large?: boolean
  viewerTeam?: ClanWarTeam | null
}>()

const clock = computed(() => warClock(props.war, props.now, props.viewerTeam))
const headline = computed(() => warHeadline(props.war))
</script>

<template>
  <span class="war-clock" :class="{ 'war-clock--large': large }">
    <template v-if="headline">
      <strong class="war-clock__headline">{{ headline }}</strong>
      <span class="war-clock__label">{{ clock.value }}</span>
    </template>
    <template v-else>
      <span class="war-clock__label">{{ clock.label }}</span>
      <span v-if="clock.value" class="war-clock__clock">{{ clock.value }}</span>
    </template>
    <span class="war-clock__label">{{ warModeLine(war) }}</span>
  </span>
</template>

<style scoped>
.war-clock {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  text-align: center;
}

.war-clock__headline {
  font-size: var(--text-card-title);
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.war-clock__label {
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.war-clock__clock {
  font-family: var(--font-mono);
  font-size: var(--text-card-title);
  font-weight: 600;
}

.war-clock--large {
  gap: var(--space-xs);
}

.war-clock--large .war-clock__headline {
  font-size: var(--text-page-title);
  line-height: 1.1;
  letter-spacing: 0.02em;
}

.war-clock--large .war-clock__clock {
  order: -1;
  font-size: calc(var(--text-page-title) * 1.25);
  line-height: 1.1;
}

@media (max-width: 720px) {
  .war-clock--large .war-clock__clock {
    font-size: var(--text-page-title);
  }
}
</style>
