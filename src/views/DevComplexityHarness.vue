<script setup lang="ts">
import BaseBanner from '@/components/common/BaseBanner.vue'
import BaseTabs from '@/components/common/BaseTabs.vue'
import ChartToggleGroup from '@/components/common/ChartToggleGroup.vue'
import type {
  ComplexityDifficultyRow,
  ComplexityMapLeaderboard,
  ComplexityPlayerBoard,
  EstimateScenario,
} from '@/types/api/complexity'
import { ESTIMATE_SCENARIOS, SCENARIO_LABELS } from '@/utils/complexity'
import ComplexityMapModal from '@/views/staff/ranking/complexity/ComplexityMapModal.vue'
import ComplexityMapsTable from '@/views/staff/ranking/complexity/ComplexityMapsTable.vue'
import ComplexityPlayersTable from '@/views/staff/ranking/complexity/ComplexityPlayersTable.vue'
import LadderStrip from '@/views/staff/ranking/complexity/LadderStrip.vue'
import { ref } from 'vue'

const scenario = ref<EstimateScenario>('NEW_SCRIPT')
const showModal = ref(false)

const scenarioToggles = ESTIMATE_SCENARIOS.map((key) => ({
  key,
  label: SCENARIO_LABELS[key],
  color: 'var(--page-accent, var(--accent))',
}))

const SONGS = [
  ['Overkill', 'RIOT', 'Nolan1279', 'tech_acc', 12.05, 12.4, 9.1, 385],
  ['Reality Check Through The Skull', 'Nightmargin', 'Bloodcloak', 'true_acc', 8.4, 8.6, 7.95, 1204],
  ['Ghost', 'Camellia', 'Joetastic', 'standard_acc', 6.2, 6.1, 8.35, 92],
  ['Beat Saber', 'Jaroslav Beck', 'Freeek', 'true_acc', 3.1, 3.2, 2.85, 5402],
  ['Blood Rave', 'Chuckya', 'Skyler', 'tech_acc', 11.2, 11.0, 11.15, 47],
  ['Escape', 'Cash Cash', 'Rocker1904', 'standard_acc', 9.75, 10.2, 6.4, 812],
]

function makeRow(index: number): ComplexityDifficultyRow {
  const [songName, songAuthor, mapAuthor, categoryCode, current, old, next, scores] = SONGS[index % SONGS.length] as [string, string, string, string, number, number, number, number]
  const withEstimate = index % 5 !== 4
  return {
    mapDifficultyId: `diff-${index}`,
    mapId: `map-${index}`,
    songName,
    songSubName: index % 3 === 0 ? 'Extended Mix' : null,
    songAuthor,
    mapAuthor,
    coverUrl: '',
    cdnCoverUrl: '',
    difficulty: index % 4 === 0 ? 'EXPERT' : 'EXPERT_PLUS',
    characteristic: 'Standard',
    categoryId: `cat-${categoryCode}`,
    categoryCode,
    status: index % 7 === 6 ? 'QUALIFIED' : 'RANKED',
    scores,
    scenarios: {
      CURRENT: { complexity: current, topAp: 1115.9, averageAp: 618.1, averageWeightedAp: 240.3 },
      OLD_SCRIPT: { complexity: old, topAp: 1131.2, averageAp: 626, averageWeightedAp: 244.1 },
      NEW_SCRIPT: withEstimate
        ? { complexity: next, topAp: 987.4, averageAp: 552.7, averageWeightedAp: 201.9 }
        : { complexity: null, topAp: null, averageAp: null, averageWeightedAp: null },
    },
    deltas: {
      OLD_SCRIPT: { complexity: old - current, topAp: 15.3, averageAp: 7.9, averageWeightedAp: 3.8 },
      NEW_SCRIPT: withEstimate
        ? { complexity: next - current, topAp: -128.5, averageAp: -65.4, averageWeightedAp: -38.4 }
        : { complexity: null, topAp: null, averageAp: null, averageWeightedAp: null },
    },
    estimates: {
      OLD_SCRIPT: {
        version: 'ai-acc-curve',
        updatedAt: '2026-09-08T12:00:00Z',
        inputs: {
          aiAccuracy: 0.9856,
          shiftedAccuracy: 0.9876,
          rawMultiplier: 0.61,
          transformedMultiplier: 0.64,
          apTarget: 985,
        },
      },
      NEW_SCRIPT: withEstimate
        ? {
          version: 'note-acc-2026-09',
          updatedAt: '2026-09-10T12:00:00Z',
          inputs: {
            model: 'note-acc-beatleader',
            modelHash: index % 6 === 5 ? '9911bbccdd001122' : '3c274428ee3881d6',
            mapVersion: '3',
            notes: 518,
            predictedNotes: 512,
            meanNoteAccuracy: 0.8794,
            worstNoteAccuracy: 0.71,
            worstShare: 0.05,
            meanTerm: 0.9186,
            worstTerm: 0.5376,
            intercept: 26.088,
            meanSlope: -18.052,
            worstSlope: 0,
          },
        }
        : undefined,
    },
  }
}

const rows = Array.from({ length: 24 }, (_, index) => makeRow(index))

const positions = new Map(
  rows.map((row, index) => [row.mapDifficultyId, { now: index + 1, next: 24 - index }]),
)

const board: ComplexityPlayerBoard = {
  categoryId: null,
  categoryCode: 'overall',
  ladders: {
    CURRENT: {
      players: 1240,
      totalAp: 812345.6,
      playersWith900: 234,
      playersWith1000: 80,
      playersWith1100: 4,
      playsWith1000: 1204,
      playsWith1100: 33,
      topPlayAp: 1124,
    },
    OLD_SCRIPT: {
      players: 1240,
      totalAp: 829110.2,
      playersWith900: 251,
      playersWith1000: 88,
      playersWith1100: 6,
      playsWith1000: 1288,
      playsWith1100: 41,
      topPlayAp: 1139.4,
    },
    NEW_SCRIPT: {
      players: 1240,
      totalAp: 702884.1,
      playersWith900: 168,
      playersWith1000: 41,
      playersWith1100: 1,
      playsWith1000: 702,
      playsWith1100: 9,
      topPlayAp: 1041.7,
    },
  },
  rows: Array.from({ length: 12 }, (_, index) => ({
    userId: `7656119986665585${index}`,
    name: ['Tiku', 'Nolan1279', 'Vaporeon', 'Lightblade', 'Chidzo', 'MoreOn'][index % 6],
    avatarUrl: '',
    cdnAvatarUrl: '',
    country: ['US', 'DE', 'JP', 'BR', 'FI', 'GB'][index % 6],
    scenarios: {
      CURRENT: { ap: 11469.7 - index * 412.5, rank: index + 1 },
      OLD_SCRIPT: { ap: 11702.3 - index * 402.1, rank: index + 1 },
      NEW_SCRIPT: { ap: 10412.3 - index * 455.2, rank: index === 3 ? 1 : index + 1 },
    },
    deltas: {
      OLD_SCRIPT: { ap: 232.6, rank: 0 },
      NEW_SCRIPT: { ap: -1057.4 + index * 42.7, rank: index === 3 ? -3 : (index % 3) - 1 },
    },
  })),
}

const leaderboard: ComplexityMapLeaderboard = {
  difficulty: rows[0],
  rows: Array.from({ length: 10 }, (_, index) => ({
    userId: `7656119986665585${index}`,
    name: ['Tiku', 'Nolan1279', 'Vaporeon', 'Lightblade', 'Chidzo', 'MoreOn'][index % 6],
    avatarUrl: '',
    cdnAvatarUrl: '',
    country: ['US', 'DE', 'JP', 'BR', 'FI', 'GB'][index % 6],
    accuracy: 0.99106 - index * 0.0031,
    scenarios: {
      CURRENT: { ap: 1115.9 - index * 22.4, weightedAp: 976.4 - index * 20.1, rank: index + 1 },
      OLD_SCRIPT: { ap: 1131.2 - index * 22.9, weightedAp: 989.8 - index * 20.5, rank: index + 1 },
      NEW_SCRIPT: { ap: 987.4 - index * 19.8, weightedAp: 863.1 - index * 17.8, rank: index + 1 },
    },
    deltas: {
      OLD_SCRIPT: { ap: 15.3, weightedAp: 13.4, rank: 0 },
      NEW_SCRIPT: { ap: -128.5 + index * 2.6, weightedAp: -113.3, rank: index === 2 ? 2 : 0 },
    },
  })),
}

const params = new URLSearchParams(location.search)
const tab = ref(params.get('view') ?? 'maps')
if (params.get('modal') === '1') showModal.value = true
if (params.get('theme') === 'light') document.documentElement.dataset.theme = 'light'
const overflow = ref('')
if (params.get('debug') === '1') {
  setTimeout(() => {
    const found: string[] = []
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('*'))) {
      if (el.scrollWidth > window.innerWidth + 1 && el.getBoundingClientRect().width > window.innerWidth + 1) {
        found.push(`${el.tagName}.${el.className}`.slice(0, 90) + ' w=' + Math.round(el.getBoundingClientRect().width))
      }
    }
    overflow.value = found.slice(0, 14).join(' | ')
  }, 500)
}
const tabs = [
  { key: 'maps', label: 'Maps' },
  { key: 'worth', label: 'Most worth' },
  { key: 'players', label: 'Players' },
]
</script>

<template>
  <div class="dev-harness">
    <h1 class="dev-harness__title">Reweight Maps</h1>
    <pre v-if="overflow" style="color:#ff6b6b;font-size:10px;white-space:pre-wrap">{{ overflow }}</pre>
    <p class="dev-harness__subtitle">24 difficulties priced under three scenarios, estimated 2h ago</p>

    <BaseTabs :tabs="tabs" :model-value="tab" @update:model-value="tab = $event" />

    <div class="dev-harness__controls">
      <ChartToggleGroup :toggles="scenarioToggles" :active="[scenario]" label="Scenario"
        @select="scenario = $event as EstimateScenario" />
    </div>

    <BaseBanner variant="warning" :dismissible="false">
      New script has no estimate on 5 of 24 difficulties. Run the refresh complexity estimates job in
      the admin jobs panel. 4 difficulties still carry an estimate from an older model.
    </BaseBanner>

    <LadderStrip :ladders="board.ladders" :scenario="scenario" />

    <ComplexityMapsTable v-if="tab === 'maps'" :rows="rows" :scenario="scenario"
      @select="showModal = true" />
    <ComplexityMapsTable v-else-if="tab === 'worth'" board :rows="rows" :positions="positions"
      :scenario="scenario" @select="showModal = true" />
    <ComplexityPlayersTable v-else :rows="board.rows" :scenario="scenario" />

    <ComplexityMapModal :open="showModal" :row="rows[0]" :leaderboard="leaderboard"
      :scenario="scenario" model-hash="3c274428ee3881d6" @close="showModal = false" />
  </div>
</template>

<style scoped>
.dev-harness {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  width: 100%;
  max-width: var(--page-width-wide);
  margin: 0 auto;
}

.dev-harness :deep(.banner) {
  margin-inline: 0 auto;
}

.dev-harness__title {
  margin: 0;
  color: var(--text-primary);
  font-size: var(--text-page-title);
  font-weight: 700;
}

.dev-harness__subtitle {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.dev-harness__controls {
  display: flex;
  gap: var(--space-md);
}
</style>
