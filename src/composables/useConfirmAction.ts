import { parseApiError } from '@/api/client'
import { computed, ref, type Ref } from 'vue'

export interface PendingConfirm {
  title: string
  message: string
  confirmLabel: string
  destructive?: boolean
  typedConfirmation?: string
  blocked?: boolean
  run: () => Promise<void> | void
}

export function useConfirmAction(busy: Ref<boolean> = ref(false)) {
  const confirm = ref<PendingConfirm | null>(null)
  const confirmError = ref<string | null>(null)

  function ask(pending: PendingConfirm) {
    confirmError.value = null
    confirm.value = pending
  }

  async function runConfirm() {
    const pending = confirm.value
    if (!pending) return
    busy.value = true
    confirmError.value = null
    try {
      await pending.run()
      confirm.value = null
    } catch (err) {
      confirmError.value = parseApiError(err, 'That did not go through').message
    } finally {
      busy.value = false
    }
  }

  const confirmModal = computed(() => ({
    open: confirm.value !== null,
    title: confirm.value?.title ?? '',
    message: confirm.value?.message ?? '',
    confirmLabel: confirm.value?.confirmLabel ?? '',
    destructive: confirm.value?.destructive,
    typedConfirmation: confirm.value?.typedConfirmation,
    blocked: confirm.value?.blocked,
    loading: busy.value,
    error: confirmError.value,
    onConfirm: runConfirm,
    onClose: () => { confirm.value = null },
  }))

  return { confirmModal, ask }
}
