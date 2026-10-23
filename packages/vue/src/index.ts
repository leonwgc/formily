import { computed, onScopeDispose, shallowRef, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { createForm, type FieldOptions, type Form, type FormOptions } from 'formily-core'

export function useForm<TValues extends object>(options: FormOptions<TValues>): Form<TValues> {
  return createForm(options)
}

export function useFormState<TValues extends object>(form: Form<TValues>) {
  const state = shallowRef(form.getState())
  const unsubscribe = form.subscribe(() => { state.value = form.getState() })
  onScopeDispose(unsubscribe)
  return state
}

export function useField<TValues extends object, TValue = unknown>(
  form: Form<TValues>,
  path: MaybeRefOrGetter<string>,
  options: FieldOptions<TValues> = {},
) {
  const state = shallowRef(form.getFieldState<TValue>(toValue(path)))
  let unregister = () => {}
  let unsubscribe = () => {}
  watch(() => toValue(path), (current) => {
    unregister()
    unsubscribe()
    state.value = form.getFieldState<TValue>(current)
    unregister = form.register(current, options)
    unsubscribe = form.subscribeField(current, () => { state.value = form.getFieldState<TValue>(current) })
  }, { immediate: true })
  onScopeDispose(() => { unregister(); unsubscribe() })
  return {
    value: computed(() => state.value.value),
    error: computed(() => state.value.error),
    isTouched: computed(() => state.value.isTouched),
    isDirty: computed(() => state.value.isDirty),
    isValidating: computed(() => state.value.isValidating),
    setValue: (value: TValue) => form.setValue(toValue(path), value),
    onChange: (value: TValue) => form.setValue(toValue(path), value),
    onBlur: () => form.blur(toValue(path)),
  }
}

export function useFieldArray<TValues extends object, TValue = unknown>(form: Form<TValues>, path: string) {
  const state = useFormState(form)
  return {
    items: computed(() => { void state.value; return form.getArrayItems<TValue>(path) }),
    append: (value: TValue) => form.append(path, value),
    insert: (index: number, value: TValue) => form.insert(path, index, value),
    remove: (index: number) => form.remove(path, index),
    move: (from: number, to: number) => form.move(path, from, to),
  }
}

export type { Form, FormOptions, FieldOptions } from 'formily-core'
