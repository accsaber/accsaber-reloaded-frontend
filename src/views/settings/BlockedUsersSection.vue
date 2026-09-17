<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import UserChip from '@/components/domain/UserChip.vue'
import { useRelationsStore } from '@/stores/relations'
import type { UserRelationResponse } from '@/types/api/relations'
import { toRelationUserRef } from '@/utils/mappers'
import { computed, ref } from 'vue'

const relationsStore = useRelationsStore()

const blocked = computed(() =>
  relationsStore.relations.filter((r) => r.type === 'blocked'),
)

const unblockingId = ref<string | null>(null)
const error = ref<string | null>(null)

async function unblock(item: UserRelationResponse) {
  if (unblockingId.value || !item.targetUserId) return
  unblockingId.value = item.id
  error.value = null
  try {
    await relationsStore.remove(item.targetUserId, 'blocked')
  } catch {
    error.value = "Couldn't unblock this user."
  } finally {
    unblockingId.value = null
  }
}
</script>

<template>
  <section class="settings-card">
    <header class="settings-card__header">
      <h2 class="settings-card__title">Blocked users</h2>
      <p class="settings-card__desc">
        Blocked users can't follow or rival you, and their stats and scores are hidden from you.
        Only you can see this list.
      </p>
    </header>

    <p v-if="blocked.length === 0" class="blocked-users__empty">You haven't blocked anyone.</p>

    <div v-for="item in blocked" v-else :key="item.id" class="settings-row blocked-users__row">
      <UserChip :user="toRelationUserRef(item)" :link="!!item.targetUserId" />
      <BaseButton size="sm" :loading="unblockingId === item.id" @click="unblock(item)">
        Unblock
      </BaseButton>
    </div>

    <p v-if="error" class="settings-card__error">{{ error }}</p>
  </section>
</template>

<style scoped>
.blocked-users__empty {
  margin: 0;
  color: var(--text-tertiary);
  font-size: var(--text-caption);
}

.blocked-users__row {
  align-items: center;
}

@media (max-width: 767px) {
  .blocked-users__row {
    flex-direction: row;
    justify-content: space-between;
  }
}
</style>
