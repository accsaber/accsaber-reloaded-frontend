import { onUnmounted, ref, type Ref } from 'vue'

interface Clock {
  now: Ref<number>
  timer: ReturnType<typeof setInterval>
  users: number
}

const clocks = new Map<number, Clock>()

export function useNow(intervalMs = 60_000): Readonly<Ref<number>> {
  let clock = clocks.get(intervalMs)
  if (!clock) {
    const now = ref(Date.now())
    clock = { now, timer: setInterval(() => { now.value = Date.now() }, intervalMs), users: 0 }
    clocks.set(intervalMs, clock)
  }
  const own = clock
  own.users++
  onUnmounted(() => {
    if (--own.users > 0) return
    clearInterval(own.timer)
    clocks.delete(intervalMs)
  })
  return own.now
}
