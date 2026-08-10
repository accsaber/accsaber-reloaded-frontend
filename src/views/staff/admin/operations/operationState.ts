import { parseApiError } from '@/api/client'

export interface OpState {
  loading: boolean
  result: string | null
  ok: boolean
}

export function makeOp(): OpState {
  return { loading: false, result: null, ok: false }
}

export function describeFailure(err: unknown): string {
  const parsed = parseApiError(err, 'Failed. Check server logs.')
  if (parsed.fieldErrors.length > 0) {
    return parsed.fieldErrors.map((f) => `${f.field}: ${f.message}`).join(' ')
  }
  return parsed.message
}

export async function run(op: OpState, fn: () => Promise<void>, msg: string) {
  op.loading = true
  op.result = null
  try {
    await fn()
    op.ok = true
    op.result = msg
  } catch (err) {
    op.ok = false
    op.result = describeFailure(err)
  } finally {
    op.loading = false
  }
}
