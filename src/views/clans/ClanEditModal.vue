<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import type { ClanResponse, UpdateClanRequest } from '@/types/api/clans'
import { ref, watch } from 'vue'
import ClanProfileForm from '@/components/domain/ClanProfileForm.vue'
import { clanDraftFrom, emptyClanDraft, type ClanProfileDraft } from '@/utils/clans'

const props = defineProps<{
  open: boolean
  clan: ClanResponse
  saving: boolean
  error: string | null
  fieldErrors: Record<string, string>
  uploadIcon: (file: File) => Promise<void>
  removeIcon: () => Promise<void>
}>()

const emit = defineEmits<{
  save: [request: UpdateClanRequest]
  close: []
}>()

const draft = ref<ClanProfileDraft>(emptyClanDraft())
const acceptingRequests = ref(true)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    draft.value = clanDraftFrom(props.clan.clan, props.clan.description)
    acceptingRequests.value = props.clan.acceptingRequests
  },
  { immediate: true },
)

function save() {
  emit('save', {
    name: draft.value.name.trim(),
    tag: draft.value.tag,
    description: draft.value.description,
    tagColor: draft.value.tagColor,
    primaryColor: draft.value.primaryColor,
    secondaryColor: draft.value.secondaryColor,
    acceptingRequests: acceptingRequests.value,
  })
}
</script>

<template>
  <BaseModal :open="open" title="Edit clan" max-width="520px" @close="emit('close')">
    <ClanProfileForm
      v-model="draft"
      :field-errors="fieldErrors"
      :icon-url="clan.clan.iconUrl"
      :upload-icon="uploadIcon"
      :remove-icon="removeIcon"
      :equipped="clan.clan.equipped"
      :disabled="saving"
    />

    <label class="clan-edit__toggle">
      <input v-model="acceptingRequests" type="checkbox" :disabled="saving" />
      <span>Take join requests</span>
    </label>

    <p v-if="error" class="clan-edit__error" role="alert">{{ error }}</p>

    <template #footer>
      <BaseButton :disabled="saving" @click="emit('close')">Cancel</BaseButton>
      <BaseButton variant="primary" :loading="saving" @click="save">Save</BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.clan-edit__toggle {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-top: var(--space-md);
  font-size: var(--text-body);
  color: var(--text-primary);
  cursor: pointer;
}

.clan-edit__toggle input {
  accent-color: var(--page-accent, var(--accent));
}

.clan-edit__error {
  margin: var(--space-sm) 0 0;
  font-size: var(--text-caption);
  color: var(--error);
}
</style>
