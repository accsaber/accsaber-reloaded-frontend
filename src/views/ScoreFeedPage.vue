<script setup lang="ts">
import BaseTabs from '@/components/common/BaseTabs.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PageHeaderBleed from '@/components/common/PageHeaderBleed.vue'
import ScoreDetailModal from '@/components/domain/ScoreDetailModal.vue'
import ScoreFeedCard from '@/components/domain/ScoreFeedCard.vue'
import { useNow } from '@/composables/useNow'
import { usePageMeta } from '@/composables/usePageMeta'
import { useScoreWebSocket } from '@/composables/useScoreWebSocket'
import { useCategoryStore } from '@/stores/categories'
import type { ScoreDisplay, ScoreFeedEntry } from '@/types/display'
import { feedEntryToScoreDisplay } from '@/utils/mappers'
import { computed, ref } from 'vue'

const categoryStore = useCategoryStore()
const { scores, status } = useScoreWebSocket()
const now = useNow()
const activeTab = ref('all')

usePageMeta({
  title: 'Score Feed | AccSaber',
  description: 'Live score feed showing real-time score submissions across AccSaber.',
})

const tabs = computed(() => [
  { key: 'all', label: 'All' },
  ...categoryStore.categoryInfoList
    .filter((c) => c.code !== 'overall' && c.code !== 'xp')
    .map((c) => ({ key: c.code, label: c.name, accentColor: c.accent })),
])

const filteredScores = computed(() =>
  activeTab.value === 'all' ? scores.value : scores.value.filter((s) => s.categoryCode === activeTab.value),
)

const statusNote = computed(() => {
  if (status.value === 'reconnecting') return 'Reconnecting...'
  if (status.value === 'disconnected') return 'Disconnected'
  return ''
})

const modalOpen = ref(false)
const modalScore = ref<ScoreDisplay | null>(null)
const modalUserId = ref('')

function onSelectScore(entry: ScoreFeedEntry) {
  modalScore.value = feedEntryToScoreDisplay(entry)
  modalUserId.value = entry.userId
  modalOpen.value = true
}
</script>

<template>
  <div class="score-feed-page">
    <PageHeaderBleed title="Score Feed" :subtitle="statusNote" />

    <BaseTabs v-model="activeTab" :tabs="tabs" />

    <div class="score-feed-page__list">
      <TransitionGroup name="feed">
        <ScoreFeedCard v-for="entry in filteredScores" :key="entry.key" :entry="entry" :now="now"
          @select="onSelectScore" />
      </TransitionGroup>

      <EmptyState v-if="filteredScores.length === 0" message="Waiting for scores..." />
    </div>

    <ScoreDetailModal :open="modalOpen" :score="modalScore" :user-id="modalUserId" @close="modalOpen = false" />
  </div>
</template>

<style scoped>
.score-feed-page {
  max-width: 900px;
  margin: 0 auto;
}

.score-feed-page__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  margin-top: var(--space-lg);
}

.feed-enter-active {
  transition: all 200ms ease-out;
}

.feed-leave-active {
  transition: all 150ms ease-in;
}

.feed-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.feed-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.feed-move {
  transition: transform 200ms ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .feed-enter-active,
  .feed-leave-active,
  .feed-move {
    transition: none;
  }
}
</style>
