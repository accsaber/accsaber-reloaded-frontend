<script setup lang="ts">
import { deltaTone, isBigMove } from '@/utils/complexity'
import { formatFixed, formatSigned } from '@/utils/formatters'
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  value: number | null | undefined
  delta?: number | null
  decimals?: number
  invert?: boolean
  emphasis?: boolean
  bigThreshold?: boolean
  deltaOnly?: boolean
}>(), {
  delta: null,
  decimals: 2,
  invert: false,
  emphasis: false,
  bigThreshold: false,
  deltaOnly: false,
})

const display = computed(() => formatFixed(props.value, props.decimals))
const missing = computed(() => props.value == null || !Number.isFinite(props.value))
const tone = computed(() => deltaTone(props.delta, props.invert))
const big = computed(() => props.bigThreshold && isBigMove(props.delta))

const deltaText = computed(() => {
  const signed = props.delta != null && props.invert ? -props.delta : props.delta
  return formatSigned(signed, props.decimals)
})

const showDelta = computed(
  () => props.delta != null && (props.deltaOnly || tone.value !== 'flat'),
)
</script>

<template>
  <span class="scenario-cell">
    <span v-if="!deltaOnly" class="scenario-cell__value"
      :class="{ 'scenario-cell__value--emphasis': emphasis, 'scenario-cell__value--missing': missing }">
      {{ display }}
    </span>
    <span v-if="showDelta" class="scenario-cell__delta" :class="[
      `scenario-cell__delta--${tone}`,
      { 'scenario-cell__delta--big': big, 'scenario-cell__delta--solo': deltaOnly },
    ]">
      {{ deltaText }}
    </span>
  </span>
</template>

<style scoped>
.scenario-cell {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
  line-height: 1.25;
}

.scenario-cell__value {
  font-family: var(--font-mono);
  font-size: var(--text-body);
  color: var(--text-secondary);
}

.scenario-cell__value--emphasis {
  color: var(--text-primary);
  font-weight: 600;
}

.scenario-cell__value--missing {
  color: var(--text-tertiary);
}

.scenario-cell__delta {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
}

.scenario-cell__delta--up {
  color: color-mix(in srgb, var(--xp-up) 80%, var(--text-secondary));
}

.scenario-cell__delta--down {
  color: color-mix(in srgb, var(--xp-down) 80%, var(--text-secondary));
}

.scenario-cell__delta--flat {
  color: var(--text-tertiary);
}

.scenario-cell__delta--solo {
  font-size: var(--text-body);
}

.scenario-cell__delta--solo.scenario-cell__delta--up {
  color: var(--xp-up);
}

.scenario-cell__delta--solo.scenario-cell__delta--down {
  color: var(--xp-down);
}

.scenario-cell__delta--big {
  font-weight: 700;
}

.scenario-cell__delta--big.scenario-cell__delta--up {
  color: var(--xp-up);
}

.scenario-cell__delta--big.scenario-cell__delta--down {
  color: var(--xp-down);
}
</style>
