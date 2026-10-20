<script setup lang="ts">
import AccuracySlider from '@/components/common/AccuracySlider.vue'
import { useFloatingPanel } from '@/composables/useFloatingPanel'
import type { CurveResponse } from '@/types/api/categories'
import { calculateAp, reverseApToAccuracy, reverseApToAccuracyByComplexity, tweakRawAp } from '@/utils/curveEval'
import { computed, nextTick, ref, watch } from 'vue'
import { clamp01 } from '@/utils/math'
import { formatAccuracy } from '@/utils/formatters'

const props = withDefaults(defineProps<{
  open: boolean
  curveId: string
  anchorEl: HTMLElement | null
  defaultAccuracy?: number
  accuracy?: number
  ap?: number
  weightedAp?: number
  complexity?: number
  showWeighted?: boolean
  siblingAps?: number[]
}>(), {
  defaultAccuracy: 0.9,
  showWeighted: true,
})

const isScoreMode = computed(() => props.ap != null && props.accuracy != null)

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const curve = ref<CurveResponse | null>(null)
const curveLoading = ref(false)
const editingAcc = ref(false)
const editingAp = ref(false)
const editInput = ref('')

const openModel = computed({
  get: () => props.open,
  set: (value: boolean) => {
    if (value || (!editingAcc.value && !editingAp.value)) emit('update:open', value)
  },
})

const { triggerRef, panelRef, panelStyle } = useFloatingPanel({ model: openModel, width: 260, gap: 4, align: 'center' })

watch(() => props.anchorEl, (el) => { triggerRef.value = el }, { immediate: true })

const tweakedAccuracy = ref(0)
const referenceAccuracy = ref(0)

function setAccuracy(acc: number) {
  tweakedAccuracy.value = Math.round(acc * 10000) / 10000
}

function initAccuracy(acc: number) {
  setAccuracy(acc)
  referenceAccuracy.value = tweakedAccuracy.value
}

function startEditingAcc() {
  editingAcc.value = true
  editInput.value = (tweakedAccuracy.value * 100).toFixed(2)
  nextTick(() => {
    const input = panelRef.value?.querySelector('.ap-tweaker__edit-input') as HTMLInputElement | null
    input?.select()
  })
}

function commitAccEdit() {
  editingAcc.value = false
  const parsed = parseFloat(editInput.value)
  if (isNaN(parsed)) return
  setAccuracy(clamp01(parsed / 100))
}

function startEditingAp() {
  editingAp.value = true
  editInput.value = tweakedRawAp.value.toFixed(2)
  nextTick(() => {
    const input = panelRef.value?.querySelector('.ap-tweaker__ap-edit') as HTMLInputElement | null
    input?.select()
  })
}

function commitApEdit() {
  editingAp.value = false
  const targetAp = parseFloat(editInput.value)
  if (isNaN(targetAp) || targetAp < 0 || !curve.value) return

  let acc: number | null = null
  if (isScoreMode.value) {
    acc = reverseApToAccuracy(curve.value, targetAp, props.accuracy!, props.ap!)
  } else if (props.complexity != null) {
    acc = reverseApToAccuracyByComplexity(curve.value, targetAp, props.complexity)
  }

  if (acc != null) setAccuracy(clamp01(acc))
}

function handleEditKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    if (editingAcc.value) commitAccEdit()
    else if (editingAp.value) commitApEdit()
  }
  if (e.key === 'Escape') {
    editingAcc.value = false
    editingAp.value = false
  }
}

watch([() => props.open, () => props.anchorEl], async ([isOpen]) => {
  if (isOpen) {
    initAccuracy(isScoreMode.value ? props.accuracy! : props.defaultAccuracy)
    editingAcc.value = false
    editingAp.value = false

    if (!curve.value || curve.value.id !== props.curveId) {
      curveLoading.value = true
      try {
        const { getCurve } = await import('@/api/curves')
        curve.value = await getCurve(props.curveId)
      } catch {
        curve.value = null
      }
      curveLoading.value = false
    }
  }
}, { immediate: true })

const tweakedRawAp = computed(() => {
  if (!curve.value) return 0
  if (isScoreMode.value) {
    return tweakRawAp(curve.value, referenceAccuracy.value, props.ap!, tweakedAccuracy.value)
  }
  return calculateAp(curve.value, tweakedAccuracy.value, props.complexity ?? 0)
})

const weightResult = computed(() => {
  if (!isScoreMode.value) return { weightedAp: 0, posChanged: false }

  const currentAp = props.ap!
  const newAp = tweakedRawAp.value
  const ratio = currentAp > 0 ? (props.weightedAp ?? 0) / currentAp : 1
  const weightedAp = newAp * ratio

  let posChanged = false
  if (props.siblingAps?.length) {
    const others = [...props.siblingAps]
    const idx = others.indexOf(currentAp)
    if (idx !== -1) others.splice(idx, 1)

    if (newAp > currentAp) {
      posChanged = others.some((s) => s >= currentAp && s < newAp)
    } else if (newAp < currentAp) {
      posChanged = others.some((s) => s <= currentAp && s > newAp)
    }
  }

  return { weightedAp, posChanged }
})

const apDiff = computed(() => isScoreMode.value ? tweakedRawAp.value - props.ap! : 0)
const weightedDiff = computed(() => {
  if (!isScoreMode.value) return 0
  return weightResult.value.weightedAp - (props.weightedAp ?? 0)
})

function formatDiff(val: number): string {
  if (Math.abs(val) < 0.005) return '0.00'
  return (val > 0 ? '+' : '') + val.toFixed(2)
}

function diffColor(val: number): string {
  if (val > 0.005) return 'var(--success)'
  if (val < -0.005) return 'var(--error)'
  return 'var(--text-secondary)'
}
</script>

<template>
  <Teleport to="body">
    <Transition name="tweaker">
      <div v-if="open" ref="panelRef" class="ap-tweaker" :style="panelStyle" @mousedown.stop @click.stop>
        <div class="ap-tweaker__header">
          <span class="field-label">AP Tweaker</span>
          <button class="ap-tweaker__close" aria-label="Close AP tweaker" @click="emit('update:open', false)">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
          </button>
        </div>

        <div v-if="curveLoading" class="ap-tweaker__loading">Loading curve...</div>
        <template v-else-if="curve">
          <div class="ap-tweaker__acc-display">
            <input v-if="editingAcc" v-model="editInput" class="ap-tweaker__edit-input" type="text" inputmode="decimal"
              @blur="commitAccEdit" @keydown="handleEditKeydown" />
            <button v-else class="ap-tweaker__acc-btn" @click="startEditingAcc">
              {{ formatAccuracy(tweakedAccuracy) }}
            </button>
          </div>

          <AccuracySlider v-model="tweakedAccuracy" />

          <div class="ap-tweaker__results">
            <div class="ap-tweaker__result">
              <span class="ap-tweaker__result-label">AP</span>
              <input v-if="editingAp" v-model="editInput" class="ap-tweaker__ap-edit" type="text" inputmode="decimal"
                @blur="commitApEdit" @keydown="handleEditKeydown" />
              <button v-else class="ap-tweaker__result-btn" @click="startEditingAp">
                {{ tweakedRawAp.toFixed(2) }}
              </button>
              <span v-if="isScoreMode && !editingAp" class="ap-tweaker__result-diff" :style="{ color: diffColor(apDiff) }">
                {{ formatDiff(apDiff) }}
              </span>
            </div>
            <div v-if="showWeighted && isScoreMode" class="ap-tweaker__result">
              <span class="ap-tweaker__result-label">Weighted</span>
              <span class="ap-tweaker__result-value">
                {{ weightResult.posChanged ? '~' : '' }}{{ weightResult.weightedAp.toFixed(2) }}
              </span>
              <span class="ap-tweaker__result-diff" :style="{ color: diffColor(weightedDiff) }">
                {{ formatDiff(weightedDiff) }}
              </span>
            </div>
            <span v-if="showWeighted && isScoreMode && weightResult.posChanged" class="ap-tweaker__approx-note">
              Position changed - weighted AP may differ
            </span>
          </div>
        </template>
        <div v-else class="ap-tweaker__loading">Curve data unavailable</div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.ap-tweaker {
  z-index: 300;
  background: var(--bg-elevated);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  padding: var(--space-sm) var(--space-md);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.ap-tweaker__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ap-tweaker__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: var(--radius-btn);
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: color 120ms ease;
}

.ap-tweaker__close:hover {
  color: var(--text-primary);
}

.ap-tweaker__loading {
  font-size: var(--text-caption);
  color: var(--text-tertiary);
  text-align: center;
  padding: var(--space-sm) 0;
}

.ap-tweaker__acc-display {
  text-align: center;
}

.ap-tweaker__acc-btn {
  font-family: var(--font-mono);
  font-size: 1.125rem;
  color: var(--text-primary);
  font-weight: 600;
  background: none;
  border: 1px solid transparent;
  border-radius: var(--radius-input);
  padding: 2px var(--space-sm);
  cursor: pointer;
  transition: border-color 120ms ease;
}

.ap-tweaker__acc-btn:hover {
  border-color: var(--bg-overlay);
}

.ap-tweaker__edit-input {
  font-family: var(--font-mono);
  font-size: 1.125rem;
  color: var(--text-primary);
  font-weight: 600;
  background: var(--bg-base);
  border: 1px solid var(--accent, var(--bg-overlay));
  border-radius: var(--radius-input);
  padding: 2px var(--space-sm);
  width: 100px;
  text-align: center;
  outline: none;
}

.ap-tweaker__results {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  padding-top: var(--space-xs);
  border-top: 1px solid var(--bg-overlay);
}

.ap-tweaker__result {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.ap-tweaker__result-label {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  width: 56px;
  flex-shrink: 0;
}

.ap-tweaker__result-value {
  font-family: var(--font-mono);
  font-size: var(--text-body);
  color: var(--text-primary);
  font-weight: 500;
  flex: 1;
}

.ap-tweaker__result-btn {
  font-family: var(--font-mono);
  font-size: var(--text-body);
  color: var(--text-primary);
  font-weight: 500;
  flex: 1;
  background: none;
  border: 1px solid transparent;
  border-radius: var(--radius-input);
  padding: 0;
  cursor: pointer;
  text-align: left;
  transition: border-color 120ms ease;
}

.ap-tweaker__result-btn:hover {
  border-color: var(--bg-overlay);
}

.ap-tweaker__ap-edit {
  font-family: var(--font-mono);
  font-size: var(--text-body);
  color: var(--text-primary);
  font-weight: 500;
  flex: 1;
  background: var(--bg-base);
  border: 1px solid var(--accent, var(--bg-overlay));
  border-radius: var(--radius-input);
  padding: 0;
  outline: none;
  width: 80px;
}

.ap-tweaker__result-diff {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  white-space: nowrap;
}

.ap-tweaker__approx-note {
  font-size: 0.625rem;
  color: var(--text-tertiary);
  font-style: italic;
}

.tweaker-enter-active,
.tweaker-leave-active {
  transition: opacity 100ms ease, transform 100ms ease;
}

.tweaker-enter-from,
.tweaker-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (prefers-reduced-motion: reduce) {

  .tweaker-enter-active,
  .tweaker-leave-active {
    transition: none;
  }
}
</style>
