<script setup lang="ts">
import { parseApiError } from '@/api/client'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import BaseSwitch from '@/components/common/BaseSwitch.vue'
import ClanProfileForm from '@/components/domain/ClanProfileForm.vue'
import type { ClanMediaKind, ClanResponse } from '@/types/api/clans'
import { clanDraftFrom, type ClanProfileDraft } from '@/utils/clans'
import { ref, watch } from 'vue'

const props = defineProps<{
  open: boolean
  clan: ClanResponse
}>()

const emit = defineEmits<{
  close: []
  saved: [clan: ClanResponse]
}>()

const MEDIA: { key: ClanMediaKind; field: 'iconUrl' | 'bannerUrl'; label: string }[] = [
  { key: 'icon', field: 'iconUrl', label: 'Remove the Icon' },
  { key: 'banner', field: 'bannerUrl', label: 'Remove the Banner' },
]

const draft = ref<ClanProfileDraft>(clanDraftFrom(props.clan.clan, props.clan.description))
const removeMedia = ref<ClanMediaKind[]>([])
const reason = ref('')
const busy = ref(false)
const error = ref<string | null>(null)
const fieldErrors = ref<Record<string, string>>({})

watch(
  () => props.open,
  (open) => {
    if (!open) return
    draft.value = clanDraftFrom(props.clan.clan, props.clan.description)
    removeMedia.value = []
    reason.value = ''
    error.value = null
    fieldErrors.value = {}
  },
)

function toggleMedia(kind: ClanMediaKind, remove: boolean) {
  removeMedia.value = remove ? [...removeMedia.value, kind] : removeMedia.value.filter((k) => k !== kind)
}

async function save() {
  if (!reason.value.trim()) return
  busy.value = true
  error.value = null
  fieldErrors.value = {}
  try {
    const { moderateClan } = await import('@/api/admin/clans')
    const saved = await moderateClan(props.clan.clan.id, {
      changes: {
        name: draft.value.name.trim(),
        tag: draft.value.tag,
        description: draft.value.description,
        tagColor: draft.value.tagColor,
        primaryColor: draft.value.primaryColor,
        secondaryColor: draft.value.secondaryColor,
      },
      removeMedia: removeMedia.value,
      reason: reason.value.trim(),
    })
    emit('saved', saved)
  } catch (err) {
    const parsed = parseApiError(err, 'Could not moderate that clan')
    const errors: Record<string, string> = {}
    for (const fe of parsed.fieldErrors) errors[fe.field.replace(/^changes\./, '')] = fe.message
    fieldErrors.value = errors
    if (parsed.fieldErrors.length === 0) error.value = parsed.message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <BaseModal :open="open" :title="`Moderate ${clan.clan.name}`" max-width="560px" @close="emit('close')">
    <div class="moderate">
      <ClanProfileForm v-model="draft" :field-errors="fieldErrors" :equipped="clan.clan.equipped" :disabled="busy" />
      <BaseSwitch v-for="media in MEDIA.filter((m) => clan.clan[m.field])" :key="media.key" :model-value="removeMedia.includes(media.key)"
        :label="media.label" :disabled="busy" @update:model-value="toggleMedia(media.key, $event)" />
      <BaseInput
        v-model="reason"
        label="Reason"
        maxlength="500"
        :error="fieldErrors.reason"
      />
      <p v-if="error" class="moderate__error" role="alert">{{ error }}</p>
    </div>
    <template #footer>
      <BaseButton :disabled="busy" @click="emit('close')">Cancel</BaseButton>
      <BaseButton variant="primary" :loading="busy" :disabled="!reason.trim()" @click="save">Save</BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.moderate {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.moderate__error {
  margin: 0;
  color: var(--error);
}
</style>
