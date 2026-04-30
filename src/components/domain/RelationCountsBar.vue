<script setup lang="ts">
import RelationListModal from '@/components/domain/RelationListModal.vue'
import type {
  RelationDirection,
  UserRelationCounts,
  UserRelationResponse,
  UserRelationType,
} from '@/types/api/relations'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  userId: string
  counts: UserRelationCounts
}>()

const localCounts = ref<UserRelationCounts>({ ...props.counts })

watch(
  () => props.counts,
  (next) => {
    localCounts.value = { ...next }
  },
)

interface Tile {
  key: string
  label: string
  count: number
  type: UserRelationType
  direction: RelationDirection
  modalTitle: string
}

const tiles = computed<Tile[]>(() => {
  const result: Tile[] = [
    {
      key: 'following',
      label: 'Following',
      count: localCounts.value.followingCount,
      type: 'follower',
      direction: 'outgoing',
      modalTitle: 'Following',
    },
    {
      key: 'followers',
      label: 'Followers',
      count: localCounts.value.followerCount,
      type: 'follower',
      direction: 'incoming',
      modalTitle: 'Followers',
    },
    {
      key: 'rivaling',
      label: 'Rivaling',
      count: localCounts.value.rivalCount,
      type: 'rival',
      direction: 'outgoing',
      modalTitle: 'Rivaling',
    },
    {
      key: 'rivaledBy',
      label: 'Rivaled by',
      count: localCounts.value.rivaledByCount,
      type: 'rival',
      direction: 'incoming',
      modalTitle: 'Rivaled by',
    },
  ]
  if (localCounts.value.blockedCount !== undefined) {
    result.push({
      key: 'blocked',
      label: 'Blocked',
      count: localCounts.value.blockedCount,
      type: 'blocked',
      direction: 'outgoing',
      modalTitle: 'Blocked',
    })
  }
  return result
})

function handleRemoved(item: UserRelationResponse) {
  if (item.type === 'follower') {
    localCounts.value.followingCount = Math.max(0, localCounts.value.followingCount - 1)
  } else if (item.type === 'rival') {
    localCounts.value.rivalCount = Math.max(0, localCounts.value.rivalCount - 1)
  } else if (item.type === 'blocked' && localCounts.value.blockedCount !== undefined) {
    localCounts.value.blockedCount = Math.max(0, localCounts.value.blockedCount - 1)
  }
}

const activeTile = ref<Tile | null>(null)

function open(tile: Tile) {
  if (tile.count === 0) return
  activeTile.value = tile
}

function close() {
  activeTile.value = null
}
</script>

<template>
  <div class="relation-counts">
    <button
      v-for="tile in tiles"
      :key="tile.key"
      class="relation-counts__tile"
      :class="{ 'relation-counts__tile--empty': tile.count === 0 }"
      :disabled="tile.count === 0"
      @click="open(tile)"
    >
      <span class="relation-counts__value">{{ tile.count.toLocaleString() }}</span>
      <span class="relation-counts__label">{{ tile.label }}</span>
    </button>

    <RelationListModal
      :open="activeTile !== null"
      :user-id="userId"
      :type="activeTile?.type ?? 'follower'"
      :direction="activeTile?.direction ?? 'outgoing'"
      :title="activeTile?.modalTitle ?? ''"
      @close="close"
      @removed="handleRemoved"
    />
  </div>
</template>

<style scoped>
.relation-counts {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-sm);
}

.relation-counts__tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: var(--space-xs) var(--space-md);
  background: transparent;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  cursor: pointer;
  font: inherit;
  color: inherit;
  transition: border-color 120ms ease, background-color 120ms ease;
}

.relation-counts__tile:hover:not(:disabled) {
  background: var(--bg-elevated);
  border-color: var(--text-tertiary);
}

.relation-counts__tile--empty,
.relation-counts__tile:disabled {
  cursor: default;
  opacity: 0.6;
}

.relation-counts__value {
  font-family: var(--font-mono);
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--text-primary);
}

.relation-counts__label {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  letter-spacing: 0.02em;
}
</style>
