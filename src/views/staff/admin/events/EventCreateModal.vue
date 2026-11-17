<script setup lang="ts">
import { parseApiError } from '@/api/client'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import BaseTextarea from '@/components/common/BaseTextarea.vue'
import type { EventRequest, EventResponse } from '@/types/api/events'
import { localInputToIso, slugify } from '@/utils/events'
import { computed, ref, watch } from 'vue'

const props = defineProps<{ open: boolean }>()

const emit = defineEmits<{
  close: []
  created: [event: EventResponse]
}>()

const title = ref('')
const slug = ref('')
const slugTouched = ref(false)
const description = ref('')
const startsAt = ref('')
const endsAt = ref('')
const bonusXp = ref('')

const submitting = ref(false)
const formError = ref('')
const slugError = ref('')

const slugPreview = computed(() => slugify(slug.value))

watch(title, (value) => {
  if (!slugTouched.value) slug.value = slugify(value)
})

function onSlugInput(value: string | number) {
  slug.value = String(value)
  slugTouched.value = true
  slugError.value = ''
}

function reset() {
  title.value = ''
  slug.value = ''
  slugTouched.value = false
  description.value = ''
  startsAt.value = ''
  endsAt.value = ''
  bonusXp.value = ''
  formError.value = ''
  slugError.value = ''
  submitting.value = false
}

watch(
  () => props.open,
  (open) => {
    if (open) reset()
  },
)

function buildPayload(): EventRequest | null {
  if (!title.value.trim()) {
    formError.value = 'A title is needed'
    return null
  }
  const startIso = localInputToIso(startsAt.value)
  const endIso = localInputToIso(endsAt.value)
  if (!startIso || !endIso) {
    formError.value = 'Set both the start and the end'
    return null
  }
  if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
    formError.value = 'The end has to be after the start'
    return null
  }
  const payload: EventRequest = {
    title: title.value.trim(),
    startsAt: startIso,
    endsAt: endIso,
  }
  if (slug.value.trim()) payload.slug = slug.value.trim()
  if (description.value.trim()) payload.description = description.value.trim()
  const xp = Number.parseInt(bonusXp.value, 10)
  if (bonusXp.value.trim() && Number.isFinite(xp) && xp >= 0) payload.bonusXp = xp
  return payload
}

async function submit() {
  formError.value = ''
  slugError.value = ''
  const payload = buildPayload()
  if (!payload) return
  submitting.value = true
  try {
    const { createEvent } = await import('@/api/admin/events')
    const created = await createEvent(payload)
    emit('created', created)
  } catch (e) {
    const parsed = parseApiError(e, 'Could not create the event')
    const slugField = parsed.fieldErrors.find((f) => f.field === 'slug')
    if (slugField) {
      slugError.value = slugField.message
    } else if (parsed.status === 422 && /slug/i.test(parsed.message)) {
      slugError.value = parsed.message
    } else {
      formError.value = parsed.message
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <BaseModal :open="open" title="New Event" max-width="560px" @close="emit('close')">
    <form class="event-create" @submit.prevent="submit">
      <BaseInput v-model="title" label="Title" />
      <BaseInput :model-value="slug" label="Slug" :placeholder="slugPreview || 'Made from the title'" :error="slugError"
        @update:model-value="onSlugInput" />
      <BaseTextarea v-model="description" label="Description" :rows="3" />
      <div class="event-create__row">
        <BaseInput v-model="startsAt" type="datetime-local" label="Starts" />
        <BaseInput v-model="endsAt" type="datetime-local" label="Ends" />
      </div>
      <BaseInput v-model="bonusXp" type="number" min="0" step="1" label="Completion Bonus XP" placeholder="0" />
      <p class="caption event-create__error" role="alert">{{ formError }}</p>
    </form>

    <template #footer>
      <BaseButton @click="emit('close')">Cancel</BaseButton>
      <BaseButton variant="primary" :loading="submitting" @click="submit">Create</BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.event-create {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.event-create__row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-md);
}

.event-create__error {
  min-height: 1lh;
  color: var(--error);
}
</style>
