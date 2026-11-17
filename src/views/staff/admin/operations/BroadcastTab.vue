<script setup lang="ts">
import { parseApiError } from '@/api/client'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import NotificationRow from '@/components/domain/NotificationRow.vue'
import { useConfirmAction } from '@/composables/useConfirmAction'
import type { NotificationResponse } from '@/types/api/notifications'
import { formatCount } from '@/utils/formatters'
import ToolCard from './ToolCard.vue'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

const TITLE_MAX = 200
const LINK_MAX = 500

const router = useRouter()
const { confirmModal, ask } = useConfirmAction()

const title = ref('')
const linkTo = ref('')
const fieldErrors = ref<Record<string, string>>({})
const delivered = ref<number | null>(null)

const cleanTitle = computed(() => title.value.trim())
const cleanLink = computed(() => linkTo.value.trim())

const titleError = computed(() => fieldErrors.value.title ?? (title.value.length > TITLE_MAX ? `Keep it under ${TITLE_MAX} characters` : undefined))

const linkError = computed(() => {
  if (fieldErrors.value.linkTo) return fieldErrors.value.linkTo
  if (!cleanLink.value) return undefined
  if (!cleanLink.value.startsWith('/') || cleanLink.value.length > LINK_MAX) return `An in-app path starting with /, at most ${LINK_MAX} characters`
  return router.resolve(cleanLink.value).name === 'not-found' ? 'No page matches this path' : undefined
})

const canSend = computed(() => !!cleanTitle.value && !titleError.value && !linkError.value)

const preview = computed<NotificationResponse>(() => ({
  id: 'broadcast-preview',
  type: 'server',
  title: cleanTitle.value || 'Your announcement',
  linkTo: cleanLink.value || null,
  read: false,
  createdAt: new Date().toISOString(),
}))

function askSend() {
  fieldErrors.value = {}
  ask({
    title: 'Send to Everyone',
    message: `Send "${cleanTitle.value}" to every active player? It cannot be edited or recalled.`,
    confirmLabel: 'Send',
    run: async () => {
      const { broadcastNotification } = await import('@/api/admin/notifications')
      try {
        delivered.value = (await broadcastNotification({ title: cleanTitle.value, linkTo: cleanLink.value || null })).delivered
      } catch (err) {
        const parsed = parseApiError(err, 'The broadcast failed')
        fieldErrors.value = Object.fromEntries(parsed.fieldErrors.map((f) => [f.field, f.message]))
        throw err
      }
      title.value = ''
      linkTo.value = ''
    },
  })
}
</script>

<template>
  <ToolCard class="broadcast" title="Notify Every Player">
    <BaseInput v-model="title" label="Title" :maxlength="TITLE_MAX" :error="titleError" />
    <BaseInput v-model="linkTo" label="Link" placeholder="/news?post=example" :error="linkError" />
    <div class="broadcast__preview">
      <span class="field-label">Preview</span>
      <NotificationRow :notification="preview" :interactive="false" />
    </div>
    <template #actions>
      <BaseButton variant="primary" :disabled="!canSend" @click="askSend">Send Broadcast</BaseButton>
      <span v-if="delivered !== null" class="caption">Delivered to {{ formatCount(delivered) }} players</span>
    </template>
    <ConfirmModal v-bind="confirmModal" />
  </ToolCard>
</template>

<style scoped>
.broadcast {
  max-width: 640px;
}

.broadcast__preview {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}
</style>
