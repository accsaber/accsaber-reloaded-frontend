import type { ItemModifierRef, UnusualEffectRef } from '@/types/api/items'
import type { Composition, ModifierEffectSpec } from '@/types/cosmetics/effects'
import { asNumber, asString } from '@/utils/cosmetics/effects'
import { readHauntSpec, readWearSpec, type HauntSpec, type WearSpec } from '@/utils/cosmetics/wear'
import { sortModifiersByKey, UNUSUAL_MODIFIER_KEY } from '@/utils/items'
import { clamp } from '@/utils/math'

export interface EffectLayer {
  key: string
  spec: ModifierEffectSpec
}

export function buildEffectLayers(
  modifiers: ItemModifierRef[] | null | undefined,
  unusualEffect?: UnusualEffectRef | null,
): EffectLayer[] {
  const hasRolledEffect = !!unusualEffect?.effectSpec
  const layers: EffectLayer[] = []
  for (const m of sortModifiersByKey(modifiers ?? [])) {
    if (hasRolledEffect && m.key === UNUSUAL_MODIFIER_KEY) continue
    if (m.effectSpec) layers.push({ key: `m:${m.id}`, spec: m.effectSpec })
  }
  if (unusualEffect?.effectSpec) {
    layers.push({ key: `u:${unusualEffect.id}`, spec: unusualEffect.effectSpec })
  }
  return layers
}

export function valueFxLayers(value: { fx?: ModifierEffectSpec } | null | undefined): EffectLayer[] {
  return value?.fx?.compositions?.length ? [{ key: 'fx', spec: value.fx }] : []
}

export interface StackedEffectLayer extends EffectLayer {
  stackIndex: number
}

export function themeCompositionLayers(
  layers: EffectLayer[] | null | undefined,
): StackedEffectLayer[] {
  return annotateEffectLayerStacks(
    (layers ?? []).flatMap((layer) => {
      const compositions = layer.spec.themeCompositions
      if (!compositions?.length) return []
      return [{ key: layer.key, spec: { contractVersion: 1 as const, compositions } }]
    }),
  )
}

export function annotateEffectLayerStacks(
  layers: EffectLayer[] | null | undefined,
): StackedEffectLayer[] {
  const seen = new Map<string, number>()
  return (layers ?? []).map((layer) => {
    const n = seen.get(layer.key) ?? 0
    seen.set(layer.key, n + 1)
    return { key: n > 0 ? `${layer.key}#${n}` : layer.key, spec: layer.spec, stackIndex: n }
  })
}

export interface FragmentSpec {
  radiusPct: number
  cols: number
  black: string
  red: string
}

function parseFragment(c: Composition): FragmentSpec {
  return {
    radiusPct: clamp(asNumber(c.radiusPct) ?? 40, 20, 100),
    cols: clamp(Math.round(asNumber(c.cols) ?? 6), 3, 9),
    black: asString(c.black) ?? '#0c0a0a',
    red: asString(c.red) ?? '#d8241c',
  }
}

export function readFragmentSpec(unusualEffect?: UnusualEffectRef | null): FragmentSpec | null {
  const c = unusualEffect?.effectSpec?.compositions?.find((comp) => comp.type === 'fragment')
  return c ? parseFragment(c) : null
}

function findLayerComposition<T>(
  layers: EffectLayer[] | null | undefined,
  type: string,
  parse: (c: Composition) => T,
): { spec: T; seed: string } | null {
  for (const layer of layers ?? []) {
    const c = layer.spec.compositions.find((comp) => comp.type === type)
    if (c) return { spec: parse(c), seed: layer.key }
  }
  return null
}

export function readWearFromLayers(layers: EffectLayer[] | null | undefined): { spec: WearSpec; seed: string } | null {
  return findLayerComposition(layers, 'wear', readWearSpec)
}

export function readHauntFromLayers(layers: EffectLayer[] | null | undefined): { spec: HauntSpec; seed: string } | null {
  return findLayerComposition(layers, 'haunt', readHauntSpec)
}

export function readFragmentFromLayers(
  layers: EffectLayer[] | null | undefined,
): { spec: FragmentSpec; count: number; seed: string } | null {
  if (!layers) return null
  let spec: FragmentSpec | null = null
  let seed = ''
  let count = 0
  for (const layer of layers) {
    const c = layer.spec.compositions.find((comp) => comp.type === 'fragment')
    if (c) {
      count++
      if (!spec) {
        spec = parseFragment(c)
        seed = layer.key
      }
    }
  }
  return spec ? { spec, count, seed } : null
}
