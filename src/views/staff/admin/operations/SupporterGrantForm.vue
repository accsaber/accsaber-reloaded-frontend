<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import type { SupporterGrantInput } from '@/composables/useSupporterAdmin'
import type { KofiEventType, SupporterTierResponse } from '@/types/api/supporters'
import { KOFI_EVENT_TYPES, KOFI_EVENT_TYPE_DISPLAY } from '@/types/api/supporters'
import { formatCents } from '@/utils/formatters'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  tiers: SupporterTierResponse[]
  submitting: boolean
}>()

const emit = defineEmits<{
  submit: [input: SupporterGrantInput]
}>()

const tierKey = ref('')
const amount = ref('')
const typeKey = ref('donation')
const fromName = ref('')
const email = ref('')
const note = ref('')

const tierOptions = computed(() =>
  props.tiers.map((tier) => ({
    value: tier.tierKey,
    label: tier.displayName,
    description: `${formatCents(tier.monthlyCostCents)} per month`,
  })),
)

const typeOptions = KOFI_EVENT_TYPES.map((value) => ({
  value,
  label: KOFI_EVENT_TYPE_DISPLAY[value],
}))

const selectedTier = computed(
  () => props.tiers.find((tier) => tier.tierKey === tierKey.value) ?? null,
)

const amountCents = computed(() => {
  const parsed = Number(amount.value)
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0
})

const canSubmit = computed(() => !!selectedTier.value && amountCents.value >= 1)

watch(selectedTier, (tier) => {
  if (tier) amount.value = (tier.monthlyCostCents / 100).toFixed(2)
})

function toEventType(value: string): KofiEventType {
  return KOFI_EVENT_TYPES.find((known) => known === value) ?? 'donation'
}

function submit() {
  const tier = selectedTier.value
  if (!tier || !canSubmit.value) return
  emit('submit', {
    amountCents: amountCents.value,
    tierName: tier.displayName,
    type: toEventType(typeKey.value),
    fromName: fromName.value.trim() || undefined,
    email: email.value.trim() || undefined,
    note: note.value.trim() || undefined,
  })
}
</script>

<template>
  <div class="grant">
    <div class="grant__row">
      <BaseSelect v-model="tierKey" label="Tier" :options="tierOptions" placeholder="Pick a tier" />
      <BaseInput v-model="amount" label="Amount" type="number" min="0" step="0.01" placeholder="0.00" />
      <BaseSelect v-model="typeKey" label="Type" :options="typeOptions" />
    </div>
    <div class="grant__row">
      <BaseInput v-model="fromName" label="From name" placeholder="Optional" />
      <BaseInput v-model="email" label="Email" placeholder="Optional" />
      <BaseInput v-model="note" label="Note" placeholder="Optional" />
    </div>
    <BaseButton variant="primary" :loading="submitting" :disabled="!canSubmit" @click="submit">
      Grant supporter
    </BaseButton>
  </div>
</template>

<style scoped>
.grant {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  align-items: flex-start;
}

.grant__row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--space-md);
  width: 100%;
}
</style>
