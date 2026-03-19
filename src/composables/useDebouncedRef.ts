import { onUnmounted, ref, watch, type Ref } from 'vue'

export function useDebouncedRef<T>(source: Ref<T>, delayMs = 300): Ref<T> {
  const debounced = ref(source.value) as Ref<T>
  let timeout: ReturnType<typeof setTimeout> | null = null

  watch(source, (val) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => {
      debounced.value = val
    }, delayMs)
  })

  onUnmounted(() => {
    if (timeout) clearTimeout(timeout)
  })

  return debounced
}
