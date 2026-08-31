import type { MilestoneResponse } from '@/types/api/milestones'
import { resolveMilestoneGlyph, type MilestoneGlyphKey } from '@/utils/milestoneIcons'

let pending: Promise<MilestoneResponse[]> | null = null

export function loadMilestoneCatalog(): Promise<MilestoneResponse[]> {
  if (!pending) {
    pending = import('@/api/milestones')
      .then(({ getMilestones }) => getMilestones({ size: 500 }))
      .then((page) => page.content)
      .catch(() => {
        pending = null
        return []
      })
  }
  return pending
}

export function glyphMapOf(catalog: MilestoneResponse[]): Map<string, MilestoneGlyphKey> {
  const out = new Map<string, MilestoneGlyphKey>()
  for (const m of catalog) out.set(m.id, resolveMilestoneGlyph(m.iconGroup, m.querySpec))
  return out
}

export async function loadMilestoneGlyphs(): Promise<Map<string, MilestoneGlyphKey>> {
  return glyphMapOf(await loadMilestoneCatalog())
}
