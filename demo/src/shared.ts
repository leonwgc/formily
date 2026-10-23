import type { FormOptions } from 'formily-core'

export interface DemoValues {
  name: string
  contact: { email: string }
  username: string
  items: { label: string }[]
}

export const initialValues: DemoValues = {
  name: '',
  contact: { email: '' },
  username: '',
  items: [{ label: '' }],
}

export const formOptions: FormOptions<DemoValues> = {
  initialValues,
  validate: (values) => ({
    form: values.items.length ? undefined : 'Add at least one item.',
  }),
}

export const required = (value: unknown) =>
  String(value ?? '').trim() ? undefined : 'This field is required.'

export const email = (value: unknown) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value ?? '')) ? undefined : 'Enter a valid email address.'

export const username = async (value: unknown) => {
  await new Promise((resolve) => setTimeout(resolve, 250))
  const name = String(value ?? '').trim()
  if (!name) return 'This field is required.'
  if (name.toLowerCase() === 'taken') return 'This username is already taken.'
  return undefined
}
