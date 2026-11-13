<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import BaseTabs from '@/components/common/BaseTabs.vue'
import StatusMark from '@/components/common/StatusMark.vue'
import CampaignRoadmap from '@/components/domain/CampaignRoadmap.vue'
import type {
  CampaignBarrierResponse,
  CampaignDifficultyResponse,
} from '@/types/api/campaigns'
import type { PublicMapDifficultyResponse } from '@/types/api/maps'
import { clamp } from '@/utils/math'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import MapPickerModal from '@/components/domain/MapPickerModal.vue'
import CampaignRoadmapToolLayer from './CampaignRoadmapToolLayer.vue'
import CampaignTrayIcon from './CampaignTrayIcon.vue'
import { useCampaignRoadmapTools } from './useCampaignRoadmapTools'

withDefaults(defineProps<{ accent?: string }>(), {
  accent: 'var(--accent)',
})

const emit = defineEmits<{
  close: [outcome: 'done' | 'skipped']
}>()

type StepId = 'add' | 'connect' | 'goal' | 'reward' | 'barrier' | 'finish'

interface TutorialStep {
  id: StepId
  title: string
  body: string
}

const steps: TutorialStep[] = [
  { id: 'add', title: 'Add a Map', body: 'Click Add Node and pick a map.' },
  {
    id: 'connect',
    title: 'Connect Two Maps',
    body: 'Add a second map. Switch to Connect and drag from the first map to the second.',
  },
  { id: 'goal', title: 'Set a Goal', body: 'Set the accuracy a player needs on your first map.' },
  { id: 'reward', title: 'Give XP', body: 'Set the XP a player gets for clearing it.' },
  {
    id: 'barrier',
    title: 'Add a Barrier',
    body: "A barrier blocks the maps after it until the player's average accuracy on the maps before it is high enough. Add a third map, connect it, click Add Barrier, then click the new arrow.",
  },
  { id: 'finish', title: 'The Rest', body: 'Everything else is in the left rail.' },
]

const finishTrays = [
  { icon: 'identity', name: 'Identity', text: 'Name, summary and description' },
  { icon: 'sliders', name: 'Settings', text: 'Order and completion rules' },
  { icon: 'image', name: 'Images', text: 'Background and icon' },
  { icon: 'gift', name: 'Rewards', text: 'What a player gets for finishing' },
  { icon: 'users', name: 'Collab', text: 'Invite other players to build with you' },
  { icon: 'flag', name: 'Status', text: 'Publish it' },
] as const

const stepIndex = ref(0)
const direction = ref<'fwd' | 'back'>('fwd')
const celebrating = ref(false)
let advanceTimer: number | null = null

const nodes = ref<CampaignDifficultyResponse[]>([])
const barriers = ref<CampaignBarrierResponse[]>([])
const MODE_TABS = [
  { key: 'drag', label: 'Drag' },
  { key: 'connect', label: 'Connect' },
  { key: 'select', label: 'Select' },
]

const sandboxMode = ref<'drag' | 'connect' | 'select'>('drag')
const selectedId = ref<string | null>(null)
const pickerOpen = ref(false)
const goalTouched = ref(false)
const barrierTouched = ref(false)
const barrierPlacement = ref(false)

let nodeSeq = 0

const currentStep = computed(() => steps[stepIndex.value])
const firstNode = computed(() => nodes.value[0] ?? null)
const hasConnection = computed(() =>
  nodes.value.some((n) => n.prerequisites.length > 0),
)

const firstBarrier = computed(() => barriers.value[0] ?? null)

const edgeCount = computed(
  () =>
    nodes.value.reduce((sum, n) => sum + n.prerequisites.length, 0) +
    barriers.value.reduce((sum, b) => sum + b.prerequisites.length, 0),
)

const thirdMapConnected = computed(() => nodes.value.length >= 3 && edgeCount.value >= 2)

const nodesBeforeGate = computed<CampaignDifficultyResponse[]>(() => {
  const barrier = firstBarrier.value
  if (!barrier) return []
  const forward = new Map<string, string[]>()
  const addEdge = (from: string, to: string) => {
    const list = forward.get(from) ?? []
    list.push(to)
    forward.set(from, list)
  }
  for (const n of nodes.value) {
    for (const p of n.prerequisites) addEdge(p.comesFromCampaignDifficultyId, n.id)
  }
  for (const b of barriers.value) {
    for (const p of b.prerequisites) addEdge(p.comesFromCampaignDifficultyId, b.id)
  }
  const beyond = new Set<string>()
  const queue = [barrier.id]
  while (queue.length > 0) {
    const current = queue.pop() as string
    for (const next of forward.get(current) ?? []) {
      if (!beyond.has(next)) {
        beyond.add(next)
        queue.push(next)
      }
    }
  }
  return nodes.value.filter((n) => !beyond.has(n.id))
})

const watchesMapsBefore = computed(() => {
  const barrier = firstBarrier.value
  if (!barrier) return false
  const before = nodesBeforeGate.value
  if (before.length === 0) return false
  return before.every((n) => barrier.affectedCampaignDifficultyIds.includes(n.id))
})

const stepDone = computed<boolean[]>(() => [
  nodes.value.length >= 1,
  nodes.value.length >= 2 && hasConnection.value,
  goalTouched.value,
  (firstNode.value?.xp ?? 0) > 0,
  thirdMapConnected.value &&
    barriers.value.length >= 1 &&
    barrierTouched.value &&
    watchesMapsBefore.value,
  false,
])

const checklist = computed(() => {
  if (currentStep.value.id === 'connect') {
    return [
      { label: 'Two maps added', done: nodes.value.length >= 2 },
      { label: 'Maps connected', done: hasConnection.value },
    ]
  }
  if (currentStep.value.id === 'barrier') {
    return [
      { label: 'Third map connected', done: thirdMapConnected.value },
      { label: 'Barrier placed', done: barriers.value.length >= 1 },
      { label: 'Accuracy set', done: barrierTouched.value },
      { label: 'Maps picked', done: watchesMapsBefore.value },
    ]
  }
  return []
})

const wantsAdd = computed(
  () =>
    (currentStep.value.id === 'add' && nodes.value.length === 0) ||
    (currentStep.value.id === 'connect' && nodes.value.length < 2) ||
    (currentStep.value.id === 'barrier' && nodes.value.length < 3),
)

const wantsBarrier = computed(
  () =>
    currentStep.value.id === 'barrier' &&
    thirdMapConnected.value &&
    barriers.value.length === 0 &&
    !barrierPlacement.value,
)

const wantsConnectMode = computed(
  () =>
    currentStep.value.id === 'connect' &&
    nodes.value.length >= 2 &&
    !hasConnection.value &&
    sandboxMode.value !== 'connect',
)

const goalPct = computed({
  get: () => Math.round((firstNode.value?.requirementValue ?? 0.95) * 1000) / 10,
  set: (v: number) => {
    const node = firstNode.value
    if (!node) return
    const clamped = clamp(Number(v) || 70, 70, 100)
    node.requirementValue = Math.round(clamped * 10) / 1000
  },
})

const xpValue = computed({
  get: () => firstNode.value?.xp ?? 0,
  set: (v: number) => {
    const node = firstNode.value
    if (!node) return
    node.xp = Math.max(0, Math.round(Number(v) || 0))
  },
})

function commitGoal() {
  if (!firstNode.value) return
  goalTouched.value = true
  checkAutoAdvance()
}

function setXpPreset(v: number) {
  xpValue.value = v
  checkAutoAdvance()
}

function commitXp() {
  checkAutoAdvance()
}

function toNode(meta: PublicMapDifficultyResponse): CampaignDifficultyResponse {
  nodeSeq += 1
  return {
    id: `tutorial-${nodeSeq}`,
    mapDifficultyId: meta.id,
    mapId: meta.mapId,
    categoryId: meta.categoryId,
    complexity: meta.complexity,
    beatsaverCode: meta.beatsaverCode,
    maxScore: meta.maxScore,
    metadata: meta.metadata,
    nps: meta.nps,
    maxCombo: meta.maxCombo,
    songName: meta.songName,
    songSubName: meta.songSubName,
    songAuthor: meta.songAuthor,
    mapAuthor: meta.mapAuthor,
    coverUrl: meta.coverUrl,
    cdnCoverUrl: meta.cdnCoverUrl ?? null,
    difficulty: meta.difficulty,
    characteristic: meta.characteristic,
    targetMode: 'AND',
    targets: [
      { requirementType: 'ACC', requirementValue: 0.95, requirementValueMax: null },
    ],
    requirementType: 'ACC',
    requirementValue: 0.95,
    requirementValueMax: null,
    modifiers: [],
    description: null,
    checkpointLabel: null,
    checkpointLabelPosition: null,
    checkpointAvatarUrl: null,
    nodeBorderUrl: null,
    nodeBorderLayer: 'ABOVE',
    borderColor: null,
    borderShape: null,
    checkpointColor: null,
    checkpointSize: null,
    size: null,
    positionX: nodes.value.length * 2,
    positionY: 0,
    xp: 0,
    terminal: false,
    prerequisites: [],
    prerequisiteMode: 'AND',
    items: [],
  }
}

function handlePicked(picked: PublicMapDifficultyResponse[]) {
  if (picked.length === 0) return
  for (const meta of picked) {
    nodes.value = [...nodes.value, toNode(meta)]
  }
  pickerOpen.value = false
  if (nodes.value.length === 1) selectedId.value = nodes.value[0].id
  checkAutoAdvance()
}

function handleMove(payload: { id: string; positionX: number; positionY: number }) {
  const vertex = vertexById(payload.id)
  if (!vertex) return
  vertex.positionX = payload.positionX
  vertex.positionY = payload.positionY
}

function handleEmptyClick() {
  selectedId.value = null
  barrierPlacement.value = false
}

function handleConnect(payload: { fromId: string; toId: string }) {
  if (payload.fromId === payload.toId) return
  const from = vertexById(payload.fromId)
  const to = vertexById(payload.toId)
  if (!from || !to) return
  if (to.prerequisites.some((p) => p.comesFromCampaignDifficultyId === payload.fromId)) return
  if (from.prerequisites.some((p) => p.comesFromCampaignDifficultyId === payload.toId)) return
  to.prerequisites = [
    ...to.prerequisites,
    { comesFromCampaignDifficultyId: payload.fromId, color: null },
  ]
  checkAutoAdvance()
}

function handleDisconnect(payload: { fromId: string; toId: string }) {
  const to = vertexById(payload.toId)
  if (!to) return
  to.prerequisites = to.prerequisites.filter(
    (p) => p.comesFromCampaignDifficultyId !== payload.fromId,
  )
}

function vertexById(
  id: string,
): CampaignDifficultyResponse | CampaignBarrierResponse | null {
  return (
    nodes.value.find((n) => n.id === id) ?? barriers.value.find((b) => b.id === id) ?? null
  )
}

function toggleBarrierPlacement() {
  if (!hasConnection.value) return
  barrierPlacement.value = !barrierPlacement.value
}

function handlePlaceBarrier(payload: { fromId: string; toId: string }) {
  const from = vertexById(payload.fromId)
  const to = vertexById(payload.toId)
  if (!from || !to) return
  nodeSeq += 1
  const barrier: CampaignBarrierResponse = {
    id: `tutorial-barrier-${nodeSeq}`,
    conditionType: 'AVERAGE_ACC',
    conditionValue: 0.9,
    conditionValueMax: null,
    description: null,
    checkpointLabel: null,
    checkpointLabelPosition: null,
    checkpointAvatarUrl: null,
    checkpointColor: null,
    borderColor: null,
    borderShape: null,
    size: null,
    checkpointSize: null,
    positionX: Math.round((from.positionX + to.positionX) / 2),
    positionY: Math.round((from.positionY + to.positionY) / 2),
    xp: 0,
    prerequisites: [{ comesFromCampaignDifficultyId: payload.fromId, color: null }],
    prerequisiteMode: 'AND',
    affectedCampaignDifficultyIds: payload.fromId.startsWith('tutorial-barrier')
      ? []
      : [payload.fromId],
    items: [],
  }
  barriers.value = [...barriers.value, barrier]
  to.prerequisites = to.prerequisites
    .filter((p) => p.comesFromCampaignDifficultyId !== payload.fromId)
    .concat({ comesFromCampaignDifficultyId: barrier.id, color: null })
  barrierPlacement.value = false
  selectedId.value = barrier.id
  checkAutoAdvance()
}

function toggleWatched(nodeId: string) {
  const barrier = firstBarrier.value
  if (!barrier) return
  const current = barrier.affectedCampaignDifficultyIds
  barrier.affectedCampaignDifficultyIds = current.includes(nodeId)
    ? current.filter((id) => id !== nodeId)
    : [...current, nodeId]
  checkAutoAdvance()
}

const barrierPct = computed({
  get: () => Math.round((firstBarrier.value?.conditionValue ?? 0.9) * 1000) / 10,
  set: (v: number) => {
    const barrier = firstBarrier.value
    if (!barrier) return
    const clamped = clamp(Number(v) || 70, 70, 100)
    barrier.conditionValue = Math.round(clamped * 10) / 1000
  },
})

function commitBarrierValue() {
  if (!firstBarrier.value) return
  barrierTouched.value = true
  checkAutoAdvance()
}

function clearAdvanceTimer() {
  if (advanceTimer != null) {
    window.clearTimeout(advanceTimer)
    advanceTimer = null
  }
  celebrating.value = false
}

function checkAutoAdvance() {
  if (stepIndex.value >= steps.length - 1) return
  if (!stepDone.value[stepIndex.value]) return
  if (celebrating.value) return
  celebrating.value = true
  advanceTimer = window.setTimeout(() => {
    advanceTimer = null
    celebrating.value = false
    if (stepDone.value[stepIndex.value]) goNext()
  }, 900)
}

function goNext() {
  clearAdvanceTimer()
  if (stepIndex.value >= steps.length - 1) return
  direction.value = 'fwd'
  stepIndex.value += 1
}

function goBack() {
  clearAdvanceTimer()
  if (stepIndex.value === 0) return
  direction.value = 'back'
  stepIndex.value -= 1
}

function skipStep() {
  goNext()
}

function resetTutorial() {
  clearAdvanceTimer()
  nodes.value = []
  barriers.value = []
  selectedId.value = null
  sandboxMode.value = 'drag'
  barrierPlacement.value = false
  pickerOpen.value = false
  goalTouched.value = false
  barrierTouched.value = false
  direction.value = 'back'
  stepIndex.value = 0
}

function skipAll() {
  clearAdvanceTimer()
  emit('close', 'skipped')
}

function finish() {
  clearAdvanceTimer()
  emit('close', 'done')
}

function onModalClose() {
  if (pickerOpen.value) return
  skipAll()
}

const roadmapTools = useCampaignRoadmapTools({
  editable: () => true,
  mode: () => sandboxMode.value,
  barrierPlacement: () => barrierPlacement.value,
  selectedId: () => selectedId.value,
  onConnect: handleConnect,
  onDisconnect: handleDisconnect,
  onPlaceBarrier: handlePlaceBarrier,
})

const dialogEl = ref<HTMLElement | null>(null)

onMounted(() => {
  dialogEl.value?.focus()
})

onUnmounted(clearAdvanceTimer)
</script>

<template>
  <BaseModal :open="true" max-width="1180px" persistent @close="onModalClose">
    <div
      ref="dialogEl"
      class="tutorial campaign-editor"
      role="region"
      aria-label="Campaign editor tutorial"
      tabindex="-1"
      :style="{ '--tutorial-accent': accent, '--page-accent': accent }"
    >
      <header class="tutorial__head">
        <h2 class="card-title">Build Your First Campaign</h2>
        <span class="caption">Practice canvas, nothing is saved</span>
        <div class="tutorial__progress" role="img" :aria-label="`Step ${stepIndex + 1} of ${steps.length}`">
          <span
            v-for="(s, i) in steps"
            :key="s.id"
            class="tutorial__progress-seg"
            :class="{
              'tutorial__progress-seg--done': stepDone[i] || i < stepIndex,
              'tutorial__progress-seg--current': i === stepIndex,
            }"
          />
        </div>
        <BaseButton
          v-if="nodes.length > 0 || barriers.length > 0 || stepIndex > 0"
          @click="resetTutorial"
        >
          Start Over
        </BaseButton>
        <BaseButton @click="skipAll">Skip Tutorial</BaseButton>
      </header>

      <div class="tutorial__body">
        <div class="tutorial__stage">
          <CampaignRoadmap
            :difficulties="nodes"
            :barriers="barriers"
            :accent-color="accent"
            :show-origin="false"
            :show-starfield="true"
            :default-scale="1"
            :follow-focus="false"
            :selected-id="selectedId"
            :barrier-placement="barrierPlacement"
            :editable="true"
            :mode="sandboxMode"
            :tools="roadmapTools"
            @select="selectedId = $event"
            @deselect="selectedId = null"
            @empty-click="handleEmptyClick"
            @move="handleMove"
          >
            <template #tools="{ layer, edge }">
              <CampaignRoadmapToolLayer :tools="roadmapTools" :layer="layer" :edge="edge" />
            </template>
            <template #actions>
              <div class="tutorial__add-cluster">
                <BaseButton
                  variant="primary"
                  :class="{ 'tutorial__attn': wantsAdd }"
                  @click="pickerOpen = true"
                >
                  <CampaignTrayIcon name="plus" :size="16" />
                  Add Node
                </BaseButton>
                <BaseButton
                  :class="{ 'tutorial__attn': wantsBarrier, 'tutorial__armed': barrierPlacement }"
                  :disabled="!hasConnection"
                  :title="!hasConnection ? 'Connect two nodes first' : ''"
                  @click="toggleBarrierPlacement"
                >
                  <CampaignTrayIcon name="gate" :size="16" />
                  {{ barrierPlacement ? 'Pick an Arrow' : 'Add Barrier' }}
                </BaseButton>
              </div>
            </template>
          </CampaignRoadmap>

          <BaseTabs
            class="tutorial__mode"
            :class="{ 'tutorial__attn': wantsConnectMode }"
            variant="segmented"
            label="Canvas mode"
            :tabs="MODE_TABS"
            :model-value="sandboxMode"
            @update:model-value="sandboxMode = $event as typeof sandboxMode"
          />

        </div>

        <aside class="tutorial__panel">
          <Transition :name="direction === 'fwd' ? 'tutorial-step-fwd' : 'tutorial-step-back'" mode="out-in">
            <div :key="currentStep.id" class="tutorial__step" aria-live="polite">
              <h3 class="card-title tutorial__step-title">{{ currentStep.title }}</h3>
              <p class="tutorial__step-body">{{ currentStep.body }}</p>

              <ul v-if="checklist.length" class="tutorial__checklist">
                <li v-for="item in checklist" :key="item.label" :class="{ 'tutorial__check--on': item.done }">
                  <StatusMark :done="item.done" />
                  {{ item.label }}
                </li>
              </ul>

              <template v-if="currentStep.id === 'goal' || currentStep.id === 'reward'">
                <p v-if="!firstNode" class="caption">Add a map first.</p>
                <label v-else-if="currentStep.id === 'goal'" class="campaign-editor__field">
                  <span>Target (%)</span>
                  <div class="campaign-editor__slider-row">
                    <input v-model.number="goalPct" type="range" min="70" max="100" step="0.1" @change="commitGoal" />
                    <input v-model.number.lazy="goalPct" type="number" min="70" max="100" step="0.1"
                      @change="commitGoal" />
                  </div>
                </label>
                <label v-else class="campaign-editor__field">
                  <span>XP</span>
                  <div class="campaign-editor__slider-row">
                    <div class="campaign-editor__tag-chips">
                      <button
                        v-for="preset in [25, 50, 100]"
                        :key="preset"
                        type="button"
                        class="campaign-editor__chip"
                        :class="{ 'campaign-editor__chip--active': xpValue === preset }"
                        @click="setXpPreset(preset)"
                      >
                        {{ preset }}
                      </button>
                    </div>
                    <input v-model.number.lazy="xpValue" type="number" min="0" step="5" @change="commitXp" />
                  </div>
                </label>
              </template>

              <template v-if="currentStep.id === 'barrier'">
                <p v-if="!hasConnection" class="caption">Connect two maps first.</p>
                <template v-if="firstBarrier">
                  <label class="campaign-editor__field">
                    <span>Average Accuracy (%)</span>
                    <div class="campaign-editor__slider-row">
                      <input v-model.number="barrierPct" type="range" min="70" max="100" step="0.5"
                        @change="commitBarrierValue" />
                      <input v-model.number.lazy="barrierPct" type="number" min="70" max="100" step="0.5"
                        @change="commitBarrierValue" />
                    </div>
                  </label>
                  <div class="campaign-editor__field">
                    <span>Maps It Counts</span>
                    <div class="campaign-editor__tag-chips">
                      <button
                        v-for="n in nodesBeforeGate"
                        :key="n.id"
                        type="button"
                        class="campaign-editor__chip"
                        :class="{
                          'campaign-editor__chip--active':
                            firstBarrier.affectedCampaignDifficultyIds.includes(n.id),
                        }"
                        :aria-pressed="firstBarrier.affectedCampaignDifficultyIds.includes(n.id)"
                        @click="toggleWatched(n.id)"
                      >
                        {{ n.songName }}
                      </button>
                    </div>
                  </div>
                </template>
              </template>

              <ul v-if="currentStep.id === 'finish'" class="tutorial__trays">
                <li v-for="t in finishTrays" :key="t.icon">
                  <CampaignTrayIcon :name="t.icon" :size="16" />
                  <strong>{{ t.name }}</strong>
                  <span class="caption">{{ t.text }}</span>
                </li>
              </ul>
            </div>
          </Transition>

          <div class="tutorial__status">
          <Transition name="tutorial-status">
            <div v-if="celebrating" class="tutorial__done" role="status">
              <svg
                class="tutorial__done-check"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Done
            </div>
          </Transition>
          </div>

          <footer class="tutorial__foot">
            <BaseButton :disabled="stepIndex === 0" @click="goBack">Back</BaseButton>
            <span class="tutorial__foot-gap" />
            <BaseButton
              v-if="currentStep.id !== 'finish' && !stepDone[stepIndex]"
              @click="skipStep"
            >
              Skip Step
            </BaseButton>
            <BaseButton
              v-if="currentStep.id !== 'finish'"
              variant="primary"
              :disabled="!stepDone[stepIndex]"
              @click="goNext"
            >
              Next
            </BaseButton>
            <BaseButton v-else variant="primary" @click="finish">Finish</BaseButton>
          </footer>
        </aside>
      </div>
    </div>

    <MapPickerModal
      v-if="pickerOpen"
      title="Add Nodes"
      used-label="In campaign"
      :commit-label="(n) => `Add ${n} ${n === 1 ? 'Node' : 'Nodes'}`"
      @close="pickerOpen = false"
      @pick="handlePicked"
    />
  </BaseModal>
</template>

<style scoped>
.tutorial {
  display: flex;
  flex-direction: column;
  height: min(760px, calc(100vh - var(--space-xl) * 2));
  margin: calc(var(--space-lg) * -1);
  overflow: hidden;
  outline: none;
}

.tutorial__head {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
  padding: var(--space-md) var(--space-md) var(--space-md) var(--space-lg);
}

.tutorial__progress {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-left: auto;
}

.tutorial__progress-seg {
  width: 26px;
  height: 3px;
  border-radius: var(--radius-pill);
  background: var(--bg-overlay);
  transition: background-color var(--dur-fast) var(--ease-out);
}

.tutorial__progress-seg--current {
  background: color-mix(in srgb, var(--tutorial-accent) 45%, var(--bg-overlay));
}

.tutorial__progress-seg--done {
  background: var(--tutorial-accent);
}

.tutorial__body {
  display: flex;
  flex: 1;
  min-height: 0;
}

.tutorial__stage {
  position: relative;
  flex: 1;
  min-width: 0;
  background: var(--bg-base);
  overflow: hidden;
}

.tutorial__add-cluster {
  display: inline-flex;
  gap: var(--space-sm);
  pointer-events: auto;
}

.tutorial__attn,
.tutorial__attn:hover:not(:disabled) {
  border-color: var(--tutorial-accent);
  animation: tutorial-attn-pulse 1.6s ease-in-out infinite;
}

.tutorial__armed,
.tutorial__armed:hover:not(:disabled) {
  color: var(--warning);
  border-color: var(--warning);
}

.tutorial__mode {
  position: absolute;
  top: var(--space-md);
  left: 50%;
  transform: translateX(-50%);
  z-index: 4;
}

@keyframes tutorial-attn-pulse {
  0%,
  100% {
    background-color: color-mix(in srgb, var(--tutorial-accent) 10%, transparent);
  }
  50% {
    background-color: color-mix(in srgb, var(--tutorial-accent) 28%, transparent);
  }
}

.tutorial__panel {
  display: flex;
  flex-direction: column;
  width: 340px;
  flex-shrink: 0;
  background: var(--bg-surface);
}

.tutorial__step {
  flex: 1;
  padding: var(--space-lg);
  overflow-y: auto;
}

.tutorial__step-title {
  margin: 0 0 var(--space-sm);
  font-weight: 650;
  color: var(--text-primary);
}

.tutorial__step-body {
  margin: 0;
  font-size: var(--text-body);
  line-height: 1.55;
  color: var(--text-secondary);
}

.tutorial__checklist,
.tutorial__trays {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  margin: var(--space-md) 0 0;
  padding: 0;
  list-style: none;
}

.tutorial__checklist li,
.tutorial__trays li {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: var(--text-body);
  color: var(--text-secondary);
}

.tutorial__check--on,
.tutorial__trays strong {
  color: var(--text-primary);
}

.tutorial__trays strong {
  font-weight: 600;
}

.tutorial__step .campaign-editor__field,
.tutorial__step > .caption {
  margin-top: var(--space-md);
}

.tutorial__status {
  min-height: calc(var(--text-body) * 1.5 + var(--space-sm) * 2);
}

.tutorial__done {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin: 0 var(--space-lg);
  padding: var(--space-sm) 0;
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--success);
}

.tutorial__done-check polyline {
  stroke-dasharray: 24;
  stroke-dashoffset: 0;
  animation: tutorial-check-draw var(--dur-enter) var(--ease-out);
}

@keyframes tutorial-check-draw {
  from {
    stroke-dashoffset: 24;
  }
}

.tutorial__foot {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md) var(--space-lg);
}

.tutorial__foot-gap {
  flex: 1;
}

.tutorial-step-fwd-enter-active,
.tutorial-step-back-enter-active {
  transition:
    opacity var(--dur-fast) var(--ease-out),
    transform var(--dur-fast) var(--ease-out);
}

.tutorial-step-fwd-leave-active,
.tutorial-step-back-leave-active {
  transition:
    opacity var(--dur-fast) var(--ease-out)-in,
    transform var(--dur-fast) var(--ease-out)-in;
}

.tutorial-step-fwd-enter-from {
  opacity: 0;
  transform: translateX(10px);
}

.tutorial-step-fwd-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

.tutorial-step-back-enter-from {
  opacity: 0;
  transform: translateX(-10px);
}

.tutorial-step-back-leave-to {
  opacity: 0;
  transform: translateX(10px);
}

.tutorial-status-enter-active {
  transition:
    opacity var(--dur-fast) var(--ease-out),
    transform var(--dur-fast) var(--ease-out);
}

.tutorial-status-leave-active {
  transition: opacity var(--dur-fast) var(--ease-out)-in;
}

.tutorial-status-enter-from {
  opacity: 0;
  transform: translateY(4px);
}

.tutorial-status-leave-to {
  opacity: 0;
}

@media (max-width: 860px) {
  .tutorial__head {
    flex-wrap: wrap;
    gap: var(--space-sm);
    padding: var(--space-sm) var(--space-md);
  }

  .tutorial__body {
    flex-direction: column;
  }

  .tutorial__stage {
    flex: none;
    height: 42%;
    min-height: 220px;
  }

  .tutorial__panel {
    flex: 1;
    width: auto;
    min-height: 0;
  }

  .tutorial__step {
    padding: var(--space-md);
  }

}

@media (prefers-reduced-motion: reduce) {
  .tutorial__done-check polyline,
  .tutorial__attn {
    animation: none;
  }

  .tutorial-step-fwd-enter-active,
  .tutorial-step-fwd-leave-active,
  .tutorial-step-back-enter-active,
  .tutorial-step-back-leave-active,
  .tutorial-status-enter-active,
  .tutorial-status-leave-active,
  .tutorial__progress-seg {
    transition: none;
  }
}
</style>
