# formily-react

React hooks for `formily-core`. React 18 or newer is required as a peer dependency.

```tsx
import { useForm, useTextField } from 'formily-react'

function NameForm() {
  const form = useForm({ initialValues: { name: '' } })
  const name = useTextField(form, 'name', { validate: (value) => value ? undefined : 'Required' })

  return <form onSubmit={(event) => { event.preventDefault(); void form.submit(console.log) }}>
    <label htmlFor="name">Name</label>
    <input id="name" {...name.inputProps} aria-invalid={!!name.error} />
    {name.error && <span role="alert">{name.error}</span>}
    <button>Submit</button>
  </form>
}
```

`useTextField` binds text inputs and textareas. Use `useField` for other controls and `useFieldArray` for repeatable rows. See the [repository README](https://github.com/leonwgc/formily#readme) for validation, state, and array behavior.
