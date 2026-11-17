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
import { formatAccuracy } from '@/utils/formatters'

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
    body: 'Every play you finish on a ranked map gives XP and you get more for better accuracy and higher complexity.',
  },
  {
    key: 'milestone',
    color: 'var(--xp-milestone)',
    label: 'Milestones',
    body: 'Complete one and its XP is yours for good.',
  },
  {
    key: 'set-bonus',
    color: 'var(--xp-set-bonus)',
    label: 'Set bonuses',
    body: 'Finish every milestone in a set and you get a bonus on top.',
  },
  {
    key: 'mission',
    color: 'var(--xp-mission)',
    label: 'Missions',
    body: 'Daily and weekly goals made for your skill level. For some of them even your attempts count.',
  },
  {
    key: 'campaign',
    color: 'var(--xp-campaign)',
    label: 'Campaigns',
    body: 'Clearing campaign challenges gives XP on top of what the play already gave you.',
  },
  {
    key: 'event',
    color: 'var(--xp-event)',
    label: 'Events',
    body: 'Missions and bonuses from whatever event is live.',
  },
  {
    key: 'clan',
    color: 'var(--xp-clan)',
    label: 'Clans',
    body: 'Clan missions and fighting in clan wars.',
  },
]

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
      AP is about how good you are and XP is about how much you play. Pretty much everything you
      do on AccSaber gives XP, levels never stop and some of them give you items.
    </p>

    <WikiHeading id="sources">Where XP comes from</WikiHeading>
    <p>
      XP comes from seven places and each one has its own color. They're the same colors your
      profile uses to show where your XP came from:
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

    <WikiHeading id="score-xp">XP from a play</WikiHeading>
    <p>
      Every play you finish starts at 25 XP and you get a bonus on top for your accuracy and the
      map's complexity. That bonus gets even steeper near the top than the AP curve does:
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
      Beating your own best gives the same 25 plus 1.5x the bonus you gained over your old play.
      A score that's worse than your best still gives the flat 25.
    </p>

    <WikiHeading id="ladder">Levels and what they unlock</WikiHeading>
    <p>
      Every level costs more XP than the one before it until level 100 and from there the cost
      stays the same. Each stretch of levels has its own tier name and some levels unlock items.
      Drag through it, this is live data:
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
    <p v-else-if="ladderFailed">
      The ladder couldn't load right now but you can also find it on your profile.
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
  border-radius: var(--radius-card);
  background: var(--bg-base);
}

.sources__label {
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--source-color);
}

.sources__body {
  font-size: var(--text-caption);
  color: var(--text-primary);
  line-height: 1.6;
}
</style>
