<script setup lang="ts">
import EffectCanvas from '@/components/cosmetics/effects/EffectCanvas.vue'
import { useEffectSurface } from '@/composables/useEffectSurface'
import type { Composition } from '@/types/cosmetics/effects'
import { AVATAR_STACK_SCALE } from '@/utils/avatarBox'
import type { Ctx } from '@/utils/cosmetics/canvasShapes'
import { darken } from '@/utils/color'
import { activeEvents, asColor, asNumber, clampNumber, easeOut, geometryMemo, pctSize, readPctSizing, seededCount, seededPick, type ContentBox, type CycleEvent, type EffectFrame, type EffectProps, type PctSizing, type RingGeometry, type RingPoly } from '@/utils/cosmetics/effects'
import { drawGlint } from '@/utils/cosmetics/starshine'
import { hash01 } from '@/utils/random'
import { computed, watch } from 'vue'

const props = defineProps<EffectProps>()

interface Finish {
  color: string
  glitter: string
}

interface BaubleConfig {
  finishes: Finish[]
  cap: string
  thread: string
  count: number
  intervalSecs: number
  size: PctSizing
  swayDeg: number
  swaySecs: number
  specks: number
}

interface Speck {
  x: number
  y: number
  r: number
  rate: number
  phase: number
}

interface Bauble {
  x: number
  y: number
  r: number
  thread: number
  floor: number
  fall: number
  finish: Finish
  phase: number
  specks: Speck[]
}

const TAU = Math.PI * 2
const FALL_S = 0.5
const MAX_FALL_S = 1.6
const SHATTER_S = 0.7
const GONE_S = 1.3
const RETURN_S = 1
const AFTER_S = SHATTER_S + GONE_S + RETURN_S
const LIFE_S = MAX_FALL_S + AFTER_S
const FREE_DROP = 7
const SHARDS = 8
const GLINT_S = 3.4
const FALLBACK: Finish = { color: '#d9a520', glitter: '#fff3c4' }

function readFinishes(c: Composition, seed: number): Finish[] {
  const all = (Array.isArray(c.finishes) ? c.finishes : []).filter(
    (f): f is Finish => !!f && typeof f === 'object' && typeof (f as Finish).color === 'string' && typeof (f as Finish).glitter === 'string',
  )
  return all.length ? seededPick(all, seed, seededCount(c.tones, [1, 3], hash01(seed * 7 + 3))) : [FALLBACK]
}

function readBaubles(c: Composition): BaubleConfig {
  const seed = asNumber(c.seed) ?? 0
  return {
    finishes: readFinishes(c, seed),
    cap: asColor(c.cap),
    thread: asColor(c.thread),
    count: seededCount(c.count, [3, 5], hash01(seed * 11 + 5)),
    intervalSecs: Math.max(LIFE_S + 0.5, asNumber(c.intervalSecs) ?? 7),
    size: readPctSizing(c, 'sizePct', [1, 5.5, 30], [2, 3], [5, 12]),
    swayDeg: clampNumber(c.swayDeg, 0, 20, 5),
    swaySecs: Math.max(1, asNumber(c.swaySecs) ?? 3.6),
    specks: Math.round(clampNumber(c.specks, 0, 40, 14)),
  }
}

const { isTitle, field } = useEffectSurface(() => props.measure)
const cfg = computed(() => readBaubles(props.composition))
const framed = computed(() => !isTitle.value && !field.value)

function radius(box: ContentBox): number {
  return isTitle.value ? Math.max(2, box.h * 0.26) : pctSize(Math.min(box.w, box.h), cfg.value.size)
}

const pad = computed(() => (isTitle.value ? Math.ceil(radius(props.measure.box) * (FREE_DROP + 7)) : 0))

function edgeAt(poly: RingPoly, x: number, lowest: boolean, fallback: number): number {
  let found = lowest ? -Infinity : Infinity
  poly.pts.forEach((a, i) => {
    const b = poly.pts[(i + 1) % poly.pts.length]
    if ((a.x - x) * (b.x - x) > 0 || a.x === b.x) return
    const y = a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x)
    found = lowest ? Math.max(found, y) : Math.min(found, y)
  })
  return Number.isFinite(found) ? found : fallback
}

interface Picture {
  path: Path2D
  span: (x: number) => [top: number, bottom: number] | null
}

interface Hung {
  baubles: Bauble[]
  picture: Picture | null
}

const SCAN_STEPS = 240

function pictureOf(box: ContentBox): Picture | null {
  const d = props.measure.host?.avatarMask
  const probe = d && framed.value ? document.createElement('canvas').getContext('2d') : null
  if (!d || !probe) return null
  const path = new Path2D(d)
  const unit = (p: number, origin: number, size: number) => 50 + (((p - origin) / size) * 100 - 50) / AVATAR_STACK_SCALE
  return {
    path,
    span(x) {
      let top = NaN
      let bottom = NaN
      for (let i = 0; i <= SCAN_STEPS; i++) {
        const y = box.y + (box.h * i) / SCAN_STEPS
        if (!probe.isPointInPath(path, unit(x, box.x, box.w), unit(y, box.y, box.h))) continue
        if (Number.isNaN(top)) top = y
        bottom = y
      }
      return Number.isNaN(top) ? null : [top, bottom]
    },
  }
}

function clipTo(g: Ctx, picture: Picture, box: ContentBox): void {
  const before = g.getTransform()
  g.translate(box.x, box.y)
  g.scale(box.w / 100, box.h / 100)
  g.translate(50, 50)
  g.scale(AVATAR_STACK_SCALE, AVATAR_STACK_SCALE)
  g.translate(-50, -50)
  g.clip(picture.path)
  g.setTransform(before)
}

const hung = geometryMemo<Hung>()
watch(cfg, hung.clear)

function hang(box: ContentBox, ring: RingGeometry, picture: Picture | null): Bauble[] {
  const c = cfg.value
  const size = radius(box)
  const seed = (asNumber(props.composition.seed) ?? 0) * 17 + props.measure.stack * 101 + 71
  return Array.from({ length: c.count }, (_, i) => {
    const s = seed + i * 23
    const r = size * (0.8 + hash01(s + 2) * 0.4)
    const thread = size * (0.8 + hash01(s + 3) * 2.2)
    const x = box.x + box.w * (0.22 + ((i + 0.2 + hash01(s + 1) * 0.6) / c.count) * 0.56)
    const inside = picture?.span(x) ?? (framed.value ? [edgeAt(ring.inner, x, false, box.y), edgeAt(ring.inner, x, true, box.y + box.h)] : null)
    const y = inside ? inside[0] : field.value ? box.y : box.y + (props.measure.ink?.bottom ?? box.h)
    const rest = y + thread + r * 1.28
    const floor = inside ? inside[1] - r : field.value ? box.y + box.h - r : rest + r * FREE_DROP
    return {
      x,
      y,
      r,
      thread,
      floor,
      fall: Math.min(MAX_FALL_S, FALL_S * Math.sqrt(Math.max(1, (floor - rest) / (r * FREE_DROP)))),
      finish: c.finishes[i % c.finishes.length],
      phase: hash01(s + 4) * TAU,
      specks: Array.from({ length: c.specks }, (_, k) => {
        const reach = Math.sqrt(hash01(s + k * 5 + 11)) * 0.84
        const turn = hash01(s + k * 7 + 13) * TAU
        return { x: Math.cos(turn) * reach, y: Math.sin(turn) * reach, r: 0.06 + hash01(s + k * 3 + 17) * 0.08, rate: 1.4 + hash01(s + k * 11 + 19) * 3, phase: hash01(s + k * 13 + 23) * TAU }
      }),
    }
  })
}

function ornament(g: Ctx, b: Bauble, cy: number, t: number): void {
  const c = cfg.value
  g.fillStyle = c.cap
  g.fillRect(-b.r * 0.3, cy - b.r * 1.28, b.r * 0.6, b.r * 0.4)
  g.fillStyle = b.finish.color
  g.beginPath()
  g.arc(0, cy, b.r, 0, TAU)
  g.fill()
  g.fillStyle = darken(b.finish.color, 0.28)
  g.beginPath()
  g.arc(0, cy, b.r, 0.15, Math.PI - 0.15)
  g.arc(0, cy - b.r * 0.42, b.r * 1.08, Math.PI - 0.62, 0.62, true)
  g.fill()
  const alpha = g.globalAlpha
  g.fillStyle = b.finish.glitter
  for (const speck of b.specks) {
    g.globalAlpha = alpha * (0.2 + 0.8 * Math.sin(t * speck.rate + speck.phase) ** 2)
    g.beginPath()
    g.arc(speck.x * b.r, cy + speck.y * b.r, speck.r * b.r, 0, TAU)
    g.fill()
  }
  const beat = ((t + b.phase) % GLINT_S) / (GLINT_S * 0.3)
  if (beat < 1) {
    g.globalAlpha = alpha * Math.sin(beat * Math.PI)
    drawGlint(g, 'star', -b.r * 0.36, cy - b.r * 0.4, b.r * 0.62 * Math.sin(beat * Math.PI), beat * 0.8)
  }
  g.globalAlpha = alpha
}

function drawHanging(g: Ctx, b: Bauble, t: number, grown: number): void {
  const c = cfg.value
  const thread = b.thread * grown
  g.save()
  g.translate(b.x, b.y)
  g.rotate(Math.sin((t * TAU) / c.swaySecs + b.phase) * ((c.swayDeg * Math.PI) / 180))
  g.globalAlpha = Math.min(1, grown * 2)
  g.strokeStyle = c.thread
  g.lineWidth = Math.max(0.5, b.r * 0.08)
  g.beginPath()
  g.moveTo(0, 0)
  g.lineTo(0, thread)
  g.stroke()
  ornament(g, b, thread + b.r * 1.28, t)
  g.restore()
}

function drawShards(g: Ctx, b: Bauble, age: number, seed: number): void {
  const u = age / SHATTER_S
  for (let k = 0; k < SHARDS; k++) {
    const a = Math.PI * (1.08 + (k / (SHARDS - 1)) * 0.84) + (hash01(seed + k) - 0.5) * 0.3
    const reach = b.r * (1.6 + hash01(seed + k * 3) * 2.2) * easeOut(u)
    const x = b.x + Math.cos(a) * reach
    const y = b.floor + Math.sin(a) * reach * 0.6 + b.r * 1.2 * u * u
    const size = b.r * (0.25 + hash01(seed + k * 5) * 0.3)
    const turn = hash01(seed + k * 7) * TAU + u * 5
    g.fillStyle = k % 3 ? b.finish.color : b.finish.glitter
    g.globalAlpha = 1 - u * u
    g.beginPath()
    g.moveTo(x + Math.cos(turn) * size, y + Math.sin(turn) * size)
    g.lineTo(x + Math.cos(turn + 2.2) * size, y + Math.sin(turn + 2.2) * size)
    g.lineTo(x + Math.cos(turn + 4.3) * size * 0.7, y + Math.sin(turn + 4.3) * size * 0.7)
    g.fill()
  }
  g.globalAlpha = 1
}

function drawDropped(g: Ctx, b: Bauble, t: number, ev: CycleEvent): void {
  const rest = b.thread + b.r * 1.28
  const back = b.fall + AFTER_S - RETURN_S
  if (ev.age < b.fall) {
    g.save()
    g.translate(b.x, b.y)
    ornament(g, b, rest + Math.max(0, b.floor - b.y - rest) * (ev.age / b.fall) ** 2, t)
    g.restore()
  } else if (ev.age < b.fall + SHATTER_S) {
    drawShards(g, b, ev.age - b.fall, ev.seed)
  } else if (ev.age > back) {
    drawHanging(g, b, t, easeOut((ev.age - back) / RETURN_S))
  }
}

function drawFrame(f: EffectFrame): boolean {
  const c = cfg.value
  const t = f.reduced ? 0 : f.t
  const { baubles, picture } = hung.get(f.ring, 1, () => {
    const found = pictureOf(f.box)
    return { baubles: hang(f.box, f.ring, found), picture: found }
  })
  f.g.save()
  if (picture) clipTo(f.g, picture, f.box)
  const ev = f.reduced ? undefined : activeEvents(f.t, c.intervalSecs, LIFE_S, props.measure.stack * 101 + 83)[0]
  const dropped = ev ? Math.floor(hash01(ev.seed + 9) * baubles.length) : -1
  baubles.forEach((b, i) => {
    if (i === dropped && ev) drawDropped(f.g, b, t, ev)
    else drawHanging(f.g, b, t, 1)
  })
  f.g.restore()
  return true
}
</script>

<template>
  <EffectCanvas :measure="measure" :pad="pad" :draw="drawFrame" />
</template>
