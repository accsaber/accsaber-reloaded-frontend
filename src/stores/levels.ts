import type { LevelThreshold } from '@/api/levels'
import { getLevelThresholds } from '@/api/levels'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export function tierKey(title: string): string {
  return title.toLowerCase().replace(/\s+/g, '-')
}

export const useLevelStore = defineStore('levels', () => {
  const thresholds = ref<LevelThreshold[]>([])
  const loaded = ref(false)

  function getTitleForLevel(level: number): string | null {
    if (thresholds.value.length === 0) return null
    let match = thresholds.value[0]
    for (const t of thresholds.value) {
      if (t.level <= level) match = t
      else break
    }
    return match.title
  }

  function getTierColorForLevel(level: number | null | undefined): string {
    if (level == null) return 'var(--text-primary)'
    const title = getTitleForLevel(level)
    return title ? `var(--tier-${tierKey(title)})` : 'var(--text-primary)'
  }

  async function fetchThresholds(): Promise<void> {
    try {
      const data = await getLevelThresholds()
      thresholds.value = [...data].sort((a, b) => a.level - b.level)
      loaded.value = true
    } catch {
    }
  }

  return {
    thresholds,
    loaded,
    getTitleForLevel,
    getTierColorForLevel,
    fetchThresholds,
  }
})
