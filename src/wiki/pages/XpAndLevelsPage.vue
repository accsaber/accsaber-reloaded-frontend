<script setup lang="ts">
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import { useItemCatalog } from '@/composables/useItemCatalog'
import { useAuthStore } from '@/stores/auth'
import { useLevelStore } from '@/stores/levels'
import { scoreXp, XP_MIN_COMPLEXITY } from '@/wiki/apCurve'
import WikiCurveExplorer from '@/wiki/components/WikiCurveExplorer.vue'
import WikiHeading from '@/wiki/components/WikiHeading.vue'
import WikiProse from '@/wiki/components/WikiProse.vue'
import WikiXpLadder from '@/wiki/WikiXpLadder.vue'
import { computed, onMounted, ref } from 'vue'

const authStore = useAuthStore()
const levelStore = useLevelStore()
const { itemsById, ensureLoaded } = useItemCatalog()

const catalogReady = ref(false)
const personalLevel = ref<number | null>(null)
const ladderFailed = ref(false)

const ladderReady = computed(() => levelStore.loaded && catalogReady.value)

const XP_SOURCES = [
  {
    key: 'score',
    color: 'var(--xp-score)',
    label: 'Ranked plays',
    body: 'Every completed play on a ranked map pays XP. The better the accuracy and the more demanding the map, the bigger the payout.',
  },
  {
    key: 'milestone',
    color: 'var(--xp-milestone)',
    label: 'Milestones',
    body: 'Lifetime achievements. Cross a threshold once, get its XP forever.',
  },
  {
    key: 'set-bonus',
    color: 'var(--xp-set-bonus)',
    label: 'Set bonuses',
    body: 'Finish every milestone in a set and a bonus lands on top of everything the set already paid.',
  },
  {
    key: 'mission',
    color: 'var(--xp-mission)',
    label: 'Missions',
    body: 'Rotating objectives sized to your skill, and the missions that live events bring pay out through here too. Attempts count toward some of them, so even failed runs push these along.',
  },
  {
    key: 'campaign',
    color: 'var(--xp-campaign)',
    label: 'Campaigns',
    body: 'Clearing campaign challenges pays out on top of whatever the play itself earned.',
  },
]

const formatAccuracy = (v: number) => `${(v * 100).toFixed(2)}%`
const formatAccuracyTick = (v: number) => `${(v * 100).toFixed(1).replace('.0', '')}%`
const formatXp = (v: number) => `${Math.round(v)} XP`
const formatXpTick = (v: number) => String(Math.round(v))

onMounted(async () => {
  try {
    await Promise.all([
      levelStore.loaded ? Promise.resolve() : levelStore.fetchThresholds(),
      ensureLoaded(),
    ])
    catalogReady.value = itemsById.value.size > 0
    if (!levelStore.loaded || !catalogReady.value) ladderFailed.value = true
  } catch {
    ladderFailed.value = true
  }
  if (authStore.isLoggedIn && authStore.userId) {
    try {
      const { getUserLevel } = await import('@/api/users')
      personalLevel.value = (await getUserLevel(authStore.userId)).level
    } catch {
      personalLevel.value = null
    }
  }
})
</script>

<template>
  <WikiProse>
    <p>
      AP measures how good you are. XP measures how much you have lived here. Everything you do
      on AccSaber feeds one bar that only ever fills, levels never cap, and the ladder hands
      out real items as you climb it. This page covers where XP comes from and what the climb
      looks like.
    </p>

    <WikiHeading id="sources">Five ways to earn</WikiHeading>
    <p>
      Every point of XP arrives through one of five doors, and each has its own color, the same
      colors your profile uses to break down where yours came from:
    </p>
    <div class="sources">
      <div
        v-for="source in XP_SOURCES"
        :key="source.key"
        class="sources__tile"
        :style="{ '--source-color': source.color }"
      >
        <span class="sources__label">{{ source.label }}</span>
        <span class="sources__body">{{ source.body }}</span>
      </div>
    </div>

    <WikiHeading id="score-xp">What a play pays</WikiHeading>
    <p>
      Score XP is exact math, so here it is, live. Every completed play starts at a flat 25 XP,
      and a bonus stacks on top based on your accuracy and the map's complexity. The bonus
      curve is even more top-heavy than the AP curve, so clean plays on demanding maps are
      where the XP fountain really opens up:
    </p>
    <WikiCurveExplorer
      :fn="scoreXp"
      :x-min="0.8"
      :x-max="1"
      x-label="Accuracy"
      y-label="XP for the play"
      :format-x="formatAccuracy"
      :format-y="formatXp"
      :format-x-tick="formatAccuracyTick"
      :format-y-tick="formatXpTick"
      :initial-x="0.95"
      param-label="Complexity"
      :param-min="XP_MIN_COMPLEXITY"
      :param-max="14"
      :param-step="0.5"
      :initial-param="8"
    />
    <p>
      Improving a personal best pays the same base plus one and a half times the bonus you
      gained over your old play, and even a worse score than your best still banks the flat 25.
      Playing is never wasted.
    </p>

    <WikiHeading id="ladder">The ladder</WikiHeading>
    <p>
      Levels follow a curve that keeps early climbing quick and late climbing prestigious: each
      level costs more than the last until level 100, where the price locks in flat for the
      rest of the road. There is a named tier for every stretch of the ladder and real
      unlockable items waiting at milestone levels. Drag through it, this is live data, so what
      you see here is exactly what is waiting:
    </p>
    <WikiXpLadder
      v-if="ladderReady"
      :thresholds="levelStore.thresholds"
      :items-by-id="itemsById"
      :personal-level="personalLevel"
      :user-name="authStore.userProfile?.name"
      :avatar-url="authStore.userProfile?.avatarUrl"
      :avatar-fallback-url="authStore.userProfile?.avatarFallbackUrl"
    />
    <p v-else-if="ladderFailed" class="ladder-error">
      The ladder could not load right now. It lives on your profile too.
    </p>
    <SkeletonLoader v-else variant="card" />
  </WikiProse>
</template>

<style scoped>
.sources {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-md);
  margin: 0 0 var(--space-md);
}

.sources__tile {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  padding: var(--space-md);
  border: 1px solid color-mix(in srgb, var(--source-color) 40%, var(--bg-overlay));
  border-radius: var(--radius-card);
  background: color-mix(in srgb, var(--source-color) 5%, var(--bg-surface));
}

.sources__label {
  font-size: var(--text-caption);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--source-color);
}

.sources__body {
  font-size: var(--text-caption);
  color: var(--text-primary);
  line-height: 1.6;
}

.ladder-error {
  color: var(--text-secondary);
}
</style>
