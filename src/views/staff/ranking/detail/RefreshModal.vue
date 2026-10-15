<script setup lang="ts">
import { parseApiError } from '@/api/client'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import type { DifficultyDrift } from '@/views/staff/ranking/detail/useDifficultyDrift'
import { ref, watch } from 'vue'

const props = defineProps<{
  open: boolean
  difficultyId: string
  driftInfo: DifficultyDrift | null
}>()

const emit = defineEmits<{
  close: []
  refreshed: []
}>()

const loading = ref(false)
const error = ref('')

watch(() => props.open, (open) => {
  if (open) error.value = ''
})

function refreshErrorMessage(e: unknown): string {
  const parsed = parseApiError(e, 'Refresh failed.')
  if (parsed.status === 409) return 'That leaderboard is already attached to another difficulty.'
  if (parsed.status >= 500) return 'Refresh failed. Please try again.'
  return parsed.message
}

async function refresh() {
  const drift = props.driftInfo
  if (!drift) return
  if (!drift.newBlLeaderboardId) {
    error.value = 'New BeatLeader leaderboard not yet available. Try again in a minute.'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const { refreshDifficulty } = await import('@/api/ranking/maps')
    await refreshDifficulty(props.difficultyId, {
      blLeaderboardId: drift.newBlLeaderboardId,
      ssLeaderboardId: drift.newSsLeaderboardId ?? undefined,
    })
    emit('refreshed')
  } catch (e) {
    error.value = refreshErrorMessage(e)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <BaseModal :open="open" title="Refresh from BeatSaver" max-width="520px" @close="emit('close')">
    <p class="refresh__intro">
      This will refresh metadata, hash, and leaderboard IDs to the latest BeatSaver version.
    </p>
    <div v-if="driftInfo" class="refresh__diff">
      <div class="refresh__row">
        <span class="refresh__label">Hash</span>
        <span class="refresh__old">{{ driftInfo.oldHash }}</span>
        <span class="refresh__arrow">to</span>
        <span class="refresh__new">{{ driftInfo.newHash }}</span>
      </div>
      <div class="refresh__row">
        <span class="refresh__label">BeatLeader</span>
        <span class="refresh__old">{{ driftInfo.oldBlLeaderboardId ?? '-' }}</span>
        <span class="refresh__arrow">to</span>
        <span class="refresh__new" :class="{ 'refresh__new--missing': !driftInfo.newBlLeaderboardId }">
          {{ driftInfo.newBlLeaderboardId ?? 'Not yet on BeatLeader' }}
        </span>
      </div>
      <div class="refresh__row">
        <span class="refresh__label">ScoreSaber</span>
        <span class="refresh__old">{{ driftInfo.oldSsLeaderboardId ?? '-' }}</span>
        <span class="refresh__arrow">to</span>
        <span class="refresh__new" :class="{ 'refresh__new--missing': !driftInfo.newSsLeaderboardId }">
          {{ driftInfo.newSsLeaderboardId ?? 'Not yet on ScoreSaber' }}
        </span>
      </div>
      <p v-if="!driftInfo.newBlLeaderboardId" class="refresh__hint">
        BeatLeader edge caches can lag a minute or two after a re-upload.
      </p>
    </div>
    <p v-if="error" class="refresh__error">{{ error }}</p>
    <template #footer>
      <div class="modal-actions">
        <BaseButton @click="emit('close')">Cancel</BaseButton>
        <BaseButton variant="primary" :loading="loading" :disabled="!driftInfo?.newBlLeaderboardId" @click="refresh">
          Refresh
        </BaseButton>
      </div>
    </template>
  </BaseModal>
</template>

<style scoped>
.refresh__intro {
  margin: 0 0 var(--space-md);
  font-size: var(--text-body);
  color: var(--text-secondary);
}

.refresh__diff {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-md);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  background: var(--bg-base);
}

.refresh__row {
  display: grid;
  grid-template-columns: 80px 1fr auto 1fr;
  align-items: center;
  gap: var(--space-sm);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
}

.refresh__label {
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.refresh__old {
  color: var(--text-tertiary);
  text-decoration: line-through;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.refresh__arrow {
  color: var(--text-tertiary);
  font-family: var(--font-sans);
  font-size: var(--text-caption);
}

.refresh__new {
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.refresh__new--missing {
  color: var(--warning);
  font-family: var(--font-sans);
  font-style: italic;
}

.refresh__hint {
  margin: var(--space-xs) 0 0;
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.refresh__error {
  margin: var(--space-md) 0 0;
  font-size: var(--text-caption);
  color: var(--error);
}

.modal-actions {
  display: flex;
  gap: var(--space-sm);
  justify-content: flex-end;
}
</style>
