import { describe, expect, it, vi } from 'vitest'
import { createForm } from '../src/index.js'

interface Values {
  user: { name: string; email: string }
  items: { label: string }[]
}

const initialValues: Values = {
  user: { name: '', email: '' },
  items: [{ label: 'A' }, { label: 'B' }, { label: 'C' }],
}

function makeForm() {
  return createForm({ initialValues })
}

describe('form state', () => {
  it('clones initial values, updates nested paths, and tracks dirty state', () => {
    const form = makeForm()
    const observed: boolean[] = []
    const unsubscribe = form.subscribe(() => observed.push(form.getState().isDirty))
    form.setValue('user.name', 'Ada')
    expect(form.getValue('user.name')).toBe('Ada')
    expect(initialValues.user.name).toBe('')
    expect(form.getFieldState('user.name').isDirty).toBe(true)
    form.setValue('user.name', '')
    expect(form.getState().isDirty).toBe(false)
    expect(observed).toEqual([true, false])
    unsubscribe()
    form.setValue('user.name', 'Grace')
    expect(observed).toHaveLength(2)
  })

  it('does not expose mutable internal values through state or getters', () => {
    const form = makeForm()
    form.getState().values.items[0]!.label = 'Changed outside'
    form.getValue<{ label: string }>('items.0').label = 'Also outside'
    expect(form.getValue('items.0.label')).toBe('A')
    expect(form.getState().isDirty).toBe(false)
  })

  it('supports bracket paths and rejects prototype pollution', () => {
    const form = makeForm()
    form.setValue('items[0].label', 'First')
    expect(form.getValue('items.0.label')).toBe('First')
    expect(() => form.setValue('__proto__.hacked', true)).toThrow('Invalid field path')
    expect(Object.prototype).not.toHaveProperty('hacked')
  })

  it('notifies only changed field subscribers and retains unregistered values', () => {
    const form = makeForm()
    const name = vi.fn()
    const email = vi.fn()
    const stopName = form.subscribeField('user.name', name)
    form.subscribeField('user.email', email)
    const unregister = form.register('user.name')
    const snapshot = form.getFieldState('user.name')
    expect(form.getFieldState('user.name')).toBe(snapshot)
    form.setValue('user.email', 'a@example.com')
    expect(name).not.toHaveBeenCalled()
    expect(email).toHaveBeenCalledTimes(1)
    form.setValue('user.name', 'Ada')
    expect(name).toHaveBeenCalledTimes(1)
    unregister()
    expect(form.getValue('user.name')).toBe('Ada')
    stopName()
  })

  it('updates the initial baseline and can replace current values', () => {
    const form = makeForm()
    form.setValue('user.name', 'Ada')
    form.setInitialValues({ ...initialValues, user: { name: 'Ada', email: '' } })
    expect(form.getState().isDirty).toBe(false)
    form.setInitialValues({ ...initialValues, user: { name: 'Grace', email: '' } }, { replaceValues: true })
    expect(form.getValue('user.name')).toBe('Grace')
    expect(form.getState().isDirty).toBe(false)
  })

  it('removes a nested value explicitly', () => {
    const form = makeForm()
    form.removeValue('user.email')
    expect(form.getValue('user.email')).toBeUndefined()
    expect(form.getState().isDirty).toBe(true)
  })
})

describe('validation', () => {
  it('validates on blur, then change, and clears errors', async () => {
    const form = makeForm()
    form.register('user.name', { validate: (value) => value ? undefined : 'Required' })
    form.setValue('user.name', '')
    expect(form.getFieldState('user.name').error).toBeUndefined()
    form.blur('user.name')
    await vi.waitFor(() => expect(form.getFieldState('user.name').error).toBe('Required'))
    expect(form.getFieldState('user.name').isTouched).toBe(true)
    form.setValue('user.name', 'Ada')
    await vi.waitFor(() => expect(form.getFieldState('user.name').error).toBeUndefined())
  })

  it('supports change-only and submit-only field modes', async () => {
    const form = makeForm()
    form.register('user.name', { validateOn: 'change', validate: () => 'Change error' })
    form.register('user.email', { validateOn: 'submit', validate: () => 'Submit error' })
    form.setValue('user.name', 'A')
    await vi.waitFor(() => expect(form.getFieldState('user.name').error).toBe('Change error'))
    form.blur('user.email')
    expect(form.getFieldState('user.email').error).toBeUndefined()
    await form.validate()
    expect(form.getFieldState('user.email').error).toBe('Submit error')
  })

  it('keeps only the latest async validation result', async () => {
    const form = makeForm()
    const resolvers: Array<(error?: string) => void> = []
    form.register('user.name', { validate: () => new Promise((resolve) => resolvers.push(resolve)) })
    const old = form.validateField('user.name')
    form.setValue('user.name', 'new')
    const latest = form.validateField('user.name')
    resolvers[1]?.(undefined)
    expect(await latest).toBe(true)
    resolvers[0]?.('Old error')
    expect(await old).toBe(false)
    expect(form.getFieldState('user.name').error).toBeUndefined()
  })

  it('merges form-level field errors and exposes a form error', async () => {
    const form = createForm({ initialValues, validate: () => ({ fields: { 'user.email': 'Bad email' }, form: 'Form issue' }) })
    expect(await form.validate()).toBe(false)
    expect(form.getState().errors['user.email']).toBe('Bad email')
    expect(form.getState().formError).toBe('Form issue')
  })

  it('discards stale form-level validation after a value changes', async () => {
    let finish!: (result: { form: string }) => void
    const form = createForm({ initialValues, validate: () => new Promise<{ form: string }>((resolve) => { finish = resolve }) })
    const old = form.validate()
    await Promise.resolve()
    form.setValue('user.name', 'Ada')
    finish({ form: 'Old form error' })
    expect(await old).toBe(false)
    expect(form.getState().formError).toBeUndefined()
  })
})

describe('submission and reset', () => {
  it('does not call the handler for invalid values', async () => {
    const form = makeForm()
    form.register('user.name', { validate: () => 'Required' })
    const handler = vi.fn()
    const result = await form.submit(handler)
    expect(result).toEqual({ ok: false, errors: { 'user.name': 'Required' }, formError: undefined })
    expect(handler).not.toHaveBeenCalled()
    expect(form.getState().submitCount).toBe(1)
  })

  it('deduplicates pending submissions and restores isSubmitting after errors', async () => {
    const form = makeForm()
    let finish!: (value: number) => void
    const handler = vi.fn(() => new Promise<number>((resolve) => { finish = resolve }))
    const first = form.submit(handler)
    const second = form.submit(handler)
    expect(first).toBe(second)
    expect(form.getState().isSubmitting).toBe(true)
    await vi.waitFor(() => expect(handler).toHaveBeenCalledTimes(1))
    finish(42)
    expect(await first).toEqual({ ok: true, data: 42 })
    expect(form.getState().isSubmitting).toBe(false)
    await expect(form.submit(() => { throw new Error('Server down') })).rejects.toThrow('Server down')
    expect(form.getState().isSubmitting).toBe(false)
  })

  it('reset restores initial data and clears interaction state', async () => {
    const form = makeForm()
    form.register('user.name', { validate: () => 'Required' })
    form.setValue('user.name', 'Ada')
    form.blur('user.name')
    await form.submit(() => undefined)
    form.reset()
    expect(form.getState()).toMatchObject({ values: initialValues, errors: {}, touched: {}, isDirty: false, submitCount: 0 })
  })
})

describe('field arrays', () => {
  it('preserves stable keys through append, insert, move, and remove', () => {
    const form = makeForm()
    const original = form.getArrayItems<{ label: string }>('items')
    form.append('items', { label: 'D' })
    form.insert('items', 1, { label: 'X' })
    expect(form.getArrayItems('items').map((item) => item.key)).toEqual([
      original[0]?.key, expect.any(String), original[1]?.key, original[2]?.key, expect.any(String),
    ])
    form.move('items', 0, 3)
    expect(form.getArrayItems('items')[3]?.key).toBe(original[0]?.key)
    form.remove('items', 3)
    expect(form.getArrayItems('items').map((item) => item.key)).not.toContain(original[0]?.key)
  })

  it('moves touched and errors with the item and drops deleted metadata', async () => {
    const form = makeForm()
    form.register('items.0.label', { validate: () => 'Bad A' })
    form.blur('items.0.label')
    await vi.waitFor(() => expect(form.getState().errors['items.0.label']).toBe('Bad A'))
    form.move('items', 0, 2)
    expect(form.getState().errors['items.2.label']).toBe('Bad A')
    expect(form.getState().touched['items.2.label']).toBe(true)
    form.remove('items', 2)
    expect(form.getState().errors['items.2.label']).toBeUndefined()
    expect(form.getState().touched['items.2.label']).toBeUndefined()
  })

  it('keeps nested array keys with their parent item', () => {
    const form = createForm({ initialValues: { items: [{ tags: ['A'] }, { tags: ['B'] }] } })
    const firstKey = form.getArrayItems('items.0.tags')[0]?.key
    form.move('items', 0, 1)
    expect(form.getArrayItems('items.1.tags')[0]?.key).toBe(firstKey)
  })

  it('rejects out-of-range operations', () => {
    const form = makeForm()
    expect(() => form.insert('items', 4, {})).toThrow(RangeError)
    expect(() => form.remove('items', -1)).toThrow(RangeError)
    expect(() => form.move('items', 0, 4)).toThrow(RangeError)
  })
})
