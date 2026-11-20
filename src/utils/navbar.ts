export function readNavbarHeight(): number {
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--navbar-height')) || 0
}
