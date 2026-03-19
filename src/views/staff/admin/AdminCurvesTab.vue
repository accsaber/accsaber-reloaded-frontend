<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { CurveResponse } from '@/types/api/categories'
import type { CreateCurveRequest } from '@/types/api/admin'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'

const curves = ref<CurveResponse[]>([])
const loading = ref(false)
const selectedId = ref<string | null>(null)
interface CurveEditForm {
  name: string
  type: 'FORMULA' | 'POINT_LOOKUP'
  formula: string
  xParameterName: string
  xParameterValue: number
  yParameterName: string
  yParameterValue: number
  zParameterName: string
  zParameterValue: number
  scale: number
  shift: number
}

const EMPTY_FORM: CurveEditForm = {
  name: '', type: 'FORMULA', formula: '',
  xParameterName: '', xParameterValue: 0,
  yParameterName: '', yParameterValue: 0,
  zParameterName: '', zParameterValue: 0,
  scale: 1, shift: 0,
}

const editForm = ref<CurveEditForm>({ ...EMPTY_FORM })
const saveLoading = ref(false)
const saveSuccess = ref(false)
const chartCanvas = ref<HTMLCanvasElement | null>(null)
let chartInstance: unknown = null

const selected = computed(() => curves.value.find((c) => c.id === selectedId.value) ?? null)

const showCreateModal = ref(false)
const createForm = ref({ name: '', type: 'FORMULA' as const, formula: '' })
const createLoading = ref(false)
const createError = ref('')

function openCreate() {
  createForm.value = { name: '', type: 'FORMULA', formula: '' }
  createError.value = ''
  showCreateModal.value = true
}

async function createCurve() {
  if (!createForm.value.name) return
  createLoading.value = true
  createError.value = ''
  try {
    const { createCurve: api } = await import('@/api/admin/curves')
    const created = await api(createForm.value)
    curves.value.push(created)
    selectCurve(created.id)
    showCreateModal.value = false
  } catch {
    createError.value = 'Failed to create curve.'
  } finally {
    createLoading.value = false
  }
}

async function fetchCurves() {
  loading.value = true
  try {
    const { getCurves } = await import('@/api/admin/curves')
    curves.value = await getCurves()
    if (curves.value.length && !selectedId.value) {
      selectCurve(curves.value[0].id)
    }
  } finally {
    loading.value = false
  }
}
fetchCurves()

function selectCurve(id: string) {
  selectedId.value = id
  const c = curves.value.find((x) => x.id === id)
  if (c) {
    editForm.value = {
      name: c.name,
      type: c.type,
      formula: c.formula ?? '',
      xParameterName: c.xParameterName ?? '',
      xParameterValue: c.xParameterValue ?? 0,
      yParameterName: c.yParameterName ?? '',
      yParameterValue: c.yParameterValue ?? 0,
      zParameterName: c.zParameterName ?? '',
      zParameterValue: c.zParameterValue ?? 0,
      scale: c.scale ?? 1,
      shift: c.shift ?? 0,
    }
  }
}

async function saveCurve() {
  if (!selectedId.value) return
  saveLoading.value = true
  saveSuccess.value = false
  try {
    const { updateCurve } = await import('@/api/admin/curves')
    const updated = await updateCurve(selectedId.value, editForm.value)
    const idx = curves.value.findIndex((c) => c.id === selectedId.value)
    if (idx !== -1) curves.value[idx] = updated
    selectCurve(updated.id)
    saveSuccess.value = true
    setTimeout(() => { saveSuccess.value = false }, 2500)
  } finally {
    saveLoading.value = false
  }
}

watch([selected, chartCanvas], async ([curve, canvas]) => {
  if (!curve || curve.type !== 'POINT_LOOKUP' || !canvas) return
  if (chartInstance) {
    (chartInstance as { destroy(): void }).destroy()
    chartInstance = null
  }
  const points = curve.points
  if (!points || !points.length) return

  const style = getComputedStyle(document.documentElement)
  const accentColor = style.getPropertyValue('--accent').trim()
  const textMuted = style.getPropertyValue('--text-secondary').trim()
  const gridColor = style.getPropertyValue('--bg-overlay').trim()

  const { Chart, registerables } = await import('chart.js')
  Chart.register(...registerables)
  chartInstance = new Chart(canvas, {
    type: 'scatter',
    data: {
      datasets: [{
        label: curve.name,
        data: points,
        backgroundColor: accentColor,
        pointRadius: 3,
        pointHoverRadius: 5,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => `(${(ctx.parsed.x ?? 0).toFixed(4)}, ${(ctx.parsed.y ?? 0).toFixed(4)})` } },
      },
      scales: {
        x: {
          title: { display: true, text: 'Accuracy', color: textMuted },
          ticks: { color: textMuted },
          grid: { color: gridColor },
        },
        y: {
          title: { display: true, text: 'Normalized AP', color: textMuted },
          ticks: { color: textMuted },
          grid: { color: gridColor },
        },
      },
    },
  })
})

const TYPE_OPTIONS = [
  { value: 'FORMULA', label: 'Formula' },
  { value: 'POINT_LOOKUP', label: 'Point Lookup' },
]
</script>

<template>
  <div class="tab">
    <div class="tab__header">
      <h2 class="tab__title">Curves</h2>
      <BaseButton @click="openCreate">New Curve</BaseButton>
    </div>

    <div class="layout">
      <div class="curve-list">
        <div v-if="loading" class="curve-list__items">
          <SkeletonLoader v-for="i in 5" :key="i" variant="text" style="margin: 6px 0" />
        </div>
        <div v-else class="curve-list__items">
          <button
            v-for="c in curves"
            :key="c.id"
            class="curve-item"
            :class="{ 'curve-item--active': selectedId === c.id }"
            @click="selectCurve(c.id)"
          >
            <span class="curve-item__name">{{ c.name }}</span>
            <span class="curve-item__type" :class="`curve-item__type--${c.type.toLowerCase().replace('_', '-')}`">
              {{ c.type === 'POINT_LOOKUP' ? 'LOOKUP' : 'FORMULA' }}
            </span>
          </button>
        </div>
      </div>

      <div v-if="selected" class="curve-editor">
        <div class="curve-editor__header">
          <h3 class="curve-editor__name">{{ selected.name }}</h3>
          <span class="curve-editor__type">{{ selected.type }}</span>
        </div>

        <div v-if="selected.type === 'POINT_LOOKUP'" class="chart-area">
          <canvas ref="chartCanvas" />
          <p v-if="!selected.points?.length" class="chart-empty">No point data available for visualization.</p>
        </div>

        <div class="curve-form">
          <div class="form-field">
            <label class="form-label">Name</label>
            <BaseInput v-model="editForm.name" />
          </div>

          <div v-if="selected.type === 'FORMULA'" class="form-field">
            <label class="form-label">Formula</label>
            <input v-model="editForm.formula" class="code-input" placeholder="e.g. x^2 * scale + shift" spellcheck="false" />
          </div>

          <div class="curve-form__params">
            <div class="form-field">
              <label class="form-label">Scale</label>
              <BaseInput v-model.number="editForm.scale" type="number" step="any" />
            </div>
            <div class="form-field">
              <label class="form-label">Shift</label>
              <BaseInput v-model.number="editForm.shift" type="number" step="any" />
            </div>
            <template v-if="selected.type === 'FORMULA'">
              <div class="form-field">
                <label class="form-label">X param name</label>
                <BaseInput v-model="editForm.xParameterName" />
              </div>
              <div class="form-field">
                <label class="form-label">X param value</label>
                <BaseInput v-model.number="editForm.xParameterValue" type="number" step="any" />
              </div>
              <div class="form-field">
                <label class="form-label">Y param name</label>
                <BaseInput v-model="editForm.yParameterName" />
              </div>
              <div class="form-field">
                <label class="form-label">Y param value</label>
                <BaseInput v-model.number="editForm.yParameterValue" type="number" step="any" />
              </div>
              <div class="form-field">
                <label class="form-label">Z param name</label>
                <BaseInput v-model="editForm.zParameterName" />
              </div>
              <div class="form-field">
                <label class="form-label">Z param value</label>
                <BaseInput v-model.number="editForm.zParameterValue" type="number" step="any" />
              </div>
            </template>
          </div>

          <div class="curve-form__actions">
            <BaseButton variant="primary" :loading="saveLoading" @click="saveCurve">Save Changes</BaseButton>
            <span v-if="saveSuccess" class="save-ok">Saved</span>
          </div>
        </div>
      </div>

      <div v-else-if="!loading" class="empty-hint">Select a curve to edit</div>
    </div>
  </div>

  <BaseModal :open="showCreateModal" title="New Curve" @close="showCreateModal = false">
    <div class="modal-form">
      <BaseInput v-model="createForm.name" label="Name" required />
      <div class="form-field">
        <label class="form-label">Type</label>
        <BaseSelect v-model="createForm.type" :options="TYPE_OPTIONS" />
      </div>
      <BaseInput v-model="createForm.formula" label="Formula (optional)" />
      <p v-if="createError" class="form-error">{{ createError }}</p>
    </div>
    <template #footer>
      <BaseButton @click="showCreateModal = false">Cancel</BaseButton>
      <BaseButton variant="primary" :loading="createLoading" :disabled="!createForm.name" @click="createCurve">Create</BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.tab { display: flex; flex-direction: column; gap: var(--space-lg); }
.tab__header { display: flex; align-items: center; justify-content: space-between; }
.tab__title { font-size: var(--text-section-heading); font-weight: 600; color: var(--text-primary); margin: 0; }

.layout { display: grid; grid-template-columns: 220px 1fr; gap: var(--space-lg); align-items: start; }

.curve-list {
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  overflow: hidden;
}
.curve-list__items { padding: var(--space-xs); }

.curve-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: var(--space-sm);
  background: none;
  border: none;
  border-radius: var(--radius-btn);
  text-align: left;
  cursor: pointer;
  gap: var(--space-sm);
  transition: background-color 100ms;
}
.curve-item:hover { background: var(--bg-elevated); }
.curve-item--active { background: color-mix(in srgb, var(--accent) 10%, transparent); }
.curve-item--active .curve-item__name { color: var(--accent); }
.curve-item__name { font-size: var(--text-body); font-weight: 500; color: var(--text-primary); flex: 1; }
.curve-item__type { font-size: 10px; font-family: var(--font-mono); font-weight: 600; padding: 1px 6px; border-radius: var(--radius-pill); border: 1px solid; }
.curve-item__type--point-lookup { color: var(--accent-low-mid); border-color: color-mix(in srgb, var(--accent-low-mid) 30%, transparent); background: color-mix(in srgb, var(--accent-low-mid) 8%, transparent); }
.curve-item__type--formula { color: var(--info); border-color: color-mix(in srgb, var(--info) 30%, transparent); background: color-mix(in srgb, var(--info) 8%, transparent); }

.curve-editor {
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  padding: var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}
.curve-editor__header { display: flex; align-items: center; gap: var(--space-sm); }
.curve-editor__name { font-size: var(--text-card-title); font-weight: 600; color: var(--text-primary); margin: 0; }
.curve-editor__type { font-size: var(--text-caption); font-family: var(--font-mono); color: var(--text-secondary); }

.chart-area { position: relative; height: 260px; }
.chart-empty { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: var(--text-tertiary); font-size: var(--text-caption); }

.curve-form { display: flex; flex-direction: column; gap: var(--space-md); }
.curve-form__params { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: var(--space-md); }
.curve-form__actions { display: flex; align-items: center; gap: var(--space-md); }

.form-field { display: flex; flex-direction: column; gap: var(--space-xs); }
.form-label { font-size: var(--text-caption); font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; }

.code-input {
  padding: var(--space-sm);
  background: var(--bg-base);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-input);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: var(--text-body);
  width: 100%;
}
.code-input:focus { border-color: var(--accent); outline: none; }

.save-ok { font-size: var(--text-caption); color: var(--success); font-family: var(--font-mono); }
.empty-hint { color: var(--text-tertiary); font-size: var(--text-body); padding: var(--space-xl); text-align: center; }

.modal-form { display: flex; flex-direction: column; gap: var(--space-md); padding: var(--space-sm) 0; }
.form-error { font-size: var(--text-caption); color: var(--error); margin: 0; }
</style>
