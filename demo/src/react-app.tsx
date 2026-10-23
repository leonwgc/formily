import { useState, type FormEvent } from 'react'
import { useField, useFieldArray, useForm, useFormState } from 'formily-react'
import type { FieldOptions, Form } from 'formily-core'
import { email, formOptions, required, username, type DemoValues } from './shared.js'
import reactAppSource from './react-app.tsx?raw'
import reactMainSource from './react-main.tsx?raw'
import sharedSource from './shared.ts?raw'

const sourceFiles = [
  { name: 'react-app.tsx', source: reactAppSource },
  { name: 'shared.ts', source: sharedSource },
  { name: 'react-main.tsx', source: reactMainSource },
]

function SourceViewer() {
  const [selected, setSelected] = useState(0)
  const [copyStatus, setCopyStatus] = useState('Copy code')
  const current = sourceFiles[selected]!

  async function copySource() {
    try {
      await navigator.clipboard.writeText(current.source)
      setCopyStatus('Copied')
    } catch {
      setCopyStatus('Copy unavailable')
    }
  }

  return <section className="source-card" aria-labelledby="react-source-title">
    <div className="source-heading">
      <div><span className="eyebrow">Explore the implementation</span><h2 id="react-source-title">Source code</h2>
        <p>These files are loaded directly from the React demo source.</p></div>
      <button className="copy-button" type="button" onClick={copySource} aria-live="polite">{copyStatus}</button>
    </div>
    <div className="source-files" aria-label="Source files">
      {sourceFiles.map((file, index) => <button key={file.name} type="button" aria-pressed={selected === index}
        onClick={() => { setSelected(index); setCopyStatus('Copy code') }}>{file.name}</button>)}
    </div>
    <pre className="source-code"><code>{current.source}</code></pre>
  </section>
}

function TextField({ form, path, label, validate, hint }: {
  form: Form<DemoValues>
  path: string
  label: string
  validate: NonNullable<FieldOptions<DemoValues>['validate']>
  hint?: string
}) {
  const field = useField<DemoValues, string>(form, path, { validate })
  const id = `react-${path.replace(/[^a-z\d]/gi, '-')}`
  return <div className="field">
    <label htmlFor={id}>{label}</label>
    <input id={id} name={path} value={field.value ?? ''}
      aria-invalid={!!field.error} aria-describedby={field.error ? `${id}-error` : hint ? `${id}-hint` : undefined}
      onChange={(event) => field.onChange(event.target.value)} onBlur={field.onBlur} />
    {field.error && <small className="error" id={`${id}-error`} role="alert">{field.error}</small>}
    {!field.error && hint && <small className="hint" id={`${id}-hint`}>{hint}</small>}
  </div>
}

function ItemField({ form, index, onRemove }: { form: Form<DemoValues>; index: number; onRemove: () => void }) {
  const field = useField<DemoValues, string>(form, `items.${index}.label`, { validate: required })
  const id = `react-item-${index}`
  return <div className="array-row">
    <div className="field">
      <label htmlFor={id}>Item {index + 1}</label>
      <input id={id} value={field.value ?? ''} aria-invalid={!!field.error}
        aria-describedby={field.error ? `${id}-error` : undefined}
        onChange={(event) => field.onChange(event.target.value)} onBlur={field.onBlur} />
      {field.error && <small className="error" id={`${id}-error`} role="alert">{field.error}</small>}
    </div>
    <button className="icon-button" type="button" aria-label={`Remove item ${index + 1}`} onClick={onRemove}>×</button>
  </div>
}

export function ReactApp() {
  const form = useForm(formOptions)
  const state = useFormState(form)
  const items = useFieldArray<DemoValues, { label: string }>(form, 'items')
  const [result, setResult] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    const outcome = await form.submit(async (values) => {
      await new Promise((resolve) => setTimeout(resolve, 300))
      return values
    })
    setResult(outcome.ok ? JSON.stringify(outcome.data, null, 2) : 'Please fix the highlighted fields.')
  }

  return <main className="page-shell">
    <header className="page-header">
      <a href="./index.html" className="back-link">← All demos</a>
      <span className="framework-tag">React</span>
    </header>
    <div className="hero"><span className="eyebrow">Framework adapter / 01</span><h1>Build a better form.</h1>
      <p>Try nested values, field arrays, async validation, and submission through the React hooks adapter.</p></div>
    <div className="demo-grid">
      <form className="form-card" onSubmit={submit} noValidate>
        <div className="section-heading"><span>01</span><div><h2>Profile details</h2><p>Each field subscribes to its own state.</p></div></div>
        <div className="field-grid">
          <TextField form={form} path="name" label="Full name" validate={required} />
          <TextField form={form} path="contact.email" label="Email address" validate={email} />
        </div>
        <TextField form={form} path="username" label="Username" validate={username} hint="Try “taken” to see async validation." />
        <div className="section-heading array-heading"><span>02</span><div><h2>Project items</h2><p>Add, remove, and reorder entries.</p></div></div>
        <div className="array-list">{items.items.map((item) =>
          <ItemField key={item.key} form={form} index={item.index} onRemove={() => items.remove(item.index)} />)}</div>
        <div className="array-actions"><button type="button" className="quiet-button" onClick={() => items.append({ label: '' })}>+ Add item</button>
          {items.items.length > 1 && <button type="button" className="quiet-button" onClick={() => items.move(items.items.length - 1, 0)}>Move last to first</button>}</div>
        {state.formError && <p className="error" role="alert">{state.formError}</p>}
        <div className="form-actions"><button type="submit" disabled={state.isSubmitting}>{state.isSubmitting ? 'Submitting…' : 'Submit form'}</button>
          <button type="button" className="reset-button" onClick={() => { form.reset(); setResult('') }}>Reset</button></div>
      </form>
      <aside className="state-card"><div className="state-top"><span className="eyebrow">Live form state</span><span className={state.isDirty ? 'status dirty' : 'status'}>{state.isDirty ? 'Unsaved changes' : 'Pristine'}</span></div>
        <dl><div><dt>Submissions</dt><dd>{state.submitCount}</dd></div><div><dt>Validating</dt><dd>{state.isValidating ? 'Yes' : 'No'}</dd></div><div><dt>Errors</dt><dd>{Object.keys(state.errors).length}</dd></div></dl>
        <h3>Values</h3><pre>{JSON.stringify(state.values, null, 2)}</pre>
        {result && <><h3>Submission result</h3><pre data-testid="submission-result">{result}</pre></>}
      </aside>
    </div>
    <SourceViewer />
  </main>
}
