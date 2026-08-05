import type { Chart as ChartInstance, ChartConfiguration } from 'chart.js'
import { nextTick, onUnmounted, shallowRef, type Ref } from 'vue'

export interface ChartTheme {
  grid: string
  text: string
  font: { family: string; size: number }
  accent: string
}

export function readChartTheme(): ChartTheme {
  const styles = getComputedStyle(document.documentElement)
  return {
    grid: styles.getPropertyValue('--chart-grid').trim(),
    text: styles.getPropertyValue('--chart-text').trim(),
    font: { family: styles.getPropertyValue('--font-mono').trim(), size: 10 },
    accent: styles.getPropertyValue('--accent').trim(),
  }
}

export function chartAnimationDuration(): number {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 300
}

export function useLineChart(canvasRef: Ref<HTMLCanvasElement | null>) {
  const instance = shallowRef<ChartInstance | null>(null)

  function destroy() {
    instance.value?.destroy()
    instance.value = null
  }

  async function render(build: () => ChartConfiguration<'line'>) {
    const { Chart, Filler, LinearScale, LineController, LineElement, PointElement, Tooltip } =
      await import('chart.js')
    Chart.register(LineController, LineElement, PointElement, LinearScale, Filler, Tooltip)

    await nextTick()
    if (!canvasRef.value) return

    destroy()
    instance.value = new Chart(canvasRef.value, build())
  }

  onUnmounted(destroy)

  return { render, destroy }
}
