<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import ApTweaker from '@/components/domain/ApTweaker.vue'
import type { MapDifficultyResponse } from '@/types/api/maps'
import { computed, ref } from 'vue'

const props = defineProps<{
  difficulty: MapDifficultyResponse
  scoreCurveId: string | null
}>()

const tweakerOpen = ref(false)
const tweakerAnchor = ref<HTMLElement | null>(null)

const beatleaderUrl = computed(() =>
  props.difficulty.blLeaderboardId
    ? `https://www.beatleader.com/leaderboard/global/${props.difficulty.blLeaderboardId}`
    : null,
)

const scoresaberUrl = computed(() =>
  props.difficulty.ssLeaderboardId ? `https://scoresaber.com/leaderboard/${props.difficulty.ssLeaderboardId}` : null,
)

function toggleTweaker(event: Event) {
  tweakerOpen.value = !tweakerOpen.value
  tweakerAnchor.value = tweakerOpen.value ? (event.currentTarget as HTMLElement) : null
}

function onTweakerOpen(open: boolean) {
  tweakerOpen.value = open
  if (!open) tweakerAnchor.value = null
}
</script>

<template>
  <div class="links">
    <template v-if="difficulty.beatsaverCode">
      <BaseButton size="sm" :href="`beatsaver://${difficulty.beatsaverCode}`" aria-label="One-Click Install"
        title="One-Click Install">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 13V4.5a1.5 1.5 0 0 1 3 0V12" />
          <path d="M11 11.5V6.5a1.5 1.5 0 0 1 3 0V12" />
          <path d="M14 10.5V8.5a1.5 1.5 0 0 1 3 0V13a6 6 0 0 1-6 6H9a6 6 0 0 1-6-6v-2a1.5 1.5 0 0 1 3 0V12" />
        </svg>
      </BaseButton>
      <BaseButton size="sm" :href="`https://beatsaver.com/maps/${difficulty.beatsaverCode}`"
        aria-label="View on BeatSaver">
        <img src="https://beatsaver.com/static/favicon/favicon-32x32.png" alt="BeatSaver" width="16" height="16"
          class="links__favicon" decoding="async" />
      </BaseButton>
    </template>
    <BaseButton v-if="beatleaderUrl" size="sm" :href="beatleaderUrl" aria-label="View on BeatLeader">
      <img src="https://beatleader.com/assets/favicon-32x32.png" alt="BeatLeader" width="16" height="16"
        class="links__favicon" decoding="async" />
    </BaseButton>
    <BaseButton v-if="scoresaberUrl" size="sm" :href="scoresaberUrl" aria-label="View on ScoreSaber">
      <img src="https://scoresaber.com/favicon-32x32.png" alt="ScoreSaber" width="16" height="16"
        class="links__favicon" decoding="async" />
    </BaseButton>
    <template v-if="scoreCurveId && difficulty.complexity != null">
      <BaseButton size="sm" aria-label="AP Tweaker" @click="toggleTweaker($event)">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
          <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" stroke="currentColor" stroke-width="1.5"
            stroke-linecap="round" stroke-linejoin="round" />
          <path
            d="M16.2 12.5a1.4 1.4 0 00.28 1.54l.05.05a1.7 1.7 0 11-2.4 2.4l-.05-.05a1.4 1.4 0 00-1.54-.28 1.4 1.4 0 00-.84 1.28v.14a1.7 1.7 0 11-3.4 0v-.07a1.4 1.4 0 00-.92-1.28 1.4 1.4 0 00-1.54.28l-.05.05a1.7 1.7 0 11-2.4-2.4l.05-.05a1.4 1.4 0 00.28-1.54 1.4 1.4 0 00-1.28-.84H2.3a1.7 1.7 0 110-3.4h.07a1.4 1.4 0 001.28-.92 1.4 1.4 0 00-.28-1.54l-.05-.05a1.7 1.7 0 112.4-2.4l.05.05a1.4 1.4 0 001.54.28h.07a1.4 1.4 0 00.84-1.28V2.3a1.7 1.7 0 113.4 0v.07a1.4 1.4 0 00.84 1.28 1.4 1.4 0 001.54-.28l.05-.05a1.7 1.7 0 112.4 2.4l-.05.05a1.4 1.4 0 00-.28 1.54v.07a1.4 1.4 0 001.28.84h.14a1.7 1.7 0 110 3.4h-.07a1.4 1.4 0 00-1.28.84z"
            stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </BaseButton>
      <ApTweaker :open="tweakerOpen" :curve-id="scoreCurveId" :anchor-el="tweakerAnchor"
        :complexity="difficulty.complexity" :show-weighted="false" @update:open="onTweakerOpen" />
    </template>
  </div>
</template>

<style scoped>
.links {
  display: flex;
  gap: var(--space-sm);
  margin-top: var(--space-sm);
}

.links__favicon {
  border-radius: var(--radius-btn);
}
</style>
