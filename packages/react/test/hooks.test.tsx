import { act, StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { createForm } from 'formily-core'
import { useField, useFieldArray, useFormState, useTextField } from '../src/index.js'

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const mounted: Array<{ root: Root; container: HTMLElement }> = []
afterEach(async () => {
  for (const { root, container } of mounted.splice(0)) {
    await act(async () => { root.unmount() })
    container.remove()
  }
})

function mount(element: React.ReactNode) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  mounted.push({ root, container })
  act(() => { root.render(element) })
  return container
}

describe('React adapter', () => {
  it('binds text inputs without manual change handlers', async () => {
    const form = createForm({ initialValues: { name: '' } })
    function App() {
      const name = useTextField(form, 'name', { validate: (value) => value ? undefined : 'Required' })
      return <><input aria-label="Name" {...name.inputProps} />
        <span data-testid="error">{name.error}</span></>
    }
    const container = mount(<App />)
    const input = container.querySelector('input')!
    expect(input.name).toBe('name')
    await act(async () => { input.dispatchEvent(new FocusEvent('focusout', { bubbles: true })); await Promise.resolve() })
    expect(container.querySelector('[data-testid=error]')?.textContent).toBe('Required')
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'Ada')
      input.dispatchEvent(new Event('input', { bubbles: true }))
      await Promise.resolve()
    })
    expect(form.getValue('name')).toBe('Ada')
    expect(input.value).toBe('Ada')
    expect(container.querySelector('[data-testid=error]')?.textContent).toBe('')
  })

  it('updates field and form subscriptions through React hooks', async () => {
    const form = createForm({ initialValues: { name: '' } })
    function App() {
      const field = useField(form, 'name', { validate: (value) => value ? undefined : 'Required' })
      const state = useFormState(form)
      return <><input aria-label="Name" value={String(field.value ?? '')}
        onChange={(event) => field.onChange(event.target.value)} onBlur={field.onBlur} />
        <span data-testid="dirty">{String(state.isDirty)}</span>
        <span data-testid="error">{field.error}</span></>
    }
    const container = mount(<StrictMode><App /></StrictMode>)
    expect(container.querySelector('[data-testid=dirty]')?.textContent).toBe('false')
    await act(async () => { form.blur('name'); await Promise.resolve() })
    expect(container.querySelector('[data-testid=error]')?.textContent).toBe('Required')
    await act(async () => { form.setValue('name', 'Ada'); await Promise.resolve() })
    expect((container.querySelector('input') as HTMLInputElement).value).toBe('Ada')
    expect(container.querySelector('[data-testid=dirty]')?.textContent).toBe('true')
    expect(container.querySelector('[data-testid=error]')?.textContent).toBe('')
  })

  it('exposes stable array keys and operations', () => {
    const form = createForm({ initialValues: { items: [{ label: 'A' }] } })
    function App() {
      const array = useFieldArray(form, 'items')
      return <><button onClick={() => array.append({ label: 'B' })}>Add</button>
        <span data-testid="count">{array.items.length}</span></>
    }
    const container = mount(<App />)
    act(() => { container.querySelector('button')?.click() })
    expect(container.querySelector('[data-testid=count]')?.textContent).toBe('2')
    expect(form.getValue('items.1.label')).toBe('B')
  })
})
