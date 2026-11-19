<script setup lang="ts">
import { parseApiError } from '@/api/client'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseSwitch from '@/components/common/BaseSwitch.vue'
import BaseTabs from '@/components/common/BaseTabs.vue'
import CoverImage from '@/components/common/CoverImage.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import StatusMark from '@/components/common/StatusMark.vue'
import DifficultyBadge from '@/components/domain/DifficultyBadge.vue'
import SongTitle from '@/components/domain/SongTitle.vue'
import { useAutoCheckPoll } from '@/composables/useAutoCheckPoll'
import { usePageMeta } from '@/composables/usePageMeta'
import { rankingDashboardRoute } from '@/router'
import { useAuthStore } from '@/stores/auth'
import { formatChartDuration, formatChartNumber } from '@/utils/chartMetadata'
import { AUTO_CRITERIA_LABELS } from '@/utils/constants'
import { computed, defineAsyncComponent, ref } from 'vue'
import { type DiffSelection, useMapSource } from './map-import/useMapSource'

const PseudoLoginModal = defineAsyncComponent(() => import('@/components/domain/PseudoLoginModal.vue'))

type Mode = 'import' | 'suggest' | 'check'

const props = withDefaults(defineProps<{
  mode?: Mode
}>(), {
  mode: 'import',
})

const GHOST_ROWS = 3
const EXISTING_ID = /ID: ([0-9a-f-]{36})/i
const COPY = {
  import: {
    title: 'Import Map',
    pageTitle: 'Import Map | AccSaber Ranking',
    description: 'Import a map from BeatSaver into the AccSaber ranking queue.',
    verb: 'Import',
    failed: 'Import failed',
  },
  suggest: {
    title: 'Suggest a Map',
    pageTitle: 'Suggest a Map | AccSaber',
    description: 'Suggest a BeatSaver map for ranking on AccSaber.',
    verb: 'Suggest',
    failed: 'Could not suggest it',
  },
  check: {
    title: 'Criteria Checker',
    pageTitle: 'Criteria Checker | AccSaber',
    description: 'Check a map against the AccSaber ranking criteria before suggesting it.',
    verb: 'Check',
    failed: 'Could not run the check',
  },
}[props.mode]
const SAVED = {
  import: { done: 'Imported', exists: 'Already imported', back: 'Back to Queue', detail: 'ranking-map-detail', backRoute: { name: rankingDashboardRoute } },
  suggest: { done: 'Suggested', exists: 'Already in the Hub', back: 'Back to the Hub', detail: 'ranking-hub-detail', backRoute: { name: 'ranked-queue', query: { tab: 'suggested' } } },
  check: null,
}[props.mode]

usePageMeta({ title: COPY.pageTitle, description: COPY.description })

const auth = useAuthStore()
const { header, diffs, fetching, fetchError, categoryTabs, loadCode, loadUpload, checkSource } = useMapSource(!!SAVED)
const pollAutoCheck = useAutoCheckPoll()

const input = ref('')
const zipInput = ref<HTMLInputElement | null>(null)
const loginMounted = ref(false)
const loginOpen = ref(false)

const pending = computed(() => diffs.value.filter((d) => d.selected && !d.importedId))
const importing = computed(() => diffs.value.some((d) => d.importing))
const anyImported = computed(() => diffs.value.some((d) => d.importedId))

function onZipPicked(event: Event) {
  const field = event.target as HTMLInputElement
  const file = field.files?.[0]
  field.value = ''
  if (file) void loadUpload(file)
}

async function send(diff: DiffSelection) {
  const ids = {
    blLeaderboardId: diff.blLeaderboardId!,
    ssLeaderboardId: diff.ssLeaderboardId != null ? String(diff.ssLeaderboardId) : undefined,
    categoryId: diff.categoryId,
  }
  if (props.mode === 'suggest') return (await import('@/api/maps')).suggestMap(ids)
  const [{ importMap }, { castVote }] = await Promise.all([import('@/api/ranking/maps'), import('@/api/ranking/voting')])
  const created = await importMap({ ...ids, difficulty: diff.difficulty, characteristic: diff.characteristic })
  void castVote(created.id, { vote: 'UPVOTE', type: 'RANK' }).catch(() => undefined)
  return created
}

async function refetch(id: string) {
  if (props.mode === 'suggest') return (await import('@/api/maps')).getDifficulty(id)
  return (await import('@/api/ranking/maps')).getRankingDifficulty(id)
}

async function importOne(diff: DiffSelection) {
  diff.importing = true
  diff.error = ''
  try {
    const created = await send(diff)
    diff.importedId = created.id
    diff.autoStatus = created.autoCriteriaStatus
    pollAutoCheck(created, () => refetch(created.id), (fresh) => { diff.autoStatus = fresh.autoCriteriaStatus })
  } catch (err) {
    const parsed = parseApiError(err, COPY.failed)
    if (parsed.code === 'CONFLICT' && SAVED) {
      diff.existingId = parsed.message.match(EXISTING_ID)?.[1] ?? null
      diff.selected = false
      diff.error = diff.existingId ? SAVED.exists : parsed.message
    } else {
      diff.error = parsed.message
    }
  } finally {
    diff.importing = false
  }
}

async function checkSelected() {
  const rows = pending.value
  for (const diff of rows) Object.assign(diff, { importing: true, result: null, error: '' })
  fetchError.value = ''
  try {
    const { checkCriteria } = await import('@/api/maps')
    const results = await checkCriteria(checkSource(), rows.map(({ difficulty, categoryId }) => ({ difficulty, categoryId })))
    rows.forEach((diff, i) => { diff.result = results[i] ?? null })
  } catch (err) {
    fetchError.value = parseApiError(err, COPY.failed).message
  } finally {
    for (const diff of rows) diff.importing = false
  }
}

function run() {
  if (props.mode !== 'import' && !auth.userId) {
    loginMounted.value = true
    loginOpen.value = true
    return
  }
  return SAVED ? Promise.all(pending.value.map(importOne)) : checkSelected()
}
</script>

<template>
  <div class="map-import">
    <h1>{{ COPY.title }}</h1>

    <form class="map-import__lookup" @submit.prevent="loadCode(input)">
      <BaseInput
        v-model="input"
        label="BeatSaver Code or URL"
        placeholder="4fdd2"
        :disabled="fetching"
      />
      <BaseButton type="submit" variant="primary" :loading="fetching" :disabled="!input.trim()">Fetch</BaseButton>
      <template v-if="!SAVED">
        <input ref="zipInput" type="file" hidden accept=".zip,application/zip" @change="onZipPicked" />
        <BaseButton type="button" :disabled="fetching" @click="zipInput?.click()">Upload a Zip</BaseButton>
      </template>
      <p class="caption map-import__error map-import__lookup-error" role="alert">{{ fetchError }}</p>
    </form>

    <section v-if="fetching || header" class="map-import__map" :aria-busy="fetching">
      <div class="map-import__hero">
        <SkeletonLoader v-if="!header" class="placeholder" width="120px" height="120px" />
        <CoverImage v-else :src="header.coverUrl" :alt="header.songName" :size="120" />
        <div class="map-import__identity">
          <template v-if="header">
            <h2 class="map-import__song">
              <SongTitle layout="stacked" :name="header.songName" :sub-name="header.songSubName" />
            </h2>
            <p class="map-import__credits">{{ header.songAuthor }} · {{ header.mapper }}</p>
            <p class="caption">
              {{ [header.bpm != null && `${formatChartNumber(header.bpm)} BPM`, formatChartDuration(header.duration)].filter(Boolean).join(' · ') }}
            </p>
          </template>
          <SkeletonLoader v-else class="placeholder" variant="text" :lines="3" width="240px" />
        </div>
      </div>

      <ul class="map-import__diffs">
        <template v-if="!header">
          <li v-for="i in GHOST_ROWS" :key="i" class="placeholder"><SkeletonLoader height="56px" /></li>
        </template>
        <li
          v-for="diff in diffs"
          :key="diff.key"
          class="map-import__diff"
        >
          <StatusMark v-if="diff.importedId || diff.existingId" done />
          <BaseSwitch
            v-else
            v-model="diff.selected"
            :disabled="importing || (!!SAVED && !diff.blLeaderboardId)"
            :aria-label="`${COPY.verb} ${diff.difficulty}`"
          />
          <span class="map-import__diff-name">
            <DifficultyBadge :difficulty="diff.difficulty" />
            <span v-if="diff.characteristic !== 'Standard'" class="caption">{{ diff.characteristic }}</span>
          </span>
          <span v-if="diff.njs != null" class="caption map-import__diff-meta">NJS {{ diff.njs }} · {{ diff.notes }} notes</span>
          <span class="map-import__diff-end">
            <SkeletonLoader v-if="!SAVED && diff.importing" class="placeholder" width="52px" height="21px" />
            <span v-if="diff.result" class="map-import__result" :class="`criteria-text--${diff.result.status.toLowerCase()}`" role="status">
              {{ AUTO_CRITERIA_LABELS[diff.result.status] }}
            </span>
            <span v-if="diff.error && !diff.existingId" class="caption map-import__error" role="alert">{{ diff.error }}</span>
            <span v-if="SAVED && !diff.blLeaderboardId" class="caption map-import__error">Not on BeatLeader</span>
            <template v-else-if="SAVED && (diff.importedId || diff.existingId)">
              <span v-if="diff.autoStatus" class="caption" :class="`criteria-text--${diff.autoStatus.toLowerCase()}`">
                Auto check {{ AUTO_CRITERIA_LABELS[diff.autoStatus].toLowerCase() }}
              </span>
              <span class="caption" role="status">{{ diff.importedId ? SAVED.done : diff.error }}</span>
              <BaseButton
                size="sm"
                :href="$router.resolve({ name: SAVED.detail, params: { difficultyId: (diff.importedId ?? diff.existingId)! } }).href"
              >
                View
              </BaseButton>
            </template>
            <Transition v-else name="collapse">
              <span v-if="diff.selected" class="collapsible">
                <BaseTabs
                  v-model="diff.categoryId"
                  variant="segmented"
                  :label="`Category for ${diff.difficulty}`"
                  :tabs="categoryTabs"
                  :disabled-keys="importing ? categoryTabs.map((t) => t.key) : []"
                />
              </span>
            </Transition>
          </span>
          <Transition name="collapse">
            <div v-if="diff.result?.failures.length" class="collapsible map-import__failures">
              <ul class="criteria-failures">
                <li v-for="(failure, i) in diff.result.failures" :key="i">{{ failure }}</li>
              </ul>
            </div>
          </Transition>
        </li>
      </ul>

      <div class="map-import__actions">
        <BaseButton v-if="SAVED && anyImported && !pending.length" :href="$router.resolve(SAVED.backRoute).href">
          {{ SAVED.back }}
        </BaseButton>
        <BaseButton v-else variant="primary" :loading="importing" :disabled="!pending.length" @click="run">
          {{ pending.length > 1 ? `${COPY.verb} ${pending.length} Difficulties` : COPY.verb }}
        </BaseButton>
      </div>
    </section>

    <PseudoLoginModal v-if="loginMounted" :open="loginOpen" @close="loginOpen = false" />
  </div>
</template>

<style scoped>
.map-import {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  width: 100%;
  max-width: 880px;
  margin: 0 auto;
}

.map-import__lookup {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--space-xs) var(--space-sm);
}

.map-import__lookup-error {
  flex-basis: 100%;
  min-height: 1lh;
}

.map-import__lookup :deep(.base-input) {
  flex: 1;
}

.map-import__map {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  padding: var(--space-lg);
  background: var(--bg-surface);
  border-radius: var(--radius-card);
  animation: settle-in var(--dur-enter) var(--ease-out) backwards;
}

.map-import__hero {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
}

.map-import__identity {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  min-width: 0;
}

.map-import__song {
  margin: 0;
  font-size: var(--text-page-title);
  line-height: 1.2;
  text-wrap: balance;
}

.map-import__credits {
  margin: 0;
  font-size: var(--text-card-title);
  color: var(--text-secondary);
}

.map-import__diffs {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.map-import__diff {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0 var(--space-md);
  min-height: 56px;
  padding: 0 var(--space-md);
  border-radius: var(--radius-btn);
}

.map-import__diff:nth-child(odd) {
  background: var(--bg-elevated);
}

.map-import__diff-name {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm);
  min-width: 96px;
  font-size: var(--text-card-title);
}

.map-import__diff-meta {
  font-family: var(--font-mono);
}

.map-import__diff-end {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-left: auto;
}

.map-import__result {
  font-weight: 600;
}

.map-import__failures {
  flex-basis: 100%;
}

.map-import__failures > * {
  padding-bottom: var(--space-sm);
}

.map-import__error {
  color: var(--error);
}

.map-import__actions {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 767px) {
  .map-import__hero {
    align-items: flex-start;
    gap: var(--space-md);
  }

  .map-import__song {
    font-size: var(--text-section-heading);
  }

  .map-import__diff {
    padding: var(--space-sm) var(--space-md);
  }

  .map-import__diff-end .collapsible > * {
    margin-top: var(--space-sm);
  }

  .map-import__diff-end {
    flex-basis: 100%;
    margin-left: 0;
  }

}
</style>
