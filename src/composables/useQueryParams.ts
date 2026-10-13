import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

export function useQueryParams() {
  const route = useRoute()
  const router = useRouter()

  function setQuery(patch: Record<string, string | undefined>) {
    const query = { ...route.query, ...patch }
    delete query.page
    router.replace({ query })
  }

  function queryRef<T extends string>(key: string) {
    return computed<T | ''>({
      get: () => (route.query[key] as T) || '',
      set: (value) => setQuery({ [key]: value || undefined }),
    })
  }

  return { setQuery, queryRef }
}
