<script setup lang="ts">
import type { AutoCriteriaStatus } from '@/types/api/maps'
import type { CriteriaStatus, VoteType } from '@/types/enums'
import { computed } from 'vue'

const props = defineProps<{
  source: {
    criteriaStatus: CriteriaStatus | null
    autoCriteriaStatus: AutoCriteriaStatus | null
    criteriaUpvotes?: number
    criteriaDownvotes?: number
    headCriteriaVote?: VoteType | null
  }
  prefix?: string
  icon?: boolean
}>()

type Verdict = 'passed' | 'failed' | 'pending' | 'unavailable'

const WORD: Record<Verdict, string> = { passed: 'pass', failed: 'fail', pending: 'pending', unavailable: 'N/A' }

const result = computed<{ verdict: Verdict; by: string }>(() => {
  const s = props.source
  if (s.headCriteriaVote === 'UPVOTE') return { verdict: 'passed', by: 'Head' }
  if (s.headCriteriaVote === 'DOWNVOTE') return { verdict: 'failed', by: 'Head' }
  if (s.headCriteriaVote) return { verdict: 'pending', by: 'Head' }
  const up = s.criteriaUpvotes ?? 0
  const down = s.criteriaDownvotes ?? 0
  if (s.criteriaStatus === 'PASSED' || up > down) return { verdict: 'passed', by: '' }
  if (s.criteriaStatus === 'FAILED' || down > up) return { verdict: 'failed', by: '' }
  if (s.autoCriteriaStatus === 'PASSED') return { verdict: 'passed', by: 'Auto' }
  if (s.autoCriteriaStatus === 'FAILED') return { verdict: 'failed', by: 'Auto' }
  if (s.autoCriteriaStatus === 'UNAVAILABLE') return { verdict: 'unavailable', by: 'Auto' }
  return { verdict: 'pending', by: '' }
})

const label = computed(() => {
  const by = props.prefix ? result.value.by.toLowerCase() : result.value.by
  const words = [props.prefix, by, WORD[result.value.verdict]].filter(Boolean).join(' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
})
</script>

<template>
  <span v-if="icon" class="criteria-verdict criteria-verdict--icon" :class="`criteria-text--${result.verdict}`" role="img" :aria-label="`Criteria ${label.toLowerCase()}`" :title="label">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path v-if="result.verdict === 'passed'" d="M20 6 9 17l-5-5" />
      <path v-else-if="result.verdict === 'failed'" d="M18 6 6 18M6 6l12 12" />
      <path v-else d="M6 12h12" />
    </svg>
  </span>
  <span v-else class="criteria-verdict" :class="`criteria-text--${result.verdict}`">{{ label }}</span>
</template>

<style scoped>
.criteria-verdict {
  font-weight: 600;
  white-space: nowrap;
}

.criteria-verdict--icon {
  display: inline-flex;
  flex-shrink: 0;
}

.criteria-verdict--icon.criteria-text--pending {
  color: var(--text-tertiary);
}
</style>
