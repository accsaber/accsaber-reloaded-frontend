import { onUnmounted, ref } from 'vue'
import { readStoredString, writeStoredString } from '@/utils/storage'
import { clamp } from '@/utils/math'

const MUTE_KEY = 'crate:muted'
const TICK_MIN_GAP_MS = 24
const TICK_LOOKAHEAD = 0.02

export interface CrateTick {
  t: number
  progress: number
}

interface NoiseHitOptions {
  type: BiquadFilterType
  freq: number
  peak: number
  decay: number
  freqEnd?: number
  q?: number
  attack?: number
  at?: number
}

interface ToneOptions {
  type: OscillatorType
  freq: number
  peak: number
  decay: number
  freqEnd?: number
  detune?: number
  attack?: number
  hold?: number
  lowpass?: [from: number, to: number]
  delay?: number
  at?: number
}

const CHIME_PARTIAL_RATIO = 2.4
const CHIME_STEP_S = 0.09
const CHIME_NOTES = [659.26, 880, 1318.5, 1108.73, 1318.5, 1760]
const SPARKLE_NOTES = [1760, 2217.46, 2637, 3520, 2637, 3520]
const SPARKLE_STEP_S = 0.06
const MYTHIC_SLOWDOWN = 1.4
const BASS_HZ = 110
const HELD_PARTIAL_RATIO = 2
const TAIL_GAP_S = 0.12
const FINAL_HOLD_S = 0.5
const BRASS_HOLD_SHARE = 0.3

const SAMPLE_URLS = import.meta.glob<string>('@/assets/sounds/crate/*.mp3', {
  query: '?url',
  import: 'default',
})

const samples = new Map<string, AudioBuffer>()
let sharedSamples: Promise<void> | null = null

function loadSamples(ctx: AudioContext): Promise<void> {
  sharedSamples ??= Promise.all(
    Object.entries(SAMPLE_URLS).map(async ([path, url]) => {
      try {
        const data = await (await fetch(await url())).arrayBuffer()
        samples.set(path.slice(path.lastIndexOf('/') + 1, -4), await ctx.decodeAudioData(data))
      } catch {
        return
      }
    }),
  ).then(() => undefined)
  return sharedSamples
}

function impulse(ac: AudioContext): AudioBuffer {
  const length = Math.floor(ac.sampleRate * 1.4)
  const buf = ac.createBuffer(2, length, ac.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch)
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3)
    }
  }
  return buf
}

interface SharedAudio {
  ctx: AudioContext
  master: GainNode
  reverb: ConvolverNode
}

let sharedCtx: AudioContext | null = null
let sharedMaster: GainNode | null = null
let sharedReverb: ConvolverNode | null = null
let sharedNoise: AudioBuffer | null = null
let activeInstances = 0

function sharedAudio(): SharedAudio | null {
  if (typeof AudioContext === 'undefined') return null
  if (!sharedCtx || !sharedMaster || !sharedReverb) {
    sharedCtx = new AudioContext()
    sharedMaster = sharedCtx.createGain()
    sharedMaster.gain.value = 0.45
    sharedMaster.connect(sharedCtx.destination)
    sharedReverb = sharedCtx.createConvolver()
    sharedReverb.buffer = impulse(sharedCtx)
    const wet = sharedCtx.createGain()
    wet.gain.value = 0.25
    sharedReverb.connect(wet).connect(sharedMaster)
  }
  if (sharedCtx.state === 'suspended') void sharedCtx.resume()
  return { ctx: sharedCtx, master: sharedMaster, reverb: sharedReverb }
}

function sharedNoiseBuffer(ac: AudioContext): AudioBuffer {
  if (!sharedNoise) {
    sharedNoise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate)
    const data = sharedNoise.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  return sharedNoise
}

export function useCrateSounds() {
  const muted = ref(readStoredString(MUTE_KEY) === '1')

  let bus: GainNode | null = null
  let tickBus: GainNode | null = null
  let disposed = false

  activeInstances++

  function out(): GainNode | null {
    if (muted.value || disposed) return null
    const shared = sharedAudio()
    if (!shared) return null
    if (!bus) {
      bus = shared.ctx.createGain()
      bus.connect(shared.master)
      bus.connect(shared.reverb)
    }
    return bus
  }

  function reset() {
    if (bus) {
      bus.disconnect()
      bus = null
    }
    if (tickBus) {
      tickBus.disconnect()
      tickBus = null
    }
  }

  function noise(ac: AudioContext): AudioBufferSourceNode {
    const src = ac.createBufferSource()
    src.buffer = sharedNoiseBuffer(ac)
    return src
  }

  function envelope(
    ac: AudioContext,
    peak: number,
    at: number,
    attack: number,
    decay: number,
    hold = 0,
  ): GainNode {
    const gain = ac.createGain()
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(peak, at + attack)
    if (hold) gain.gain.setValueAtTime(peak, at + attack + hold)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + attack + hold + decay)
    return gain
  }

  function noiseHit(dest: GainNode, opts: NoiseHitOptions) {
    const ac = dest.context as AudioContext
    const at = opts.at ?? ac.currentTime
    const attack = opts.attack ?? 0.004
    const src = noise(ac)
    const filter = ac.createBiquadFilter()
    filter.type = opts.type
    filter.Q.value = opts.q ?? 1
    filter.frequency.setValueAtTime(opts.freq, at)
    if (opts.freqEnd) {
      filter.frequency.exponentialRampToValueAtTime(opts.freqEnd, at + attack + opts.decay)
    }
    const gain = envelope(ac, opts.peak, at, attack, opts.decay)
    src.connect(filter).connect(gain).connect(dest)
    src.loop = true
    src.start(at, Math.random() * src.buffer!.duration)
    src.stop(at + attack + opts.decay + 0.05)
  }

  function tone(dest: GainNode, opts: ToneOptions) {
    const ac = dest.context as AudioContext
    const at = (opts.at ?? ac.currentTime) + (opts.delay ?? 0)
    const attack = opts.attack ?? 0.004
    const end = at + attack + (opts.hold ?? 0) + opts.decay
    const osc = ac.createOscillator()
    osc.type = opts.type
    osc.detune.value = opts.detune ?? 0
    osc.frequency.setValueAtTime(opts.freq, at)
    if (opts.freqEnd && opts.freqEnd !== opts.freq) {
      osc.frequency.exponentialRampToValueAtTime(opts.freqEnd, end)
    }
    const gain = envelope(ac, opts.peak, at, attack, opts.decay, opts.hold)
    if (opts.lowpass) {
      const filter = ac.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(opts.lowpass[0], at)
      filter.frequency.exponentialRampToValueAtTime(opts.lowpass[1], end)
      osc.connect(filter).connect(gain)
    } else {
      osc.connect(gain)
    }
    gain.connect(dest)
    osc.start(at)
    osc.stop(end + 0.05)
  }

  function scheduleTicks(ticks: CrateTick[]) {
    if (muted.value || disposed) return
    const shared = sharedAudio()
    if (!shared) return
    if (tickBus) tickBus.disconnect()
    tickBus = shared.ctx.createGain()
    tickBus.connect(shared.master)
    const base = shared.ctx.currentTime + TICK_LOOKAHEAD
    let lastKept = -Infinity
    for (const { t, progress } of ticks) {
      if (t - lastKept < TICK_MIN_GAP_MS) continue
      lastKept = t
      sample(tickBus, 'tick', {
        at: base + t / 1000,
        rate: 0.9 + progress * 0.35 + Math.random() * 0.04,
        gain: 0.3 + progress * 0.23,
      })
    }
  }

  function sample(
    dest: GainNode,
    name: 'shake' | 'tick',
    opts: { gain: number; rate?: number; at?: number },
  ) {
    const buffer = samples.get(name)
    if (!buffer) return
    const ac = dest.context
    const src = ac.createBufferSource()
    src.buffer = buffer
    src.playbackRate.value = opts.rate ?? 1
    const level = ac.createGain()
    level.gain.value = opts.gain
    src.connect(level).connect(dest)
    src.start(opts.at ?? ac.currentTime)
  }

  function windup(durationMs: number) {
    const dest = out()
    if (!dest) return
    sample(dest, 'shake', { gain: 0.5 })
    const at = dest.context.currentTime + (durationMs * 0.8) / 1000
    tone(dest, { type: 'sine', freq: 180, freqEnd: 90, peak: 0.14, decay: 0.14, at })
    noiseHit(dest, {
      type: 'lowpass',
      freq: 900,
      freqEnd: 300,
      peak: 0.09,
      attack: 0.01,
      decay: 0.18,
      at,
    })
    noiseHit(dest, { type: 'highpass', freq: 4000, peak: 0.2, decay: 0.04, at })
    noiseHit(dest, { type: 'bandpass', freq: 2400, freqEnd: 900, peak: 0.16, decay: 0.1, at })
  }

  function land() {
    const dest = out()
    if (!dest) return
    tone(dest, { type: 'sine', freq: 240, freqEnd: 130, peak: 0.2, decay: 0.16 })
    tone(dest, { type: 'sine', freq: 420, freqEnd: 380, peak: 0.07, decay: 0.08 })
    noiseHit(dest, { type: 'lowpass', freq: 900, peak: 0.1, decay: 0.07 })
  }

  function swing() {
    const dest = out()
    if (!dest) return
    noiseHit(dest, {
      type: 'bandpass',
      freq: 180,
      freqEnd: 1400,
      peak: 0.3,
      attack: 0.03,
      decay: 0.2,
    })
    tone(dest, { type: 'sine', freq: 110, freqEnd: 320, peak: 0.08, attack: 0.03, decay: 0.18 })
    noiseHit(dest, {
      type: 'bandpass',
      freq: 380,
      freqEnd: 2600,
      q: 1.2,
      peak: 0.12,
      attack: 0.02,
      decay: 0.17,
    })
    noiseHit(dest, {
      type: 'highpass',
      freq: 3000,
      freqEnd: 8000,
      peak: 0.08,
      attack: 0.03,
      decay: 0.15,
    })
  }

  function slice(score01: number) {
    const dest = out()
    if (!dest) return
    noiseHit(dest, {
      type: 'bandpass',
      freq: 1100,
      freqEnd: 3600 + 1400 * score01,
      q: 6,
      peak: 0.14,
      decay: 0.1,
    })
    noiseHit(dest, { type: 'lowpass', freq: 1800, freqEnd: 320, peak: 0.14, decay: 0.13 })
    noiseHit(dest, { type: 'lowpass', freq: 420, freqEnd: 120, peak: 0.2, decay: 0.12 })
    noiseHit(dest, { type: 'bandpass', freq: 5200, freqEnd: 9000, q: 9, peak: 0.16, decay: 0.07 })
    noiseHit(dest, { type: 'highpass', freq: 3800, freqEnd: 7000, peak: 0.24, decay: 0.15 })
    noiseHit(dest, { type: 'bandpass', freq: 7200, q: 0.8, peak: 0.2, decay: 0.1 })
    tone(dest, { type: 'sine', freq: 140, freqEnd: 70, peak: 0.12, decay: 0.09 })
    tone(dest, { type: 'sine', freq: 95, freqEnd: 42, peak: 0.3, decay: 0.18 })
  }

  function brass(dest: GainNode, freq: number, delay: number, length: number) {
    for (const [detune, peak] of [
      [0, 0.05],
      [8, 0.04],
    ] as const) {
      tone(dest, {
        type: 'sawtooth',
        freq,
        detune,
        peak,
        attack: 0.03,
        hold: length * BRASS_HOLD_SHARE,
        decay: length * (1 - BRASS_HOLD_SHARE),
        lowpass: [600, 2600],
        delay,
      })
    }
  }

  function sparkle(dest: GainNode, delay: number) {
    SPARKLE_NOTES.forEach((freq, i) => {
      tone(dest, { type: 'sine', freq, peak: 0.03, decay: 0.3, delay: delay + i * SPARKLE_STEP_S })
    })
  }

  function reveal(rarityIndex: number) {
    const dest = out()
    if (!dest) return
    const tier = clamp(rarityIndex, 0, CHIME_NOTES.length - 1)
    const mythic = tier === CHIME_NOTES.length - 1
    const notes = tier === 0 ? [CHIME_NOTES[1]!] : CHIME_NOTES.slice(0, tier + 1)
    const step = mythic ? CHIME_STEP_S * MYTHIC_SLOWDOWN : CHIME_STEP_S
    const end = (notes.length - 1) * step
    const decay = 0.5 + tier * 0.12
    notes.forEach((freq, i) => {
      const delay = i * step
      const hold = mythic && i === notes.length - 1 ? FINAL_HOLD_S : 0
      tone(dest, { type: 'sine', freq, peak: 0.09, hold, decay, delay })
      tone(dest, {
        type: 'sine',
        freq: freq * (hold ? HELD_PARTIAL_RATIO : CHIME_PARTIAL_RATIO),
        peak: 0.028,
        hold,
        decay: decay * 0.6,
        delay,
      })
      if (!mythic) return
      tone(dest, { type: 'triangle', freq: freq / 2, peak: 0.07, hold, decay, delay })
      brass(dest, freq / 2, delay, hold ? hold / BRASS_HOLD_SHARE : step * 1.8)
    })
    if (mythic) bass(dest, 0.14, end, FINAL_HOLD_S, 1.4)
    if (tier < 4) return
    const tail = end + (mythic ? FINAL_HOLD_S : TAIL_GAP_S)
    sparkle(dest, tail)
    bass(dest, 0.08, tail, 0, 0.9)
  }

  function bass(dest: GainNode, peak: number, delay: number, hold: number, decay: number) {
    tone(dest, { type: 'sine', freq: BASS_HZ, peak, attack: 0.02, hold, decay, delay })
  }

  function prime(): Promise<void> {
    const shared = muted.value || disposed ? null : sharedAudio()
    return shared ? loadSamples(shared.ctx) : Promise.resolve()
  }

  function toggleMute() {
    muted.value = !muted.value
    writeStoredString(MUTE_KEY, muted.value ? '1' : '0')
    if (muted.value) reset()
    else void prime()
  }

  void prime()

  onUnmounted(() => {
    disposed = true
    reset()
    activeInstances = Math.max(0, activeInstances - 1)
    if (activeInstances === 0 && sharedCtx && sharedCtx.state === 'running') {
      void sharedCtx.suspend()
    }
  })

  return { muted, toggleMute, prime, reset, scheduleTicks, windup, land, swing, slice, reveal }
}
