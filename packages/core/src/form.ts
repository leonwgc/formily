import { clone, equal, getAt, segments, setAt, unsetAt, type Path } from './path.js'

export type ValidationResult = string | undefined | null | void
export type FieldValidator<TValues extends object = object> = (
  value: unknown,
  values: Readonly<TValues>,
) => ValidationResult | Promise<ValidationResult>
export type FormValidationResult = { fields?: Record<string, string>; form?: string } | void
export type FormValidator<TValues extends object> = (
  values: Readonly<TValues>,
) => FormValidationResult | Promise<FormValidationResult>
export type ValidateOn = 'change' | 'blur' | 'submit'

export interface FieldOptions<TValues extends object> {
  validate?: FieldValidator<TValues>
  validateOn?: ValidateOn
}

export interface FormOptions<TValues extends object> {
  initialValues: TValues
  validate?: FormValidator<TValues>
}

export interface FormState<TValues extends object> {
  readonly values: Readonly<TValues>
  readonly errors: Readonly<Record<string, string>>
  readonly formError: string | undefined
  readonly touched: Readonly<Record<string, boolean>>
  readonly isDirty: boolean
  readonly isValidating: boolean
  readonly isSubmitting: boolean
  readonly submitCount: number
}

export interface FieldState<TValue = unknown> {
  readonly value: TValue | undefined
  readonly error: string | undefined
  readonly isTouched: boolean
  readonly isDirty: boolean
  readonly isValidating: boolean
}

export type SubmitResult<TResult> =
  | { ok: true; data: TResult }
  | { ok: false; errors: Record<string, string>; formError?: string }

export interface ArrayItem<TValue = unknown> {
  key: string
  index: number
  value: TValue
}

interface Registration<TValues extends object> extends FieldOptions<TValues> {
  id: number
  path: Path
}

function sameField(left: FieldState, right: FieldState): boolean {
  return equal(left.value, right.value) && left.error === right.error &&
    left.isTouched === right.isTouched && left.isDirty === right.isDirty &&
    left.isValidating === right.isValidating
}

export class Form<TValues extends object> {
  private values: TValues
  private initialValues: TValues
  private errors: Record<string, string> = {}
  private formError: string | undefined
  private touched: Record<string, boolean> = {}
  private validating = new Set<string>()
  private validated = new Set<string>()
  private validationVersions = new Map<string, number>()
  private formValidationVersion = 0
  private registrations = new Map<number, Registration<TValues>>()
  private registrationId = 0
  private listeners = new Set<() => void>()
  private fieldListeners = new Map<Path, Set<() => void>>()
  private fieldSnapshots = new Map<Path, FieldState>()
  private state: FormState<TValues>
  private submitting = false
  private submitCount = 0
  private pendingSubmit: Promise<SubmitResult<unknown>> | undefined
  private arrayKeys = new Map<Path, string[]>()
  private arrayKeyId = 0

  constructor(private readonly options: FormOptions<TValues>) {
    this.initialValues = clone(options.initialValues)
    this.values = clone(options.initialValues)
    this.state = this.makeState()
  }

  private makeState(): FormState<TValues> {
    return {
      values: clone(this.values),
      errors: { ...this.errors },
      formError: this.formError,
      touched: { ...this.touched },
      isDirty: !equal(this.values, this.initialValues),
      isValidating: this.validating.size > 0,
      isSubmitting: this.submitting,
      submitCount: this.submitCount,
    }
  }

  private publish(): void {
    this.state = this.makeState()
    for (const listener of this.listeners) listener()
    for (const [path, previous] of this.fieldSnapshots) {
      const next = this.makeFieldState(path)
      if (sameField(previous, next)) continue
      this.fieldSnapshots.set(path, next)
      for (const listener of this.fieldListeners.get(path) ?? []) listener()
    }
  }

  getState = (): FormState<TValues> => this.state

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  private makeFieldState(path: Path): FieldState {
    return {
      value: clone(getAt(this.values, path)),
      error: this.errors[path],
      isTouched: !!this.touched[path],
      isDirty: !equal(getAt(this.values, path), getAt(this.initialValues, path)),
      isValidating: this.validating.has(path),
    }
  }

  getFieldState = <TValue = unknown>(path: Path): FieldState<TValue> => {
    if (!this.fieldSnapshots.has(path)) this.fieldSnapshots.set(path, this.makeFieldState(path))
    return this.fieldSnapshots.get(path) as FieldState<TValue>
  }

  subscribeField = (path: Path, listener: () => void): (() => void) => {
    let listeners = this.fieldListeners.get(path)
    if (!listeners) {
      listeners = new Set()
      this.fieldListeners.set(path, listeners)
      if (!this.fieldSnapshots.has(path)) this.fieldSnapshots.set(path, this.makeFieldState(path))
    }
    listeners.add(listener)
    return () => {
      listeners!.delete(listener)
      if (!listeners!.size) {
        this.fieldListeners.delete(path)
        this.fieldSnapshots.delete(path)
      }
    }
  }

  register = (path: Path, options: FieldOptions<TValues> = {}): (() => void) => {
    segments(path)
    const id = ++this.registrationId
    this.registrations.set(id, { ...options, id, path })
    return () => { this.registrations.delete(id) }
  }

  getValue = <TValue = unknown>(path: Path): TValue | undefined => clone(getAt(this.values, path)) as TValue | undefined

  private cancelValidation(path: Path): void {
    this.validationVersions.set(path, (this.validationVersions.get(path) ?? 0) + 1)
    this.validating.delete(path)
  }

  private cancelRelatedValidations(path: Path): void {
    this.formValidationVersion++
    for (const active of this.validationVersions.keys()) {
      if (active === path || active.startsWith(`${path}.`) || path.startsWith(`${active}.`)) {
        this.cancelValidation(active)
      }
    }
  }

  setValue = (path: Path, value: unknown): void => {
    this.values = setAt(this.values, path, clone(value))
    this.cancelRelatedValidations(path)
    this.formError = undefined
    this.syncArrayKeys(path)
    this.publish()
    const registrations = [...this.registrations.values()].filter((item) => item.path === path)
    if (registrations.some((item) => item.validateOn === 'change' ||
      ((item.validateOn ?? 'blur') === 'blur' && (this.touched[path] || this.validated.has(path))))) {
      void this.validateField(path)
    }
  }

  setValues = (values: TValues): void => {
    this.values = clone(values)
    this.invalidateValidations()
    this.formError = undefined
    this.arrayKeys.clear()
    this.publish()
  }

  setInitialValues = (values: TValues, options: { replaceValues?: boolean } = {}): void => {
    this.initialValues = clone(values)
    if (options.replaceValues) {
      this.values = clone(values)
      this.clearMeta()
      this.arrayKeys.clear()
    }
    this.publish()
  }

  removeValue = (path: Path): void => {
    this.values = unsetAt(this.values, path)
    this.cancelRelatedValidations(path)
    this.formError = undefined
    this.deleteMeta(path)
    this.publish()
  }

  blur = (path: Path): void => {
    this.touched = { ...this.touched, [path]: true }
    this.publish()
    if ([...this.registrations.values()].some((item) => item.path === path && item.validateOn !== 'submit')) {
      void this.validateField(path)
    }
  }

  async validateField(path: Path): Promise<boolean> {
    const version = (this.validationVersions.get(path) ?? 0) + 1
    this.validationVersions.set(path, version)
    this.validating.add(path)
    this.publish()
    const validators = [...this.registrations.values()].filter((item) => item.path === path && item.validate)
    let error: string | undefined
    try {
      for (const item of validators) {
        const result = await item.validate!(getAt(this.values, path), clone(this.values))
        if (result) { error = result; break }
      }
    } finally {
      if (this.validationVersions.get(path) === version) {
        this.validating.delete(path)
        this.validated.add(path)
        this.errors = { ...this.errors }
        if (error) this.errors[path] = error
        else delete this.errors[path]
        this.publish()
      }
    }
    return this.validationVersions.get(path) === version && !error
  }

  async validate(): Promise<boolean> {
    const version = ++this.formValidationVersion
    const paths = [...new Set([...this.registrations.values()].filter((item) => item.validate).map((item) => item.path))]
    const fieldResults = await Promise.all(paths.map((path) => this.validateField(path)))
    const formResult = (await this.options.validate?.(clone(this.values))) || undefined
    if (version !== this.formValidationVersion) return false
    this.formError = formResult?.form
    const errors = { ...this.errors }
    for (const key of Object.keys(errors)) {
      if (!paths.includes(key)) delete errors[key]
    }
    for (const [path, error] of Object.entries(formResult?.fields ?? {})) {
      if (!errors[path]) errors[path] = error
    }
    this.errors = errors
    this.publish()
    return fieldResults.every(Boolean) && !this.formError && !Object.keys(errors).length
  }

  submit = <TResult>(handler: (values: TValues) => TResult | Promise<TResult>): Promise<SubmitResult<TResult>> => {
    if (this.pendingSubmit) return this.pendingSubmit as Promise<SubmitResult<TResult>>
    this.submitting = true
    this.submitCount += 1
    this.publish()
    const task = (async (): Promise<SubmitResult<TResult>> => {
      try {
        if (!await this.validate()) {
          return { ok: false, errors: { ...this.errors }, formError: this.formError }
        }
        return { ok: true, data: await handler(clone(this.values)) }
      } finally {
        this.submitting = false
        this.pendingSubmit = undefined
        this.publish()
      }
    })()
    this.pendingSubmit = task
    return task
  }

  reset = (): void => {
    this.values = clone(this.initialValues)
    this.clearMeta()
    this.arrayKeys.clear()
    this.publish()
  }

  private invalidateValidations(): void {
    this.formValidationVersion++
    for (const path of this.validationVersions.keys()) this.cancelValidation(path)
    this.validating.clear()
  }

  private clearMeta(): void {
    this.invalidateValidations()
    this.errors = {}
    this.formError = undefined
    this.touched = {}
    this.validated.clear()
    this.submitCount = 0
  }

  private deleteMeta(path: Path): void {
    const prefix = `${path}.`
    this.errors = Object.fromEntries(Object.entries(this.errors).filter(([key]) => key !== path && !key.startsWith(prefix)))
    this.touched = Object.fromEntries(Object.entries(this.touched).filter(([key]) => key !== path && !key.startsWith(prefix)))
    for (const key of this.validationVersions.keys()) {
      if (key === path || key.startsWith(prefix)) this.cancelValidation(key)
    }
  }

  private syncArrayKeys(path: Path): void {
    if (!this.arrayKeys.has(path)) return
    const value = getAt(this.values, path)
    if (!Array.isArray(value)) { this.arrayKeys.delete(path); return }
    const keys = this.arrayKeys.get(path)!
    while (keys.length < value.length) keys.push(`item-${++this.arrayKeyId}`)
    keys.length = value.length
  }

  getArrayItems = <TValue = unknown>(path: Path): ArrayItem<TValue>[] => {
    const values = getAt(this.values, path)
    if (!Array.isArray(values)) return []
    if (!this.arrayKeys.has(path)) this.arrayKeys.set(path, [])
    this.syncArrayKeys(path)
    return values.map((value, index) => ({ key: this.arrayKeys.get(path)![index]!, index, value: clone(value) }))
  }

  private changeArray(path: Path, values: unknown[], keys: string[], mapIndex: (index: number) => number | undefined): void {
    const prefix = `${path}.`
    const mapChildPath = (name: string): string | undefined => {
      if (!name.startsWith(prefix)) return name
      const rest = name.slice(prefix.length)
      const match = /^(\d+)(\.|$)/.exec(rest)
      if (!match) return name
      const next = mapIndex(Number(match[1]))
      return next === undefined ? undefined : `${prefix}${next}${rest.slice(match[1]!.length)}`
    }
    const remap = (source: Record<string, string | boolean>): typeof source => {
      const target: typeof source = {}
      for (const [name, value] of Object.entries(source)) {
        const mapped = mapChildPath(name)
        if (mapped !== undefined) target[mapped] = value
      }
      return target
    }
    this.values = setAt(this.values, path, values)
    this.arrayKeys = new Map([...this.arrayKeys].flatMap(([name, itemKeys]) => {
      const mapped = mapChildPath(name)
      return mapped === undefined || name === path ? [] : [[mapped, itemKeys] as const]
    }))
    this.arrayKeys.set(path, keys)
    this.formError = undefined
    this.errors = remap(this.errors) as Record<string, string>
    this.touched = remap(this.touched) as Record<string, boolean>
    this.validated = new Set([...this.validated].flatMap((name) => {
      const mapped = mapChildPath(name)
      return mapped === undefined ? [] : [mapped]
    }))
    for (const item of this.registrations.values()) {
      const mapped = mapChildPath(item.path)
      if (mapped === undefined) this.registrations.delete(item.id)
      else item.path = mapped
    }
    this.invalidateValidations()
    this.publish()
  }

  append = (path: Path, value: unknown): void => {
    const items = this.getArrayItems(path)
    this.changeArray(path, [...items.map((item) => item.value), clone(value)],
      [...items.map((item) => item.key), `item-${++this.arrayKeyId}`], (index) => index)
  }

  insert = (path: Path, index: number, value: unknown): void => {
    const items = this.getArrayItems(path)
    if (index < 0 || index > items.length) throw new RangeError('Array index out of range')
    const values = items.map((item) => item.value)
    const keys = items.map((item) => item.key)
    values.splice(index, 0, clone(value))
    keys.splice(index, 0, `item-${++this.arrayKeyId}`)
    this.changeArray(path, values, keys, (old) => old >= index ? old + 1 : old)
  }

  remove = (path: Path, index: number): void => {
    const items = this.getArrayItems(path)
    if (index < 0 || index >= items.length) throw new RangeError('Array index out of range')
    const values = items.map((item) => item.value)
    const keys = items.map((item) => item.key)
    values.splice(index, 1)
    keys.splice(index, 1)
    this.changeArray(path, values, keys, (old) => old === index ? undefined : old > index ? old - 1 : old)
  }

  move = (path: Path, from: number, to: number): void => {
    const items = this.getArrayItems(path)
    if (from < 0 || to < 0 || from >= items.length || to >= items.length) throw new RangeError('Array index out of range')
    const values = items.map((item) => item.value)
    const keys = items.map((item) => item.key)
    values.splice(to, 0, values.splice(from, 1)[0])
    keys.splice(to, 0, keys.splice(from, 1)[0]!)
    this.changeArray(path, values, keys, (old) => {
      if (old === from) return to
      if (from < to && old > from && old <= to) return old - 1
      if (from > to && old >= to && old < from) return old + 1
      return old
    })
  }
}

export function createForm<TValues extends object>(options: FormOptions<TValues>): Form<TValues> {
  return new Form(options)
}
