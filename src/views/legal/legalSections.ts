import type { InjectionKey, Ref } from 'vue'

export interface LegalSectionEntry {
  id: string
  title: string
}

export interface LegalSectionRegistry {
  sections: Ref<LegalSectionEntry[]>
  register: (entry: LegalSectionEntry) => number
}

export const legalSectionsKey: InjectionKey<LegalSectionRegistry> = Symbol('legal-sections')

export function formatSectionNumber(index: number): string {
  return String(index).padStart(2, '0')
}
