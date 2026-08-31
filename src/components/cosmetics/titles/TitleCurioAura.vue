<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { TitleCurioAuraSpec } from '@/types/api/items'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { pickVariant, titleAuraRect, type TitleAuraRect } from '@/utils/cosmetics/titleAura'
import { hash01, randBetween as rand } from '@/utils/random'
import { useTemplateRef } from 'vue'

const props = defineProps<{
  aura: TitleCurioAuraSpec
  light: boolean
}>()

type CurioKind = 'crate' | 'gem' | 'coin' | 'trophy' | 'star'

interface Slot {
  x: number
  y: number
  size: number
}

const KINDS: CurioKind[] = ['crate', 'gem', 'coin', 'trophy', 'star']
const STATIC_T = 3
const CYCLE = 6

let rect: TitleAuraRect | null = null
let slots: Slot[] = []

function color(): string {
  return pickVariant(props.light, props.aura.lightColor, props.aura.color, '#f2c94c')
}

function glint(): string {
  return pickVariant(props.light, props.aura.lightGlint, props.aura.glint, '#fff7d6')
}

function seedSlots(): void {
  const n = props.aura.count ?? 5
  slots = Array.from({ length: n }, (_, i) => {
    const left = i % 2 === 0
    return {
      x: left ? rand(-0.02, 0.16) : rand(0.84, 1.02),
      y: 0.1 + (Math.floor(i / 2) / Math.max(1, Math.ceil(n / 2) - 1)) * 0.75 + rand(-0.05, 0.05),
      size: rand(0.5, 0.72),
    }
  })
}

function drawKind(ctx: CanvasRenderingContext2D, kind: CurioKind, s: number): void {
  ctx.beginPath()
  if (kind === 'crate') {
    ctx.rect(-s * 0.5, -s * 0.42, s, s * 0.84)
    ctx.moveTo(-s * 0.5, -s * 0.1)
    ctx.lineTo(s * 0.5, -s * 0.1)
  } else if (kind === 'gem') {
    ctx.moveTo(0, -s * 0.5)
    ctx.lineTo(s * 0.45, -s * 0.1)
    ctx.lineTo(0, s * 0.5)
    ctx.lineTo(-s * 0.45, -s * 0.1)
    ctx.closePath()
  } else if (kind === 'coin') {
    ctx.arc(0, 0, s * 0.44, 0, Math.PI * 2)
    ctx.moveTo(s * 0.26, 0)
    ctx.arc(0, 0, s * 0.26, 0, Math.PI * 2)
  } else if (kind === 'trophy') {
    ctx.moveTo(-s * 0.34, -s * 0.46)
    ctx.lineTo(s * 0.34, -s * 0.46)
    ctx.quadraticCurveTo(s * 0.3, s * 0.08, 0, s * 0.14)
    ctx.quadraticCurveTo(-s * 0.3, s * 0.08, -s * 0.34, -s * 0.46)
    ctx.moveTo(-s * 0.16, s * 0.42)
    ctx.lineTo(s * 0.16, s * 0.42)
    ctx.moveTo(0, s * 0.14)
    ctx.lineTo(0, s * 0.42)
  } else {
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 - Math.PI / 2
      const b = a + Math.PI / 5
      const ox = Math.cos(a) * s * 0.5
      const oy = Math.sin(a) * s * 0.5
      if (k === 0) ctx.moveTo(ox, oy)
      else ctx.lineTo(ox, oy)
      ctx.lineTo(Math.cos(b) * s * 0.22, Math.sin(b) * s * 0.22)
    }
    ctx.closePath()
  }
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init() {
    rect = canvasRef.value ? titleAuraRect(canvasRef.value) : null
    seedSlots()
  },
  draw(ctx, w, h, now, reduced) {
    ctx.clearRect(0, 0, w, h)
    if (!rect) return
    const r = rect
    const t = reduced ? STATIC_T : now / 1000
    for (const [si, slot] of slots.entries()) {
      const cycle = Math.floor(t / CYCLE + si * 0.37)
      const local = ((t / CYCLE + si * 0.37) % 1)
      const kind = KINDS[Math.floor(hash01(cycle * 13 + si * 7) * KINDS.length)]
      let a = 0.75
      if (local < 0.1) a *= local / 0.1
      else if (local > 0.9) a *= (1 - local) / 0.1
      const s = r.fs * slot.size
      const x = r.x + r.w * slot.x
      const y = r.y + r.h * slot.y + Math.sin(t * 0.9 + si * 2) * r.fs * 0.05
      ctx.save()
      ctx.translate(x, y)
      ctx.strokeStyle = withAlpha(color(), a)
      ctx.lineWidth = Math.max(0.8, r.fs * 0.06)
      ctx.lineJoin = 'round'
      drawKind(ctx, kind, s)
      ctx.stroke()
      const gp = ((t * 0.6 + si * 0.7) % 3) / 0.5
      if (gp < 1) {
        const gx = -s * 0.5 + gp * s
        ctx.strokeStyle = withAlpha(glint(), a * Math.sin(gp * Math.PI))
        ctx.lineWidth = Math.max(0.6, r.fs * 0.04)
        ctx.beginPath()
        ctx.moveTo(gx + s * 0.14, -s * 0.5)
        ctx.lineTo(gx - s * 0.14, s * 0.5)
        ctx.stroke()
      }
      ctx.restore()
    }
  },
})
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" />
</template>
