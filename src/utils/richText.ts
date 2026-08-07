import DOMPurify from 'dompurify'

const ALLOWED_TAGS = [
  'b',
  'i',
  'u',
  'em',
  'strong',
  's',
  'sub',
  'sup',
  'code',
  'small',
  'p',
  'div',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'blockquote',
  'pre',
  'hr',
  'span',
  'a',
  'br',
]

const ALLOWED_ATTR = ['style', 'class', 'href', 'target', 'rel']

export function sanitizeRichHtml(html: string | null | undefined): string {
  return DOMPurify.sanitize(html ?? '', {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ADD_ATTR: ['target', 'rel'],
  })
}

const KEEP_EMPTY = new Set(['BR', 'HR', 'IMG'])

const TRACKED_PROPS = [
  'color',
  'font-size',
  'font-family',
  'font-weight',
  'font-style',
  'letter-spacing',
  'line-height',
  'text-align',
] as const

const EFFECT_CLASSES = new Set(['glow', 'outline', 'shadow'])

const PLUGIN_PROPS = ['color', 'font-size']

function isBlank(text: string): boolean {
  return !/[^\t\n\r ]/.test(text)
}

function hasContent(el: Element): boolean {
  if (KEEP_EMPTY.has(el.tagName)) return true
  if (!isBlank(el.textContent ?? '')) return true
  return el.querySelector('br, hr, img') !== null
}

function isRelativeLength(value: string): boolean {
  return /[\d.](?:em|ex|ch|%)/.test(value)
}

function paragraphsToDivs(root: ParentNode) {
  for (const el of Array.from(root.querySelectorAll('p'))) {
    const div = document.createElement('div')
    for (const attr of Array.from(el.attributes)) div.setAttribute(attr.name, attr.value)
    div.append(...Array.from(el.childNodes))
    el.replaceWith(div)
  }
}

function pruneEmpty(root: ParentNode) {
  const all = Array.from(root.querySelectorAll('*'))
  for (let i = all.length - 1; i >= 0; i--) {
    if (!hasContent(all[i])) all[i].remove()
  }
}

function dropInherited(el: Element, props: Map<string, string>, classes: Set<string>) {
  const style = (el as HTMLElement).style
  const nextProps = new Map(props)
  const nextClasses = new Set(classes)

  for (const prop of TRACKED_PROPS) {
    const value = style.getPropertyValue(prop)
    if (!value) continue
    if (nextProps.get(prop) === value && !isRelativeLength(value)) style.removeProperty(prop)
    else nextProps.set(prop, value)
  }
  for (const token of Array.from(el.classList)) {
    if (!EFFECT_CLASSES.has(token)) continue
    if (nextClasses.has(token)) el.classList.remove(token)
    else nextClasses.add(token)
  }
  for (const child of Array.from(el.children)) dropInherited(child, nextProps, nextClasses)
}

function propertyReaches(el: Element, prop: string): boolean {
  for (const child of Array.from(el.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      if (!isBlank((child as Text).data)) return true
      continue
    }
    if (child.nodeType !== Node.ELEMENT_NODE) continue
    if ((child as HTMLElement).style?.getPropertyValue(prop)) continue
    if (propertyReaches(child as Element, prop)) return true
  }
  return false
}

function dropDeadProps(root: ParentNode) {
  for (const el of Array.from(root.querySelectorAll<HTMLElement>('[style]'))) {
    for (const prop of TRACKED_PROPS) {
      if (!el.style.getPropertyValue(prop)) continue
      if (!propertyReaches(el, prop)) el.style.removeProperty(prop)
    }
  }
}

function unwrapBare(root: ParentNode) {
  const all = Array.from(root.querySelectorAll('*'))
  for (let i = all.length - 1; i >= 0; i--) {
    const el = all[i] as HTMLElement
    if (el.getAttribute('style') === '') el.removeAttribute('style')
    if (el.getAttribute('class') === '') el.removeAttribute('class')
    if (el.tagName !== 'SPAN' || el.attributes.length > 0) continue
    el.replaceWith(...Array.from(el.childNodes))
  }
}

function propOrder(prop: string): number {
  const i = PLUGIN_PROPS.indexOf(prop)
  return i === -1 ? PLUGIN_PROPS.length : i
}

function splitStyleSpans(root: ParentNode) {
  for (const el of Array.from(root.querySelectorAll<HTMLElement>('span[style]'))) {
    const decls = Array.from(el.style)
      .map((prop) => [prop, el.style.getPropertyValue(prop)] as const)
      .sort((a, b) => propOrder(a[0]) - propOrder(b[0]))
    if (decls.length === 0) {
      el.removeAttribute('style')
      continue
    }
    el.setAttribute('style', `${decls[0][0]}:${decls[0][1]}`)
    let host: HTMLElement = el
    for (const [prop, value] of decls.slice(1)) {
      const inner = document.createElement('span')
      inner.setAttribute('style', `${prop}:${value}`)
      inner.append(...Array.from(host.childNodes))
      host.appendChild(inner)
      host = inner
    }
  }
}

export function normalizeRichHtml(html: string | null | undefined): string {
  if (!html) return ''
  const template = document.createElement('template')
  template.innerHTML = html
  const root = template.content

  paragraphsToDivs(root)
  pruneEmpty(root)
  for (const child of Array.from(root.children)) dropInherited(child, new Map(), new Set())
  dropDeadProps(root)
  unwrapBare(root)
  splitStyleSpans(root)

  if (isBlank(root.textContent ?? '') && !root.querySelector('img, hr')) return ''
  return template.innerHTML
}
