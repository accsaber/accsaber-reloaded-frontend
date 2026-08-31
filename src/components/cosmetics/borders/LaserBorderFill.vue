<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { LaserFill } from '@/types/api/items'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { hash01, randBetween as rand } from '@/utils/random'
import { useTemplateRef, watch } from 'vue'

const props = defineProps<{
  fill: LaserFill
  trace?: { ds: string[]; viewBox: string } | null
}>()

const STATIC_T = 4

interface Spark {
  born: number
  u: number
  ang: number
  speed: number
}

interface Mote {
  x: number
  y: number
  dx: number
  dy: number
  phase: number
  size: number
}

interface Slash {
  born: number
  x: number
  y: number
  ang: number
  len: number
}

interface Wave {
  born: number
  u: number
}

interface Loop {
  pts: { x: number; y: number }[]
  len: number
}

let sparks: Spark[] = []
let motes: Mote[] = []
let slashes: Slash[] = []
let waves: Wave[] = []
let nextSlashAt = 0
let nextWaveAt = 0
let lattice: HTMLCanvasElement | null = null
let startTime = 0
let loops: Loop[] = []
let mainLoop = 0
let vb = { x: 0, y: 0, w: 100, h: 100 }

function buildLoops(): void {
  loops = []
  mainLoop = 0
  const tr = props.trace
  if (!tr || tr.ds.length === 0 || typeof document === 'undefined') return
  const nums = tr.viewBox.split(' ').map(Number)
  if (nums.length === 4 && nums.every((n) => Number.isFinite(n)) && nums[2] > 0 && nums[3] > 0) {
    vb = { x: nums[0], y: nums[1], w: nums[2], h: nums[3] }
  }
  for (const d of tr.ds) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    el.setAttribute('d', d)
    let len = 0
    try {
      len = el.getTotalLength()
    } catch {
      continue
    }
    if (!Number.isFinite(len) || len < 4) continue
    const n = 150
    const pts: { x: number; y: number }[] = []
    for (let k = 0; k <= n; k++) {
      const p = el.getPointAtLength((len * k) / n)
      pts.push({ x: p.x, y: p.y })
    }
    loops.push({ pts, len })
  }
  for (const [i, lp] of loops.entries()) {
    if (lp.len > loops[mainLoop].len) mainLoop = i
  }
}

watch(() => props.trace, () => buildLoops())

function loopPoint(lp: Loop, u: number, w: number, h: number): { x: number; y: number } {
  const n = lp.pts.length - 1
  const f = (((u % 1) + 1) % 1) * n
  const i = Math.floor(f)
  const frac = f - i
  const a = lp.pts[i]
  const b = lp.pts[Math.min(n, i + 1)]
  return {
    x: ((a.x + (b.x - a.x) * frac - vb.x) / vb.w) * w,
    y: ((a.y + (b.y - a.y) * frac - vb.y) / vb.h) * h,
  }
}

function seedMotes(): void {
  motes = Array.from({ length: 26 }, () => ({
    x: rand(0, 100),
    y: rand(0, 100),
    dx: rand(-1.6, 1.6),
    dy: rand(-1.2, 1.2),
    phase: rand(0, 6.28),
    size: rand(0.5, 1.2),
  }))
}

function renderLattice(w: number, h: number): void {
  lattice = document.createElement('canvas')
  lattice.width = Math.max(2, Math.floor(w))
  lattice.height = Math.max(2, Math.floor(h))
  const ctx = lattice.getContext('2d')
  if (!ctx) return
  const step = Math.max(10, Math.min(w, h) * 0.16)
  ctx.strokeStyle = withAlpha(props.fill.glow, 0.06)
  ctx.lineWidth = 1
  for (let x = -h; x < w + h; x += step) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x + h, h)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x + h, 0)
    ctx.lineTo(x, h)
    ctx.stroke()
  }
  for (let k = 0; k < 30; k++) {
    ctx.fillStyle = withAlpha(props.fill.glow, 0.05 + hash01(k * 7) * 0.06)
    const s = 1 + hash01(k * 3) * 2
    ctx.fillRect(hash01(k * 13) * w, hash01(k * 29) * h, s, s)
  }
}

function beamPoint(u: number, w: number, h: number): { x: number; y: number } {
  if (loops.length) return loopPoint(loops[mainLoop], u, w, h)
  return ringPoint(u, w, h)
}

function ringPoint(u: number, w: number, h: number): { x: number; y: number } {
  const inset = Math.min(w, h) * 0.16
  const rw = w - inset * 2
  const rh = h - inset * 2
  const per = 2 * (rw + rh)
  let d = ((u % 1) + 1) % 1 * per
  if (d < rw) return { x: inset + d, y: inset }
  d -= rw
  if (d < rh) return { x: inset + rw, y: inset + d }
  d -= rh
  if (d < rw) return { x: inset + rw - d, y: inset + rh }
  d -= rw
  return { x: inset, y: inset + rh - d }
}

function drawSlash(ctx: CanvasRenderingContext2D, sl: Slash, t: number, unit: number): void {
  const age = t - sl.born
  const grow = Math.min(1, age / 0.09)
  const fade = age < 0.12 ? 1 : Math.max(0, 1 - (age - 0.12) / 0.5)
  if (fade <= 0) return
  const dx = Math.cos(sl.ang)
  const dy = Math.sin(sl.ang)
  const half = sl.len * grow * unit
  ctx.lineCap = 'round'
  for (const layer of [
    { width: 6 * unit, color: withAlpha(props.fill.glow, 0.22 * fade) },
    { width: 2.6 * unit, color: withAlpha(props.fill.glow, 0.5 * fade) },
    { width: 1.1 * unit, color: withAlpha(props.fill.core, fade) },
  ]) {
    ctx.strokeStyle = layer.color
    ctx.lineWidth = Math.max(0.8, layer.width)
    ctx.beginPath()
    ctx.moveTo(sl.x * unit - dx * half, sl.y * unit - dy * half)
    ctx.lineTo(sl.x * unit + dx * half, sl.y * unit + dy * half)
    ctx.stroke()
  }
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init(w, h, now) {
    startTime = now
    sparks = []
    slashes = []
    waves = []
    seedMotes()
    renderLattice(w, h)
    buildLoops()
    nextSlashAt = 1.2
    nextWaveAt = 0.8
  },
  draw(ctx, w, h, now, reduced) {
    const t = reduced ? STATIC_T : (now - startTime) / 1000
    const speed = props.fill.speed ?? 0.12
    ctx.fillStyle = props.fill.dark
    ctx.fillRect(0, 0, w, h)
    if (lattice) ctx.drawImage(lattice, 0, 0, w, h)
    const unit = Math.min(w, h) / 100
    const bigUnit = Math.max(w, h) / 100
    for (const m of motes) {
      const mx = ((m.x + t * m.dx) % 104 + 104) % 104 - 2
      const my = ((m.y + t * m.dy) % 104 + 104) % 104 - 2
      const a = 0.2 + 0.4 * (0.5 + 0.5 * Math.sin(t * 1.8 + m.phase))
      ctx.fillStyle = withAlpha(props.fill.glow, a)
      ctx.beginPath()
      ctx.arc((mx / 100) * w, (my / 100) * h, Math.max(0.5, m.size * unit * 0.8), 0, Math.PI * 2)
      ctx.fill()
    }
    const pulse = 0.75 + 0.25 * Math.sin(t * 5.2)
    const steps = 90
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    for (const layer of [
      { width: 7 * unit, color: withAlpha(props.fill.glow, 0.16 * pulse) },
      { width: 3.6 * unit, color: withAlpha(props.fill.glow, 0.4 * pulse) },
      { width: 1.4 * unit, color: props.fill.core },
    ]) {
      ctx.strokeStyle = layer.color
      ctx.lineWidth = Math.max(0.8, layer.width)
      if (loops.length) {
        for (const lp of loops) {
          ctx.beginPath()
          for (let s = 0; s <= steps; s++) {
            const p = loopPoint(lp, s / steps, w, h)
            if (s === 0) ctx.moveTo(p.x, p.y)
            else ctx.lineTo(p.x, p.y)
          }
          ctx.closePath()
          ctx.stroke()
        }
      } else {
        ctx.beginPath()
        for (let s = 0; s <= steps; s++) {
          const p = ringPoint(s / steps, w, h)
          if (s === 0) ctx.moveTo(p.x, p.y)
          else ctx.lineTo(p.x, p.y)
        }
        ctx.closePath()
        ctx.stroke()
      }
    }
    const head = (t * speed) % 1
    for (let s = 0; s < 14; s++) {
      const p = beamPoint(head - s * 0.006, w, h)
      const a = (1 - s / 14) * 0.9
      ctx.fillStyle = withAlpha('#ffffff', a)
      ctx.beginPath()
      ctx.arc(p.x, p.y, Math.max(1, (2.4 - s * 0.12) * unit), 0, Math.PI * 2)
      ctx.fill()
    }
    if (!reduced) {
      if (t >= nextWaveAt) {
        waves.push({ born: t, u: head })
        nextWaveAt = t + rand(1.4, 2.6)
      }
      if (t >= nextSlashAt) {
        slashes.push({ born: t, x: rand(15, 85), y: rand(15, 85), ang: rand(0, Math.PI), len: rand(16, 34) })
        nextSlashAt = t + rand(1.1, 2.8) / (speed / 0.12)
      }
      waves = waves.filter((wv) => t - wv.born < 0.9)
      slashes = slashes.filter((sl) => t - sl.born < 0.7)
      sparks = sparks.filter((sp) => t - sp.born < 0.6)
      if (Math.random() < 0.12) {
        sparks.push({ born: t, u: head, ang: rand(0, Math.PI * 2), speed: rand(14, 34) })
      }
    } else if (slashes.length === 0) {
      slashes = [
        { born: t - 0.1, x: 30, y: 40, ang: 0.7, len: 26 },
        { born: t - 0.1, x: 72, y: 65, ang: 2.3, len: 20 },
      ]
    }
    for (const wv of waves) {
      const age = t - wv.born
      const p = beamPoint(wv.u, w, h)
      const a = Math.pow(1 - age / 0.9, 1.6) * 0.6
      ctx.strokeStyle = withAlpha(props.fill.glow, a)
      ctx.lineWidth = Math.max(0.8, unit * (1.6 - age))
      ctx.beginPath()
      ctx.arc(p.x, p.y, age * 26 * bigUnit * 0.4 + unit, 0, Math.PI * 2)
      ctx.stroke()
    }
    for (const sl of slashes) drawSlash(ctx, sl, t, Math.max(w, h) / 100)
    for (const sp of sparks) {
      const age = t - sp.born
      const p = beamPoint(sp.u, w, h)
      const x = p.x + Math.cos(sp.ang) * sp.speed * age * unit
      const y = p.y + Math.sin(sp.ang) * sp.speed * age * unit
      const a = Math.pow(1 - age / 0.6, 1.6)
      ctx.fillStyle = withAlpha(props.fill.spark ?? props.fill.core, a)
      ctx.beginPath()
      ctx.arc(x, y, Math.max(0.6, unit * 0.8), 0, Math.PI * 2)
      ctx.fill()
    }
  },
})
</script>

<template>
  <canvas ref="canvas" class="laser-border-fill" aria-hidden="true" />
</template>

<style scoped>
.laser-border-fill {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  pointer-events: none;
}
</style>
