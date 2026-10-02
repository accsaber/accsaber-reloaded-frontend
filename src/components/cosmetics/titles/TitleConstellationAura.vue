<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { TitleConstellationAuraSpec } from '@/types/api/items'
import { pickVariant, titleAuraRect, type TitleAuraRect } from '@/utils/cosmetics/titleAura'
import { hash01 } from '@/utils/random'
import { computed, onBeforeUnmount, useTemplateRef } from 'vue'

const props = defineProps<{
  aura: TitleConstellationAuraSpec
  light: boolean
}>()

type Ctx = CanvasRenderingContext2D

interface Vec {
  x: number
  y: number
}

interface Star {
  letter: number
  home: Vec
  p: Vec
  v: Vec
  accent: boolean
}

interface Letter {
  box: DOMRect
  sprite: HTMLCanvasElement
  align: number
}

const palette = computed(() => ({
  star: pickVariant(props.light, props.aura.lightStar, props.aura.star, '#f6ecea'),
  accent: pickVariant(props.light, props.aura.lightAccent, props.aura.accent, '#8d5caf'),
  letter: pickVariant(props.light, props.aura.lightLetter, props.aura.letter, '#f6ecea'),
}))

const SAMPLE_SCALE = 4
const STIFFNESS = 34
const DAMPING = 6.5
const BREAK_MS = 1500
const INTRO_SEED = 77

let rect: TitleAuraRect | null = null
let stars: Star[] = []
let letters: Letter[] = []
let edges: [number, number, boolean][] = []
let driftX = new Float64Array(0)
let driftY = new Float64Array(0)
let err = new Float64Array(0)
let count = new Float64Array(0)
let breakX = new Float64Array(0)
let breakY = new Float64Array(0)
let breakSeed = -1
let last = 0
let start = 0
let hover = 0
let hovering = false
let mouse: Vec = { x: 0, y: 0 }
let host: HTMLElement | null = null

function canvasScale(canvas: HTMLCanvasElement): { origin: DOMRect; k: number } {
  const origin = canvas.getBoundingClientRect()
  return { origin, k: origin.width > 0 ? canvas.clientWidth / origin.width : 1 }
}

function letterBoxes(canvas: HTMLCanvasElement): { ch: string; box: DOMRect }[] {
  const node = canvas.closest('.title-renderer')?.querySelector('.title-renderer__text')?.firstChild
  if (!node || node.nodeType !== Node.TEXT_NODE) return []
  const text = node.textContent ?? ''
  const { origin, k } = canvasScale(canvas)
  const range = document.createRange()
  const out: { ch: string; box: DOMRect }[] = []
  for (let i = 0; i < text.length; i++) {
    range.setStart(node, i)
    range.setEnd(node, i + 1)
    const r = range.getBoundingClientRect()
    out.push({ ch: text[i], box: new DOMRect((r.left - origin.left) * k, (r.top - origin.top) * k, r.width * k, r.height * k) })
  }
  return out
}

function glyph(ch: string, box: DOMRect, font: CSSStyleDeclaration, color: string | null, scale: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.ceil(box.width * scale))
  c.height = Math.max(1, Math.ceil(box.height * scale))
  const g = c.getContext('2d', { willReadFrequently: color === null })
  if (!g) return c
  g.font = `${font.fontStyle} ${font.fontWeight} ${parseFloat(font.fontSize) * scale}px ${font.fontFamily}`
  g.fillStyle = color ?? '#000'
  const text = font.textTransform === 'uppercase' ? ch.toUpperCase() : ch
  const m = g.measureText(text)
  g.fillText(text, 0, (c.height + m.fontBoundingBoxAscent - m.fontBoundingBoxDescent) / 2)
  return c
}

function samplePoints(mask: HTMLCanvasElement, box: DOMRect, step: number): Vec[] {
  const g = mask.getContext('2d')
  if (!g) return []
  const data = g.getImageData(0, 0, mask.width, mask.height).data
  const out: Vec[] = []
  for (let y = 0; y < mask.height; y += step) {
    for (let x = 0; x < mask.width; x += step) {
      if (data[(y * mask.width + x) * 4 + 3] > 140) out.push({ x: box.x + x / SAMPLE_SCALE, y: box.y + y / SAMPLE_SCALE })
    }
  }
  return out
}

function dist(a: Vec, b: Vec): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function spread(points: Vec[], k: number): Vec[] {
  if (points.length <= k) return points
  let first = points[0]
  for (const p of points) if (p.y < first.y || (p.y === first.y && p.x < first.x)) first = p
  const picked = [first]
  const best = points.map((p) => dist(p, first))
  while (picked.length < k) {
    let at = 0
    for (let i = 1; i < points.length; i++) if (best[i] > best[at]) at = i
    picked.push(points[at])
    for (let i = 0; i < points.length; i++) best[i] = Math.min(best[i], dist(points[i], points[at]))
  }
  return picked
}

function treeEdges(ids: number[]): [number, number, boolean][] {
  const inTree = ids.slice(0, 1)
  const rest = ids.slice(1)
  const out: [number, number, boolean][] = []
  while (rest.length) {
    let bi = 0
    let bj = 0
    for (let i = 0; i < inTree.length; i++) {
      for (let j = 0; j < rest.length; j++) {
        if (dist(stars[inTree[i]].home, stars[rest[j]].home) < dist(stars[inTree[bi]].home, stars[rest[bj]].home)) [bi, bj] = [i, j]
      }
    }
    out.push([inTree[bi], rest[bj], true])
    inTree.push(rest.splice(bj, 1)[0])
  }
  return out
}

function bridge(a: number[], b: number[]): [number, number, boolean] | null {
  let best: [number, number, boolean] | null = null
  for (const i of a) {
    for (const j of b) {
      if (!best || dist(stars[i].home, stars[j].home) < dist(stars[best[0]].home, stars[best[1]].home)) best = [i, j, false]
    }
  }
  return best
}

function scatter(j: number, seed: number, fs: number): Vec {
  const a = hash01(seed + j * 13) * Math.PI * 2
  const d = fs * (0.7 + hash01(seed + j * 13 + 1) * 0.9)
  return { x: Math.cos(a) * d, y: Math.sin(a) * d }
}

function addLetter(ch: string, box: DOMRect, font: CSSStyleDeclaration, groups: number[][], fs: number): void {
  const letter = letters.length
  letters.push({ box, sprite: glyph(ch, box, font, palette.value.letter, window.devicePixelRatio || 1), align: 0 })
  const step = Math.max(1, Math.round(parseFloat(font.fontSize) * SAMPLE_SCALE * 0.06))
  const ids: number[] = []
  for (const home of spread(samplePoints(glyph(ch, box, font, null, SAMPLE_SCALE), box, step), props.aura.nodesPerLetter ?? 7)) {
    const j = stars.length
    const off = scatter(j, INTRO_SEED, fs)
    ids.push(j)
    stars.push({ letter, home, p: { x: home.x + off.x, y: home.y + off.y }, v: { x: 0, y: 0 }, accent: hash01(j * 31 + 7) < 0.22 })
  }
  edges.push(...treeEdges(ids))
  const link = groups.length ? bridge(groups[groups.length - 1], ids) : null
  if (link) edges.push(link)
  groups.push(ids)
}

function build(canvas: HTMLCanvasElement): void {
  rect = titleAuraRect(canvas)
  stars = []
  letters = []
  edges = []
  const text = canvas.closest('.title-renderer')?.querySelector<HTMLElement>('.title-renderer__text')
  if (!text) return
  const font = getComputedStyle(text)
  const groups: number[][] = []
  for (const { ch, box } of letterBoxes(canvas)) if (ch.trim()) addLetter(ch, box, font, groups, rect.fs)
  driftX = new Float64Array(letters.length)
  driftY = new Float64Array(letters.length)
  err = new Float64Array(letters.length)
  count = new Float64Array(letters.length)
  breakX = new Float64Array(stars.length)
  breakY = new Float64Array(stars.length)
  breakSeed = -1
}

function updateDrift(t: number, fs: number): void {
  for (let i = 0; i < letters.length; i++) {
    driftX[i] = Math.sin(t * 0.0011 + i * 1.3) * fs * 0.05
    driftY[i] = Math.cos(t * 0.0009 + i * 2.1) * fs * 0.07
  }
}

function breakAmount(t: number, fs: number): number {
  const every = props.aura.breakEveryMs ?? 9000
  const cycle = Math.floor(t / every)
  const u = (t - cycle * every - every * (0.3 + hash01(cycle * 7 + 3) * 0.5)) / BREAK_MS
  if (u < 0 || u >= 1) return 0
  if (breakSeed !== cycle) {
    breakSeed = cycle
    stars.forEach((_, j) => {
      const off = scatter(j, cycle * 97, fs)
      breakX[j] = off.x
      breakY[j] = off.y
    })
  }
  return Math.min(1, u * 6)
}

function stepStars(t: number, dt: number, fs: number): void {
  hover += ((hovering ? 1 : 0) - hover) * Math.min(1, dt * 5)
  const brk = breakAmount(t, fs)
  const pull = (props.aura.pull ?? 0.55) * hover
  const reach = 2 * (fs * 1.8) ** 2
  stars.forEach((s, j) => {
    let x = s.home.x + driftX[s.letter] + breakX[j] * brk
    let y = s.home.y + driftY[s.letter] + breakY[j] * brk
    if (pull > 0.001) {
      const dx = mouse.x - s.home.x
      const dy = mouse.y - s.home.y
      const k = pull * Math.exp(-(dx * dx + dy * dy) / reach)
      x += dx * k
      y += dy * k
    }
    s.v.x += (STIFFNESS * (x - s.p.x) - DAMPING * s.v.x) * dt
    s.v.y += (STIFFNESS * (y - s.p.y) - DAMPING * s.v.y) * dt
    s.p.x += s.v.x * dt
    s.p.y += s.v.y * dt
  })
}

function stepLetters(dt: number, fs: number): void {
  err.fill(0)
  count.fill(0)
  for (const s of stars) {
    err[s.letter] += Math.hypot(s.p.x - s.home.x - driftX[s.letter], s.p.y - s.home.y - driftY[s.letter])
    count[s.letter]++
  }
  letters.forEach((l, i) => {
    const mean = count[i] ? err[i] / count[i] : 0
    const want = Math.max(0, Math.min(1, 1 - (mean - fs * 0.05) / (fs * 0.22)))
    l.align += (want - l.align) * Math.min(1, dt * 8)
  })
}

function drawLetters(g: Ctx): void {
  letters.forEach((l, i) => {
    if (l.align <= 0.01) return
    g.globalAlpha = l.align * l.align
    g.drawImage(l.sprite, l.box.x + driftX[i], l.box.y + driftY[i], l.box.width, l.box.height)
  })
}

function drawEdges(g: Ctx, fs: number): void {
  g.lineWidth = Math.max(0.5, fs * 0.03)
  g.strokeStyle = palette.value.accent
  for (const [a, b, inner] of edges) {
    const fade = Math.max(0, Math.min(1, 2.4 - dist(stars[a].p, stars[b].p) / fs))
    if (fade <= 0) continue
    g.globalAlpha = (inner ? 0.7 : 0.4) * fade
    g.beginPath()
    g.moveTo(stars[a].p.x, stars[a].p.y)
    g.lineTo(stars[b].p.x, stars[b].p.y)
    g.stroke()
  }
}

function twinkle(t: number, j: number): number {
  return 0.65 + 0.35 * Math.sin(t * 0.0023 + j * 1.7)
}

function dotRadius(s: Star, fs: number): number {
  return fs * (s.accent ? 0.065 : 0.045)
}

function drawHalos(g: Ctx, t: number, fs: number): void {
  g.fillStyle = palette.value.accent
  stars.forEach((s, j) => {
    g.globalAlpha = 0.16 * twinkle(t, j)
    g.beginPath()
    g.arc(s.p.x, s.p.y, dotRadius(s, fs) * 2, 0, Math.PI * 2)
    g.fill()
  })
}

function drawCores(g: Ctx, t: number, fs: number, accent: boolean): void {
  g.fillStyle = accent ? palette.value.accent : palette.value.star
  stars.forEach((s, j) => {
    if (s.accent !== accent) return
    g.globalAlpha = 0.95 * twinkle(t, j)
    g.beginPath()
    g.arc(s.p.x, s.p.y, dotRadius(s, fs), 0, Math.PI * 2)
    g.fill()
  })
}

function settle(): void {
  for (const s of stars) {
    s.p = { ...s.home }
    s.v = { x: 0, y: 0 }
  }
  for (const l of letters) l.align = 1
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

function onMove(e: PointerEvent): void {
  if (!canvasRef.value) return
  const { origin, k } = canvasScale(canvasRef.value)
  mouse = { x: (e.clientX - origin.left) * k, y: (e.clientY - origin.top) * k }
  hovering = true
}

function onLeave(): void {
  hovering = false
}

function listen(canvas: HTMLCanvasElement): void {
  if (host) return
  host = canvas.closest<HTMLElement>('.title-renderer')
  host?.addEventListener('pointermove', onMove)
  host?.addEventListener('pointerleave', onLeave)
}

function rebuild(): void {
  if (canvasRef.value) build(canvasRef.value)
}

onBeforeUnmount(() => {
  host?.removeEventListener('pointermove', onMove)
  host?.removeEventListener('pointerleave', onLeave)
})

useElementCanvas(canvasRef, {
  init(_w, _h, now) {
    if (!canvasRef.value) return
    build(canvasRef.value)
    listen(canvasRef.value)
    if (document.fonts.status !== 'loaded') void document.fonts.ready.then(rebuild)
    start = now
    last = now
  },
  resize: rebuild,
  draw(ctx, w, h, now, reduced) {
    ctx.clearRect(0, 0, w, h)
    if (!rect || stars.length === 0) return
    const fs = rect.fs
    const t = reduced ? 0 : now - start
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    updateDrift(t, fs)
    if (reduced) settle()
    else {
      stepStars(t, dt, fs)
      stepLetters(dt, fs)
    }
    drawLetters(ctx)
    drawEdges(ctx, fs)
    drawHalos(ctx, t, fs)
    drawCores(ctx, t, fs, false)
    drawCores(ctx, t, fs, true)
    ctx.globalAlpha = 1
  },
})
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" />
</template>
