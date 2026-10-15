<script setup lang="ts">
import MilestoneFrameArt from '@/components/domain/MilestoneFrameArt.vue'
import MilestoneGlyphArt from '@/components/domain/MilestoneGlyphArt.vue'
import { glyphSymbolId, renderGlyph, type MilestoneGlyphKey } from '@/utils/milestoneIcons'
import {
  MILESTONE_FRAME_ENTRIES,
  MILESTONE_MARK_ENTRIES,
  markSymbolId,
  type MilestoneFrameTier,
} from '@/utils/milestoneTiers'
import { computed } from 'vue'

const props = defineProps<{
  combos: Array<{ glyph: MilestoneGlyphKey; tier: MilestoneFrameTier }>
}>()

const marks = MILESTONE_MARK_ENTRIES.map((m) => ({ ...m, id: markSymbolId(m.key) }))

const glyphs = computed(() => {
  const seen = new Map<string, { id: string; parts: GlyphParts }>()
  for (const combo of props.combos) {
    const id = glyphSymbolId(combo.glyph, combo.tier)
    if (seen.has(id)) continue
    seen.set(id, { id, parts: renderGlyph(combo.glyph, combo.tier) })
  }
  return [...seen.values()]
})

type GlyphParts = ReturnType<typeof renderGlyph>
</script>

<template>
  <defs>
    <symbol v-for="f in MILESTONE_FRAME_ENTRIES" :id="f.id" :key="f.id" viewBox="0 0 100 100">
      <MilestoneFrameArt :frame="f.frame" />
    </symbol>

    <symbol v-for="g in glyphs" :id="g.id" :key="g.id" viewBox="0 0 24 24">
      <MilestoneGlyphArt :parts="g.parts" />
    </symbol>

    <symbol v-for="m in marks" :id="m.id" :key="m.id" viewBox="0 0 24 24">
      <path
        :d="m.d"
        :fill="m.filled ? 'currentColor' : 'none'"
        stroke="currentColor"
        :stroke-width="m.filled ? 1.4 : 2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </symbol>
  </defs>
</template>
