import { parseApiError } from '@/api/client'
import { useRankingCategoryTabs } from '@/composables/useRankingCategoryTabs'
import type { AutoCriteriaCheckResponse, AutoCriteriaStatus, CriteriaCheckSource } from '@/types/api/maps'
import type { Difficulty } from '@/types/enums'
import {
  difficultyToEnum,
  fetchBeatLeaderMapInfo,
  fetchBeatSaverMap,
  fetchScoreSaberLeaderboards,
  parseBeatSaverCode,
} from '@/utils/beatsaver'
import { readMapZip } from '@/utils/mapZip'
import { onUnmounted, ref } from 'vue'

export interface MapHeader {
  songName: string
  songSubName: string
  songAuthor: string
  mapper: string
  bpm: number | null
  duration: number | null
  coverUrl: string
}

export interface DiffSelection {
  key: string
  characteristic: string
  difficulty: Difficulty
  njs: number | null
  notes: number | null
  selected: boolean
  categoryId: string
  blLeaderboardId: string | null
  ssLeaderboardId: number | null
  importing: boolean
  importedId: string | null
  existingId: string | null
  autoStatus: AutoCriteriaStatus | null
  result: AutoCriteriaCheckResponse | null
  error: string
}

interface LoadedMap {
  header: MapHeader
  source: CriteriaCheckSource
  diffs: DiffSelection[]
}

const MAX_ZIP_BYTES = 11 * 1024 * 1024

export function useMapSource(leaderboards: boolean) {
  const categoryTabs = useRankingCategoryTabs()

  const header = ref<MapHeader | null>(null)
  const diffs = ref<DiffSelection[]>([])
  const fetching = ref(false)
  const fetchError = ref('')

  let fetchId = 0
  let source: CriteriaCheckSource | null = null
  let coverObjectUrl = ''

  function row(characteristic: string, bsDifficulty: string, extra: Partial<DiffSelection> = {}): DiffSelection {
    return {
      key: `${bsDifficulty}-${characteristic}`,
      characteristic,
      difficulty: difficultyToEnum(bsDifficulty) as Difficulty,
      njs: null,
      notes: null,
      selected: false,
      categoryId: categoryTabs.value[0]?.key ?? '',
      blLeaderboardId: null,
      ssLeaderboardId: null,
      importing: false,
      importedId: null,
      existingId: null,
      autoStatus: null,
      result: null,
      error: '',
      ...extra,
    }
  }

  function dropCover() {
    if (coverObjectUrl) URL.revokeObjectURL(coverObjectUrl)
    coverObjectUrl = ''
  }

  async function load(read: () => Promise<LoadedMap>, failed: string) {
    const id = ++fetchId
    fetching.value = true
    fetchError.value = ''
    header.value = null
    diffs.value = []
    dropCover()
    try {
      const loaded = await read()
      if (id !== fetchId) return
      header.value = loaded.header
      source = loaded.source
      diffs.value = leaderboards ? loaded.diffs : loaded.diffs.filter((d) => d.characteristic === 'Standard')
    } catch (err) {
      if (id === fetchId) fetchError.value = parseApiError(err, failed).message
    } finally {
      if (id === fetchId) fetching.value = false
    }
  }

  async function readBeatSaver(code: string): Promise<LoadedMap> {
    const map = await fetchBeatSaverMap(code).catch(() => null)
    const version = map?.versions[0]
    if (!map || !version) throw new Error('Map not found')
    const [bl, ss] = await Promise.all([
      fetchBeatLeaderMapInfo(version.hash),
      leaderboards ? fetchScoreSaberLeaderboards(version.hash) : new Map<string, number>(),
    ])
    return {
      header: {
        songName: map.metadata.songName,
        songSubName: map.metadata.songSubName,
        songAuthor: map.metadata.songAuthorName,
        mapper: map.metadata.levelAuthorName,
        bpm: map.metadata.bpm,
        duration: map.metadata.duration,
        coverUrl: bl.coverUrl ?? version.coverURL,
      },
      source: { songHash: version.hash },
      diffs: version.diffs.map((d) =>
        row(d.characteristic, d.difficulty, {
          njs: d.njs,
          notes: d.notes,
          blLeaderboardId: bl.leaderboards.get(`${d.difficulty}-${d.characteristic}`) ?? null,
          ssLeaderboardId: ss.get(`${d.difficulty}-${d.characteristic}`) ?? null,
        }),
      ),
    }
  }

  async function readUpload(file: File): Promise<LoadedMap> {
    if (file.size > MAX_ZIP_BYTES) throw new Error('The zip has to be 11MB or smaller')
    const map = await readMapZip(file)
    coverObjectUrl = map.cover ? URL.createObjectURL(map.cover) : ''
    return {
      header: { ...map, duration: null, coverUrl: coverObjectUrl },
      source: { zip: file },
      diffs: map.difficulties.map((d) => row(d.characteristic, d.difficulty)),
    }
  }

  function loadCode(input: string) {
    const code = parseBeatSaverCode(input)
    if (code) return load(() => readBeatSaver(code), 'Map not found')
    fetchError.value = 'Not a BeatSaver code or URL'
  }

  function loadUpload(file: File) {
    return load(() => readUpload(file), 'Could not read that zip')
  }

  function checkSource(): CriteriaCheckSource {
    if (!source) throw new Error('Load a map first')
    return source
  }

  onUnmounted(dropCover)

  return { header, diffs, fetching, fetchError, categoryTabs, loadCode, loadUpload, checkSource }
}
