<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { TitleConstellationAuraSpec, TitleConstellationSpec } from '@/types/api/items'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { CONSTELLATION_DIM_MS, CONSTELLATION_FLY_MS, CONSTELLATION_STAGGER_MS, constellationClock, easeInOut, letterFlight, letterRelease, type ConstellationClock } from '@/utils/cosmetics/titleConstellation'
import { pickVariant, titleAuraRect, type TitleAuraRect } from '@/utils/cosmetics/titleAura'
import { hash01 } from '@/utils/random'
import { computed, useTemplateRef } from 'vue'

const props = defineProps<{
  aura: TitleConstellationAuraSpec
  light: boolean
  constellation?: TitleConstellationSpec
}>()

type Ctx = CanvasRenderingContext2D

interface Vec {
  x: number
  y: number
}

interface Star {
  letter: number
  target: Vec
  accent: boolean
}

const palette = computed(() => ({
  star: pickVariant(props.light, props.aura.lightStar, props.aura.star, '#f6ecea'),
  accent: pickVariant(props.light, props.aura.lightAccent, props.aura.accent, '#8d5caf'),
}))

const SAMPLE_SCALE = 4
const ABSORB_MS = 700

let rect: TitleAuraRect | null = null
let stars: Star[] = []
let edges: [number, number][] = []
let start = 0

function letterBoxes(canvas: HTMLCanvasElement): { el: HTMLElement; box: DOMRect }[] {
  const chars = canvas.closest('.title-renderer')?.querySelectorAll<HTMLElement>('.title-renderer__forge-char')
  if (!chars) return []
  const origin = canvas.getBoundingClientRect()
  const k = origin.width > 0 ? canvas.clientWidth / origin.width : 1
  return Array.from(chars, (el) => {
    const r = el.getBoundingClientRect()
    return { el, box: new DOMRect((r.left - origin.left) * k, (r.top - origin.top) * k, r.width * k, r.height * k) }
  })
}

function glyphPixels(el: HTMLElement, box: DOMRect): Vec[] {
  const ch = el.textContent?.trim() ?? ''
  if (!ch || box.width < 1) return []
  const cs = getComputedStyle(el)
  const text = cs.textTransform === 'uppercase' ? ch.toUpperCase() : ch
  const w = Math.ceil(box.width * SAMPLE_SCALE)
  const h = Math.ceil(box.height * SAMPLE_SCALE)
  const off = document.createElement('canvas')
  off.width = w
  off.height = h
  const g = off.getContext('2d', { willReadFrequently: true })
  if (!g) return []
  g.font = `${cs.fontStyle} ${cs.fontWeight} ${parseFloat(cs.fontSize) * SAMPLE_SCALE}px ${cs.fontFamily}`
  g.textAlign = 'center'
  const m = g.measureText(text)
  g.fillText(text, w / 2, (h + m.fontBoundingBoxAscent - m.fontBoundingBoxDescent) / 2)
  const data = g.getImageData(0, 0, w, h).data
  const step = Math.max(1, Math.round(parseFloat(cs.fontSize) * SAMPLE_SCALE * 0.06))
  const out: Vec[] = []
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      if (data[(y * w + x) * 4 + 3] > 140) out.push({ x: box.x + x / SAMPLE_SCALE, y: box.y + y / SAMPLE_SCALE })
    }
  }
  return out
}

function spread(points: Vec[], k: number): Vec[] {
  if (points.length <= k) return points
  let first = points[0]
  for (const p of points) if (p.y < first.y || (p.y === first.y && p.x < first.x)) first = p
  const picked = [first]
  const best = points.map((p) => Math.hypot(p.x - first.x, p.y - first.y))
  while (picked.length < k) {
    let at = 0
    for (let i = 1; i < points.length; i++) if (best[i] > best[at]) at = i
    const p = points[at]
    picked.push(p)
    for (let i = 0; i < points.length; i++) best[i] = Math.min(best[i], Math.hypot(points[i].x - p.x, points[i].y - p.y))
  }
  return picked
}

function treeEdges(ids: number[]): [number, number][] {
  if (ids.length < 2) return []
  const inTree = [ids[0]]
  const rest = ids.slice(1)
  const out: [number, number][] = []
  while (rest.length) {
    let bi = 0
    let bj = 0
    let bd = Infinity
    for (let i = 0; i < inTree.length; i++) {
      for (let j = 0; j < rest.length; j++) {
        const a = stars[inTree[i]].target
        const b = stars[rest[j]].target
        const d = Math.hypot(a.x - b.x, a.y - b.y)
        if (d < bd) [bi, bj, bd] = [i, j, d]
      }
    }
    out.push([inTree[bi], rest[bj]])
    inTree.push(rest.splice(bj, 1)[0])
  }
  return out
}

function build(canvas: HTMLCanvasElement): void {
  rect = titleAuraRect(canvas)
  stars = []
  edges = []
  const k = props.aura.nodesPerLetter ?? 7
  letterBoxes(canvas).forEach(({ el, box }, letter) => {
    const ids: number[] = []
    for (const target of spread(glyphPixels(el, box), k)) {
      ids.push(stars.length)
      stars.push({ letter, target, accent: hash01(stars.length * 31 + 7) < 0.22 })
    }
    edges.push(...treeEdges(ids))
  })
}

function loose(cycle: number, j: number, r: TitleAuraRect, t: number): Vec {
  const seed = cycle * 977 + j * 13
  return {
    x: r.x - r.fs * 0.45 + hash01(seed) * (r.w + r.fs * 0.9) + Math.sin(t * 0.0006 + j) * r.fs * 0.08,
    y: r.y - r.fs * 0.65 + hash01(seed + 1) * (r.h + r.fs * 1.2) + Math.cos(t * 0.0005 + j * 1.3) * r.fs * 0.08,
  }
}

function lerp(a: Vec, b: Vec, p: number): Vec {
  return { x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p }
}

interface Placed {
  p: Vec
  lock: number
  show: number
}

function place(s: Star, j: number, clock: ConstellationClock, t: number, r: TitleAuraRect): Placed {
  const fly = letterFlight(clock.local, s.letter)
  const leave = letterRelease(clock, s.letter)
  if (leave > 0) return { p: lerp(s.target, loose(clock.cycle, j, r, t), leave), lock: 1 - leave, show: leave }
  const arrived = clock.local - s.letter * CONSTELLATION_STAGGER_MS - CONSTELLATION_FLY_MS
  return { p: lerp(loose(clock.cycle - 1, j, r, t), s.target, fly), lock: fly, show: 1 - easeInOut(arrived / ABSORB_MS) }
}

function drawEdges(g: Ctx, at: Placed[], fs: number): void {
  g.lineWidth = Math.max(0.5, fs * 0.035)
  for (const [a, b] of edges) {
    const lock = Math.min(at[a].lock, at[b].lock)
    const show = Math.min(at[a].show, at[b].show)
    if (show <= 0.01) continue
    const len = Math.hypot(at[a].p.x - at[b].p.x, at[a].p.y - at[b].p.y) / fs
    const near = Math.min(1, Math.max(0, 2 - len))
    g.strokeStyle = withAlpha(palette.value.star, (0.5 * lock + 0.14 * (1 - lock) * near) * show)
    g.beginPath()
    g.moveTo(at[a].p.x, at[a].p.y)
    g.lineTo(at[b].p.x, at[b].p.y)
    g.stroke()
  }
}

function drawStars(g: Ctx, at: Placed[], t: number, fs: number): void {
  stars.forEach((s, j) => {
    const { p, lock, show } = at[j]
    if (show <= 0.01) return
    const color = s.accent ? palette.value.accent : palette.value.star
    const twinkle = (0.65 + 0.35 * Math.sin(t * 0.0023 + j * 1.7)) * show
    const r = fs * (s.accent ? 0.07 : 0.05)
    g.fillStyle = withAlpha(color, (0.06 + 0.16 * lock) * twinkle)
    g.beginPath()
    g.arc(p.x, p.y, r * 3, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = withAlpha(color, (0.45 + 0.55 * lock) * twinkle)
    g.beginPath()
    g.arc(p.x, p.y, r, 0, Math.PI * 2)
    g.fill()
  })
}

function staticClock(): ConstellationClock {
  const clock = constellationClock(0, props.constellation)
  return { ...clock, local: clock.period - CONSTELLATION_DIM_MS - 50 }
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

function rebuild(): void {
  if (canvasRef.value) build(canvasRef.value)
}

useElementCanvas(canvasRef, {
  init(_w, _h, now) {
    rebuild()
    start = now
  },
  resize: rebuild,
  draw(ctx, w, h, now, reduced) {
    ctx.clearRect(0, 0, w, h)
    if (!rect || stars.length === 0) return
    const r = rect
    const t = now - start
    const clock = reduced
      ? staticClock()
      : constellationClock(t, props.constellation)
    const at = stars.map((s, j) => place(s, j, clock, t, r))
    ctx.globalCompositeOperation = props.light ? 'source-over' : 'lighter'
    drawEdges(ctx, at, r.fs)
    drawStars(ctx, at, t, r.fs)
    ctx.globalCompositeOperation = 'source-over'
  },
})
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" />
</template>
