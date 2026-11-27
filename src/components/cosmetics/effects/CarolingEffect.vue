<script setup lang="ts">
import EffectCanvas from '@/components/cosmetics/effects/EffectCanvas.vue'
import { useEffectSurface } from '@/composables/useEffectSurface'
import type { Composition } from '@/types/cosmetics/effects'
import type { Ctx } from '@/utils/cosmetics/canvasShapes'
import { activeEvents, asColor, asNumber, clampNumber, pctSize, readPctSizing, ringExtreme, type CycleEvent, type EffectFrame, type EffectProps, type PctSizing } from '@/utils/cosmetics/effects'
import { smoothstep01 } from '@/utils/math'
import { hash01 } from '@/utils/random'
import { computed } from 'vue'

const props = defineProps<EffectProps>()

interface CarolConfig {
  color: string
  notes: number
  intervalSecs: number
  staggerSecs: number
  noteSecs: number
  size: PctSizing
  hops: number
  hop: number
  spanPct: number
}

const TAU = Math.PI * 2
const FADE = 0.16
const SPRITE = { x: 0.6, y: 1.5, w: 2.2, h: 2 }
const SPRITE_LIMIT = 24
const NOTE_GAP = 2

function readCarol(c: Composition, light: boolean): CarolConfig {
  return {
    color: asColor(light ? c.lightColor : c.color),
    notes: Math.round(clampNumber(c.notes, 2, 6, 4)),
    intervalSecs: Math.max(1.5, asNumber(c.intervalSecs) ?? 5),
    staggerSecs: Math.max(0.05, asNumber(c.staggerSecs) ?? 0.36),
    noteSecs: Math.max(0.6, asNumber(c.noteSecs) ?? 2.6),
    size: readPctSizing(c, 'sizePct', [2, 5, 40], [3, 4], [5, 13]),
    hops: Math.round(clampNumber(c.hops, 1, 10, 5)),
    hop: clampNumber(c.hop, 0.3, 4, 1.3),
    spanPct: clampNumber(c.spanPct, 10, 100, 60),
  }
}

const { isTitle, field, light } = useEffectSurface(() => props.measure)
const cfg = computed(() => readCarol(props.composition, light.value))
const color = computed(() => props.measure.host?.color ?? cfg.value.color)

function noteSize(minD: number, boxH: number): number {
  return isTitle.value ? Math.max(3, boxH * 0.34) : pctSize(minD, cfg.value.size)
}

const phrase = computed(() => {
  const c = cfg.value
  const b = props.measure.box
  const size = noteSize(Math.min(b.w, b.h), b.h)
  const span = b.w * (c.spanPct / 100)
  const gap = size * NOTE_GAP
  const notes = Math.max(1, Math.min(c.notes, 1 + Math.floor(span / gap)))
  const stagger = Math.max(c.staggerSecs, (gap / span) * c.noteSecs)
  return { size, span, notes, stagger, life: (notes - 1) * stagger + c.noteSecs }
})

const pad = computed(() => {
  if (field.value) return 0
  const b = props.measure.box
  return Math.round(noteSize(Math.min(b.w, b.h), b.h) * (cfg.value.hop + 2.4))
})

function paintNote(g: Ctx, s: number, pair: boolean): void {
  const stemW = Math.max(1, s * 0.11)
  const heads = pair ? [[0, 0], [s * 0.88, -s * 0.16]] : [[0, 0]]
  for (const [hx, hy] of heads) {
    g.beginPath()
    g.ellipse(hx, hy, s * 0.36, s * 0.27, -0.35, 0, TAU)
    g.fill()
    g.fillRect(hx + s * 0.34 - stemW, hy - s * 1.05, stemW, s * 1.03)
  }
  g.beginPath()
  if (pair) {
    g.moveTo(s * 0.34 - stemW, -s * 1.05)
    g.lineTo(s * 1.22, -s * 1.21)
    g.lineTo(s * 1.22, -s * 0.99)
    g.lineTo(s * 0.34 - stemW, -s * 0.83)
  } else {
    g.moveTo(s * 0.34, -s * 1.05)
    g.quadraticCurveTo(s * 0.92, -s * 0.86, s * 0.74, -s * 0.4)
    g.quadraticCurveTo(s * 0.72, -s * 0.72, s * 0.34, -s * 0.8)
  }
  g.fill()
}

const sprites = new Map<string, HTMLCanvasElement>()

function noteSprite(s: number, pair: boolean, ink: string): HTMLCanvasElement {
  const key = `${s.toFixed(2)}:${pair}:${ink}`
  let sprite = sprites.get(key)
  if (sprite) return sprite
  if (sprites.size > SPRITE_LIMIT) sprites.clear()
  const scale = window.devicePixelRatio || 1
  sprite = document.createElement('canvas')
  sprite.width = Math.ceil(s * SPRITE.w * scale)
  sprite.height = Math.ceil(s * SPRITE.h * scale)
  const g = sprite.getContext('2d')
  if (g) {
    g.setTransform(scale, 0, 0, scale, s * SPRITE.x * scale, s * SPRITE.y * scale)
    g.fillStyle = ink
    paintNote(g, s, pair)
  }
  sprites.set(key, sprite)
  return sprite
}

function drawPhrase(f: EffectFrame, ev: CycleEvent, floorY: number): void {
  const c = cfg.value
  const { g, box } = f
  const { size: s, span, notes, stagger } = phrase.value
  const from = box.x + s + hash01(ev.seed + 2) * Math.max(0, box.w - span - s * 2)
  const back = hash01(ev.seed + 4) > 0.5
  for (let k = 0; k < notes; k++) {
    const u = (ev.age - k * stagger) / c.noteSecs
    if (u <= 0 || u >= 1) continue
    const beat = u * c.hops * TAU
    const air = (1 - Math.cos(beat)) / 2
    g.save()
    g.translate(from + span * (back ? 1 - u : u), floorY - s * 0.3 - air * s * c.hop)
    g.rotate(Math.sin(beat) * (back ? -0.1 : 0.1))
    g.globalAlpha = smoothstep01(u / FADE) * smoothstep01((1 - u) / FADE)
    g.drawImage(noteSprite(s, hash01(ev.seed + k * 7) > 0.6, color.value), -s * SPRITE.x, -s * SPRITE.y, s * SPRITE.w, s * SPRITE.h)
    g.restore()
  }
  g.globalAlpha = 1
}

function drawFrame(f: EffectFrame): boolean {
  const c = cfg.value
  const seed0 = props.measure.stack * 101 + 59
  const events: CycleEvent[] = f.reduced ? [{ age: phrase.value.life * 0.45, seed: seed0 }] : activeEvents(f.t, c.intervalSecs, phrase.value.life, seed0)
  const floorY = field.value ? f.box.y + f.box.h : isTitle.value ? f.box.y : ringExtreme(f.ring.outer, { x: 0, y: -1 }).p.y
  for (const ev of events) drawPhrase(f, ev, floorY)
  return events.length > 0
}
</script>

<template>
  <EffectCanvas :measure="measure" :pad="pad" :draw="drawFrame" />
</template>
