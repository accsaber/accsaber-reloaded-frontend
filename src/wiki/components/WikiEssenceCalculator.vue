<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import IconButton from '@/components/common/IconButton.vue'
import '@/wiki/components/demo.css'
import type { ItemResponse } from '@/types/api/items'
import { formatEssence } from '@/utils/essence'
import { computed, ref } from 'vue'
import { clamp } from '@/utils/math'

const props = defineProps<{
  items: ItemResponse[]
}>()

const counts = ref<Record<string, number>>({})

const total = computed(() =>
  props.items.reduce((sum, item) => sum + (counts.value[item.id] ?? 0) * (item.worth ?? 0), 0),
)

const destroyed = computed(() =>
  props.items.reduce((sum, item) => sum + (counts.value[item.id] ?? 0), 0),
)

function step(item: ItemResponse, by: number) {
  const next = clamp((counts.value[item.id] ?? 0) + by, 0, 99)
  counts.value = { ...counts.value, [item.id]: next }
}

function clear() {
  counts.value = {}
}
</script>

<template>
  <figure class="wiki-demo">
    <ul class="grinder__list">
      <li v-for="item in items" :key="item.id" class="grinder__row" :class="`rarity--${item.rarity}`">
        <span class="grinder__name">{{ item.name }}</span>
        <span class="grinder__rarity">{{ item.rarity }}</span>
        <span class="grinder__worth">{{ formatEssence(item.worth ?? 0) }}</span>
        <span class="grinder__stepper">
          <IconButton :disabled="!counts[item.id]" :label="`One fewer ${item.name}`" @click="step(item, -1)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" aria-hidden="true">
              <path d="M5 12h14" />
            </svg>
          </IconButton>
          <span class="grinder__count">{{ counts[item.id] ?? 0 }}</span>
          <IconButton :label="`One more ${item.name}`" @click="step(item, 1)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </IconButton>
        </span>
      </li>
    </ul>

    <div class="grinder__footer">
      <span class="caption">
        {{ destroyed === 1 ? '1 item destroyed' : `${destroyed} items destroyed` }}
      </span>
      <span class="wiki-demo__value grinder__total">{{ formatEssence(total) }}</span>
      <BaseButton :disabled="!destroyed" @click="clear">Clear</BaseButton>
    </div>
  </figure>
</template>

<style scoped>
.grinder__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.grinder__row {
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  align-items: center;
  gap: var(--space-md);
  min-height: 48px;
  padding: 0 var(--space-md);
}

.grinder__row:nth-child(odd) {
  background: var(--bg-elevated);
}

.grinder__name {
  color: var(--text-primary);
  font-weight: 500;
}

.grinder__rarity {
  font-size: var(--text-caption);
  text-transform: capitalize;
  color: var(--rarity-color, var(--text-tertiary));
}

.grinder__worth {
  min-width: 6ch;
  text-align: right;
  font-family: var(--font-mono);
  color: var(--text-secondary);
}

.grinder__stepper {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
}

.grinder__count {
  min-width: 3ch;
  text-align: center;
  font-family: var(--font-mono);
  color: var(--text-primary);
}

.grinder__footer {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding-top: var(--space-md);
}

.grinder__total {
  margin-left: auto;
  color: var(--accent);
}

@media (max-width: 560px) {
  .grinder__row {
    grid-template-columns: 1fr auto;
    row-gap: 0;
    padding: var(--space-sm) var(--space-md);
  }

  .grinder__worth {
    text-align: left;
  }
}
</style>
