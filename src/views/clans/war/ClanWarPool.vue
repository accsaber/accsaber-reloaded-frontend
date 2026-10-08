<script setup lang="ts">
import { parseApiError } from '@/api/client'
import BaseButton from '@/components/common/BaseButton.vue'
import ClanTag from '@/components/domain/ClanTag.vue'
import type { ClanWarPoolEntryResponse, ClanWarResponse } from '@/types/api/clans'
import { CLAN_WAR_POOL_SOURCE_LABEL } from '@/utils/clans'
import { formatAccuracy } from '@/utils/formatters'
import { saveBlob } from '@/utils/download'
import { computed, ref } from 'vue'
import WarMapRow from './WarMapRow.vue'

const props = defineProps<{
  war: ClanWarResponse
  pool: ClanWarPoolEntryResponse[]
  canSubmitPicks: boolean
  signedIn: boolean
  collapsible?: boolean
}>()

const emit = defineEmits<{
  'submit-picks': []
}>()

const expanded = ref(false)
const showList = computed(() => !props.collapsible || expanded.value)
const listId = `war-pool-${Math.random().toString(36).slice(2, 9)}`
const downloading = ref(false)
const downloadError = ref<string | null>(null)

const picking = computed(() => props.war.status === 'picking')
async function download() {
  downloading.value = true
  downloadError.value = null
  try {
    const { downloadClanWarPlaylist } = await import('@/api/clans')
    const file = await downloadClanWarPlaylist(props.war.id)
    saveBlob(file.blob, file.filename ?? `accsaber-war-${props.war.attacker.clan.tag}-vs-${props.war.defender.clan.tag}.json`)
  } catch (err) {
    downloadError.value = parseApiError(err, 'Could not download the playlist.').message
  } finally {
    downloading.value = false
  }
}
</script>

<template>
  <section class="war-pool">
    <header class="war-pool__head">
      <h2 class="war-pool__title">
        <button
          v-if="collapsible"
          type="button"
          class="war-pool__toggle"
          :aria-expanded="expanded"
          :aria-controls="listId"
          @click="expanded = !expanded"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="9 6 15 12 9 18" />
          </svg>
          Pool
          <span class="war-pool__count">{{ pool.length }} maps</span>
        </button>
        <template v-else>
          Pool
          <span class="war-pool__count">{{ pool.length }}/{{ war.arenaSpec.poolSize }}</span>
        </template>
      </h2>
      <span class="war-pool__actions">
        <BaseButton v-if="canSubmitPicks" variant="primary" size="sm" @click="emit('submit-picks')">Submit picks</BaseButton>
        <BaseButton v-if="!picking" size="sm" :loading="downloading" @click="download">Download playlist</BaseButton>
      </span>
    </header>

    <p v-if="downloadError" class="war-pool__error" role="alert">{{ downloadError }}</p>

    <p v-if="pool.length === 0" class="war-pool__empty">No maps to show yet.</p>
    <ul v-else v-show="showList" :id="listId" class="war-pool__list">
      <li v-for="entry in pool" :key="entry.difficulty.id" class="war-pool__row">
        <WarMapRow :difficulty="entry.difficulty">
          <span v-if="entry.viewerScore" class="war-pool__own">
            <span class="war-pool__own-acc">{{ formatAccuracy(entry.viewerScore.accuracy) }}</span>
            <span class="war-pool__own-ap">{{ Math.round(entry.viewerScore.ap ?? 0) }} AP</span>
          </span>
          <span v-else-if="signedIn && war.status === 'active'" class="war-pool__own war-pool__own--none">Not played</span>
          <ClanTag v-if="entry.pickedBy" :clan="entry.pickedBy" size="sm" />
          <span class="war-pool__source">{{ CLAN_WAR_POOL_SOURCE_LABEL[entry.source] }}</span>
        </WarMapRow>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.war-pool {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.war-pool__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
}

.war-pool__title {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm);
  margin: 0;
  font-size: var(--text-section-heading);
  font-weight: 700;
  color: var(--text-primary);
}

.war-pool__toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 0;
  font: inherit;
  color: inherit;
  background: none;
  border: none;
  cursor: pointer;
}

.war-pool__toggle svg {
  color: var(--text-secondary);
  transition: transform 150ms ease-out;
}

.war-pool__toggle[aria-expanded='true'] svg {
  transform: rotate(90deg);
}

@media (prefers-reduced-motion: reduce) {
  .war-pool__toggle svg {
    transition: none;
  }
}

.war-pool__count {
  font-family: var(--font-mono);
  font-size: var(--text-body);
  font-weight: 500;
  color: var(--text-tertiary);
}

.war-pool__actions {
  display: flex;
  gap: var(--space-xs);
}

.war-pool__empty {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.war-pool__error {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--error);
}

.war-pool__list {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  overflow: hidden;
}

.war-pool__row {
  padding: var(--space-sm) var(--space-md);
  border-bottom: 1px solid var(--bg-overlay);
}

.war-pool__row:last-child {
  border-bottom: none;
}

.war-pool__row:nth-child(even) {
  background: var(--bg-elevated);
}

.war-pool__own {
  display: inline-flex;
  align-items: baseline;
  gap: var(--space-xs);
  margin-right: var(--space-sm);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.war-pool__own-acc {
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--text-primary);
}

.war-pool__own--none {
  color: var(--text-tertiary);
}

.war-pool__source {
  font-size: var(--text-caption);
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}
</style>
