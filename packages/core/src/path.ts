export type Path = string

const forbidden = new Set(['__proto__', 'prototype', 'constructor'])

export function segments(path: Path): string[] {
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean)
  if (!parts.length || parts.some((part) => forbidden.has(part))) {
    throw new Error(`Invalid field path: ${path}`)
  }
  return parts
}

export function getAt(value: unknown, path: Path): unknown {
  return segments(path).reduce<unknown>((current, part) => {
    if (current === null || typeof current !== 'object') return undefined
    return (current as Record<string, unknown>)[part]
  }, value)
}

export function clone<T>(value: T): T {
  if (Array.isArray(value)) return value.map(clone) as T
  if (value instanceof Date) return new Date(value.getTime()) as T
  if (value && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)])) as T
  }
  return value
}

export function equal(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true
  if (left instanceof Date && right instanceof Date) return left.getTime() === right.getTime()
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false
  if (!Array.isArray(left) && (Object.getPrototypeOf(left) !== Object.prototype || Object.getPrototypeOf(right) !== Object.prototype)) return false
  if (Array.isArray(left) !== Array.isArray(right)) return false
  const leftKeys = Object.keys(left)
  const rightKeys = Object.keys(right)
  return leftKeys.length === rightKeys.length && leftKeys.every((key) =>
    Object.hasOwn(right, key) && equal((left as Record<string, unknown>)[key], (right as Record<string, unknown>)[key]),
  )
}

export function setAt<T>(value: T, path: Path, next: unknown): T {
  const root = clone(value) as Record<string, unknown>
  const parts = segments(path)
  let current: Record<string, unknown> = root
  parts.forEach((part, index) => {
    if (index === parts.length - 1) {
      current[part] = next
      return
    }
    const following = parts[index + 1]!
    const child = current[part]
    if (!child || typeof child !== 'object') current[part] = /^\d+$/.test(following) ? [] : {}
    current = current[part] as Record<string, unknown>
  })
  return root as T
}

export function unsetAt<T>(value: T, path: Path): T {
  const root = clone(value) as Record<string, unknown>
  const parts = segments(path)
  let current: Record<string, unknown> = root
  for (const part of parts.slice(0, -1)) {
    const child = current[part]
    if (!child || typeof child !== 'object') return root as T
    current = child as Record<string, unknown>
  }
  delete current[parts.at(-1)!]
  return root as T
}
