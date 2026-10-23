import { createForm, type SubmitResult } from 'formily-core'

const form = createForm({ initialValues: { title: '', count: 0 } })
form.setValues({ title: 'Draft', count: 1 })
form.submit((values) => {
  const title: string = values.title
  const count: number = values.count
  return title.length + count
})

// @ts-expect-error count must be a number
form.setValues({ title: 'Draft', count: 'one' })

// @ts-expect-error the entire value shape is required
form.setValues({ title: 'Draft' })

const accepted: SubmitResult<number> = { ok: true, data: 1 }
const rejected: SubmitResult<number> = { ok: false, errors: { title: 'Required' } }
void accepted
void rejected
