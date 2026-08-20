import { env } from 'cloudflare:workers'

const CRAWLER_PATTERN =
  /discordbot|twitterbot|facebookexternalhit|slackbot|telegrambot|whatsapp|linkedinbot|redditbot|embedly|pinterest|vkshare|skypeuripreview|googlebot/i

const OG_PATH_PATTERN = /^\/(players|maps|campaigns)\/([^/]+)$/

const OG_CACHE_SECONDS = 300

const GATE_HEADER = 'X-Staging-Key'

const INDEXABLE_HOSTS = new Set(['accsaber.com', 'www.accsaber.com'])

const ROBOTS_ALLOW = `User-agent: *
Allow: /

Sitemap: https://accsaber.com/sitemap.xml
`

const ROBOTS_DENY = `User-agent: *
Disallow: /
`

function renderRobots(url: URL): Response {
  return new Response(INDEXABLE_HOSTS.has(url.hostname) ? ROBOTS_ALLOW : ROBOTS_DENY, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  })
}

function apiBase(): URL {
  return new URL('v1/', env.API_PROXY_TARGET || 'https://api.accsaber.com')
}

function applyGate(headers: Headers, gated: boolean) {
  headers.delete(GATE_HEADER)
  if (gated && env.STAGING_GATE_KEY) headers.set(GATE_HEADER, env.STAGING_GATE_KEY)
}

async function renderOpenGraph(url: URL, request: Request): Promise<Response | null> {
  const match = OG_PATH_PATTERN.exec(url.pathname)
  if (!match) return null
  if (!CRAWLER_PATTERN.test(request.headers.get('user-agent') || '')) return null

  const [, resource, id] = match
  const upstream = new URL(`og/${resource}/${id}`, apiBase())
  if (resource === 'maps') upstream.search = url.search

  const headers = new Headers()
  applyGate(headers, true)

  const response = await fetch(upstream, {
    headers,
    cf: { cacheTtl: OG_CACHE_SECONDS, cacheEverything: true },
  })
  if (!response.ok) return null

  const rendered = new Response(response.body, response)
  rendered.headers.set('cache-control', `public, max-age=${OG_CACHE_SECONDS}`)
  return rendered
}

export default {
  async fetch(request) {
    const url = new URL(request.url)

    if (url.pathname === '/robots.txt') return renderRobots(url)

    function createProxy(prefix: string, upstream: string | URL, gated = false) {
      if (!url.pathname.startsWith(prefix)) return null
      const upstreamURL = new URL(url.pathname.slice(prefix.length), upstream)
      upstreamURL.search = url.search
      const proxied = new Request(upstreamURL, request)
      applyGate(proxied.headers, gated)
      return fetch(proxied)
    }

    return (
      createProxy('/v1/', apiBase(), true) ||
      createProxy('/proxy/beatsaver/', 'https://api.beatsaver.com') ||
      createProxy('/proxy/beatleader/', 'https://api.beatleader.com') ||
      createProxy('/proxy/scoresaber/', 'https://scoresaber.com') ||
      (await renderOpenGraph(url, request)) ||
      env.ASSETS.fetch(request)
    )
  },
} satisfies ExportedHandler
