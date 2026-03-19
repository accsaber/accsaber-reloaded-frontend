import { isRef, onUnmounted, ref, watch, type Ref } from 'vue'

const CACHE_PREFIX = 'color-extract:'

export function useColorExtract(imageUrl: Ref<string> | string) {
  const dominantColor = ref<string | null>(null)
  const isLoading = ref(false)

  let callbackId: number | null = null

  function getCached(url: string): string | null {
    try {
      return sessionStorage.getItem(CACHE_PREFIX + url)
    } catch {
      return null
    }
  }

  function setCache(url: string, color: string) {
    try {
      sessionStorage.setItem(CACHE_PREFIX + url, color)
    } catch {
    }
  }

  function extractColor(url: string) {
    if (!url) {
      dominantColor.value = null
      return
    }

    const cached = getCached(url)
    if (cached) {
      dominantColor.value = cached
      return
    }

    isLoading.value = true

    const run = () => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            isLoading.value = false
            return
          }

          const size = 10
          canvas.width = size
          canvas.height = size
          ctx.drawImage(img, 0, 0, size, size)

          const data = ctx.getImageData(0, 0, size, size).data
          let r = 0, g = 0, b = 0, count = 0

          for (let i = 0; i < data.length; i += 4) {
            const alpha = data[i + 3]
            if (alpha < 128) continue
            r += data[i]
            g += data[i + 1]
            b += data[i + 2]
            count++
          }

          if (count > 0) {
            r = Math.round(r / count)
            g = Math.round(g / count)
            b = Math.round(b / count)
            const color = `rgb(${r}, ${g}, ${b})`
            dominantColor.value = color
            setCache(url, color)
          }
        } catch {
        }
        isLoading.value = false
      }
      img.onerror = () => {
        isLoading.value = false
      }
      img.src = url
    }

    if ('requestIdleCallback' in window) {
      callbackId = window.requestIdleCallback(run)
    } else {
      setTimeout(run, 0)
    }
  }

  if (isRef(imageUrl)) {
    watch(imageUrl, (url) => extractColor(url), { immediate: true })
  } else {
    extractColor(imageUrl)
  }

  onUnmounted(() => {
    if (callbackId !== null && 'cancelIdleCallback' in window) {
      window.cancelIdleCallback(callbackId)
    }
  })

  return { dominantColor, isLoading }
}
