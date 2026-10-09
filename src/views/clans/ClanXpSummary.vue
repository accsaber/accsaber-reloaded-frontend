<script setup lang="ts">
import ClanBar from './ClanBar.vue'
import type { ClanXpSource } from '@/types/api/clans'
import { CLAN_XP_SOURCE_LABEL } from '@/utils/clans'
import { computed } from 'vue'

const props = defineProps<{
  bySource: Partial<Record<ClanXpSource, number>>
}>()

const rows = computed(() => {
  const entries = (Object.entries(props.bySource) as [ClanXpSource, number][]).filter(([, xp]) => xp > 0)
  const top = Math.max(1, ...entries.map(([, xp]) => xp))
  return entries
    .sort((a, b) => b[1] - a[1])
    .map(([source, xp]) => ({ source, label: CLAN_XP_SOURCE_LABEL[source], xp, share: xp / top }))
})
const total = computed(() => rows.value.reduce((sum, row) => sum + row.xp, 0))
</script>

<template>
  <div class="xp-summary">
    <p class="xp-summary__line">
      <template v-if="rows.length">{{ Math.round(total).toLocaleString() }} XP this season.</template>
      <template v-else>No XP this season yet.</template>
    </p>
    <dl v-if="rows.length" class="xp-summary__rows">
      <div v-for="row in rows" :key="row.source" class="xp-summary__row">
        <dt>{{ row.label }}</dt>
        <dd>
          <ClanBar class="xp-summary__bar" :value="row.share" :max="1" />
          <span class="xp-summary__value">{{ Math.round(row.xp).toLocaleString() }}</span>
        </dd>
      </div>
    </dl>
  </div>
</template>

<style scoped>
.xp-summary {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.xp-summary__line {
  margin: 0;
  max-width: 65ch;
  font-size: var(--text-body);
  line-height: 1.5;
  color: var(--text-secondary);
}

.xp-summary__rows {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  margin: 0;
  max-width: 560px;
}

.xp-summary__row {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  align-items: center;
  gap: var(--space-md);
}

.xp-summary__row dt {
  font-size: var(--text-body);
  color: var(--text-primary);
}

.xp-summary__row dd {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin: 0;
}

.xp-summary__bar {
  flex: 1;
}

.xp-summary__value {
  min-width: 64px;
  font-family: var(--font-mono);
  font-size: var(--text-body);
  text-align: right;
  color: var(--text-primary);
}
</style>
