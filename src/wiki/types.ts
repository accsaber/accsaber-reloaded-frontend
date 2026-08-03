import type { Component } from 'vue'

export interface WikiEntry {
  slug: string
  title: string
  summary: string
  keywords: string[]
  related: string[]
  updated: string
  loader: () => Promise<{ default: Component }>
}

export interface WikiSection {
  key: string
  title: string
  accent?: string
  entries: WikiEntry[]
  subsections?: WikiSection[]
}

export interface WikiTocItem {
  id: string
  label: string
  level: 2 | 3
}
