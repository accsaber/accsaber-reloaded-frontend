import type {
  KofiEventResponse,
  ManualSupporterGrantRequest,
  SupporterStateResponse,
  SupporterTierResponse,
} from '@/types/api/supporters'
import { describeFailure, makeOp, run } from '@/views/staff/admin/operations/operationState'
import { ref, watch } from 'vue'

const QUEUE_SIZE = 50
const HISTORY_SIZE = 50
const NEWEST_FIRST = 'receivedAt,DESC'

export type SupporterGrantInput = Omit<ManualSupporterGrantRequest, 'userId'>

export function useSupporterAdmin() {
  const tiers = ref<SupporterTierResponse[]>([])

  const queue = ref<KofiEventResponse[]>([])
  const queueLoading = ref(false)
  const queueError = ref<string | null>(null)

  const panelUserId = ref<string | null>(null)
  const account = ref<SupporterStateResponse | null>(null)
  const history = ref<KofiEventResponse[]>([])
  const panelLoading = ref(false)
  const panelError = ref<string | null>(null)

  const claiming = ref<Record<string, boolean>>({})
  const claimError = ref<string | null>(null)
  const grantOp = ref(makeOp())

  async function loadTiers() {
    try {
      const { getSupporterTiers } = await import('@/api/supporters')
      tiers.value = await getSupporterTiers()
    } catch (err) {
      queueError.value = describeFailure(err)
    }
  }

  async function loadQueue() {
    queueLoading.value = true
    try {
      const { getKofiEvents } = await import('@/api/admin/supporters')
      const page = await getKofiEvents({
        status: 'unclaimed',
        page: 0,
        size: QUEUE_SIZE,
        sort: NEWEST_FIRST,
      })
      queue.value = page.content
      queueError.value = null
    } catch (err) {
      queueError.value = describeFailure(err)
    } finally {
      queueLoading.value = false
    }
  }

  async function loadPanel(userId: string) {
    panelLoading.value = true
    try {
      const [{ getUserSupporter }, { getKofiEvents }] = await Promise.all([
        import('@/api/supporters'),
        import('@/api/admin/supporters'),
      ])
      const [state, page] = await Promise.all([
        getUserSupporter(userId),
        getKofiEvents({ userId, status: 'all', page: 0, size: HISTORY_SIZE, sort: NEWEST_FIRST }),
      ])
      account.value = state
      history.value = page.content
      panelError.value = null
    } catch (err) {
      panelError.value = describeFailure(err)
    } finally {
      panelLoading.value = false
    }
  }

  async function claim(kofiTransactionId: string, userId: string) {
    claiming.value[kofiTransactionId] = true
    claimError.value = null
    try {
      const { claimSupporterEvent } = await import('@/api/admin/supporters')
      await claimSupporterEvent({ kofiTransactionId, userId })
      queue.value = queue.value.filter((event) => event.kofiTransactionId !== kofiTransactionId)
      if (panelUserId.value === userId) await loadPanel(userId)
    } catch (err) {
      claimError.value = describeFailure(err)
    } finally {
      delete claiming.value[kofiTransactionId]
    }
  }

  async function grant(input: SupporterGrantInput) {
    const userId = panelUserId.value
    if (!userId) return
    await run(
      grantOp.value,
      async () => {
        const { grantSupporter } = await import('@/api/admin/supporters')
        await grantSupporter({ ...input, userId })
        await loadPanel(userId)
      },
      'Supporter granted.',
    )
  }

  watch(panelUserId, (userId) => {
    account.value = null
    history.value = []
    panelError.value = null
    grantOp.value = makeOp()
    if (userId) void loadPanel(userId)
  })

  void loadTiers()
  void loadQueue()

  return {
    tiers,
    queue,
    queueLoading,
    queueError,
    panelUserId,
    account,
    history,
    panelLoading,
    panelError,
    claiming,
    claimError,
    grantOp,
    loadQueue,
    claim,
    grant,
  }
}
