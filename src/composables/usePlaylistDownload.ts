import { buildQuery } from '@/api/utils'
import { useCategoryStore } from '@/stores/categories'
import type { UserScoresParams } from '@/types/api/users'
import { computed } from 'vue'

function triggerDownload(path: string, filename: string) {
  const baseUrl = import.meta.env.VITE_API_BASE as string
  const a = document.createElement('a')
  a.href = `${baseUrl}${path}`
  a.download = filename
  a.click()
}

export function usePlaylistDownload() {
  const categoryStore = useCategoryStore()

  const playlistCategories = computed(() =>
    categoryStore.categories
      .filter((c) => c.code !== 'xp')
      .map((c) => ({
        code: c.code,
        name: c.name,
        accent: categoryStore.getAccent(c.code),
      })),
  )

  function downloadPlaylist(categoryCode: string) {
    triggerDownload(
      `/playlists/${categoryCode}`,
      `accsaber-${categoryCode.replace('_', '-')}.json`,
    )
  }

  function downloadUnrankedPlaylist(categoryCode: string) {
    triggerDownload(
      `/playlists/unranked/${categoryCode}`,
      `accsaber-queued-${categoryCode.replace('_', '-')}.json`,
    )
  }

  function downloadMissingPlaylist(userId: string, categoryCode: string) {
    triggerDownload(
      `/playlists/missing/${userId}/${categoryCode}`,
      `accsaber-missing-${userId}-${categoryCode.replace('_', '-')}.bplist`,
    )
  }

  function downloadBatchPlaylist(batchId: string, batchName: string) {
    triggerDownload(
      `/playlists/batch/${batchId}`,
      `accsaber-${batchName.toLowerCase().replace(/[\s_]+/g, '-')}.bplist`,
    )
  }

  function downloadScoresPlaylist(userId: string, params: UserScoresParams) {
    triggerDownload(
      `/playlists/scores/${userId}${buildQuery(params)}`,
      `accsaber-scores-${userId}.bplist`,
    )
  }

  return {
    playlistCategories,
    downloadPlaylist,
    downloadUnrankedPlaylist,
    downloadMissingPlaylist,
    downloadBatchPlaylist,
    downloadScoresPlaylist,
  }
}
