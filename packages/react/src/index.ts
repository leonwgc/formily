import { useCallback, useEffect, useRef, useSyncExternalStore, type ChangeEvent } from 'react'
import { createForm, type FieldOptions, type FieldState, type Form, type FormOptions } from 'formily-core'

export function useForm<TValues extends object>(options: FormOptions<TValues>): Form<TValues> {
  const form = useRef<Form<TValues> | null>(null)
  if (!form.current) form.current = createForm(options)
  return form.current
}

export function useFormState<TValues extends object>(form: Form<TValues>) {
  return useSyncExternalStore(form.subscribe, form.getState, form.getState)
}

export interface ReactField<TValue> extends FieldState<TValue> {
  setValue(value: TValue): void
  onChange(value: TValue): void
  onBlur(): void
}

export function useField<TValues extends object, TValue = unknown>(
  form: Form<TValues>,
  path: string,
  options: FieldOptions<TValues> = {},
): ReactField<TValue> {
  const optionsRef = useRef(options)
  optionsRef.current = options
  useEffect(() => form.register(path, {
    validate: (value, values) => optionsRef.current.validate?.(value, values),
    validateOn: optionsRef.current.validateOn,
  }), [form, path, options.validateOn])
  const subscribe = useCallback((listener: () => void) => form.subscribeField(path, listener), [form, path])
  const getSnapshot = useCallback(() => form.getFieldState<TValue>(path), [form, path])
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const setValue = useCallback((value: TValue) => form.setValue(path, value), [form, path])
  const onBlur = useCallback(() => form.blur(path), [form, path])
  return { ...state, setValue, onChange: setValue, onBlur }
}

export function useTextField<TValues extends object>(
  form: Form<TValues>,
  path: string,
  options: FieldOptions<TValues> = {},
) {
  const field = useField<TValues, string>(form, path, options)
  return {
    ...field,
    inputProps: {
      name: path,
      value: field.value ?? '',
      onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => field.onChange(event.target.value),
      onBlur: field.onBlur,
    },
  }
}

export function useFieldArray<TValues extends object, TValue = unknown>(form: Form<TValues>, path: string) {
  useFormState(form)
  return {
    items: form.getArrayItems<TValue>(path),
    append: (value: TValue) => form.append(path, value),
    insert: (index: number, value: TValue) => form.insert(path, index, value),
    remove: (index: number) => form.remove(path, index),
    move: (from: number, to: number) => form.move(path, from, to),
  }
}

export type { Form, FormOptions, FieldOptions, FieldState } from 'formily-core'
