<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import type { EstimateScenario } from '@/types/api/complexity'
import { SCENARIO_LABELS } from '@/utils/complexity'
import { formatCount } from '@/utils/formatters'
import { computed, ref, watch } from 'vue'

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
  confirm: [reason: string]
}>()

const reason = ref('')

const defaultReason = computed(() =>
  props.version
    ? `${SCENARIO_LABELS[props.scenario]} (${props.version})`
    : SCENARIO_LABELS[props.scenario],
)

watch(() => props.open, (open) => {
  if (open) reason.value = defaultReason.value
})

const canConfirm = computed(() => reason.value.trim().length > 0 && props.moving > 0)
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

      <p v-if="error" class="apply-scenario__error">{{ error }}</p>
    </div>

    <template #footer>
      <div class="apply-scenario__actions">
        <BaseButton @click="emit('close')">Cancel</BaseButton>
        <BaseButton variant="primary" :disabled="!canConfirm" :loading="submitting"
          @click="emit('confirm', reason.trim())">
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
