import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { createPinia } from 'pinia'
import { createServer } from 'vite'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createMemoryHistory, createRouter } from 'vue-router'

const SITE = 'https://accsaber.com'
const OUT = fileURLToPath(new URL('../dist/client/', import.meta.url))
const WIKI_DESCRIPTION = 'Everything about AccSaber, explained like a human would.'

const STATIC_ROUTES = [
  '/',
  '/getting-started',
  '/download',
  '/quest',
  '/leaderboards',
  '/leaderboards/overall',
  '/leaderboards/true_acc',
  '/leaderboards/standard_acc',
  '/leaderboards/tech_acc',
  '/maps',
  '/ranked-queue',
  '/stats',
  '/score-feed',
  '/milestones',
  '/campaigns',
  '/clans',
  '/market',
  '/news',
  '/credits',
  '/wiki',
]

const inert = new Proxy(function () {}, {
  get: (_, key) => (key === Symbol.toPrimitive ? () => '' : key === 'cookie' ? '' : inert),
  apply: () => inert,
  construct: () => inert,
})
const memoryStorage = { getItem: () => null, setItem() {}, removeItem() {} }
Object.assign(globalThis, {
  window: globalThis,
  location: new URL(`${SITE}/`),
  document: inert,
  localStorage: memoryStorage,
  sessionStorage: memoryStorage,
  getComputedStyle: () => ({ getPropertyValue: () => '' }),
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
})

const escape = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

async function renderEntry(entry) {
  const { default: page } = await entry.loader()
  const app = createSSRApp({ render: () => h(page) })
  const router = createRouter({
    history: createMemoryHistory('/'),
    routes: [{ path: '/:p(.*)*', component: { render: () => null } }],
  })
  app.use(createPinia()).use(router)
  await router.push(`/wiki/${entry.slug}`)
  return renderToString(app)
}

function setHead(html, { title, description, url, type, jsonLd }) {
  const t = escape(title)
  const d = escape(description)
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${t}</title>`)
    .replace(/(name="description" content=")[^"]*/, `$1${d}`)
    .replace(/(property="og:title" content=")[^"]*/, `$1${t}`)
    .replace(/(property="og:description" content=")[^"]*/, `$1${d}`)
    .replace(/(property="og:url" content=")[^"]*/, `$1${url}`)
    .replace(/(property="og:type" content=")[^"]*/, `$1${type}`)
    .replace(/(name="twitter:title" content=")[^"]*/, `$1${t}`)
    .replace(/(name="twitter:description" content=")[^"]*/, `$1${d}`)
    .replace(
      '</head>',
      `<link rel="canonical" href="${url}" />\n<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>\n<style>#app > .prerender { opacity: 0 }</style>\n</head>`,
    )
}

function setBody(html, content) {
  return html.replace(
    '<div id="app"></div>',
    `<div id="app"><main class="prerender">${content}</main></div>`,
  )
}

function wikiNav(entries) {
  const items = entries
    .map((e) => `<li><a href="/wiki/${e.slug}">${escape(e.title)}</a></li>`)
    .join('')
  return `<nav aria-label="Wiki"><ul>${items}</ul></nav>`
}

function breadcrumb(entry) {
  const crumbs = [
    { name: 'AccSaber', item: SITE },
    { name: 'Wiki', item: `${SITE}/wiki` },
    ...(entry ? [{ name: entry.title, item: `${SITE}/wiki/${entry.slug}` }] : []),
  ]
  return {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, ...c })),
  }
}

function articlePage(shell, entry, body, nav) {
  const url = `${SITE}/wiki/${entry.slug}`
  return setBody(
    setHead(shell, {
      title: `${entry.title} | AccSaber Wiki`,
      description: entry.summary,
      url,
      type: 'article',
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'TechArticle',
            headline: entry.title,
            description: entry.summary,
            url,
            dateModified: entry.updated,
            keywords: entry.keywords.join(', '),
            isPartOf: { '@type': 'WebSite', name: 'AccSaber', url: SITE },
          },
          breadcrumb(entry),
        ],
      },
    }),
    `<article><h1>${escape(entry.title)}</h1><p>${escape(entry.summary)}</p>${body}</article>${nav}`,
  )
}

function homePage(shell, sections) {
  const body = sections
    .map(
      (s) =>
        `<section><h2>${escape(s.title)}</h2><ul>${s.all
          .map(
            (e) =>
              `<li><a href="/wiki/${e.slug}">${escape(e.title)}</a>: ${escape(e.summary)}</li>`,
          )
          .join('')}</ul></section>`,
    )
    .join('')
  return setBody(
    setHead(shell, {
      title: 'Wiki | AccSaber',
      description: WIKI_DESCRIPTION,
      url: `${SITE}/wiki`,
      type: 'website',
      jsonLd: { '@context': 'https://schema.org', ...breadcrumb(null) },
    }),
    `<h1>AccSaber Wiki</h1><p>${escape(WIKI_DESCRIPTION)}</p>${body}`,
  )
}

function sitemap(entries) {
  const urls = [
    ...STATIC_ROUTES.map((path) => `<url><loc>${SITE}${path}</loc></url>`),
    ...entries.map(
      (e) => `<url><loc>${SITE}/wiki/${e.slug}</loc><lastmod>${e.updated}</lastmod></url>`,
    ),
  ]
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  ${urls.join('\n  ')}\n</urlset>\n`
}

function llmsTxt(sections) {
  const blocks = sections.map(
    (s) =>
      `## ${s.title}\n\n${s.all.map((e) => `- [${e.title}](${SITE}/wiki/${e.slug}): ${e.summary}`).join('\n')}`,
  )
  return `# AccSaber\n\n> Accuracy-based leaderboard platform for Beat Saber. Players earn AP (Accuracy Points) on ranked maps across the True Acc, Standard Acc and Tech Acc categories, plus an Overall ranking.\n\nThe wiki explains every system on the site.\n\n${blocks.join('\n\n')}\n`
}

const vite = await createServer({
  configFile: false,
  logLevel: 'error',
  plugins: [vue()],
  resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
  define: { __APP_VERSION__: '"ssr"', __APP_CHANNEL__: '"ssr"' },
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
})

try {
  const { WIKI_SECTIONS } = await vite.ssrLoadModule('/src/wiki/registry.ts')
  const sections = WIKI_SECTIONS.map((s) => ({
    title: s.title,
    all: [...s.entries, ...(s.subsections ?? []).flatMap((x) => x.entries)],
  }))
  const entries = sections.flatMap((s) => s.all)
  const shell = readFileSync(`${OUT}index.html`, 'utf-8')
  const nav = wikiNav(entries)

  mkdirSync(`${OUT}wiki`, { recursive: true })
  for (const entry of entries) {
    const body = await renderEntry(entry)
    writeFileSync(`${OUT}wiki/${entry.slug}.html`, articlePage(shell, entry, body, nav))
  }
  writeFileSync(`${OUT}wiki.html`, homePage(shell, sections))
  writeFileSync(`${OUT}sitemap.xml`, sitemap(entries))
  writeFileSync(`${OUT}llms.txt`, llmsTxt(sections))
  console.log(`prerendered ${entries.length} wiki pages, sitemap.xml, llms.txt`)
} finally {
  await vite.close()
}
