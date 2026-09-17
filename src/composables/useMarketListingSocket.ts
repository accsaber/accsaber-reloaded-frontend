import { useSocket } from '@/composables/useSocket'
import type { MarketListingEvent } from '@/types/api/market'
import type { ConnectionStatus } from '@/types/display'
import { toValue, type MaybeRefOrGetter, type Ref } from 'vue'

export interface MarketSocketHandlers {
  onEvent: (event: MarketListingEvent) => void
  onReconnect?: () => void
}

interface UseMarketListingSocketReturn {
  status: Ref<ConnectionStatus>
}

export function useMarketListingSocket(
  listingId: MaybeRefOrGetter<string | null | undefined>,
  handlers: MarketSocketHandlers,
): UseMarketListingSocketReturn {
  const { status } = useSocket<MarketListingEvent>({
    path: '/ws/market',
    params: () => {
      const id = toValue(listingId)
      return id ? { listingId: id } : null
    },
    onMessage: handlers.onEvent,
    onReconnect: handlers.onReconnect,
  })

  return { status }
}
