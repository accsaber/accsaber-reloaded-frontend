<script setup lang="ts">
import HintTooltip from '@/components/common/HintTooltip.vue'
import ProgressBar from '@/components/common/ProgressBar.vue'
import MissionRewards from '@/components/domain/MissionRewards.vue'
import { useCategoryStore } from '@/stores/categories'
import type { MissionResponse } from '@/types/api/missions'
import { buildMapRoute } from '@/utils/mapRoute'
import { BAND_LABEL, missionProgressLabel, normalizeDifficulties } from '@/utils/missions'
import { computed } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

type Segment =
  | { kind: 'text'; text: string }
  | { kind: 'link'; text: string; to: RouteLocationRaw }
  | { kind: 'hint'; text: string; tip: string }

const props = defineProps<{
  mission: MissionResponse
}>()

const emit = defineEmits<{
  navigate: []
}>()

const categoryStore = useCategoryStore()

const isCompleted = computed(() => props.mission.status === 'completed')

const categoryInfo = computed(() =>
  props.mission.categoryCode ? categoryStore.getCategoryInfo(props.mission.categoryCode) : undefined,
)

const categoryName = computed(() => categoryInfo.value?.name ?? props.mission.categoryCode ?? '')
const categoryColor = computed(() => categoryInfo.value?.accent ?? 'var(--accent)')

const progress = computed(() => props.mission.progressValue ?? 0)

const target = computed(() => props.mission.targetValue ?? 0)

const hasBar = computed(() => target.value > 0)

const counterLabel = computed(() =>
  missionProgressLabel(props.mission.type, progress.value, target.value),
)

function inlineHint(segments: Segment[]): Segment[] {
  const m = props.mission
  const acc = m.targetAcc != null ? `${m.targetAcc.toFixed(2)}%` : null
  const ap = m.targetAp != null ? m.targetAp.toLocaleString() : null
  const score = m.targetScore != null ? m.targetScore.toLocaleString() : null
  const forms = [acc && `${acc} accuracy`, ap && `${ap} AP`, score && `${score} score`].filter(Boolean)
  if (forms.length < 2) return segments
  const anchor = [acc, ap, score, 'score'].find((word) =>
    word && segments.some((seg) => seg.kind === 'text' && seg.text.includes(word)),
  )
  return anchor ? inline(segments, anchor, (text) => ({ kind: 'hint', text, tip: forms.join(', ') })) : segments
}

function inlineLink(
  segments: Segment[],
  name: string | null | undefined,
  to: RouteLocationRaw | null,
): Segment[] {
  if (!name || !to) return segments
  return inline(segments, name, (text) => ({ kind: 'link', text, to }))
}

function inline(segments: Segment[], name: string, build: (text: string) => Segment): Segment[] {
  const out: Segment[] = []
  let replaced = false
  for (const seg of segments) {
    if (replaced || seg.kind !== 'text') {
      out.push(seg)
      continue
    }
    const idx = seg.text.indexOf(name)
    if (idx === -1) {
      out.push(seg)
      continue
    }
    if (idx > 0) out.push({ kind: 'text', text: seg.text.slice(0, idx) })
    out.push(build(name))
    const tail = seg.text.slice(idx + name.length)
    if (tail) out.push({ kind: 'text', text: tail })
    replaced = true
  }
  return out
}

const segments = computed<Segment[]>(() => {
  const m = props.mission
  let out: Segment[] = [{ kind: 'text', text: normalizeDifficulties(m.description) }]
  out = inlineLink(
    out,
    m.targetPlayerName,
    m.targetPlayerId ? { name: 'player-profile', params: { userId: m.targetPlayerId } } : null,
  )
  const map = m.targetMap
  const mapTo: RouteLocationRaw | null = map?.mapId
    ? buildMapRoute({
      beatsaverCode: map.beatsaverCode,
      mapId: map.mapId,
      difficulty: map.difficulty,
      difficultyId: map.id,
      characteristic: map.characteristic,
    })
    : null
  out = inlineLink(out, map?.songName, mapTo)
  return inlineHint(out)
})

function handleLinkClick() {
  emit('navigate')
}
</script>

<template>
  <article class="mission-row" :class="{ 'mission-row--done': isCompleted }">
    <h3 class="mission-row__title">
      <span class="mission-row__name">{{ mission.name }}</span>
      <span v-if="categoryName" class="mission-row__cat" :style="{ color: categoryColor }">
        {{ categoryName }}
      </span>
    </h3>
    <div class="mission-row__side">
      <MissionRewards :xp-reward="mission.xpReward" :item-reward="mission.itemReward" :size="28" />
      <span v-if="mission.band" class="caption">{{ BAND_LABEL[mission.band] }}</span>
    </div>

    <p class="caption mission-row__text">
      <template v-for="(seg, i) in segments" :key="i">
        <router-link
          v-if="seg.kind === 'link'"
          :to="seg.to"
          class="mission-row__link"
          @click="handleLinkClick"
        >{{ seg.text }}</router-link>
        <HintTooltip v-else-if="seg.kind === 'hint'" variant="inline" :text="seg.tip">
          <template #trigger>{{ seg.text }}</template>
        </HintTooltip>
        <template v-else>{{ seg.text }}</template>
      </template>
    </p>

    <span v-if="isCompleted" class="mission-row__done">Completed</span>
    <div v-else-if="hasBar" class="mission-row__status">
      <ProgressBar :value="progress / target" />
      <span class="mission-row__counter">{{ counterLabel }}</span>
    </div>
  </article>
</template>

<style scoped>
.mission-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 6px var(--space-md);
  padding: var(--space-sm) var(--space-md);
}

.mission-row__side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  grid-row: span 2;
}

.mission-row__text {
  grid-column: 1;
}

.mission-row__status,
.mission-row__done {
  grid-column: 1 / -1;
}

.mission-row--done .mission-row__name {
  color: var(--text-secondary);
}

.mission-row__title {
  margin: 0;
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
  font-family: var(--font-sans);
  font-size: var(--text-body);
  font-weight: 600;
  line-height: 1.3;
  color: var(--text-primary);
}

.mission-row__cat {
  font-size: var(--text-caption);
  flex-shrink: 0;
}

.mission-row__name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.mission-row__link {
  color: var(--text-primary);
  font-weight: 500;
  text-decoration: none;
  border-bottom: 1px solid color-mix(in srgb, var(--accent) 50%, transparent);
  transition: color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out);
}

.mission-row__link:hover {
  color: var(--accent);
  border-bottom-color: var(--accent);
}

.mission-row__status {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  --bar-height: 4px;
  --bar-color: var(--accent);
}

.mission-row__counter {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-secondary);
  white-space: nowrap;
}

.mission-row__done {
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--success);
}
</style>
