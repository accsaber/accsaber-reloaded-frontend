<script setup lang="ts">
import type {
  ComplexityDifficultyRow,
  ComplexityPlayerPlays,
  ComplexityRaterSpec,
  ComplexityScenario,
} from '@/types/api/complexity'
import PlayerPlaysModal from '@/views/staff/ranking/complexity/PlayerPlaysModal.vue'
import RaterForm from '@/views/staff/ranking/complexity/RaterForm.vue'
import { useTuningState } from '@/views/staff/ranking/complexity/tuning'
import { ref } from 'vue'

const params = new URLSearchParams(location.search)
if (params.get('theme') === 'light') document.documentElement.dataset.theme = 'light'

const rater: ComplexityRaterSpec = {
  worstShare: 0.05,
  board: {
    minScores: 100,
    fullScores: 200,
    topPlayers: 100,
    minPlayers: 10,
    minPlayerPlays: 20,
    maxNudge: 1,
  },
  categories: {
    true_acc: {
      intercept: 14.889,
      meanSlope: -10.086,
      worstSlope: -2.731,
      resetSlope: -1.414,
      dotSlope: -2.814,
      notesSlope: 0.823,
      njsSlope: 0,
      boardSlope: 0,
    },
    standard_acc: {
      intercept: 34.442,
      meanSlope: -21.638,
      worstSlope: -1.176,
      resetSlope: 0,
      dotSlope: 0,
      notesSlope: 0,
      njsSlope: -0.189,
      boardSlope: 0,
    },
    tech_acc: {
      intercept: 33.24,
      meanSlope: -23.591,
      worstSlope: 0,
      resetSlope: 0,
      dotSlope: 0,
      notesSlope: 0,
      njsSlope: 0,
      boardSlope: 0,
    },
  },
  boardCategories: {
    true_acc: {
      intercept: 4.809,
      meanSlope: -2.273,
      worstSlope: -0.531,
      resetSlope: -1.356,
      dotSlope: -0.244,
      notesSlope: 0.457,
      njsSlope: 0,
      boardSlope: -8.368,
    },
    tech_acc: {
      intercept: 23.84,
      meanSlope: -14.324,
      worstSlope: 0.566,
      resetSlope: 0,
      dotSlope: 0,
      notesSlope: 0,
      njsSlope: 0,
      boardSlope: -8.516,
    },
  },
}

useTuningState().adopt(rater, [0.01, 0.02, 0.05, 0.1, 0.25], 'note-acc-2026-09-10')

function difficulty(index: number): ComplexityDifficultyRow {
  const songs = [
    ['Sharks', 'Imagine Dragons', 'Rashed', 'true_acc'],
    ['Favorite Part', 'Friday Pilots Club', 'Nolan1279', 'true_acc'],
    ['SUN GOES DOWN', 'Lil Nas X', 'Joetastic', 'standard_acc'],
    ['Easy Breezy', 'chelmico', 'Bloodcloak', 'tech_acc'],
  ]
  const [songName, songAuthor, mapAuthor, categoryCode] = songs[index % songs.length] as string[]
  return {
    mapDifficultyId: `diff-${index}`,
    mapId: `map-${index}`,
    songName,
    songSubName: null,
    songAuthor,
    mapAuthor,
    coverUrl: '',
    cdnCoverUrl: '',
    difficulty: 'EASY',
    characteristic: 'Standard',
    categoryId: `cat-${categoryCode}`,
    categoryCode,
    status: 'RANKED',
    scores: 400,
    scenarios: {},
    deltas: {},
    estimates: {},
  }
}

const columns: ComplexityScenario[] = ['CURRENT', 'NEW_SCRIPT']

function play(index: number) {
  return {
    difficulty: difficulty(index),
    accuracy: 0.9928 - index * 0.001,
    scenarios: {
      CURRENT: { ap: 878.6 - index * 20, weightedAp: 717.7, position: index + 1, rank: 44 },
      NEW_SCRIPT: { ap: 895.4 - index * 18, weightedAp: 895.4, position: index + 1, rank: 40 },
    },
    deltas: {
      NEW_SCRIPT: { ap: 16.8, weightedAp: 177.7, position: -6, rank: -4 },
    },
  }
}

const player: ComplexityPlayerPlays = {
  userId: '76561199866655859',
  name: 'roadnottaken2718',
  avatarUrl: '',
  cdnAvatarUrl: '',
  country: 'US',
  categories: [
    {
      categoryId: 'cat-true',
      categoryCode: 'true_acc',
      scenarios: { CURRENT: { ap: 9069, rank: 118 }, NEW_SCRIPT: { ap: 8973.4, rank: 121 } },
      deltas: { NEW_SCRIPT: { ap: -95.6, rank: 3 } },
      plays: [play(0), play(1)],
    },
    {
      categoryId: 'cat-standard',
      categoryCode: 'standard_acc',
      scenarios: { CURRENT: { ap: 8826, rank: 328 }, NEW_SCRIPT: { ap: 8976.8, rank: 309 } },
      deltas: { NEW_SCRIPT: { ap: 150.8, rank: -19 } },
      plays: [play(2)],
    },
    {
      categoryId: 'cat-tech',
      categoryCode: 'tech_acc',
      scenarios: { CURRENT: { ap: 9065, rank: 227 }, NEW_SCRIPT: { ap: 9017.6, rank: 282 } },
      deltas: { NEW_SCRIPT: { ap: -47.4, rank: 55 } },
      plays: [play(3)],
    },
  ],
}

const limit = ref(10)
const playsOpen = ref(params.get('plays') === '1')
</script>

<template>
  <div class="dev-tune">
    <RaterForm @change="() => {}" />

    <PlayerPlaysModal :open="playsOpen" :player="player" scenario="NEW_SCRIPT" :columns="columns"
      :limit="limit" @close="playsOpen = false" @update:limit="limit = $event" />
  </div>
</template>

<style scoped>
.dev-tune {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
  min-width: 0;
  width: 100%;
  max-width: 1760px;
  margin: 0 auto;
}
</style>
