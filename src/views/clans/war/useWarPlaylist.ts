import { parseApiError } from '@/api/client'
import type { ClanWarResponse } from '@/types/api/clans'
import { saveBlob } from '@/utils/download'
import { ref } from 'vue'

export function useWarPlaylist(war: () => ClanWarResponse) {
  const downloading = ref(false)
  const error = ref<string | null>(null)

  async function download() {
    const current = war()
    downloading.value = true
    error.value = null
    try {
      const { downloadClanWarPlaylist } = await import('@/api/clans')
      const file = await downloadClanWarPlaylist(current.id)
      saveBlob(file.blob, file.filename ?? `accsaber-war-${current.attack.lead.tag}-vs-${current.defend.lead.tag}.bplist`)
    } catch (err) {
      error.value = parseApiError(err, 'Could not download the playlist.').message
    } finally {
      downloading.value = false
    }
  }

  return { downloading, error, download }
}
