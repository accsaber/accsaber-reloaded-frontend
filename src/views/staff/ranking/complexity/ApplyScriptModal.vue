<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import BaseSwitch from '@/components/common/BaseSwitch.vue'
import BaseTabs from '@/components/common/BaseTabs.vue'
import type { Tab } from '@/types/display'
import type { MapDifficultyStatus } from '@/types/enums'
import { CX_DECIMALS } from '@/utils/complexity'
import { formatCount, formatFixed } from '@/utils/formatters'
import { computed, ref, watch } from 'vue'

const DEFAULT_STEP = 0.5

const props = defineProps<{
  open: boolean
  status: MapDifficultyStatus
  statuses: Tab[]
  counting?: boolean
  batchName: string | null
  moving: number
  total: number
  pinned: number
  version: string | null
  submitting?: boolean
  error?: string
}>()

const emit = defineEmits<{
  close: []
  confirm: [reason: string, maxStep: number | undefined]
  'update:status': [status: MapDifficultyStatus]
}>()

const SCOPE: Record<string, string> = {
  RANKED: 'the whole ranked pool',
  QUALIFIED: 'the qualified maps',
  QUEUE: 'the queue',
}
const REASON: Record<string, string> = {
  RANKED: 'Full ranked pool',
  QUALIFIED: 'Qualified maps',
  QUEUE: 'Queue maps',
}

const reason = ref('')
const maxStep = ref(DEFAULT_STEP)
const capped = ref(true)

const scoreless = computed(() => props.status !== 'RANKED')

const defaultReason = computed(() => {
  const scope = props.batchName ? `${props.batchName} round` : REASON[props.status]
  return props.version ? `${scope} (${props.version})` : scope
})

watch(() => props.open, (open) => {
  if (!open) return
  maxStep.value = DEFAULT_STEP
  capped.value = true
})

watch([() => props.open, defaultReason], ([open]) => {
  if (open) reason.value = defaultReason.value
})

const summary = computed(() => {
  const scope = props.batchName ?? SCOPE[props.status]
  const pinned = props.pinned ? `, ${formatCount(props.pinned)} pinned left alone` : ''
  return `${formatCount(props.moving)} of ${formatCount(props.total)} maps in ${scope} change${pinned}`
})

const effect = computed(() => {
  if (scoreless.value) return 'These maps have no scores, nothing is recalculated'
  const step = capped.value
    ? `No map moves more than ${formatFixed(maxStep.value, CX_DECIMALS)} this round`
    : 'Every map goes straight to the script number'
  return `${step}. Scores, statistics, rankings, milestones and XP update in the background`
})

const canConfirm = computed(
  () => !props.counting && reason.value.trim().length > 0 && props.moving > 0
    && (scoreless.value || !capped.value || maxStep.value > 0),
)

function confirm() {
  emit('confirm', reason.value.trim(), scoreless.value || !capped.value ? undefined : maxStep.value)
}
</script>

<template>
  <BaseModal :open="open" title="Apply Script" max-width="560px" @close="emit('close')">
    <form class="apply-script" @submit.prevent="canConfirm && confirm()">
      <BaseTabs variant="segmented" label="Maps to set" :tabs="statuses" :model-value="status"
        @update:model-value="emit('update:status', $event as MapDifficultyStatus)" />

      <p class="apply-script__summary" :class="{ refreshing: counting }">{{ summary }}</p>

      <BaseInput v-model="reason" label="Reason" />

      <div class="apply-script__step" :class="{ 'apply-script__step--off': scoreless }">
        <BaseSwitch v-model="capped" label="Limit How Far a Map Moves" :disabled="scoreless" />
        <BaseInput class="apply-script__step-field" label="Step Limit" type="number" step="0.1" min="0.1"
          :disabled="scoreless || !capped" :model-value="maxStep" @update:model-value="maxStep = Number($event)" />
      </div>

      <p class="caption apply-script__effect">{{ effect }}</p>
      <p class="caption apply-script__error" role="alert">{{ error }}</p>
    </form>

    <template #footer>
      <BaseButton @click="emit('close')">Cancel</BaseButton>
      <BaseButton variant="primary" :disabled="!canConfirm" :loading="submitting" @click="confirm">Apply</BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.apply-script {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-md);
}

.apply-script > :deep(.base-input) {
  align-self: stretch;
}

.apply-script__summary {
  margin: 0;
  font-size: var(--text-card-title);
  font-weight: 600;
  color: var(--text-primary);
}

.apply-script__step {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  align-self: stretch;
  gap: var(--space-md);
}

.apply-script__step :deep(.base-switch) {
  height: var(--control-h);
}

.apply-script__step-field {
  width: 140px;
}

.apply-script__effect {
  min-height: 2lh;
}

.apply-script__error {
  min-height: 1lh;
  color: var(--error);
}
</style>
