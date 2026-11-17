<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseTabs from '@/components/common/BaseTabs.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import { useConfirmAction } from '@/composables/useConfirmAction'
import { useCategoryStore } from '@/stores/categories'
import type { Tab } from '@/types/display'
import ResourcePicker from './ResourcePicker.vue'
import ToolCard from './ToolCard.vue'
import { makeOp, run } from './operationState'
import { RESOURCE_SOURCES } from './resourceSources'
import { computed, ref } from 'vue'

const categoryStore = useCategoryStore()
const { confirmModal, ask } = useConfirmAction()

const userSource = RESOURCE_SOURCES.USER!
const difficultySource = RESOURCE_SOURCES.MAP_DIFFICULTY!

const categoryTabs = computed<Tab[]>(() =>
  categoryStore.categories.map((c) => ({ key: c.id, label: categoryStore.getShortName(c.code), accentColor: categoryStore.getAccent(c.code) })),
)

const statsOp = ref(makeOp())
const statsUserId = ref<string | null>(null)
const statsCategoryId = ref('')

function recalcStats() {
  const userId = statsUserId.value
  if (!userId || !statsCategoryId.value) return
  void run(statsOp.value, async () => {
    const { recalculatePlayerStats } = await import('@/api/admin/recalculation')
    await recalculatePlayerStats(userId, statsCategoryId.value)
    statsUserId.value = null
  }, 'Statistics recalculated')
}

const removeOp = ref(makeOp())
const removeUserId = ref<string | null>(null)
const removeDifficultyId = ref<string | null>(null)
const removeReason = ref('')

function askRemoveScore() {
  const userId = removeUserId.value
  const mapDifficultyId = removeDifficultyId.value
  if (!userId || !mapDifficultyId) return
  ask({
    title: 'Remove Score',
    message: 'Remove this score? The player is fetched again so it is not imported back.',
    confirmLabel: 'Remove',
    destructive: true,
    run: () => run(removeOp.value, async () => {
      const { removeScore } = await import('@/api/admin/recalculation')
      await removeScore({ userId, mapDifficultyId, reason: removeReason.value || undefined })
      removeUserId.value = null
      removeDifficultyId.value = null
      removeReason.value = ''
    }, 'Score removal queued'),
  })
}

const refreshOp = ref(makeOp())
const refreshAllOp = ref(makeOp())
const refreshUserId = ref<string | null>(null)

function refreshPlayer() {
  const userId = refreshUserId.value
  if (!userId) return
  void run(refreshOp.value, async () => {
    const { refreshPlayer: api } = await import('@/api/admin/recalculation')
    await api(userId)
    refreshUserId.value = null
  }, 'Player refresh queued')
}

function askRefreshAll() {
  ask({
    title: 'Refresh Every Player',
    message: 'Refresh every player? This is a heavy background job.',
    confirmLabel: 'Refresh All',
    destructive: true,
    run: () => run(refreshAllOp.value, async () => {
      const { refreshAllPlayers } = await import('@/api/admin/recalculation')
      await refreshAllPlayers()
    }, 'Refresh of every player queued'),
  })
}
</script>

<template>
  <div class="player-tools">
    <ToolCard title="Recalculate Statistics" :results="[statsOp]">
      <ResourcePicker v-model="statsUserId" :search="userSource.search" :resolve="userSource.resolve" :placeholder="userSource.placeholder" />
      <BaseTabs v-model="statsCategoryId" class="player-tools__categories" variant="segmented" label="Category" :tabs="categoryTabs" />
      <template #actions>
        <BaseButton variant="primary" :loading="statsOp.loading" :disabled="!statsUserId || !statsCategoryId" @click="recalcStats">
          Recalculate
        </BaseButton>
      </template>
    </ToolCard>

    <ToolCard title="Remove Score" :results="[removeOp]">
      <ResourcePicker v-model="removeUserId" :search="userSource.search" :resolve="userSource.resolve" :placeholder="userSource.placeholder" />
      <ResourcePicker v-model="removeDifficultyId" :search="difficultySource.search" :resolve="difficultySource.resolve"
        :placeholder="difficultySource.placeholder" />
      <BaseInput v-model="removeReason" placeholder="Reason" aria-label="Reason" />
      <template #actions>
        <BaseButton variant="destructive" :loading="removeOp.loading" :disabled="!removeUserId || !removeDifficultyId" @click="askRemoveScore">
          Remove
        </BaseButton>
      </template>
    </ToolCard>

    <ToolCard title="Refresh From Platforms" :results="[refreshOp, refreshAllOp]">
      <ResourcePicker v-model="refreshUserId" :search="userSource.search" :resolve="userSource.resolve" :placeholder="userSource.placeholder" />
      <template #actions>
        <BaseButton variant="primary" :loading="refreshOp.loading" :disabled="!refreshUserId" @click="refreshPlayer">Refresh Player</BaseButton>
        <BaseButton variant="destructive" :loading="refreshAllOp.loading" @click="askRefreshAll">Refresh All</BaseButton>
      </template>
    </ToolCard>

    <ConfirmModal v-bind="confirmModal" />
  </div>
</template>

<style scoped>
.player-tools {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: var(--space-lg);
  align-items: stretch;
}

.player-tools__categories {
  align-self: flex-start;
}

.player-tools__categories :deep(.base-tabs__tab--active) {
  color: var(--tab-accent);
}
</style>
