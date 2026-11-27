<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { BorderOverlayHost, BorderScarfOverlaySpec } from '@/types/cosmetics/border'
import { darken, lighten, luminance } from '@/utils/color'
import type { Ctx } from '@/utils/cosmetics/canvasShapes'
import { fillTriple, tripleFromHex } from '@/utils/cosmetics/fillColors'
import { paintKnit } from '@/utils/cosmetics/knit'
import { enterUnitSpace } from '@/utils/cosmetics/overlayCanvas'
import { computed, useTemplateRef } from 'vue'

const props = defineProps<BorderOverlayHost & { overlay: BorderScarfOverlaySpec }>()

interface Palette {
  wool: string
  stripe: string
  ink: string
}

const MARGIN = 20
const MIN_GAP = 0.3
const STATIC_T = 0
const TOP = [-3, 76, 25, 82, 50, 80, 75, 78, 103, 74]
const DROP = 19
const STRIPE_XS = [3, 19, 35, 51, 83]
const STRIPE_W = 7
const WORN_STITCH = 2.2
const WORN_AREA = { x0: -12, y0: 60, x1: 112, y1: 124 }
const KNOT = { x: 73, y: 86 }
const TAIL = { top: 90, bottom: 117, left: -6, right: 7 }

const palette = computed<Palette>(() => {
  const fill = props.color?.states?.[0]?.fill
  if (worn.value) return { wool: worn.value.wool, stripe: worn.value.motif, ink: darken(worn.value.shade, 0.4) }
  const [dark, , light] = (fill && fillTriple(fill)) || tripleFromHex(props.overlay.fallback)
  const lightWool = props.overlay.tone === 'light'
  const wool = lightWool ? light : dark
  let stripe = lightWool ? dark : light
  if (Math.abs(luminance(wool) - luminance(stripe)) < MIN_GAP) stripe = luminance(wool) > 0.5 ? darken(wool, 0.6) : lighten(wool, 0.6)
  return { wool, stripe, ink: darken(wool, 0.55) }
})

const worn = computed(() => {
  const fill = props.color?.states?.[0]?.fill
  return fill?.type === 'knit' && props.overlay.wears === 'knit' ? { ...fill, stitch: WORN_STITCH } : null
})

function wear(ctx: Ctx): void {
  if (worn.value) paintKnit(ctx, worn.value, WORN_AREA)
}

function topAt(x: number): number {
  const k = x < 50 ? 0 : 4
  const t = (x - TOP[k]) / (TOP[k + 4] - TOP[k])
  return (1 - t) * (1 - t) * TOP[k + 1] + 2 * (1 - t) * t * TOP[k + 3] + t * t * TOP[k + 5]
}

function bandEdge(ctx: Ctx, dy: number, move: boolean): void {
  if (move) ctx.moveTo(TOP[0], TOP[1] + dy)
  ctx.quadraticCurveTo(TOP[2], TOP[3] + dy, TOP[4], TOP[5] + dy)
  ctx.quadraticCurveTo(TOP[6], TOP[7] + dy, TOP[8], TOP[9] + dy)
}

function bandPath(ctx: Ctx): void {
  ctx.beginPath()
  bandEdge(ctx, 0, true)
  ctx.lineTo(TOP[8], TOP[9] + DROP)
  ctx.quadraticCurveTo(TOP[6], TOP[7] + DROP, TOP[4], TOP[5] + DROP - 1)
  ctx.quadraticCurveTo(TOP[2], TOP[3] + DROP - 1, TOP[0], TOP[1] + DROP)
  ctx.closePath()
}

function drawBand(ctx: Ctx, p: Palette): void {
  bandPath(ctx)
  ctx.fillStyle = p.wool
  ctx.fill()
  ctx.save()
  ctx.clip()
  wear(ctx)
  ctx.fillStyle = p.stripe
  for (const x of worn.value ? [] : STRIPE_XS) {
    ctx.beginPath()
    ctx.moveTo(x, topAt(x) - 1)
    ctx.lineTo(x + STRIPE_W, topAt(x + STRIPE_W) - 1)
    ctx.lineTo(x + STRIPE_W - 2, topAt(x + STRIPE_W) + DROP + 1)
    ctx.lineTo(x - 2, topAt(x) + DROP + 1)
    ctx.fill()
  }
  ctx.strokeStyle = p.ink
  ctx.globalAlpha = 0.22
  ctx.lineWidth = 0.7
  for (const k of [0.33, 0.66]) {
    ctx.beginPath()
    bandEdge(ctx, DROP * k, true)
    ctx.stroke()
  }
  ctx.restore()
  bandPath(ctx)
  ctx.globalAlpha = 0.5
  ctx.lineWidth = 0.8
  ctx.stroke()
  ctx.globalAlpha = 1
}

function tailPath(ctx: Ctx, len: number): void {
  ctx.beginPath()
  ctx.moveTo(TAIL.left, 0)
  ctx.lineTo(TAIL.left - 2, len)
  ctx.lineTo(TAIL.right, len)
  ctx.lineTo(TAIL.right, 0)
  ctx.closePath()
}

function knotPath(ctx: Ctx): void {
  ctx.beginPath()
  ctx.moveTo(65, 79.5)
  ctx.quadraticCurveTo(73, 76, 81, 79)
  ctx.quadraticCurveTo(84, 86, 81, 93.5)
  ctx.quadraticCurveTo(73, 96.5, 65, 94)
  ctx.quadraticCurveTo(62.5, 86.5, 65, 79.5)
}

function drawTail(ctx: Ctx, p: Palette, t: number): void {
  const len = TAIL.bottom - TAIL.top
  ctx.save()
  ctx.translate(KNOT.x, TAIL.top)
  ctx.rotate(Math.sin(t * 1.1) * 0.05)
  tailPath(ctx, len)
  ctx.fillStyle = p.wool
  ctx.fill()
  ctx.save()
  ctx.clip()
  if (worn.value) {
    ctx.translate(-KNOT.x, -TAIL.top)
    wear(ctx)
  } else {
    ctx.fillStyle = p.stripe
    ctx.fillRect(-10, 8, 20, 5)
    ctx.fillRect(-10, 18, 20, 5)
  }
  ctx.restore()
  tailPath(ctx, len)
  ctx.strokeStyle = p.ink
  ctx.globalAlpha = 0.5
  ctx.lineWidth = 0.8
  ctx.stroke()
  ctx.globalAlpha = 1
  ctx.strokeStyle = p.stripe
  ctx.lineWidth = 1.4
  ctx.lineCap = 'round'
  ctx.beginPath()
  for (let x = TAIL.left - 1.2; x < TAIL.right; x += 2.4) {
    ctx.moveTo(x, len)
    ctx.lineTo(x - 0.3, len + 5)
  }
  ctx.stroke()
  ctx.restore()
}

function drawKnot(ctx: Ctx, p: Palette): void {
  knotPath(ctx)
  ctx.fillStyle = p.wool
  ctx.fill()
  ctx.save()
  ctx.clip()
  wear(ctx)
  ctx.restore()
  knotPath(ctx)
  ctx.strokeStyle = p.ink
  ctx.lineWidth = 0.9
  ctx.globalAlpha = 0.55
  ctx.stroke()
  ctx.globalAlpha = 0.28
  ctx.lineWidth = 0.7
  ctx.beginPath()
  for (const y of [82, 86.5, 91]) {
    ctx.moveTo(68, y)
    ctx.quadraticCurveTo(KNOT.x, y - 1.5, 78, y)
  }
  ctx.stroke()
  ctx.globalAlpha = 1
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init() {},
  draw(ctx, w, h, now, reduced) {
    ctx.clearRect(0, 0, w, h)
    const p = palette.value
    ctx.save()
    enterUnitSpace(ctx, w, h, MARGIN)
    drawTail(ctx, p, reduced ? STATIC_T : now / 1000)
    drawBand(ctx, p)
    drawKnot(ctx, p)
    ctx.restore()
  },
})
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" />
</template>
