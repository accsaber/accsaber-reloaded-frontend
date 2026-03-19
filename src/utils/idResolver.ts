export async function resolveToSteamId(input: string): Promise<string> {
  const trimmed = input.trim()
  if (!trimmed) throw new Error('Please enter a player ID or profile URL')

  if (/^\d{17}$/.test(trimmed)) return trimmed

  const ssMatch = trimmed.match(/scoresaber\.com\/u\/(\d+)/)
  if (ssMatch) return ssMatch[1]

  const blMatch = trimmed.match(/beatleader\.com\/u\/([^/?#]+)/)
  if (blMatch) {
    return fetchBeatLeaderSteamId(blMatch[1])
  }

  if (/^[a-zA-Z0-9_-]+$/.test(trimmed) && trimmed.length < 17) {
    try {
      return await fetchBeatLeaderSteamId(trimmed)
    } catch {
    }
  }

  if (/^\d+$/.test(trimmed)) {
    try {
      return await fetchBeatLeaderSteamId(trimmed)
    } catch {
      throw new Error('Could not find a player with that ID')
    }
  }

  throw new Error('Could not find a player with that ID')
}

async function fetchBeatLeaderSteamId(idOrSlug: string): Promise<string> {
  const res = await fetch(`https://api.beatleader.com/player/${encodeURIComponent(idOrSlug)}`)
  if (!res.ok) throw new Error('Could not find a player with that ID')
  const data = await res.json()
  const steamId = data.id as string | undefined
  if (!steamId || !/^\d{17}$/.test(steamId)) {
    throw new Error('Could not find a player with that ID')
  }
  return steamId
}
