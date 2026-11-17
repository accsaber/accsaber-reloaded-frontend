<script setup lang="ts">
import BaseSwitch from '@/components/common/BaseSwitch.vue'
import ClanColorField from '@/components/domain/ClanColorField.vue'
import type { ClanResponse } from '@/types/api/clans'
import { CLAN_COLOR_FIELDS, isPacifist, type ClanProfileDraft } from '@/utils/clans'
import { formatDuration } from '@/utils/formatters'
import { computed } from 'vue'

const draft = defineModel<ClanProfileDraft>({ required: true })
const acceptingRequests = defineModel<boolean>('acceptingRequests', { required: true })
const pacifism = defineModel<boolean>('pacifism', { required: true })

const props = defineProps<{
  clan: ClanResponse
  fieldErrors: Record<string, string>
  error: string | null
  disabled: boolean
}>()

const errors = computed(() =>
  [...new Set([...Object.values(props.fieldErrors), props.error])].filter((message): message is string => !!message),
)

const pacifismLabel = computed(() => {
  const from = props.clan.pacifistFrom
  if (!pacifism.value || !from || isPacifist(props.clan)) return 'Pacifism'
  return `Pacifism, on in ${formatDuration(new Date(from).getTime() - Date.now(), { zero: 'now' })}`
})
</script>

<template>
  <div class="header-editor">
    <div class="header-editor__row">
      <ClanColorField
        v-for="field in CLAN_COLOR_FIELDS"
        :key="field.key"
        :model-value="draft[field.key]"
        :label="field.label"
        :disabled="disabled"
        :error="fieldErrors[field.key]"
        @update:model-value="draft = { ...draft, [field.key]: $event }"
      />
      <BaseSwitch v-model="acceptingRequests" label="Take Join Requests" :disabled="disabled" />
      <BaseSwitch v-model="pacifism" :label="pacifismLabel" :disabled="disabled" />
    </div>

    <p v-for="message in errors" :key="message" class="caption header-editor__error" role="alert">{{ message }}</p>
  </div>
</template>

<style scoped>
.header-editor {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.header-editor__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm) var(--space-lg);
}

.header-editor__error {
  color: var(--error);
}
</style>
