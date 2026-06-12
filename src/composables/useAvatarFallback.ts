export interface AvatarSource {
  avatarUrl?: string | null
  cdnAvatarUrl?: string | null
}

export interface CoverSource {
  coverUrl?: string | null
  cdnCoverUrl?: string | null
}

export function pickAvatarUrl(source: AvatarSource | null | undefined): string {
  if (!source) return ''
  return source.cdnAvatarUrl ?? source.avatarUrl ?? ''
}

export function pickAvatarFallback(source: AvatarSource | null | undefined): string | null {
  if (!source) return null
  if (source.cdnAvatarUrl && source.avatarUrl && source.cdnAvatarUrl !== source.avatarUrl) {
    return source.avatarUrl
  }
  return null
}

export function pickCoverUrl(source: CoverSource | null | undefined): string {
  if (!source) return ''
  return source.cdnCoverUrl ?? source.coverUrl ?? ''
}

export function pickCoverFallback(source: CoverSource | null | undefined): string | null {
  if (!source) return null
  if (source.cdnCoverUrl && source.coverUrl && source.cdnCoverUrl !== source.coverUrl) {
    return source.coverUrl
  }
  return null
}

export function onAvatarError(
  fallbackUrl: string | null | undefined,
): (event: Event) => void {
  return (event: Event) => {
    const img = event.currentTarget as HTMLImageElement
    if (!fallbackUrl || img.dataset.fellBack === '1') return
    if (img.src === fallbackUrl) return
    img.dataset.fellBack = '1'
    img.src = fallbackUrl
  }
}

export const onImageError = onAvatarError
