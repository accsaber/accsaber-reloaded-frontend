import { useConfirmAction } from '@/composables/useConfirmAction'
import { useAuthStore } from '@/stores/auth'
import type { PublicMapDifficultyResponse } from '@/types/api/maps'

type Suggestion = Pick<PublicMapDifficultyResponse, 'id' | 'songName' | 'status' | 'importedBy' | 'deactivatedAt'>

export function useWithdrawSuggestion() {
  const auth = useAuthStore()
  const { confirmModal, ask } = useConfirmAction()

  function canWithdraw(suggestion: Suggestion | null | undefined): boolean {
    return (
      !!suggestion &&
      !!auth.userId &&
      suggestion.importedBy?.id === auth.userId &&
      suggestion.status === 'SUGGESTED' &&
      !suggestion.deactivatedAt
    )
  }

  function askWithdraw(suggestion: Suggestion, done: () => void) {
    ask({
      title: 'Withdraw Suggestion',
      message: `${suggestion.songName} leaves the suggestions. You can suggest it again later.`,
      confirmLabel: 'Withdraw',
      destructive: true,
      run: async () => {
        const { withdrawSuggestion } = await import('@/api/maps')
        await withdrawSuggestion(suggestion.id)
        done()
      },
    })
  }

  return { confirmModal, canWithdraw, askWithdraw }
}
