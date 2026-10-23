# Formily

A headless TypeScript form library with a framework-independent core and small React and Vue 3 adapters.

## Packages

| Package | Purpose |
| --- | --- |
| `formily-core` | Form state, nested paths, validation, submission, and field arrays |
| `formily-react` | React hooks based on `useSyncExternalStore` |
| `formily-vue` | Vue 3 composables based on refs and computed values |

All three packages are ESM-only and ship TypeScript declarations. React and Vue are peer dependencies of their respective adapters. These packages have their own API and are not drop-in replacements for Ant Design Form, react-hook-form, or the existing `@formily/*` packages.

## Quick start

```ts
import { createForm } from 'formily-core'

const form = createForm({
  initialValues: { user: { email: '' }, items: [{ label: '' }] },
  validate: (values) => ({
    form: values.items.length ? undefined : 'Add an item',
  }),
})

const unregister = form.register('user.email', {
  validate: (value) => String(value).includes('@') ? undefined : 'Invalid email',
})

form.setValue('user.email', 'hello@example.com')
form.blur('user.email')
form.append('items', { label: 'First' })

const result = await form.submit(async (values) => values)
if (!result.ok) console.log(result.errors, result.formError)
unregister()
```

`register` returns an unregister function. Unregistering preserves the value. `removeValue(path)` removes a value explicitly. Field paths accept dot notation and numeric brackets, such as `items.0.label` or `items[0].label`.

Validation runs on submit by default. A field validates on blur and on later changes; `validateOn: 'change'` or `'submit'` overrides that behavior. Field validators may return one message or no message, synchronously or asynchronously. Stale async field results are discarded. `submit` returns `{ ok: true, data }` or `{ ok: false, errors, formError }`; handler exceptions reject the promise. Concurrent calls share one pending submission.

`initialValues` is the dirty-state baseline. `setInitialValues(values, { replaceValues: true })` also replaces current values. `reset()` restores the baseline and clears errors, touched state, and submit count. Field-array operations keep item keys, errors, and touched state associated with the item as it moves.

The generic `TValues` types the form's values and submission handler. Deep string paths are validated at runtime, but are not fully checked by TypeScript in this first version.

## React

```tsx
import { useField, useForm, useFormState } from 'formily-react'

function Example() {
  const form = useForm({ initialValues: { name: '' } })
  const field = useField<{ name: string }, string>(form, 'name', {
    validate: (value) => value ? undefined : 'Required',
  })
  const state = useFormState(form)
  return <form onSubmit={(event) => { event.preventDefault(); void form.submit(console.log) }}>
    <input value={field.value} onChange={(event) => field.onChange(event.target.value)} onBlur={field.onBlur} />
    {field.error && <span role="alert">{field.error}</span>}
    <button disabled={state.isSubmitting}>Submit</button>
  </form>
}
```

## Vue 3

```ts
import { useField, useForm, useFormState } from 'formily-vue'

const form = useForm({ initialValues: { name: '' } })
const name = useField<{ name: string }, string>(form, 'name', {
  validate: (value) => value ? undefined : 'Required',
})
const state = useFormState(form)
```

The Vue composable returns computed `value`, `error`, `isDirty`, `isTouched`, and `isValidating` refs, plus `onChange`, `onBlur`, and `setValue` functions. Both adapters expose `useFieldArray` for stable-key array rendering.

## Development

Requires Node.js 22+ and pnpm 11. Run:

```sh
pnpm install
pnpm build
pnpm typecheck
pnpm test
pnpm build:docs
pnpm test:e2e
pnpm pack:check
```

`pnpm dev` serves the demos locally. Each demo page includes a source viewer whose contents come directly from its source files. `pnpm build:docs` creates a landing page and React/Vue demo pages in the root `docs/` directory. The build uses relative asset URLs so the `docs/` folder works as a GitHub Pages project site. To publish it, enable Pages for the repository's branch and `/docs` folder in GitHub settings. No deployment occurs from these scripts.

The browser tests need a local Playwright Chromium installation (`pnpm exec playwright install chromium` once per machine). If Chromium is installed at a custom path, set `FORMILY_CHROMIUM_PATH` when running `pnpm test:e2e`.

Before publishing packages to npm, verify that the unscoped package names are available and owned by the publishing account. `pnpm pack:check` creates tarballs in `.packs/` for inspection; it does not publish them.
