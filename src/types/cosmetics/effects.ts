export interface ModifierEffectSpec {
  contractVersion: 1
  compositions: Composition[]
  themeCompositions?: Composition[]
  trait?: string
}

export interface Composition {
  type: string
  [param: string]: unknown
}
