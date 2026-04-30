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
  const c = localCounts.value
  const result: Tile[] = []
  if (c.followingCount !== undefined) {
    result.push({
      key: 'following',
      label: 'Following',
      count: c.followingCount,
      type: 'follower',
      direction: 'outgoing',
      modalTitle: 'Following',
    })
  }
  result.push({
    key: 'followers',
    label: 'Followers',
    count: c.followerCount,
    type: 'follower',
    direction: 'incoming',
    modalTitle: 'Followers',
  })
  if (c.rivalCount !== undefined) {
    result.push({
      key: 'rivaling',
      label: 'Rivaling',
      count: c.rivalCount,
      type: 'rival',
      direction: 'outgoing',
      modalTitle: 'Rivaling',
    })
  }
  result.push({
    key: 'rivaledBy',
    label: 'Rivaled by',
    count: c.rivaledByCount,
    type: 'rival',
    direction: 'incoming',
    modalTitle: 'Rivaled by',
  })
  if (c.blockedCount !== undefined) {
    result.push({
      key: 'blocked',
      label: 'Blocked',
      count: c.blockedCount,
      type: 'blocked',
      direction: 'outgoing',
      modalTitle: 'Blocked',
    })
  }
  return result
})

function handleRemoved(item: UserRelationResponse) {
  const c = localCounts.value
  if (item.type === 'follower' && c.followingCount !== undefined) {
    c.followingCount = Math.max(0, c.followingCount - 1)
  } else if (item.type === 'rival' && c.rivalCount !== undefined) {
    c.rivalCount = Math.max(0, c.rivalCount - 1)
  } else if (item.type === 'blocked' && c.blockedCount !== undefined) {
    c.blockedCount = Math.max(0, c.blockedCount - 1)
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
