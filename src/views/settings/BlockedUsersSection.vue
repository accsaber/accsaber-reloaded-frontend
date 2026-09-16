<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import GlowImage from '@/components/common/GlowImage.vue'
import CountryFlag from '@/components/domain/CountryFlag.vue'
import { useRelationsStore } from '@/stores/relations'
import type { UserRelationResponse } from '@/types/api/relations'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const relationsStore = useRelationsStore()

const blocked = computed(() =>
  relationsStore.relations.filter((r) => r.type === 'blocked'),
)

const unblockingId = ref<string | null>(null)
const error = ref<string | null>(null)

function avatarOf(item: UserRelationResponse): string {
  return item.targetCdnAvatarUrl ?? item.targetAvatarUrl ?? ''
}

function goToProfile(item: UserRelationResponse) {
  if (!item.targetUserId) return
  router.push({ name: 'player-profile', params: { userId: item.targetUserId } })
}

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
      <button type="button" class="blocked-users__identity" @click="goToProfile(item)">
        <GlowImage v-if="avatarOf(item)" :src="avatarOf(item)" :alt="item.targetName" :size="36" />
        <span v-else class="blocked-users__avatar-fallback" />
        <span class="blocked-users__name">{{ item.targetName }}</span>
        <CountryFlag v-if="item.targetCountry" :country="item.targetCountry" />
      </button>
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

.blocked-users__identity {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
  font: inherit;
  color: var(--text-primary);
  text-align: left;
}

.blocked-users__identity:hover .blocked-users__name {
  color: var(--accent);
}

.blocked-users__identity:focus-visible {
  outline: 1px solid var(--accent);
  outline-offset: 4px;
}

.blocked-users__avatar-fallback {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-avatar);
  background: var(--bg-overlay);
  flex-shrink: 0;
}

.blocked-users__name {
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 120ms ease;
}

@media (max-width: 767px) {
  .blocked-users__row {
    flex-direction: row;
    justify-content: space-between;
  }
}
</style>
