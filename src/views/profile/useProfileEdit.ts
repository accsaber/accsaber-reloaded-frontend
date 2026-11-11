import { parseApiError } from '@/api/client'
import type { ProfileUpdateRequest, UserResponse } from '@/types/api/users'
import { ref, type Ref } from 'vue'

const NAME_MAX = 64

export function useProfileEdit(user: Ref<UserResponse | null>, bioLimit: Ref<number>) {
  const editing = ref(false)
  const name = ref('')
  const bio = ref('')
  const saving = ref(false)
  const error = ref<string | null>(null)

  function start() {
    if (!user.value) return
    name.value = user.value.name
    bio.value = user.value.bio ?? ''
    error.value = null
    editing.value = true
  }

  function cancel() {
    editing.value = false
    error.value = null
  }

  function invalid(trimmed: string): string | null {
    if (!trimmed) return 'Name cannot be empty.'
    if (trimmed.length > NAME_MAX) return `Name must be ${NAME_MAX} characters or fewer.`
    if (bio.value.length > bioLimit.value) return `Bio is over the ${bioLimit.value.toLocaleString()} character limit.`
    return null
  }

  async function save() {
    const current = user.value
    if (!current || saving.value) return
    const trimmed = name.value.trim()
    error.value = invalid(trimmed)
    if (error.value) return
    const body: ProfileUpdateRequest = {}
    if (trimmed !== current.name) body.name = trimmed
    if (bio.value !== (current.bio ?? '')) body.bio = bio.value
    if (!Object.keys(body).length) return cancel()
    saving.value = true
    try {
      const { updateMyProfile } = await import('@/api/users')
      await updateMyProfile(body)
      if (user.value?.id === current.id) user.value = { ...current, ...body }
      editing.value = false
    } catch (err) {
      error.value = parseApiError(err, 'Could not save your profile.').message
    } finally {
      saving.value = false
    }
  }

  return { editing, name, bio, saving, error, start, cancel, save }
}
