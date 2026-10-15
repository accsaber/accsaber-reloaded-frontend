import type { AssetSet, VisualEffect } from './common'

export interface BadgeValue {
  asset: AssetSet
  tint?: string
  effects?: VisualEffect[]
}

export interface StatisticValue {
  statKey: string
  label: string
  icon?: string
  format?: {
    type: 'integer' | 'decimal' | 'duration' | 'percent' | 'custom'
    decimals?: number
    suffix?: string
    prefix?: string
  }
}

export interface PerkValue {
  effect: string
  amount?: number
}

export interface DownloadableFileValue {
  file: string
}
