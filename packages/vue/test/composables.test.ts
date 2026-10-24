import { createApp, defineComponent, h, nextTick, ref, type App } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'
import { createForm } from 'formily-core'
import { useField, useFieldArray, useFormState, useTextField } from '../src/index.js'

const mounted: Array<{ app: App; container: HTMLElement }> = []
afterEach(() => {
  for (const { app, container } of mounted.splice(0)) { app.unmount(); container.remove() }
})

function mount(component: ReturnType<typeof defineComponent>) {
  const container = document.createElement('div')
  document.body.append(container)
  const app = createApp(component)
  app.mount(container)
  mounted.push({ app, container })
  return container
}

describe('Vue adapter', () => {
  it('binds text fields with a writable model', async () => {
    const form = createForm({ initialValues: { name: '' } })
    let setName!: (value: string) => void
    const App = defineComponent({ setup() {
      const name = useTextField(form, 'name', { validate: (value) => value ? undefined : 'Required' })
      setName = (value) => { name.model.value = value }
      return () => h('div', [
        h('span', { id: 'value' }, name.model.value),
        h('span', { id: 'error' }, name.error.value),
      ])
    } })
    const container = mount(App)
    form.blur('name')
    await Promise.resolve()
    await nextTick()
    expect(container.querySelector('#error')?.textContent).toBe('Required')
    setName('Ada')
    await Promise.resolve()
    await nextTick()
    expect(form.getValue('name')).toBe('Ada')
    expect(container.querySelector('#value')?.textContent).toBe('Ada')
    expect(container.querySelector('#error')?.textContent).toBe('')
  })

  it('reacts to value, dirty, and validation changes', async () => {
    const form = createForm({ initialValues: { name: '' } })
    const App = defineComponent({ setup() {
      const field = useField(form, 'name', { validate: (value) => value ? undefined : 'Required' })
      const state = useFormState(form)
      return () => h('div', [
        h('span', { id: 'value' }, String(field.value.value)),
        h('span', { id: 'error' }, field.error.value),
        h('span', { id: 'dirty' }, String(state.value.isDirty)),
      ])
    } })
    const container = mount(App)
    form.blur('name')
    await Promise.resolve()
    await nextTick()
    expect(container.querySelector('#error')?.textContent).toBe('Required')
    form.setValue('name', 'Ada')
    await Promise.resolve()
    await nextTick()
    expect(container.querySelector('#value')?.textContent).toBe('Ada')
    expect(container.querySelector('#dirty')?.textContent).toBe('true')
    expect(container.querySelector('#error')?.textContent).toBe('')
  })

  it('re-registers when a reactive path changes', async () => {
    const form = createForm({ initialValues: { first: 'A', second: 'B' } })
    const path = ref('first')
    const App = defineComponent({ setup() {
      const field = useField(form, path)
      return () => h('span', String(field.value.value))
    } })
    const container = mount(App)
    expect(container.textContent).toBe('A')
    path.value = 'second'
    await nextTick()
    expect(container.textContent).toBe('B')
  })

  it('exposes reactive array items', async () => {
    const form = createForm({ initialValues: { items: [{ label: 'A' }] } })
    let append!: (value: { label: string }) => void
    const App = defineComponent({ setup() {
      const array = useFieldArray(form, 'items')
      append = array.append
      return () => h('span', String(array.items.value.length))
    } })
    const container = mount(App)
    append({ label: 'B' })
    await nextTick()
    expect(container.textContent).toBe('2')
  })
})
