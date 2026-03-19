import type { ModifierResponse } from '@/types/api/modifiers'
import { get } from './client'

export function getModifiers(): Promise<ModifierResponse[]> {
  return get<ModifierResponse[]>('/modifiers')
}
