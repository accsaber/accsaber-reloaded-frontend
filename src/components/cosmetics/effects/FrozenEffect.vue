<script setup lang="ts">
import EffectCanvas from '@/components/cosmetics/effects/EffectCanvas.vue'
import { useEffectSurface } from '@/composables/useEffectSurface'
import type { Composition } from '@/types/cosmetics/effects'
import { asColor, clampNumber, geometryMemo, type ContentBox, type EffectFrame, type EffectProps } from '@/utils/cosmetics/effects'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { hash01 } from '@/utils/random'
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue'

const props = defineProps<EffectProps>()

interface FrozenConfig {
  ice: string
  crack: string
  cornerPct: number
  fade: number
  cracks: number
}

type Corner = [x: number, y: number, angle: number]

const CORNER_ARMS = [-0.5, 0, 0.5]
const TITLE_REACH = 1.7
const TITLE_END_PCT = 30
const HOST_DEPTH = 8
const REDRAWS_PER_S = 10

function readFrozen(c: Composition, light: boolean): FrozenConfig {
  return {
    ice: asColor(light ? c.lightColor : c.color),
    crack: asColor(light ? c.lightCrack : c.crack),
    cornerPct: clampNumber(c.cornerPct, 5, 60, 34),
    fade: clampNumber(c.fade, 0, 1, 0.5),
    cracks: clampNumber(c.cracks, 0, 1, 0.1),
  }
}

const { isTitle, light } = useEffectSurface(() => props.measure)
const cfg = computed(() => readFrozen(props.composition, light.value))

function jag(x: number, y: number, angle: number, len: number, steps: number, seed: number): number[] {
  const pts = [x, y]
  for (let i = 0; i < steps; i++) {
    const a = angle + (hash01(seed + i * 3.1) - 0.5) * 0.22
    x += Math.cos(a) * (len / steps)
    y += Math.sin(a) * (len / steps)
    pts.push(x, y)
  }
  return pts
}

function burst(x: number, y: number, angle: number, reach: number, seed: number): number[][] {
  const lines: number[][] = []
  CORNER_ARMS.forEach((lean, k) => {
    const ks = seed * 7 + k * 13
    const turn = angle + lean + (hash01(ks) - 0.5) * 0.3
    const len = reach * (0.55 + hash01(ks + 1) * 0.45)
    const arm = jag(x, y, turn, len, 4, ks)
    lines.push(arm)
    for (const at of [1, 3]) {
      if (hash01(ks + at) < 0.3) continue
      const side = hash01(ks + at + 5) > 0.5 ? 1 : -1
      lines.push(jag(arm[at * 2], arm[at * 2 + 1], turn + side * (1.45 + hash01(ks + at + 9) * 0.25), len * 0.45, 2, ks + at * 17))
    }
  })
  return lines
}

function cornersOf(box: ContentBox): Corner[] {
  return [
    [box.x, box.y, Math.PI * 0.25],
    [box.x + box.w, box.y, Math.PI * 0.75],
    [box.x + box.w, box.y + box.h, Math.PI * 1.25],
    [box.x, box.y + box.h, Math.PI * 1.75],
  ]
}

function cracksIn(box: ContentBox, reach: number): number[][] {
  return cornersOf(box).flatMap(([x, y, angle], i) => burst(x, y, angle, reach, 300 + i * 31))
}

const lines = geometryMemo<number[][]>()
let painted: { ring: unknown; step: number } | null = null

watch(cfg, () => {
  lines.clear()
  painted = null
})

function drawFrame(f: EffectFrame): boolean {
  const step = f.reduced ? 0 : Math.floor(f.t * REDRAWS_PER_S)
  if (painted?.ring === f.ring && painted.step === step) return false
  painted = { ring: f.ring, step }
  const c = cfg.value
  const { g, box } = f
  const reach = Math.min(box.w, box.h) * (c.cornerPct / 100)
  g.save()
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.clearRect(0, 0, g.canvas.width, g.canvas.height)
  g.restore()
  g.save()
  g.beginPath()
  g.rect(box.x, box.y, box.w, box.h)
  g.clip()
  cornersOf(box).forEach(([x, y], i) => {
    const breath = f.reduced ? 0.9 : 0.85 + 0.15 * Math.sin(f.t * 0.13 + i * 1.7)
    const fade = g.createRadialGradient(x, y, 0, x, y, reach * 1.25)
    fade.addColorStop(0, withAlpha(c.ice, c.fade * breath))
    fade.addColorStop(0.5, withAlpha(c.ice, c.fade * 0.4 * breath))
    fade.addColorStop(1, withAlpha(c.ice, 0))
    g.fillStyle = fade
    g.fillRect(x - reach * 1.25, y - reach * 1.25, reach * 2.5, reach * 2.5)
  })
  g.beginPath()
  for (const pts of lines.get(f.ring, 1, () => cracksIn(box, reach))) {
    g.moveTo(pts[0], pts[1])
    for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1])
  }
  g.globalAlpha = c.cracks
  g.strokeStyle = c.crack
  g.lineWidth = Math.max(0.5, reach * 0.005)
  g.stroke()
  g.restore()
  return false
}

const rootRef = useTemplateRef<HTMLElement>('root')
const word = ref<{ text: string; font: Record<string, string>; at: ContentBox } | null>(null)

function readWord(): void {
  let host = rootRef.value?.parentElement ?? null
  for (let i = 0; i < HOST_DEPTH && host; i++) {
    const el: HTMLElement | null = host.querySelector<HTMLElement>('.title-renderer')
    host = host.parentElement
    if (!el) continue
    const frame = rootRef.value?.offsetParent
    if (!frame) return
    const cs = getComputedStyle(el)
    const textEl = el.querySelector('.title-renderer__text') ?? el
    const a = textEl.getBoundingClientRect()
    const b = frame.getBoundingClientRect()
    const k = b.width ? (frame as HTMLElement).offsetWidth / b.width : 1
    word.value = {
      text: textEl.textContent ?? '',
      at: { x: (a.left - b.left) * k, y: (a.top - b.top) * k, w: a.width * k, h: a.height * k },
      font: { fontFamily: cs.fontFamily, fontSize: cs.fontSize, fontWeight: cs.fontWeight, fontStyle: cs.fontStyle, letterSpacing: cs.letterSpacing, textTransform: cs.textTransform },
    }
    return
  }
}

onMounted(readWord)
watch(() => props.measure.box, readWord, { flush: 'post' })

const wordStyle = computed(() => {
  const w = word.value
  if (!w) return undefined
  const c = cfg.value
  const { x, y, w: bw, h: bh } = w.at
  const d = cracksIn({ x: 0, y: 0, w: bw, h: bh }, bh * TITLE_REACH)
    .map((pts) => `M${pts.map((n) => n.toFixed(1)).join(' ')}`)
    .join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${bw}" height="${bh}"><path d="${d}" fill="none" stroke="${c.crack}" stroke-opacity="${c.cracks}" stroke-width="0.7"/></svg>`
  const end = withAlpha(c.ice, Math.min(1, c.fade * 1.8))
  return {
    left: `${x}px`,
    top: `${y}px`,
    width: `${bw}px`,
    height: `${bh}px`,
    lineHeight: `${bh}px`,
    ...w.font,
    backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}"), linear-gradient(90deg, ${end} 0%, ${withAlpha(c.ice, 0)} ${TITLE_END_PCT}%, ${withAlpha(c.ice, 0)} ${100 - TITLE_END_PCT}%, ${end} 100%)`,
  }
})
</script>

<template>
  <span v-if="isTitle" ref="root" class="frozen-word" :style="wordStyle" aria-hidden="true">{{ word?.text }}</span>
  <EffectCanvas v-else :measure="measure" :pad="0" :draw="drawFrame" />
</template>

<style scoped>
.frozen-word {
  position: absolute;
  z-index: 2;
  white-space: nowrap;
  color: transparent;
  background-repeat: no-repeat;
  -webkit-background-clip: text;
  background-clip: text;
  pointer-events: none;
}
</style>
