import type { ComplexityScenario } from '@/types/api/complexity'

const CX_KEYS: Record<ComplexityScenario, string> = {
  CURRENT: 'cxCurrent',
  NEW_SCRIPT: 'cxScript',
  PREVIEW: 'cxPreview',
}

const AP_KEYS: Record<ComplexityScenario, string> = {
  CURRENT: 'apCurrent',
  NEW_SCRIPT: 'apScript',
  PREVIEW: 'apPreview',
}

export function cxKey(scenario: ComplexityScenario): string {
  return CX_KEYS[scenario]
}

export function apKey(scenario: ComplexityScenario): string {
  return AP_KEYS[scenario]
}
