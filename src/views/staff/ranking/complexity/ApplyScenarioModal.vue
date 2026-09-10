<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import type { EstimateScenario } from '@/types/api/complexity'
import { CX_DECIMALS, SCENARIO_LABELS } from '@/utils/complexity'
import { formatCount, formatFixed } from '@/utils/formatters'
import { computed, ref, watch } from 'vue'

const DEFAULT_STEP = 0.5

const props = defineProps<{
  open: boolean
  scenario: EstimateScenario
  moving: number
  total: number
  version: string | null
  submitting?: boolean
  error?: string
}>()

const emit = defineEmits<{
  close: []
  confirm: [reason: string, maxStep: number | undefined]
}>()

const reason = ref('')
const maxStep = ref(DEFAULT_STEP)
const capped = ref(true)

const defaultReason = computed(() =>
  props.version
    ? `${SCENARIO_LABELS[props.scenario]} (${props.version})`
    : SCENARIO_LABELS[props.scenario],
)

watch(() => props.open, (open) => {
  if (!open) return
  reason.value = defaultReason.value
  maxStep.value = DEFAULT_STEP
  capped.value = true
})

const stepValid = computed(() => !capped.value || maxStep.value > 0)

const canConfirm = computed(
  () => reason.value.trim().length > 0 && props.moving > 0 && stepValid.value,
)

function confirm() {
  emit('confirm', reason.value.trim(), capped.value ? maxStep.value : undefined)
}
</script>

<template>
  <BaseModal :open="open" :title="`Apply ${SCENARIO_LABELS[scenario]}`" max-width="560px"
    @close="emit('close')">
    <div class="apply-scenario">
      <p class="apply-scenario__summary">
        This reweights <strong>{{ formatCount(moving) }}</strong> of {{ formatCount(total) }} ranked
        difficulties to what {{ SCENARIO_LABELS[scenario].toLowerCase() }} says. Scores, boards,
        statistics and XP reprice afterwards.
      </p>

      <BaseInput v-model="reason" label="Reason" placeholder="Lands on every complexity history row" />

      <div class="apply-scenario__step">
        <BaseInput v-if="capped" class="apply-scenario__step-field" label="Step limit" type="number"
          step="0.1" min="0.1" :model-value="maxStep"
          @update:model-value="maxStep = Number($event)" />
        <label class="apply-scenario__switch">
          <input v-model="capped" type="checkbox" />
          Limit how far a map moves
        </label>
        <p class="apply-scenario__hint">
          <template v-if="capped">
            No map moves more than {{ formatFixed(maxStep, CX_DECIMALS) }} complexity this round.
          </template>
          <template v-else>
            Every map goes straight to its {{ SCENARIO_LABELS[scenario].toLowerCase() }} value.
          </template>
        </p>
      </div>

      <p v-if="error" class="apply-scenario__error">{{ error }}</p>
    </div>

    <template #footer>
      <div class="apply-scenario__actions">
        <BaseButton @click="emit('close')">Cancel</BaseButton>
        <BaseButton variant="primary" :disabled="!canConfirm" :loading="submitting" @click="confirm">
          Apply to the site
        </BaseButton>
      </div>
    </template>
  </BaseModal>
</template>

<style scoped>
.apply-scenario {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.apply-scenario__summary {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--text-body);
  line-height: 1.6;
}

.apply-scenario__summary strong {
  color: var(--text-primary);
  font-family: var(--font-mono);
}

.apply-scenario__step {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding-top: var(--space-md);
  border-top: 1px solid var(--bg-overlay);
}

.apply-scenario__step-field {
  max-width: 160px;
}

.apply-scenario__switch {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  color: var(--text-primary);
  font-size: var(--text-body);
  cursor: pointer;
}

.apply-scenario__hint {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--text-caption);
  line-height: 1.5;
}

.apply-scenario__error {
  margin: 0;
  color: var(--error);
  font-size: var(--text-body);
}

.apply-scenario__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-sm);
}
</style>
