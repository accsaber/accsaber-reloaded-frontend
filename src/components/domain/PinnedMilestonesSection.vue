<script setup lang="ts">
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import MilestoneBadge from '@/components/domain/MilestoneBadge.vue'
import type { UserMilestoneProgressResponse } from '@/types/api/users'
import { resolveMilestoneGlyph, type MilestoneGlyphKey } from '@/utils/milestoneIcons'
import { formatPercent, STANDARD_PIN_SLOTS } from '@/utils/constants'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    pinned: UserMilestoneProgressResponse[]
    loading: boolean
    isSelfProfile: boolean
    maxSlots?: number
    glyphs?: Map<string, MilestoneGlyphKey>
  }>(),
  { maxSlots: STANDARD_PIN_SLOTS },
)

const emit = defineEmits<{ unpin: [milestoneId: string] }>()

const STANDARD_SLOTS = STANDARD_PIN_SLOTS

const cards = computed(() =>
  props.pinned.map((pin) => ({
    pin,
    glyph: props.glyphs?.get(pin.milestoneId) ?? resolveMilestoneGlyph(pin.iconGroup),
    rarity: `${formatPercent(pin.completionPercentage ?? 0)}% of players`,
    completedOn: pin.completedAt
      ? new Date(pin.completedAt).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : null,
  })),
)
</script>

<template>
  <section
    v-if="loading || pinned.length > 0"
    class="pinned-ms"
    aria-label="Pinned milestones"
  >
    <header class="pinned-ms__header">
      <h2 class="pinned-ms__label">Milestones</h2>
      <span v-if="!loading && pinned.length > 0" class="pinned-ms__count">
        {{ pinned.length }} of {{ maxSlots }}
        <span
          v-if="maxSlots > STANDARD_SLOTS && isSelfProfile"
          class="pinned-ms__perk"
          title="Supporters get extra pinned slots"
        >Supporter perk</span>
      </span>
    </header>

    <div v-if="loading" class="pinned-ms__grid">
      <SkeletonLoader v-for="i in Math.min(maxSlots, 3)" :key="i" variant="card" />
    </div>

    <div v-else class="pinned-ms__grid">
      <article v-for="card in cards" :key="card.pin.milestoneId" class="pinned-ms__card">
        <MilestoneBadge :glyph="card.glyph" :tier="card.pin.tier" :size="48" completed />

        <div class="pinned-ms__text">
          <h3 class="pinned-ms__title">{{ card.pin.title }}</h3>
          <p v-if="card.pin.description" class="pinned-ms__desc">{{ card.pin.description }}</p>
          <p class="pinned-ms__meta">
            <span class="pinned-ms__rarity">{{ card.rarity }}</span>
            <template v-if="card.completedOn"> · {{ card.completedOn }}</template>
          </p>
        </div>

        <button
          v-if="isSelfProfile"
          type="button"
          class="pinned-ms__unpin"
          aria-label="Unpin milestone"
          @click="emit('unpin', card.pin.milestoneId)"
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" aria-hidden="true">
            <path d="M5 5l10 10M15 5 5 15" />
          </svg>
        </button>
      </article>
    </div>
  </section>
</template>

<style scoped>
.pinned-ms {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.pinned-ms__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-md);
}

.pinned-ms__label {
  margin: 0;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.pinned-ms__count {
  display: inline-flex;
  align-items: baseline;
  gap: var(--space-sm);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.pinned-ms__perk {
  color: var(--text-secondary);
}

.pinned-ms__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-md);
}

.pinned-ms__card {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: var(--space-md);
  padding: var(--space-md);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  background: var(--bg-surface);
}

.pinned-ms__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.pinned-ms__title {
  margin: 0;
  font-size: var(--text-card-title);
  font-weight: 600;
  color: var(--text-primary);
}

.pinned-ms__desc {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--text-secondary);
  line-height: 1.45;
}

.pinned-ms__meta {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.pinned-ms__rarity {
  color: var(--text-secondary);
}

.pinned-ms__unpin {
  position: absolute;
  top: var(--space-xs);
  right: var(--space-xs);
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: var(--radius-btn);
  background: none;
  color: var(--text-tertiary);
  cursor: pointer;
  opacity: 0;
  transition: opacity 120ms ease, color 120ms ease;
}

.pinned-ms__unpin svg {
  width: 14px;
  height: 14px;
}

.pinned-ms__card:hover .pinned-ms__unpin,
.pinned-ms__unpin:focus-visible {
  opacity: 1;
}

.pinned-ms__unpin:hover {
  color: var(--error);
}
</style>
