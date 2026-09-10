<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import { CX_DECIMALS } from '@/utils/complexity'
import { formatCount, formatFixed } from '@/utils/formatters'
import { computed, ref, watch } from 'vue'

const DEFAULT_STEP = 0.5

const props = defineProps<{
  open: boolean
  batchName: string | null
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

const defaultReason = computed(() => {
  const round = props.batchName ? `${props.batchName} round` : 'Full ranked pool'
  return props.version ? `${round} (${props.version})` : round
})

watch(() => props.open, (open) => {
  if (!open) return
  reason.value = defaultReason.value
  maxStep.value = DEFAULT_STEP
  capped.value = true
})

const canConfirm = computed(
  () => reason.value.trim().length > 0 && props.moving > 0 && (!capped.value || maxStep.value > 0),
)

function confirm() {
  emit('confirm', reason.value.trim(), capped.value ? maxStep.value : undefined)
}
</script>

<template>
  <BaseModal :open="open" title="Apply the script" max-width="560px" @close="emit('close')">
    <div class="apply-script">
      <p class="apply-script__summary">
        <template v-if="batchName">
          This reweights <strong>{{ formatCount(moving) }}</strong> of the
          {{ formatCount(total) }} maps in {{ batchName }} to what the script says.
        </template>
        <template v-else>
          No batch is selected, so this reweights <strong>{{ formatCount(moving) }}</strong> of the
          {{ formatCount(total) }} maps in the whole ranked pool.
        </template>
      </p>

      <BaseInput v-model="reason" label="Reason" placeholder="Lands on every complexity history row" />

      <div class="apply-script__step">
        <BaseInput v-if="capped" class="apply-script__step-field" label="Step limit" type="number"
          step="0.1" min="0.1" :model-value="maxStep"
          @update:model-value="maxStep = Number($event)" />
        <label class="apply-script__switch">
          <input v-model="capped" type="checkbox" />
          Limit how far a map moves
        </label>
        <p class="apply-script__hint">
          <template v-if="capped">
            No map moves more than {{ formatFixed(maxStep, CX_DECIMALS) }} complexity this round, so
            a map whose leaderboard keeps grinding settles over several rounds.
          </template>
          <template v-else>
            Every map goes straight to the number the script gives it.
          </template>
        </p>
      </div>

      <p class="apply-script__effect">
        Applying reprices every affected player's scores, statistics, rankings, milestones and XP in
        the background.
      </p>

      <p v-if="error" class="apply-script__error">{{ error }}</p>
    </div>

    <template #footer>
      <div class="apply-script__actions">
        <BaseButton @click="emit('close')">Cancel</BaseButton>
        <BaseButton variant="primary" :disabled="!canConfirm" :loading="submitting" @click="confirm">
          Apply to the site
        </BaseButton>
      </div>
    </template>
  </BaseModal>
</template>

<style scoped>
.apply-script {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.apply-script__summary,
.apply-script__effect {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--text-body);
  line-height: 1.6;
}

.apply-script__summary strong {
  color: var(--text-primary);
  font-family: var(--font-mono);
}

.apply-script__effect {
  padding-top: var(--space-md);
  border-top: 1px solid var(--bg-overlay);
}

.apply-script__step {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding-top: var(--space-md);
  border-top: 1px solid var(--bg-overlay);
}

.apply-script__step-field {
  max-width: 160px;
}

.apply-script__switch {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  color: var(--text-primary);
  font-size: var(--text-body);
  cursor: pointer;
}

.apply-script__hint {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--text-caption);
  line-height: 1.5;
}

.apply-script__error {
  margin: 0;
  color: var(--error);
  font-size: var(--text-body);
}

.apply-script__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-sm);
}
</style>
