<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import ApTweaker from '@/components/domain/ApTweaker.vue'
import MapChartStats from '@/components/domain/MapChartStats.vue'
import SongTitle from '@/components/domain/SongTitle.vue'
import type { MapChartStatsSource } from '@/types/api/maps'
import { onImageError } from '@/utils/media'
import { computed, onUnmounted, ref } from 'vue'

interface HeroSong {
  songName: string
  songSubName?: string | null
  songAuthor: string
  mapAuthor: string
  beatsaverCode?: string | null
}

const props = defineProps<{
  song: HeroSong | null
  coverUrl: string
  coverFallback?: string | null
  blLeaderboardId?: string | null
  ssLeaderboardId?: string | null
  curveId?: string | null
  tweakerComplexity?: number | null
  chart?: MapChartStatsSource | null
}>()

const COPIED_MS = 1400

const onCoverError = computed(() => onImageError(props.coverFallback ?? ''))
const tweakable = computed(() => !!props.curveId && props.tweakerComplexity != null)

const tweakerOpen = ref(false)
const tweakerAnchor = ref<HTMLElement | null>(null)

function toggleTweaker(event: Event) {
  tweakerOpen.value = !tweakerOpen.value
  tweakerAnchor.value = tweakerOpen.value ? (event.currentTarget as HTMLElement) : null
}

function onTweakerOpen(open: boolean) {
  tweakerOpen.value = open
  if (!open) tweakerAnchor.value = null
}

const bsrCopied = ref(false)
let bsrCopiedTimer: ReturnType<typeof setTimeout> | undefined

async function copyBsr() {
  if (!props.song?.beatsaverCode) return
  try {
    await navigator.clipboard.writeText(`!bsr ${props.song.beatsaverCode}`)
  } catch {
    return
  }
  bsrCopied.value = true
  clearTimeout(bsrCopiedTimer)
  bsrCopiedTimer = setTimeout(() => { bsrCopied.value = false }, COPIED_MS)
}

onUnmounted(() => clearTimeout(bsrCopiedTimer))
</script>

<template>
  <header class="map-hero">
    <div v-if="song" class="map-hero__bg" aria-hidden="true">
      <div class="map-hero__bg-image" :style="{ backgroundImage: `url(${coverUrl})` }" />
    </div>

    <div v-if="!song" class="map-hero__layout">
      <SkeletonLoader variant="avatar" width="200px" height="200px" />
      <div class="map-hero__name-col">
        <SkeletonLoader width="360px" height="50px" />
        <SkeletonLoader width="200px" height="28px" />
        <SkeletonLoader width="160px" height="20px" />
        <SkeletonLoader width="280px" height="40px" />
      </div>
    </div>

    <div v-else class="map-hero__layout">
      <img class="map-hero__cover" data-shared-target :src="coverUrl" :alt="song.songName" fetchpriority="high"
        decoding="async" @error="onCoverError" />

      <div class="map-hero__details">
        <div class="map-hero__name-col">
          <h1>
            <SongTitle layout="stacked" :name="song.songName" :sub-name="song.songSubName" />
          </h1>
          <p class="map-hero__artist">{{ song.songAuthor }}</p>
          <p class="map-hero__mapper">Mapped by <strong>{{ song.mapAuthor }}</strong></p>
          <div v-if="$slots.meta" class="map-hero__meta">
            <slot name="meta" />
          </div>
        </div>

        <div class="map-hero__side">
          <div class="map-hero__links">
            <template v-if="song.beatsaverCode">
              <BaseButton size="sm" :href="`beatsaver://${song.beatsaverCode}`" aria-label="One-Click Install"
                title="One-Click Install">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M8 13V4.5a1.5 1.5 0 0 1 3 0V12" />
                  <path d="M11 11.5V6.5a1.5 1.5 0 0 1 3 0V12" />
                  <path d="M14 10.5V8.5a1.5 1.5 0 0 1 3 0V13a6 6 0 0 1-6 6H9a6 6 0 0 1-6-6v-2a1.5 1.5 0 0 1 3 0V12" />
                </svg>
              </BaseButton>
              <BaseButton size="sm" :href="`https://beatsaver.com/maps/${song.beatsaverCode}`"
                aria-label="View on BeatSaver" title="BeatSaver">
                <img src="https://beatsaver.com/static/favicon/favicon-32x32.png" alt="" width="16" height="16"
                  class="map-hero__site-icon" decoding="async" />
              </BaseButton>
              <BaseButton size="sm" aria-label="Copy BSR" title="Copy BSR" @click="copyBsr">
                <span v-if="bsrCopied" class="map-hero__bsr-label">Copied!</span>
                <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <line x1="12" y1="5" x2="12" y2="14" />
                  <line x1="12" y1="18" x2="12" y2="19" />
                </svg>
              </BaseButton>
            </template>
            <BaseButton v-if="blLeaderboardId" size="sm"
              :href="`https://www.beatleader.com/leaderboard/global/${blLeaderboardId}`"
              aria-label="View on BeatLeader" title="BeatLeader">
              <img src="https://beatleader.com/assets/favicon-32x32.png" alt="" width="16" height="16"
                class="map-hero__site-icon" decoding="async" />
            </BaseButton>
            <BaseButton v-if="ssLeaderboardId" size="sm" :href="`https://scoresaber.com/leaderboard/${ssLeaderboardId}`"
              aria-label="View on ScoreSaber" title="ScoreSaber">
              <img src="https://scoresaber.com/favicon-32x32.png" alt="" width="16" height="16"
                class="map-hero__site-icon" decoding="async" />
            </BaseButton>
            <template v-if="tweakable">
              <BaseButton size="sm" aria-label="AP Tweaker" title="AP Tweaker" @click="toggleTweaker($event)">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" stroke="currentColor" stroke-width="1.5"
                    stroke-linecap="round" stroke-linejoin="round" />
                  <path
                    d="M16.2 12.5a1.4 1.4 0 00.28 1.54l.05.05a1.7 1.7 0 11-2.4 2.4l-.05-.05a1.4 1.4 0 00-1.54-.28 1.4 1.4 0 00-.84 1.28v.14a1.7 1.7 0 11-3.4 0v-.07a1.4 1.4 0 00-.92-1.28 1.4 1.4 0 00-1.54.28l-.05.05a1.7 1.7 0 11-2.4-2.4l.05-.05a1.4 1.4 0 00.28-1.54 1.4 1.4 0 00-1.28-.84H2.3a1.7 1.7 0 110-3.4h.07a1.4 1.4 0 001.28-.92 1.4 1.4 0 00-.28-1.54l-.05-.05a1.7 1.7 0 112.4-2.4l.05.05a1.4 1.4 0 001.54.28h.07a1.4 1.4 0 00.84-1.28V2.3a1.7 1.7 0 113.4 0v.07a1.4 1.4 0 00.84 1.28 1.4 1.4 0 001.54-.28l.05-.05a1.7 1.7 0 112.4 2.4l-.05.05a1.4 1.4 0 00-.28 1.54v.07a1.4 1.4 0 001.28.84h.14a1.7 1.7 0 110 3.4h-.07a1.4 1.4 0 00-1.28.84z"
                    stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </BaseButton>
              <ApTweaker :open="tweakerOpen" :curve-id="curveId!" :anchor-el="tweakerAnchor"
                :complexity="tweakerComplexity ?? undefined" :show-weighted="false" @update:open="onTweakerOpen" />
            </template>
          </div>

          <slot name="side" />

          <details v-if="chart" class="map-hero__chart">
            <summary>Map Stats</summary>
            <MapChartStats :source="chart" />
          </details>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.map-hero {
  width: 100%;
  max-width: var(--page-column, 1280px);
}

.map-hero__bg {
  position: absolute;
  top: calc(-1 * var(--space-xl));
  left: calc(-1 * var(--space-xl));
  right: calc(-1 * var(--space-xl));
  height: 75vh;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
  -webkit-mask-image: linear-gradient(to bottom, black 50%, transparent 100%);
  mask-image: linear-gradient(to bottom, black 50%, transparent 100%);
}

.map-hero__bg-image {
  position: absolute;
  inset: -80px;
  background-size: cover;
  background-position: center 20%;
  background-repeat: no-repeat;
  filter: blur(40px) brightness(0.55) saturate(1.5);
  opacity: 0.3;
}

.map-hero__layout {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--space-xl);
  padding: var(--space-xl) 0 var(--space-lg);
}

.map-hero__cover {
  width: 200px;
  height: 200px;
  border-radius: var(--radius-avatar);
  object-fit: cover;
}

.map-hero__details {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-lg) var(--space-xl);
  min-width: 0;
}

.map-hero__side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex: none;
  gap: var(--space-md);
  text-align: right;
}

.map-hero__name-col {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-xs);
  min-width: 0;
}

.map-hero__name-col h1 {
  font-size: calc(var(--text-page-title) * 1.5);
}

.map-hero__name-col :deep(.song-title__sub) {
  font-size: var(--text-section-heading);
  font-weight: 500;
  color: var(--text-secondary);
}

.map-hero__artist {
  font-size: var(--text-section-heading);
  color: var(--text-primary);
  margin: 0;
}

.map-hero__mapper {
  font-size: var(--text-body);
  color: var(--text-secondary);
  margin: 0;
}

.map-hero__mapper strong {
  color: var(--text-primary);
  font-weight: 500;
}

.map-hero__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm) var(--space-lg);
  margin-top: var(--space-sm);
  font-size: var(--text-card-title);
}

.map-hero__links {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
}

.map-hero__links :deep(.base-button) {
  padding: var(--space-sm);
}

.map-hero__links :deep(.base-button :is(svg, img)) {
  width: 18px;
  height: 18px;
}

.map-hero__site-icon {
  border-radius: var(--radius-btn);
}

.map-hero__bsr-label {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
}

.map-hero__chart {
  position: relative;
  align-self: stretch;
}

.map-hero__chart summary {
  width: fit-content;
  margin-left: auto;
  font-size: var(--text-body);
  color: var(--text-secondary);
  cursor: pointer;
}

.map-hero__chart summary:hover {
  color: var(--text-primary);
}

.map-hero__chart :deep(.chart-stats) {
  width: 0;
  min-width: 100%;
}

@media (min-width: 1280px) {
  .map-hero__chart {
    align-self: flex-end;
    margin-top: var(--space-sm);
  }

  .map-hero__chart :deep(.chart-stats) {
    position: absolute;
    right: calc(100% + var(--space-md));
    bottom: 0;
    width: 480px;
    min-width: 0;
    padding: 0;
  }
}

@media (max-width: 767px) {
  .map-hero__bg {
    top: calc(-1 * var(--space-md));
    left: calc(-1 * var(--space-md));
    right: calc(-1 * var(--space-md));
  }

  .map-hero__layout {
    grid-template-columns: 1fr;
    justify-items: center;
    gap: var(--space-md);
    text-align: center;
  }

  .map-hero__cover {
    width: 128px;
    height: 128px;
  }

  .map-hero__details,
  .map-hero__name-col,
  .map-hero__side {
    align-items: center;
    text-align: center;
  }

  .map-hero__details {
    flex-direction: column;
  }

  .map-hero__chart summary {
    margin-right: auto;
  }

  .map-hero__links,
  .map-hero__meta {
    justify-content: center;
  }
}
</style>
