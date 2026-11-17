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
import { usePageMeta } from '@/composables/usePageMeta'
import { rankingDashboardRoute } from '@/router'
import { useCategoryStore } from '@/stores/categories'
import type { Tab } from '@/types/display'
import type { Difficulty } from '@/types/enums'
import {
  type BeatSaverMapResponse,
  difficultyToEnum,
  fetchBeatLeaderMapInfo,
  fetchBeatSaverMap,
  fetchScoreSaberLeaderboards,
  parseBeatSaverCode,
} from '@/utils/beatsaver'
import { formatChartDuration, formatChartNumber } from '@/utils/chartMetadata'
import { computed, ref } from 'vue'

const GHOST_ROWS = 3
const EXISTING_ID = /ID: ([0-9a-f-]{36})/i

const categoryStore = useCategoryStore()

usePageMeta({
  title: 'Import Map | AccSaber Ranking',
  description: 'Import a map from BeatSaver into the AccSaber ranking queue.',
})

interface DiffSelection {
  key: string
  characteristic: string
  difficulty: Difficulty
  njs: number
  notes: number
  selected: boolean
  categoryId: string
  blLeaderboardId: string | null
  ssLeaderboardId: number | null
  importing: boolean
  importedId: string | null
  existingId: string | null
  error: string
}

const input = ref('')
const fetchError = ref('')
const fetching = ref(false)
const bsMap = ref<BeatSaverMapResponse | null>(null)
const blCoverUrl = ref<string | null>(null)
const diffs = ref<DiffSelection[]>([])

const coverUrl = computed(() => blCoverUrl.value ?? bsMap.value?.versions[0]?.coverURL ?? '')

const categoryTabs = computed<Tab[]>(() =>
  categoryStore.categories
    .filter((c) => c.code !== 'overall')
    .map((c) => ({ key: c.id, label: categoryStore.getShortName(c.code), accentColor: categoryStore.getAccent(c.code) })),
)

const pending = computed(() => diffs.value.filter((d) => d.selected && !d.importedId))
const importing = computed(() => diffs.value.some((d) => d.importing))
const anyImported = computed(() => diffs.value.some((d) => d.importedId))

let fetchId = 0

async function fetchMap() {
  const code = parseBeatSaverCode(input.value)
  if (!code) {
    fetchError.value = 'Not a BeatSaver code or URL'
    return
  }
  const id = ++fetchId
  fetching.value = true
  fetchError.value = ''
  bsMap.value = null
  blCoverUrl.value = null
  diffs.value = []
  try {
    const map = await fetchBeatSaverMap(code)
    const version = map.versions[0]
    const hash = version?.hash ?? ''
    const [bl, ss] = await Promise.all([fetchBeatLeaderMapInfo(hash), fetchScoreSaberLeaderboards(hash)])
    if (id !== fetchId) return
    bsMap.value = map
    blCoverUrl.value = bl.coverUrl
    diffs.value = (version?.diffs ?? []).map((d) => {
      const key = `${d.difficulty}-${d.characteristic}`
      return {
        key,
        characteristic: d.characteristic,
        difficulty: difficultyToEnum(d.difficulty) as Difficulty,
        njs: d.njs,
        notes: d.notes,
        selected: false,
        categoryId: categoryTabs.value[0]?.key ?? '',
        blLeaderboardId: bl.leaderboards.get(key) ?? null,
        ssLeaderboardId: ss.get(key) ?? null,
        importing: false,
        importedId: null,
        existingId: null,
        error: '',
      }
    })
  } catch {
    if (id === fetchId) fetchError.value = 'Map not found'
  } finally {
    if (id === fetchId) fetching.value = false
  }
}

async function importOne(diff: DiffSelection) {
  diff.importing = true
  diff.error = ''
  try {
    const [{ importMap }, { castVote }] = await Promise.all([import('@/api/ranking/maps'), import('@/api/ranking/voting')])
    const result = await importMap({
      blLeaderboardId: diff.blLeaderboardId!,
      ssLeaderboardId: diff.ssLeaderboardId != null ? String(diff.ssLeaderboardId) : undefined,
      categoryId: diff.categoryId,
      difficulty: diff.difficulty,
      characteristic: diff.characteristic,
    })
    diff.importedId = result.id
    await castVote(result.id, { vote: 'UPVOTE', type: 'RANK' }).catch(() => undefined)
  } catch (err) {
    const parsed = parseApiError(err, 'Import failed')
    if (parsed.code === 'CONFLICT') {
      diff.existingId = parsed.message.match(EXISTING_ID)?.[1] ?? null
      diff.selected = false
      diff.error = 'Already imported'
    } else {
      diff.error = parsed.message
    }
  } finally {
    diff.importing = false
  }
}

async function importSelected() {
  for (const diff of pending.value) await importOne(diff)
}
</script>

<template>
  <div class="map-import">
    <h1>Import Map</h1>

    <form class="map-import__lookup" @submit.prevent="fetchMap">
      <BaseInput
        v-model="input"
        label="BeatSaver Code or URL"
        placeholder="4fdd2"
        :disabled="fetching"
      />
      <BaseButton variant="primary" :loading="fetching" :disabled="!input.trim()" @click="fetchMap">Fetch</BaseButton>
      <p class="caption map-import__error map-import__lookup-error" role="alert">{{ fetchError }}</p>
    </form>

    <section v-if="fetching || bsMap" class="map-import__map" :aria-busy="fetching">
      <div class="map-import__hero">
        <SkeletonLoader v-if="!bsMap" class="placeholder" width="120px" height="120px" />
        <CoverImage v-else :src="coverUrl" :alt="bsMap.metadata.songName" :size="120" />
        <div class="map-import__identity">
          <template v-if="bsMap">
            <h2 class="map-import__song">
              <SongTitle layout="stacked" :name="bsMap.metadata.songName" :sub-name="bsMap.metadata.songSubName" />
            </h2>
            <p class="map-import__credits">{{ bsMap.metadata.songAuthorName }} · {{ bsMap.metadata.levelAuthorName }}</p>
            <p class="caption">{{ formatChartNumber(bsMap.metadata.bpm) }} BPM · {{ formatChartDuration(bsMap.metadata.duration) }}</p>
          </template>
          <SkeletonLoader v-else class="placeholder" variant="text" :lines="3" width="240px" />
        </div>
      </div>

      <ul class="map-import__diffs">
        <template v-if="!bsMap">
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
            :disabled="importing || !diff.blLeaderboardId"
            :aria-label="`Import ${diff.difficulty}`"
          />
          <span class="map-import__diff-name">
            <DifficultyBadge :difficulty="diff.difficulty" />
            <span v-if="diff.characteristic !== 'Standard'" class="caption">{{ diff.characteristic }}</span>
          </span>
          <span class="caption map-import__diff-meta">NJS {{ diff.njs }} · {{ diff.notes }} notes</span>
          <span class="map-import__diff-end">
            <span v-if="diff.error && !diff.existingId" class="caption map-import__error" role="alert">{{ diff.error }}</span>
            <span v-else-if="!diff.blLeaderboardId" class="caption map-import__error">Not on BeatLeader</span>
            <template v-else-if="diff.importedId || diff.existingId">
              <span class="caption" role="status">{{ diff.importedId ? 'Imported' : diff.error }}</span>
              <BaseButton
                size="sm"
                :href="$router.resolve({ name: 'ranking-map-detail', params: { difficultyId: (diff.importedId ?? diff.existingId)! } }).href"
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
        </li>
      </ul>

      <div class="map-import__actions">
        <BaseButton v-if="anyImported && !pending.length" :href="$router.resolve({ name: rankingDashboardRoute }).href">
          Back to Queue
        </BaseButton>
        <BaseButton v-else variant="primary" :loading="importing" :disabled="!pending.length" @click="importSelected">
          {{ pending.length > 1 ? `Import ${pending.length} Difficulties` : 'Import' }}
        </BaseButton>
      </div>
    </section>
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
  align-items: center;
  gap: var(--space-md);
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
    flex-wrap: wrap;
    gap: 0 var(--space-md);
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
