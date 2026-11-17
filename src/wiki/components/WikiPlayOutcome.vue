<script setup lang="ts">
import BaseSwitch from '@/components/common/BaseSwitch.vue'
import '@/wiki/components/demo.css'
import { improvementXp, rawAp, XP_BASE_PER_SCORE } from '@/wiki/apCurve'
import { computed, ref } from 'vue'
import { formatAccuracy, formatFixed } from '@/utils/formatters'

const props = withDefaults(
  defineProps<{
    maxScore: number
    complexity: number
    pbScore: number
    initialScore: number
    minAccuracy?: number
  }>(),
  { minAccuracy: 0.9 },
)

const STEP = 250

const newScore = ref(props.initialScore)
const quitEarly = ref(false)

const sliderMin = computed(() => {
  const floor = props.maxScore * props.minAccuracy
  return props.pbScore - Math.ceil((props.pbScore - floor) / STEP) * STEP
})

const pbAccuracy = computed(() => props.pbScore / props.maxScore)
const newAccuracy = computed(() => newScore.value / props.maxScore)
const pbAp = computed(() => rawAp(pbAccuracy.value, props.complexity))
const newAp = computed(() => rawAp(newAccuracy.value, props.complexity))

const isBest = computed(() => !quitEarly.value && newScore.value > props.pbScore)

const xpPaid = computed(() =>
  isBest.value
    ? improvementXp(newAccuracy.value, pbAccuracy.value, props.complexity)
    : XP_BASE_PER_SCORE,
)

const state = computed(() => {
  if (quitEarly.value) return 'quit'
  return isBest.value ? 'best' : 'kept'
})

const verdict = computed(() => {
  if (quitEarly.value) return 'Quit early'
  return isBest.value ? 'New personal best' : 'Not a personal best'
})

const note = computed(() => {
  if (quitEarly.value)
    return "An unfinished play never becomes your best whatever it scored. It's saved in your history."
  if (isBest.value)
    return 'This play becomes your best on the map. The old one goes into your history and keeps its numbers.'
  if (newScore.value === props.pbScore)
    return 'An exact tie keeps the play you already had. Your best only changes when a play actually beats it.'
  return "Your best play stays the same and your AP doesn't change. This play is saved in your history."
})

const xpNote = computed(() => {
  if (isBest.value)
    return 'the flat 25 plus 1.5x the accuracy bonus you gained over your old play'
  if (quitEarly.value) return 'the flat 25 that any submitted play gives'
  return 'the flat 25 every completed play gives'
})

const formatScore = (v: number) => Math.round(v).toLocaleString('en-US')
</script>

<template>
  <figure class="wiki-demo">
    <div class="outcome__controls">
      <label class="wiki-demo__field outcome__slider">
        <span class="field-label">This Play, Score Before Modifiers</span>
        <input
          v-model.number="newScore"
          class="slider"
          type="range"
          :min="sliderMin"
          :max="maxScore"
          :step="STEP"
        />
      </label>
      <BaseSwitch v-model="quitEarly" label="I Quit Before the End" />
    </div>

    <div class="outcome__duel">
      <div class="wiki-demo__field outcome__side">
        <span class="field-label">Your Best So Far</span>
        <span class="wiki-demo__value">{{ formatScore(pbScore) }}</span>
        <span class="caption outcome__meta">
          {{ formatAccuracy(pbAccuracy) }} &middot; {{ formatFixed(pbAp, 1) }} AP
        </span>
      </div>
      <div class="wiki-demo__field outcome__side outcome__side--live">
        <span class="field-label">This Play</span>
        <span class="wiki-demo__value">{{ formatScore(newScore) }}</span>
        <span class="caption outcome__meta">
          {{ formatAccuracy(newAccuracy) }} &middot; {{ formatFixed(newAp, 1) }} AP
        </span>
      </div>
    </div>

    <p class="outcome__verdict" :data-state="state">
      <span class="outcome__badge">{{ verdict }}</span>
      <span class="caption outcome__note">{{ note }}</span>
    </p>

    <figcaption class="caption outcome__xp">
      You get XP either way: <strong>{{ xpPaid.toFixed(1) }}</strong>, {{ xpNote }}.
    </figcaption>
  </figure>
</template>

<style scoped>
.outcome__controls {
  display: flex;
  align-items: flex-end;
  gap: var(--space-xl);
  flex-wrap: wrap;
  margin-bottom: var(--space-lg);
}

.outcome__slider {
  flex: 1;
  min-width: 220px;
}

.outcome__duel {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-md);
}

.outcome__side {
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-btn);
  background: var(--bg-base);
}

.outcome__side--live .wiki-demo__value {
  color: var(--accent);
}

.outcome__meta {
  font-family: var(--font-mono);
}

.outcome__verdict {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm);
  flex-wrap: wrap;
  margin: var(--space-md) 0 0;
}

.outcome__badge {
  font-size: var(--text-body);
  font-weight: 600;
  white-space: nowrap;
}

.outcome__verdict[data-state='best'] .outcome__badge {
  color: var(--success);
}

.outcome__verdict[data-state='kept'] .outcome__badge {
  color: var(--text-secondary);
}

.outcome__verdict[data-state='quit'] .outcome__badge {
  color: var(--warning);
}

.outcome__note {
  flex: 1;
  min-width: 240px;
}

.outcome__xp {
  margin-top: var(--space-sm);
}

.outcome__xp strong {
  font-family: var(--font-mono);
  color: var(--text-primary);
}

@media (max-width: 560px) {
  .outcome__duel {
    grid-template-columns: 1fr;
  }
}
</style>
