import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

type QueryValue = string | string[] | undefined

export function useQueryParams() {
  const route = useRoute()
  const router = useRouter()

  function setQuery(patch: Record<string, QueryValue>) {
    const query = { ...route.query }
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) delete query[key]
      else query[key] = value
    }
    delete query.page
    router.replace({ query })
  }

  function queryRef<T extends string>(key: string) {
    return computed<T | ''>({
      get: () => (route.query[key] as T) || '',
      set: (value) => setQuery({ [key]: value }),
    })
  }

  function queryListRef<T extends string>(key: string) {
    return computed<T[]>({
      get: () => {
        const value = route.query[key]
        if (!value) return []
        return (Array.isArray(value) ? value : [value]).filter((v): v is T => typeof v === 'string')
      },
      set: (value) => setQuery({ [key]: value }),
    })
  }

  return { setQuery, queryRef, queryListRef }
}
