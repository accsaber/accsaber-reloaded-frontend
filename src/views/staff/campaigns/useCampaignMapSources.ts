import {
  addPlayerCampaignDifficulty,
  importCampaignMap,
  updateCampaignDifficultyMap,
} from '@/api/campaigns'
import { parseApiError } from '@/api/client'
import type { AddCampaignDifficultyRequest } from '@/types/api/admin'
import type { CampaignDifficultyResponse, ImportCampaignMapRequest } from '@/types/api/campaigns'
import type { PublicMapDifficultyResponse } from '@/types/api/maps'
import { enumToBsDifficulty, fetchBeatSaverMap, fetchMapLeaderboardIndex } from '@/utils/beatsaver'
import { computed, ref, type ComputedRef, type Ref } from 'vue'
import type { CampaignDocument } from './useCampaignDocument'
import type { CampaignSelection } from './useCampaignSelection'
import type { TrayId } from './useCampaignTrays'
import type { CampaignVertices } from './useCampaignVertices'

const GENRE_SLUG_OVERRIDES: Record<string, string> = {
  'r&b': 'rnb',
  'video game': 'video-game',
}

function toBeatsaverGenreSlug(name: string): string {
  const key = name.toLowerCase()
  if (GENRE_SLUG_OVERRIDES[key]) return GENRE_SLUG_OVERRIDES[key]
  return key
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

interface MapSourcesContext {
  doc: CampaignDocument
  selection: CampaignSelection
  vertices: CampaignVertices
  editable: ComputedRef<boolean>
  activeTray: Ref<TrayId | null>
}

export function useCampaignMapSources(ctx: MapSourcesContext) {
  const { campaign, actionPending, actionError, ensureCampaign, mergeDifficulty } = ctx.doc
  const { selectOnly, setSelection } = ctx.selection
  const { selectedDifficulty, allocateCells } = ctx.vertices
  const { editable, activeTray } = ctx

  const showMapPicker = ref(false)

  function openMapPicker() {
    if (!editable.value) return
    showMapPicker.value = true
  }

  function closeMapPicker() {
    showMapPicker.value = false
  }

  function selectCreated(ids: string[]) {
    if (ids.length === 1) {
      selectOnly(ids[0])
      activeTray.value = 'requirement'
    } else if (ids.length > 1) {
      setSelection(ids)
      activeTray.value = 'bulk'
    }
    showMapPicker.value = false
  }

  async function addNodesForDifficultyIds(
    mapDifficultyIds: string[],
    opts: { keepOpen?: boolean } = {},
  ): Promise<string[]> {
    if (mapDifficultyIds.length === 0) return []
    actionPending.value = true
    actionError.value = null
    try {
      let c = campaign.value
      if (!c || c.id === '') {
        c = await ensureCampaign()
        if (!c) return []
      }
      const campaignUuid = c.id
      const cells = allocateCells(mapDifficultyIds.length)
      const results = await Promise.allSettled(
        mapDifficultyIds.map((mapDifficultyId, i) => {
          const cell = cells[i] ?? { x: i, y: 0 }
          const req: AddCampaignDifficultyRequest = {
            mapDifficultyId,
            requirementType: 'ACC',
            requirementValue: 0.95,
            positionX: cell.x,
            positionY: cell.y,
            xp: 0,
          }
          return addPlayerCampaignDifficulty(campaignUuid, req)
        }),
      )
      const created = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []))
      if (created.length > 0 && campaign.value) {
        campaign.value = {
          ...campaign.value,
          difficulties: [...campaign.value.difficulties, ...created],
          difficultyCount: campaign.value.difficultyCount + created.length,
        }
      }
      const failed = results.find((r): r is PromiseRejectedResult => r.status === 'rejected')
      if (failed) throw failed.reason
      const createdIds = created.map((d) => d.id)
      if (!opts.keepOpen) selectCreated(createdIds)
      return createdIds
    } catch (err) {
      actionError.value = parseApiError(err, 'Failed to add nodes').message
      return []
    } finally {
      actionPending.value = false
    }
  }

  async function handleMapsPicked(picked: PublicMapDifficultyResponse[]) {
    await addNodesForDifficultyIds(picked.map((d) => d.id))
  }

  async function submitGlobalAdd(ids: ImportCampaignMapRequest): Promise<{ attached: boolean }> {
    const result = await importCampaignMap(ids)
    await addNodesForDifficultyIds([result.id], { keepOpen: true })
    return { attached: result.status !== 'CAMPAIGN' }
  }

  const usedMapDifficultyIds = computed(() =>
    (campaign.value?.difficulties ?? []).map((d) => d.mapDifficultyId),
  )

  const campaignGenreBeatsaverSlugs = computed(() =>
    (campaign.value?.tags ?? [])
      .filter((t) => t.kind === 'GENRE')
      .map((t) => toBeatsaverGenreSlug(t.name))
      .filter(Boolean),
  )

  const showRepoint = ref(false)
  const repointNodeId = ref<string | null>(null)

  function openRepoint(nodeId: string) {
    if (!editable.value) return
    repointNodeId.value = nodeId
    showRepoint.value = true
  }

  function closeRepoint() {
    showRepoint.value = false
    repointNodeId.value = null
  }

  async function submitRepoint(ids: ImportCampaignMapRequest): Promise<{ attached: boolean }> {
    const nodeId = repointNodeId.value
    if (!nodeId) throw new Error('No node selected to repoint')
    actionPending.value = true
    actionError.value = null
    try {
      mergeDifficulty(await updateCampaignDifficultyMap(nodeId, ids))
      closeRepoint()
      return { attached: false }
    } finally {
      actionPending.value = false
    }
  }

  async function latestVersionIds(
    d: CampaignDifficultyResponse,
    beatsaverCode: string,
  ): Promise<ImportCampaignMapRequest | null> {
    const map = await fetchBeatSaverMap(beatsaverCode)
    const hash = map.versions[0]?.hash
    if (!hash) throw new Error('Could not resolve the latest version from BeatSaver.')
    const index = await fetchMapLeaderboardIndex(hash)
    const key = `${enumToBsDifficulty(d.difficulty)}-${d.characteristic}`
    const bl = index.bl.get(key) ?? null
    const ssRaw = index.ss.get(key)
    if (!bl) return null
    return { blLeaderboardId: bl, ssLeaderboardId: ssRaw != null ? String(ssRaw) : undefined }
  }

  async function refreshNodeVersion() {
    const d = selectedDifficulty.value
    if (!editable.value || !d) return
    if (!d.beatsaverCode) {
      actionError.value = 'This node has no BeatSaver code to refresh from.'
      return
    }
    if (
      !window.confirm(
        `Refresh "${d.songName}" to the latest BeatSaver version? This repoints the node at the newest BeatLeader and ScoreSaber leaderboard IDs for this difficulty.`,
      )
    ) {
      return
    }
    actionPending.value = true
    actionError.value = null
    try {
      const ids = await latestVersionIds(d, d.beatsaverCode)
      if (!ids) {
        actionError.value = 'The latest version has no BeatLeader leaderboard for this difficulty.'
        return
      }
      mergeDifficulty(await updateCampaignDifficultyMap(d.id, ids))
    } catch (err) {
      actionError.value = parseApiError(err, 'Failed to refresh version').message
    } finally {
      actionPending.value = false
    }
  }

  return {
    showMapPicker,
    openMapPicker,
    closeMapPicker,
    handleMapsPicked,
    submitGlobalAdd,
    usedMapDifficultyIds,
    campaignGenreBeatsaverSlugs,
    showRepoint,
    openRepoint,
    closeRepoint,
    submitRepoint,
    refreshNodeVersion,
  }
}

export type CampaignMapSources = ReturnType<typeof useCampaignMapSources>
