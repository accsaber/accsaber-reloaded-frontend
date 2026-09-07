<script setup lang="ts">
import type { ItemResponse } from '@/types/api/items'
import { formatEssence } from '@/utils/essence'
import { computed, ref } from 'vue'

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
  const next = Math.max(0, Math.min(99, (counts.value[item.id] ?? 0) + by))
  counts.value = { ...counts.value, [item.id]: next }
}

function clear() {
  counts.value = {}
}
</script>

<template>
  <figure class="grinder">
    <ul class="grinder__list">
      <li v-for="item in items" :key="item.id" class="grinder__row" :class="`rarity--${item.rarity}`">
        <span class="grinder__name">{{ item.name }}</span>
        <span class="grinder__rarity">{{ item.rarity }}</span>
        <span class="grinder__worth">{{ formatEssence(item.worth ?? 0) }}</span>
        <span class="grinder__stepper">
          <button
            type="button"
            :disabled="!counts[item.id]"
            :aria-label="`One fewer ${item.name}`"
            @click="step(item, -1)"
          >
            &minus;
          </button>
          <span class="grinder__count">{{ counts[item.id] ?? 0 }}</span>
          <button type="button" :aria-label="`One more ${item.name}`" @click="step(item, 1)">+</button>
        </span>
      </li>
    </ul>

    <div class="grinder__footer">
      <span class="grinder__destroyed">
        {{ destroyed === 1 ? '1 item destroyed' : `${destroyed} items destroyed` }}
      </span>
      <span class="grinder__total">{{ formatEssence(total) }}</span>
      <button type="button" class="grinder__clear" :disabled="!destroyed" @click="clear">Clear</button>
    </div>
  </figure>
</template>

<style scoped>
.grinder {
  margin: 0 0 var(--space-md);
  padding: var(--space-md);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  background: var(--bg-surface);
}

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
  padding: var(--space-sm) 0;
  border-bottom: 1px solid var(--bg-overlay);
}

.grinder__name {
  color: var(--text-primary);
  font-weight: 500;
}

.grinder__rarity {
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--rarity-color, var(--text-tertiary));
}

.grinder__worth {
  min-width: 6ch;
  text-align: right;
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  color: var(--text-secondary);
}

.rarity--common { --rarity-color: var(--text-tertiary); }
.rarity--uncommon { --rarity-color: var(--success); }
.rarity--rare { --rarity-color: var(--info); }
.rarity--epic { --rarity-color: var(--tier-apex); }
.rarity--legendary { --rarity-color: var(--tier-gold); }
.rarity--mythic { --rarity-color: var(--error); }

.grinder__stepper {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
}

.grinder__stepper button,
.grinder__clear {
  padding: 2px 9px;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
  background: var(--bg-elevated);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  cursor: pointer;
  transition: border-color 120ms ease, color 120ms ease;
}

.grinder__stepper button:hover:not(:disabled),
.grinder__clear:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}

.grinder__stepper button:disabled,
.grinder__clear:disabled {
  color: var(--text-tertiary);
  cursor: default;
}

.grinder__count {
  min-width: 3ch;
  text-align: center;
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  color: var(--text-primary);
}

.grinder__footer {
  display: flex;
  align-items: baseline;
  gap: var(--space-md);
  padding-top: var(--space-md);
}

.grinder__destroyed {
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.grinder__total {
  margin-left: auto;
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-size: var(--text-stat-lg);
  color: var(--accent);
}

.grinder__clear {
  align-self: center;
}

@media (max-width: 560px) {
  .grinder__row {
    grid-template-columns: 1fr auto;
    row-gap: var(--space-xs);
  }

  .grinder__worth {
    text-align: left;
  }
}

@media (prefers-reduced-motion: reduce) {
  .grinder__stepper button,
  .grinder__clear {
    transition: none;
  }
}
</style>
