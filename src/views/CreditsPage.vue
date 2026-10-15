<script setup lang="ts">
import { getSupporterCredits } from '@/api/supporters'
import BaseButton from '@/components/common/BaseButton.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import UserChip from '@/components/domain/UserChip.vue'
import { usePageMeta } from '@/composables/usePageMeta'
import type { SupporterCreditEntry, SupporterTier } from '@/types/api/supporters'
import { SUPPORTER_TIER_DISPLAY, SUPPORTER_TIER_PALETTE } from '@/types/api/supporters'
import { KOFI_URL } from '@/utils/constants'
import { formatCents } from '@/utils/formatters'
import { computed, onMounted, ref } from 'vue'
import { parseApiError } from '@/api/client'

usePageMeta({
  title: 'Credits | AccSaber',
  description: 'The supporters who keep AccSaber online.',
})

const loading = ref(true)
const error = ref<string | null>(null)
const supporters = ref<SupporterCreditEntry[]>([])

async function load() {
  loading.value = true
  error.value = null
  try {
    const res = await getSupporterCredits({ status: 'all', size: 100 })
    supporters.value = res.content
  } catch (e) {
    error.value = parseApiError(e, 'Failed to load credits').message
  } finally {
    loading.value = false
  }
}

onMounted(load)

type GroupKey = SupporterTier | 'past'

const GROUP_ORDER: GroupKey[] = ['gold', 'silver', 'bronze', 'past']

const groups = computed(() => {
  const buckets: Record<GroupKey, SupporterCreditEntry[]> = { gold: [], silver: [], bronze: [], past: [] }
  const sorted = [...supporters.value].sort((a, b) => b.lifetimeSupportedCents - a.lifetimeSupportedCents)
  for (const row of sorted) buckets[row.currentTier ?? 'past'].push(row)
  return GROUP_ORDER.filter((key) => buckets[key].length > 0).map((key) => ({
    key,
    label: key === 'past' ? 'Past supporters' : SUPPORTER_TIER_DISPLAY[key],
    color: key === 'past' ? undefined : SUPPORTER_TIER_PALETTE[key].base,
    rows: buckets[key],
  }))
})
</script>

<template>
  <div class="credits">
    <h1 class="credits__title">The supporters of AccSaber</h1>

    <div v-if="loading" class="credits__loading" aria-busy="true">
      <SkeletonLoader v-for="i in 5" :key="i" variant="text" />
    </div>

    <div v-else-if="error" class="credits__error" role="alert">
      <span>{{ error }}</span>
      <BaseButton size="sm" @click="load">Retry</BaseButton>
    </div>

    <template v-else>
      <section v-for="group in groups" :key="group.key" class="credits__group">
        <h2 class="credits__group-heading" :style="{ color: group.color }">
          {{ group.label }}
          <span class="credits__group-count">{{ group.rows.length }}</span>
        </h2>
        <ul class="credits__rows">
          <li v-for="row in group.rows" :key="row.player.id">
            <router-link :to="`/players/${row.player.id}`" class="credits__row">
              <UserChip :user="row.player" />
              <span class="credits__amount">{{ formatCents(row.lifetimeSupportedCents) }}</span>
            </router-link>
          </li>
        </ul>
      </section>

      <p v-if="groups.length === 0" class="credits__empty">No supporters yet.</p>

      <footer class="credits__footer">
        Recurring tips on
        <a :href="KOFI_URL" target="_blank" rel="noopener">Ko-fi</a>
        keep AccSaber online.
      </footer>
    </template>
  </div>
</template>

<style scoped>
.credits {
  max-width: 680px;
  margin: 0 auto;
  padding: var(--space-2xl) 0 var(--space-3xl);
}

.credits__title {
  margin: 0 0 var(--space-2xl);
}

.credits__loading {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.credits__error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  padding: var(--space-lg) 0;
  color: var(--text-primary);
  border-block: 1px solid var(--bg-overlay);
}

.credits__group {
  margin-bottom: var(--space-2xl);
}

.credits__group-heading {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm);
  margin: 0 0 var(--space-md);
  padding-bottom: var(--space-xs);
  font-size: var(--text-caption);
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-tertiary);
  border-bottom: 1px solid currentColor;
}

.credits__group-count,
.credits__amount {
  font-family: var(--font-mono);
  color: var(--text-tertiary);
}

.credits__rows {
  list-style: none;
  padding: 0;
  margin: 0;
}

.credits__rows li + li {
  border-top: 1px solid var(--bg-overlay);
}

.credits__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  padding: var(--space-sm) var(--space-xs);
  color: inherit;
  text-decoration: none;
  border-radius: var(--radius-btn);
}

.credits__row:hover {
  background: var(--bg-elevated);
}

.credits__amount {
  font-size: var(--text-caption);
}

.credits__empty {
  padding: var(--space-2xl) 0;
  text-align: center;
  color: var(--text-secondary);
}

.credits__footer {
  padding-top: var(--space-md);
  border-top: 1px solid var(--bg-overlay);
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.credits__footer a {
  color: var(--text-secondary);
}
</style>
