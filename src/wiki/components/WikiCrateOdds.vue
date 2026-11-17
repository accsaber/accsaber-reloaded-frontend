<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import '@/wiki/components/demo.css'
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
  <figure class="wiki-demo">
    <figcaption class="odds__caption field-label">
      {{ crateName }}, {{ contents.length }} rewards
    </figcaption>

    <table>
      <thead>
        <tr>
          <th>Rarity</th>
          <th>Rewards</th>
          <th>Chance</th>
          <th>Your {{ opens || 0 }} Opens</th>
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
      <BaseButton @click="open(1)">Open 1</BaseButton>
      <BaseButton @click="open(10)">Open 10</BaseButton>
      <BaseButton @click="open(100)">Open 100</BaseButton>
      <BaseButton :disabled="!opens" @click="reset">Reset</BaseButton>
      <p v-if="best" class="caption odds__best">
        Best so far
        <span :class="`rarity--${best.rarity}`">{{ best.name }}</span>
      </p>
    </div>
  </figure>
</template>

<style scoped>
.odds__caption {
  margin-bottom: var(--space-sm);
}

.odds__rarity {
  text-transform: capitalize;
  color: var(--rarity-color, var(--text-tertiary));
}

.odds__num {
  font-family: var(--font-mono);
  color: var(--text-primary);
}

.odds__pulled {
  min-width: 8ch;
}

.odds__bar {
  display: block;
  height: 3px;
  margin-bottom: 3px;
  background: var(--rarity-color, var(--text-tertiary));
  transition: width var(--dur-fast) var(--ease-out);
}

.odds__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm);
}

.odds__best {
  margin: 0 0 0 auto;
}

.odds__best span {
  color: var(--rarity-color, var(--text-primary));
  font-weight: 600;
}

@media (max-width: 560px) {
  .odds__best {
    margin-left: 0;
    flex-basis: 100%;
  }
}
</style>
