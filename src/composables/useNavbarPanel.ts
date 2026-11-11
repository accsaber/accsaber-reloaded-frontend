import { useClickOutside } from '@/composables/useClickOutside'
import { ref, watch, type Ref } from 'vue'
import { useRoute } from 'vue-router'

export function useNavbarPanel(open: Ref<boolean> = ref(false)) {
  const rootRef = ref<HTMLElement | null>(null)
  const route = useRoute()

  function close() {
    open.value = false
  }

  useClickOutside(rootRef, open, close)
  watch(() => route.fullPath, close)

  return { open, rootRef }
}
