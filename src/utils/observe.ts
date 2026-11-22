type Stop = () => void

const visibleHandlers = new WeakMap<Element, (visible: boolean) => void>()
const sizeHandlers = new WeakMap<Element, (entry: ResizeObserverEntry) => void>()
let visibility: IntersectionObserver | null = null
let sizes: ResizeObserver | null = null

export function observeVisible(el: Element, onChange: (visible: boolean) => void): Stop {
  visibility ??= new IntersectionObserver(
    (entries) => {
      for (const e of entries) visibleHandlers.get(e.target)?.(e.isIntersecting)
    },
    { rootMargin: '64px' },
  )
  visibleHandlers.set(el, onChange)
  visibility.observe(el)
  return () => {
    visibleHandlers.delete(el)
    visibility?.unobserve(el)
  }
}

export function observeSize(el: Element, onChange: (entry: ResizeObserverEntry) => void): Stop {
  sizes ??= new ResizeObserver((entries) => {
    for (const e of entries) sizeHandlers.get(e.target)?.(e)
  })
  sizeHandlers.set(el, onChange)
  sizes.observe(el)
  return () => {
    sizeHandlers.delete(el)
    sizes?.unobserve(el)
  }
}
