<script setup lang="ts">
import type { CrateContentResponse, ItemRarity } from '@/types/api/items'
import { computed, ref } from 'vue'

const props = defineProps<{
  contents: CrateContentResponse[]
  crateName: string
}>()

const RARITY_ORDER: ItemRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic']

const totalWeight = computed(() => props.contents.reduce((sum, c) => sum + c.dropWeight, 0))

const rows = computed(() =>
  RARITY_ORDER.map((rarity) => {
    const entries = props.contents.filter((c) => c.rewardItem.rarity === rarity)
    const weight = entries.reduce((sum, c) => sum + c.dropWeight, 0)
    return { rarity, rewards: entries.length, share: weight / totalWeight.value }
  }).filter((row) => row.rewards > 0),
)

const opens = ref(0)
const pulled = ref<Record<string, number>>({})
const best = ref<{ name: string; rarity: ItemRarity } | null>(null)

function rollOnce(): CrateContentResponse {
  let pick = Math.random() * totalWeight.value
  for (const entry of props.contents) {
    pick -= entry.dropWeight
    if (pick < 0) return entry
  }
  return props.contents[props.contents.length - 1]
}

function open(times: number) {
  const tally = { ...pulled.value }
  let rarest = best.value
  for (let i = 0; i < times; i += 1) {
    const won = rollOnce().rewardItem
    tally[won.rarity] = (tally[won.rarity] ?? 0) + 1
    if (!rarest || RARITY_ORDER.indexOf(won.rarity) > RARITY_ORDER.indexOf(rarest.rarity)) {
      rarest = { name: won.name, rarity: won.rarity }
    }
  }
  pulled.value = tally
  best.value = rarest
  opens.value += times
}

function reset() {
  opens.value = 0
  pulled.value = {}
  best.value = null
}

const formatShare = (share: number) => `${(share * 100).toFixed(share < 0.01 ? 2 : 1)}%`
const formatRun = (count: number) => (opens.value ? `${(100 * count) / opens.value}` : '0')
</script>

<template>
  <figure class="odds">
    <figcaption class="odds__caption">
      {{ crateName }}, {{ contents.length }} rewards
    </figcaption>

    <table class="odds__table">
      <thead>
        <tr>
          <th>Rarity</th>
          <th>Rewards</th>
          <th>Chance</th>
          <th>Your {{ opens || 0 }} opens</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.rarity" :class="`rarity--${row.rarity}`">
          <td class="odds__rarity">{{ row.rarity }}</td>
          <td class="odds__num">{{ row.rewards }}</td>
          <td class="odds__num">{{ formatShare(row.share) }}</td>
          <td class="odds__pulled">
            <span class="odds__bar" :style="{ width: `${Math.min(100, Number(formatRun(pulled[row.rarity] ?? 0)))}%` }" />
            <span class="odds__num">{{ pulled[row.rarity] ?? 0 }}</span>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="odds__controls">
      <button type="button" class="odds__btn" @click="open(1)">Open 1</button>
      <button type="button" class="odds__btn" @click="open(10)">Open 10</button>
      <button type="button" class="odds__btn" @click="open(100)">Open 100</button>
      <p v-if="best" class="odds__best">
        Best so far
        <span :class="`rarity--${best.rarity}`">{{ best.name }}</span>
      </p>
      <button type="button" class="odds__btn odds__btn--quiet" :disabled="!opens" @click="reset">
        Reset
      </button>
    </div>
  </figure>
</template>

<style scoped>
.odds {
  margin: 0 0 var(--space-md);
  padding: var(--space-md);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  background: var(--bg-surface);
}

.odds__caption {
  margin-bottom: var(--space-sm);
  font-size: var(--text-caption);
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.odds__table {
  width: 100%;
  border-collapse: collapse;
  margin: 0;
}

.odds__table th {
  padding: var(--space-sm);
  border-bottom: 1px solid var(--bg-overlay);
  text-align: left;
  font-size: var(--text-caption);
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.odds__table td {
  padding: var(--space-sm);
  border-bottom: 1px solid var(--bg-overlay);
}

.odds__rarity {
  text-transform: capitalize;
  color: var(--rarity-color, var(--text-tertiary));
}

.odds__num {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  color: var(--text-primary);
}

.odds__pulled {
  position: relative;
  min-width: 8ch;
}

.odds__bar {
  display: block;
  height: 3px;
  margin-bottom: 3px;
  background: var(--rarity-color, var(--text-tertiary));
  transition: width 120ms cubic-bezier(0.22, 1, 0.36, 1);
}

.rarity--common { --rarity-color: var(--text-tertiary); }
.rarity--uncommon { --rarity-color: var(--success); }
.rarity--rare { --rarity-color: var(--info); }
.rarity--epic { --rarity-color: var(--tier-apex); }
.rarity--legendary { --rarity-color: var(--tier-gold); }
.rarity--mythic { --rarity-color: var(--error); }

.odds__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm);
  margin-top: var(--space-md);
}

.odds__btn {
  padding: 5px 12px;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
  background: var(--bg-elevated);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  font-weight: 500;
  cursor: pointer;
  transition: border-color 120ms ease, color 120ms ease;
}

.odds__btn:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}

.odds__btn:disabled {
  color: var(--text-tertiary);
  cursor: default;
}

.odds__btn--quiet {
  margin-left: auto;
}

.odds__best + .odds__btn--quiet {
  margin-left: var(--space-sm);
}

.odds__best {
  margin: 0 0 0 auto;
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.odds__best span {
  color: var(--rarity-color, var(--text-primary));
  font-weight: 600;
}

@media (max-width: 560px) {
  .odds__btn--quiet {
    margin-left: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .odds__bar,
  .odds__btn {
    transition: none;
  }
}
</style>
