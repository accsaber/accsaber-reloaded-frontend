<script setup lang="ts">
import { parseApiError } from '@/api/client'
import IconButton from '@/components/common/IconButton.vue'
import { REJECT_REASON_MAX } from '@/utils/constants'
import { nextTick, ref } from 'vue'

const props = defineProps<{
  reason?: string
  save?: (reason: string) => Promise<void>
  clamp?: boolean
}>()

const field = ref<HTMLTextAreaElement | null>(null)
const editing = ref(false)
const draft = ref('')
const saving = ref(false)
const error = ref('')

async function start() {
  draft.value = props.reason ?? ''
  error.value = ''
  editing.value = true
  await nextTick()
  field.value?.focus()
}

function cancel() {
  editing.value = false
}

async function commit() {
  if (!editing.value || saving.value || !props.save) return
  const next = draft.value.trim()
  if (!next || next === props.reason) return cancel()
  saving.value = true
  error.value = ''
  try {
    await props.save(next)
    editing.value = false
  } catch (err) {
    error.value = parseApiError(err, 'Could not save the reason').message
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <span class="reason" :class="{ 'reason--clamp': clamp }">
    <label v-if="editing" class="reason__edit">
      <span aria-hidden="true">{{ draft }} </span>
      <textarea ref="field" v-model="draft" class="inline-edit" rows="1" :maxlength="REJECT_REASON_MAX" aria-label="Reason"
        :disabled="saving" @keydown.enter.exact.prevent="commit" @keydown.escape.prevent="cancel" @blur="commit" />
    </label>
    <span v-else class="reason__text" :class="{ 'reason__text--none': !reason }" :title="clamp ? reason : undefined">
      {{ reason ?? (save ? 'Add a reason' : '-') }}
    </span>
    <IconButton v-if="save && !editing" icon="edit" label="Edit Reason" title="Edit Reason" @click="start" />
    <span v-if="error" class="caption reason__error" role="alert">{{ error }}</span>
  </span>
</template>

<style scoped>
.reason {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0 var(--space-sm);
  min-width: 0;
  min-height: var(--reason-action);
  --reason-action: 28px;
  font-size: var(--text-body);
  line-height: 1.5;
  color: var(--text-secondary);
}

.reason--clamp {
  flex-wrap: nowrap;
}

.reason__text,
.reason__edit {
  min-width: 0;
}

.reason__text {
  max-width: calc(100% - var(--reason-action) - var(--space-sm));
}

.reason__edit {
  flex: 1;
  margin-right: calc(var(--reason-action) + var(--space-sm));
}

.reason__text,
.reason__edit > * {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.reason--clamp .reason__text,
.reason--clamp .reason__edit > * {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reason__text--none {
  color: var(--text-tertiary);
}

.reason__edit {
  display: grid;
  margin-bottom: -2px;
}

.reason__edit > * {
  grid-area: 1 / 1;
  min-width: 0;
  font: inherit;
  color: inherit;
}

.reason__edit > span {
  visibility: hidden;
  border-bottom: 2px solid transparent;
}

.reason__edit > textarea {
  resize: none;
}

.reason__error {
  flex-basis: 100%;
  color: var(--error);
}
</style>
