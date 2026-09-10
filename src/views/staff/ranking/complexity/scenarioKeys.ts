import type { ComplexityScenario } from '@/types/api/complexity'

const CX_KEYS: Record<ComplexityScenario, string> = {
  CURRENT: 'cxCurrent',
  OLD_SCRIPT: 'cxOld',
  NEW_SCRIPT: 'cxNew',
  PREVIEW: 'cxPreview',
}

const AP_KEYS: Record<ComplexityScenario, string> = {
  CURRENT: 'apCurrent',
  OLD_SCRIPT: 'apOld',
  NEW_SCRIPT: 'apNew',
  PREVIEW: 'apPreview',
}

export function cxKey(scenario: ComplexityScenario): string {
  return CX_KEYS[scenario]
}

export function apKey(scenario: ComplexityScenario): string {
  return AP_KEYS[scenario]
}
