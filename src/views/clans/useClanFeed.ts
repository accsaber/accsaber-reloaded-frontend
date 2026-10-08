import { useSocket } from '@/composables/useSocket'
import type { ClanFeedFrame, ClanWarHitResponse, ClanWarResponse } from '@/types/api/clans'
import type { Ref } from 'vue'

const HEARTBEAT_MS = 30000

export function useClanFeed(
  clanId: Ref<string | null>,
  handlers: { onWar: (war: ClanWarResponse) => void; onHit?: (warId: string, hit: ClanWarHitResponse) => void },
) {
  function onFrame(frame: ClanFeedFrame) {
    if (frame.type === 'war') handlers.onWar(frame.data)
    else if (frame.type === 'hit') handlers.onHit?.(frame.warId, frame.data)
  }

  const { status } = useSocket<ClanFeedFrame>({
    path: '/ws/clans/feed',
    auth: false,
    heartbeatMs: HEARTBEAT_MS,
    params: () => (clanId.value ? { clanId: clanId.value } : null),
    onMessage: onFrame,
  })

  return { status }
}
