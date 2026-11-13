<script setup lang="ts">
import type { CampaignModifierRequirementResponse } from '@/types/api/campaigns'
import { computed } from 'vue'

const props = defineProps<{ modifiers: CampaignModifierRequirementResponse[] }>()

const badges = computed(() =>
  props.modifiers.map((m) => ({
    id: m.modifier.id,
    code: m.modifier.code,
    forbidden: m.requirement === 'FORBIDDEN',
    label: `${m.modifier.name} ${m.requirement === 'FORBIDDEN' ? 'forbidden' : 'required'}`,
  })),
)
</script>

<template>
  <ul v-if="badges.length > 0" class="mod-badges">
    <li
      v-for="b in badges"
      :key="b.id"
      class="mod-badges__item"
      :class="{ 'mod-badges__item--forbidden': b.forbidden }"
      :title="b.label"
      :aria-label="b.label"
    >
      {{ b.code }}
    </li>
  </ul>
</template>

<style scoped>
.mod-badges {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
  margin: 0;
  padding: 0;
  list-style: none;
}

.mod-badges__item {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--success);
}

.mod-badges__item--forbidden {
  color: var(--error);
  text-decoration: line-through;
}
</style>
