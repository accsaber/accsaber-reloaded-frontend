import type { ProfileBackgroundValue, ProfileThumbnailBackgroundValue, ThumbnailScene } from '@/types/cosmetics/background'
import type { BorderColorValue, BorderShapeValue } from '@/types/cosmetics/border'
import type { ClanTagCardValue, ClanTitleEffectValue } from '@/types/cosmetics/clan'
import type { AssetSet } from '@/types/cosmetics/common'
import type { CrateIconValue } from '@/types/cosmetics/crate'
import type { BadgeValue } from '@/types/cosmetics/misc'
import type { ThemeValue } from '@/types/cosmetics/theme'
import type { TitleValue } from '@/types/cosmetics/title'

export function isObj(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

export function isString(v: unknown): v is string {
  return typeof v === 'string'
}

function isNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

export function readTitleValue(value: unknown): TitleValue | null {
  if (!isObj(value)) return null
  if (!isString(value.text)) return null
  if (!Array.isArray(value.states) || value.states.length === 0) return null
  const states = value.states.filter((s): s is Record<string, unknown> => isObj(s) && isNumber(s.atMs))
  if (states.length === 0) return null
  return value as unknown as TitleValue
}

export function readClanTitleEffectValue(value: unknown): ClanTitleEffectValue | null {
  if (!isObj(value)) return null
  if (!Array.isArray(value.states) || value.states.length === 0) return null
  const states = value.states.filter((s): s is Record<string, unknown> => isObj(s) && isNumber(s.atMs))
  if (states.length === 0) return null
  return value as unknown as ClanTitleEffectValue
}

export function readClanTagCardValue(value: unknown): ClanTagCardValue | null {
  if (!isObj(value)) return null
  return isObj(value.left) || isObj(value.right) || Array.isArray(value.decals) || isObj(value.fx)
    ? (value as unknown as ClanTagCardValue)
    : null
}

export function readBorderShapeValue(value: unknown): BorderShapeValue | null {
  if (!isObj(value)) return null
  if (!Array.isArray(value.states) || value.states.length === 0) return null
  const renderMode = value.renderMode
  if (renderMode === 'pixel') {
    const validStates = value.states.filter((s) => isObj(s) && isNumber(s.atMs))
    if (validStates.length === 0) return null
    return value as unknown as BorderShapeValue
  }
  const validStates = value.states.filter(
    (s) => isObj(s) && isNumber(s.atMs) && Array.isArray(s.paths)
      && (s.paths as unknown[]).every((p) => isObj(p) && isString(p.d)),
  )
  if (validStates.length === 0) return null
  return value as unknown as BorderShapeValue
}

export function readBorderColorValue(value: unknown): BorderColorValue | null {
  if (!isObj(value) || !Array.isArray(value.states)) return null
  const valid = value.states.some((s) => isObj(s) && isNumber(s.atMs) && isRenderableFill(s.fill))
  return valid ? (value as unknown as BorderColorValue) : null
}

function isRenderableFill(fill: unknown): boolean {
  if (!isObj(fill) || !isString(fill.type)) return false
  if (fill.type === 'solid') return isString(fill.hex)
  if (fill.type === 'linear' || fill.type === 'radial' || fill.type === 'conic') {
    return Array.isArray(fill.stops) && fill.stops.every((stop) => isObj(stop) && isString(stop.hex))
  }
  return true
}

export function readBadgeValue(value: unknown): BadgeValue | null {
  if (!isObj(value)) return null
  const asset = value.asset
  if (!isObj(asset) || !isString(asset.altText)) return null
  return value as unknown as BadgeValue
}

export function readBackgroundValue(value: unknown): ProfileBackgroundValue | null {
  if (!isObj(value)) return null
  if (!isObj(value.asset)) return null
  return value as unknown as ProfileBackgroundValue
}

function isThumbnailScene(v: unknown): boolean {
  if (!isObj(v)) return false
  if (v.type === 'facet_vault') {
    return isString(v.ink) && Array.isArray(v.facets) && v.facets.every(isString)
  }
  if (v.type === 'grove') {
    return isString(v.skyTop) && isString(v.skyBottom)
      && Array.isArray(v.fruits) && v.fruits.every(isString)
  }
  if (v.type === 'sanctum') return isString(v.wallTop) && isString(v.throne) && isString(v.rim)
  if (v.type === 'monument') return isString(v.skyTop) && isString(v.stone) && isString(v.seam)
  if (v.type === 'torchlit') return isString(v.sky) && isString(v.ground) && isString(v.flame)
  if (v.type === 'fusion') {
    return isString(v.bg) && isString(v.beam)
      && Array.isArray(v.colors) && v.colors.every(isString)
  }
  if (v.type === 'hallway') {
    return isString(v.wall) && isString(v.floor) && isString(v.beam) && isString(v.figure) && isString(v.face)
      && Array.isArray(v.tints) && v.tints.every(isString)
  }
  if (v.type === 'graveyard') {
    return isString(v.skyTop) && isString(v.skyBottom) && isString(v.ground) && isString(v.stone)
      && isString(v.moon) && isString(v.fog) && isString(v.wisp) && isString(v.candle)
  }
  if (v.type === 'pumpkin_patch') return isString(v.skyTop) && isString(v.skyBottom) && isString(v.ground) && isString(v.pumpkin) && isString(v.pumpkinLit) && isString(v.vine) && isString(v.moon) && isString(v.candle)
  if (v.type === 'full_moon') return isString(v.skyTop) && isString(v.skyBottom) && isString(v.moon) && isString(v.crater) && isString(v.cloud) && isString(v.bat)
  return false
}

export function readThumbnailBackgroundValue(value: unknown): ProfileThumbnailBackgroundValue | null {
  if (!isObj(value)) return null
  const scene = isThumbnailScene(value.scene) ? value.scene : undefined
  if (!isObj(value.asset) && !scene) return null
  return { ...value, scene } as unknown as ProfileThumbnailBackgroundValue
}

export function thumbnailSceneInk(scene: ThumbnailScene): string {
  switch (scene.type) {
    case 'facet_vault': return scene.ink
    case 'grove': return scene.skyBottom
    case 'sanctum': return scene.wallTop
    case 'monument': return scene.skyTop
    case 'torchlit': return scene.sky
    case 'fusion': return scene.bg
    case 'hallway': return scene.wall
    case 'graveyard': return scene.skyTop
    case 'pumpkin_patch': return scene.skyTop
    case 'full_moon': return scene.skyTop
  }
}

export function thumbnailHostAttrs(
  value: ProfileThumbnailBackgroundValue | null | undefined,
): Record<string, unknown> {
  if (!value || (!value.scene && !pickAssetUrl(value.asset))) return {}
  const attrs: Record<string, unknown> = { 'data-thumb-base': value.scene?.base ?? 'dark' }
  if (value.scene) attrs.style = { '--thumb-ink': thumbnailSceneInk(value.scene) }
  return attrs
}

export function readThemeValue(value: unknown): ThemeValue | null {
  if (!isObj(value) || !isObj(value.tokens)) return null
  return value as unknown as ThemeValue
}

export function readCrateValue(value: unknown): CrateIconValue | null {
  if (!isObj(value) || !isObj(value.icon)) return null
  const icon = { ...value.icon } as Record<string, unknown>
  if (Array.isArray(icon.paths)) {
    icon.paths = icon.paths.filter((p) => isObj(p) && isString(p.d))
  } else {
    delete icon.paths
  }
  if (!isObj(icon.glow) || !Array.isArray((icon.glow as { stops?: unknown }).stops)) {
    delete icon.glow
  }
  return icon as unknown as CrateIconValue
}

const RASTER_PRIORITY = ['4x', '3x', '2x', '1x'] as const

export function pickAssetUrl(asset: AssetSet | null | undefined): string | null {
  if (!asset) return null
  if (asset.svg) return asset.svg
  if (asset.raster) {
    for (const k of RASTER_PRIORITY) {
      const url = asset.raster[k]
      if (url) return url
    }
    for (const url of Object.values(asset.raster)) {
      if (isString(url)) return url
    }
  }
  return null
}

export function pickVideoOrAssetUrl(asset: AssetSet | null | undefined): string | null {
  if (!asset) return null
  if (asset.video) return asset.video
  return pickAssetUrl(asset)
}
