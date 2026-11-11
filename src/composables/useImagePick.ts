import { parseApiError } from '@/api/client'
import { ref } from 'vue'

export const IMAGE_ACCEPT = 'image/avif,image/gif,image/jpeg,image/png,image/webp'

async function limitError(file: File): Promise<string | null> {
  try {
    const { getCdnLimits } = await import('@/api/cdn')
    const limits = await getCdnLimits()
    if (file.size > limits.maxUploadBytes) {
      return `File is too large. Max ${(limits.maxUploadBytes / 1_048_576).toFixed(1)} MB.`
    }
    if (!limits.allowedMimeTypes.includes(file.type)) {
      return `Unsupported format. Use ${limits.allowedMimeTypes.map((m) => m.replace('image/', '')).join(', ')}.`
    }
  } catch {
    return null
  }
  return null
}

async function isAnimated(file: File): Promise<boolean> {
  if (file.type === 'image/gif') return true
  const head = new Uint8Array(await file.slice(0, 64).arrayBuffer())
  const ascii = String.fromCharCode(...head)
  if (file.type === 'image/webp') return ascii.slice(12, 16) === 'VP8X' && (head[20] & 0x02) !== 0
  if (file.type === 'image/avif') return ascii.includes('avis')
  return false
}

export function useImagePick(upload: (file: File) => Promise<void>, crop: () => boolean) {
  const busy = ref(false)
  const error = ref<string | null>(null)
  const cropping = ref<File | null>(null)

  async function send(file: File) {
    cropping.value = null
    busy.value = true
    error.value = null
    try {
      await upload(file)
    } catch (e) {
      error.value = parseApiError(e, 'Upload failed.').message
    } finally {
      busy.value = false
    }
  }

  async function pick(e: Event) {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    error.value = await limitError(file)
    if (error.value) return
    if (crop() && !(await isAnimated(file))) cropping.value = file
    else await send(file)
  }

  return { busy, error, cropping, pick, send }
}
