export interface ZipMap {
  songName: string
  songSubName: string
  songAuthor: string
  mapper: string
  bpm: number | null
  cover: Blob | null
  difficulties: { characteristic: string; difficulty: string }[]
}

interface ZipEntry {
  name: string
  method: number
  size: number
  offset: number
}

interface InfoDat {
  _songName?: string
  _songSubName?: string
  _songAuthorName?: string
  _levelAuthorName?: string
  _beatsPerMinute?: number
  _coverImageFilename?: string
  _difficultyBeatmapSets?: { _beatmapCharacteristicName: string; _difficultyBeatmaps: { _difficulty: string }[] }[]
  song?: { title?: string; subTitle?: string; author?: string }
  audio?: { bpm?: number }
  coverImageFilename?: string
  difficultyBeatmaps?: { characteristic: string; difficulty: string; beatmapAuthors?: { mappers?: string[] } }[]
}

const END_OF_DIRECTORY = 0x06054b50
const DIRECTORY_ENTRY = 0x02014b50
const END_SEARCH_BYTES = 65557
const STORED = 0

async function view(blob: Blob, start: number, end: number): Promise<DataView> {
  return new DataView(await blob.slice(start, end).arrayBuffer())
}

async function listEntries(zip: Blob): Promise<ZipEntry[]> {
  const tail = await view(zip, Math.max(0, zip.size - END_SEARCH_BYTES), zip.size)
  let end = tail.byteLength - 22
  while (end >= 0 && tail.getUint32(end, true) !== END_OF_DIRECTORY) end--
  if (end < 0) throw new Error('That file is not a zip')
  const start = tail.getUint32(end + 16, true)
  const directory = await view(zip, start, start + tail.getUint32(end + 12, true))
  const decoder = new TextDecoder()
  const entries: ZipEntry[] = []
  let at = 0
  while (at + 46 <= directory.byteLength && directory.getUint32(at, true) === DIRECTORY_ENTRY) {
    const nameLength = directory.getUint16(at + 28, true)
    entries.push({
      name: decoder.decode(new Uint8Array(directory.buffer, at + 46, nameLength)),
      method: directory.getUint16(at + 10, true),
      size: directory.getUint32(at + 20, true),
      offset: directory.getUint32(at + 42, true),
    })
    at += 46 + nameLength + directory.getUint16(at + 30, true) + directory.getUint16(at + 32, true)
  }
  return entries
}

async function readEntry(zip: Blob, entry: ZipEntry): Promise<Blob> {
  const header = await view(zip, entry.offset, entry.offset + 30)
  const start = entry.offset + 30 + header.getUint16(26, true) + header.getUint16(28, true)
  const data = zip.slice(start, start + entry.size)
  if (entry.method === STORED) return data
  return new Response(data.stream().pipeThrough(new DecompressionStream('deflate-raw'))).blob()
}

function difficultiesOf(info: InfoDat): ZipMap['difficulties'] {
  if (info.difficultyBeatmaps) return info.difficultyBeatmaps.map(({ characteristic, difficulty }) => ({ characteristic, difficulty }))
  return (info._difficultyBeatmapSets ?? []).flatMap((set) =>
    set._difficultyBeatmaps.map((map) => ({ characteristic: set._beatmapCharacteristicName, difficulty: map._difficulty })),
  )
}

export async function readMapZip(zip: Blob): Promise<ZipMap> {
  const entries = await listEntries(zip)
  const find = (file: string) => entries.find((entry) => entry.name.split('/').pop()!.toLowerCase() === file.toLowerCase())
  const infoEntry = find('Info.dat')
  if (!infoEntry) throw new Error('That zip has no Info.dat')
  const info = JSON.parse((await (await readEntry(zip, infoEntry)).text()).replace(/^﻿/, '')) as InfoDat
  const coverName = info.coverImageFilename ?? info._coverImageFilename
  const coverEntry = coverName ? find(coverName) : undefined
  return {
    songName: info.song?.title ?? info._songName ?? '',
    songSubName: info.song?.subTitle ?? info._songSubName ?? '',
    songAuthor: info.song?.author ?? info._songAuthorName ?? '',
    mapper: info.difficultyBeatmaps?.[0]?.beatmapAuthors?.mappers?.join(', ') ?? info._levelAuthorName ?? '',
    bpm: info.audio?.bpm ?? info._beatsPerMinute ?? null,
    cover: coverEntry ? await readEntry(zip, coverEntry) : null,
    difficulties: difficultiesOf(info),
  }
}
