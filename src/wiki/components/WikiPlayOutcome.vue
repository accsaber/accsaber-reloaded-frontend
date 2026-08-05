<script setup lang="ts">
import { improvementXp, rawAp, XP_BASE_PER_SCORE } from '@/wiki/apCurve'
import { computed, ref } from 'vue'

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
    return 'An unfinished run never becomes your best play, whatever it scored. It is filed as history.'
  if (isBest.value)
    return 'This play takes over as your best on the map. The old one moves into your history and keeps its numbers.'
  if (newScore.value === props.pbScore)
    return 'An exact tie keeps the play you already had. Your best only changes when a play beats it outright.'
  return 'Your best play is untouched and your AP does not move. This run is filed as history.'
})

const xpNote = computed(() => {
  if (isBest.value)
    return 'the flat 25 plus one and a half times the accuracy bonus you gained over your old play'
  if (quitEarly.value) return 'the flat 25 that any submitted run banks'
  return 'the flat 25 every completed run banks'
})

const formatScore = (v: number) => Math.round(v).toLocaleString('en-US')
const formatAccuracy = (v: number) => `${(v * 100).toFixed(2)}%`
const formatAp = (v: number) => v.toFixed(1)
</script>

<template>
  <figure class="outcome">
    <div class="outcome__controls">
      <label class="outcome__slider">
        <span class="outcome__label">This play, score before modifiers</span>
        <input
          v-model.number="newScore"
          type="range"
          :min="sliderMin"
          :max="maxScore"
          :step="STEP"
        />
      </label>
      <label class="outcome__toggle">
        <input v-model="quitEarly" type="checkbox" />
        <span>I quit before the end</span>
      </label>
    </div>

    <div class="outcome__duel">
      <div class="outcome__side">
        <span class="outcome__label">Your best so far</span>
        <span class="outcome__score">{{ formatScore(pbScore) }}</span>
        <span class="outcome__meta">
          {{ formatAccuracy(pbAccuracy) }} &middot; {{ formatAp(pbAp) }} AP
        </span>
      </div>
      <div class="outcome__side outcome__side--live">
        <span class="outcome__label">This play</span>
        <span class="outcome__score">{{ formatScore(newScore) }}</span>
        <span class="outcome__meta">
          {{ formatAccuracy(newAccuracy) }} &middot; {{ formatAp(newAp) }} AP
        </span>
      </div>
    </div>

    <p class="outcome__verdict" :data-state="state">
      <span class="outcome__badge">{{ verdict }}</span>
      <span class="outcome__note">{{ note }}</span>
    </p>

    <figcaption class="outcome__xp">
      The run pays XP either way: <strong>{{ xpPaid.toFixed(1) }}</strong>, {{ xpNote }}.
    </figcaption>
  </figure>
</template>

<style scoped>
.outcome {
  margin: 0 0 var(--space-md);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  background: var(--bg-surface);
  padding: var(--space-md);
}

.outcome__controls {
  display: flex;
  align-items: flex-end;
  gap: var(--space-xl);
  flex-wrap: wrap;
  margin-bottom: var(--space-lg);
}

.outcome__slider {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  flex: 1;
  min-width: 220px;
}

.outcome__slider input {
  accent-color: var(--accent);
}

.outcome__label {
  font-size: var(--text-caption);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
}

.outcome__toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: var(--text-caption);
  color: var(--text-primary);
  cursor: pointer;
}

.outcome__toggle input {
  accent-color: var(--accent);
  width: 15px;
  height: 15px;
}

.outcome__duel {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-md);
}

.outcome__side {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
  background: var(--bg-base);
}

.outcome__side--live {
  border-color: color-mix(in srgb, var(--accent) 45%, var(--bg-overlay));
}

.outcome__score {
  font-family: var(--font-mono);
  font-size: var(--text-stat-lg);
  font-weight: 500;
  color: var(--text-primary);
}

.outcome__side--live .outcome__score {
  color: var(--accent);
}

.outcome__meta {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.outcome__verdict {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm);
  flex-wrap: wrap;
  margin: var(--space-md) 0 0;
  padding-top: var(--space-md);
  border-top: 1px solid var(--bg-overlay);
}

.outcome__badge {
  font-size: var(--text-caption);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  white-space: nowrap;
}

.outcome__verdict[data-state='best'] .outcome__badge {
  color: var(--success);
}

.outcome__verdict[data-state='kept'] .outcome__badge {
  color: var(--text-tertiary);
}

.outcome__verdict[data-state='quit'] .outcome__badge {
  color: var(--warning);
}

.outcome__note {
  flex: 1;
  min-width: 240px;
  font-size: var(--text-caption);
  color: var(--text-secondary);
  line-height: 1.6;
}

.outcome__xp {
  margin-top: var(--space-sm);
  font-size: var(--text-caption);
  color: var(--text-secondary);
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
