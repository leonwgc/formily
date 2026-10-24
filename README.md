# Formily

A headless TypeScript form library with a framework-independent core and small React and Vue 3 adapters.

## Packages

| Package | Purpose |
| --- | --- |
| `formily-core` | Form state, nested paths, validation, submission, and field arrays |
| `formily-react` | React hooks based on `useSyncExternalStore` |
| `formily-vue` | Vue 3 composables based on refs and computed values |

All three packages are ESM-only and ship TypeScript declarations. React and Vue are peer dependencies of their respective adapters. These packages have their own API and are not drop-in replacements for Ant Design Form, react-hook-form, or the existing `@formily/*` packages.

## Quick start: React

```tsx
import { useForm, useFormState, useTextField } from 'formily-react'

function Example() {
  const form = useForm({ initialValues: { name: '' } })
  const name = useTextField(form, 'name', {
    validate: (value) => value ? undefined : 'Required',
  })
  const state = useFormState(form)

  return <form onSubmit={(event) => { event.preventDefault(); void form.submit(console.log) }}>
    <label htmlFor="name">Name</label>
    <input id="name" {...name.inputProps} aria-invalid={!!name.error}
      aria-describedby={name.error ? 'name-error' : undefined} />
    {name.error && <span id="name-error" role="alert">{name.error}</span>}
    <button disabled={state.isSubmitting}>Submit</button>
  </form>
}
```

`inputProps` supplies `name`, a controlled string `value`, and change/blur handlers. It works with text inputs and textareas. Use `useField` for other value types or custom controls.

## Quick start: Vue 3

```vue
<script setup lang="ts">
import { useForm, useFormState, useTextField } from 'formily-vue'

const form = useForm({ initialValues: { name: '' } })
const name = useTextField(form, 'name', {
  validate: (value) => value ? undefined : 'Required',
})
const state = useFormState(form)
</script>

<template>
  <form @submit.prevent="form.submit(console.log)">
    <label for="name">Name</label>
    <input id="name" v-model="name.model" name="name" @blur="name.onBlur"
      :aria-invalid="!!name.error" :aria-describedby="name.error ? 'name-error' : undefined" />
    <span v-if="name.error" id="name-error" role="alert">{{ name.error }}</span>
    <button :disabled="state.isSubmitting">Submit</button>
  </form>
</template>
```

`model` is a writable ref for `v-model`; `onBlur` marks the field touched and runs blur validation. `useField` remains available for other value types or custom controls. Both adapters expose `useFieldArray` for stable-key array rendering. The [React demo](demo/src/react-app.tsx) and [Vue demo](demo/src/vue-app.vue) show nested fields, arrays, async validation, submission, and their source code.

## Core API and validation

```ts
import { createForm } from 'formily-core'

const form = createForm({ initialValues: { user: { email: '' }, items: [{ label: '' }] } })
const unregister = form.register('user.email', {
  validate: (value) => String(value).includes('@') ? undefined : 'Invalid email',
})

form.setValue('user.email', 'hello@example.com')
form.append('items', { label: 'First' })
const result = await form.submit(async (values) => values)
if (!result.ok) console.log(result.errors, result.formError)
unregister()
```

`register` returns an unregister function. Unregistering preserves the value; `removeValue(path)` removes it. Field paths accept dot notation and numeric brackets, such as `items.0.label` and `items[0].label`. Deep string paths are checked at runtime, but are not fully checked by TypeScript.

Fields validate on submit and blur, then on later changes. Set `validateOn: 'change'` or `'submit'` to change that behavior. Validators may be synchronous or asynchronous; stale async field results are discarded. `submit` returns `{ ok: true, data }` or `{ ok: false, errors, formError }`. Handler exceptions reject the promise, and concurrent calls share one pending submission.

`initialValues` is the dirty-state baseline. `setInitialValues(values, { replaceValues: true })` also replaces current values. `reset()` restores the baseline and clears errors, touched state, and submit count. Field-array operations keep item keys, errors, and touched state associated with the item as it moves.

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
