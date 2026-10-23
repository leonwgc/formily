<script setup lang="ts">
import { useField } from 'formily-vue'
import type { FieldValidator, Form } from 'formily-core'
import type { DemoValues } from './shared.js'

const props = defineProps<{
  form: Form<DemoValues>
  path: string
  label: string
  validate: FieldValidator<DemoValues>
  hint?: string
}>()
const field = useField<DemoValues, string>(props.form, () => props.path, { validate: props.validate })
const { value, error, onChange, onBlur } = field
const id = `vue-${props.path.replace(/[^a-z\d]/gi, '-')}`
</script>

<template>
  <div class="field">
    <label :for="id">{{ label }}</label>
    <input :id="id" :name="path" :value="value ?? ''" :aria-invalid="!!error"
      :aria-describedby="error ? `${id}-error` : hint ? `${id}-hint` : undefined"
      @input="onChange(($event.target as HTMLInputElement).value)" @blur="onBlur" />
    <small v-if="error" :id="`${id}-error`" class="error" role="alert">{{ error }}</small>
    <small v-else-if="hint" :id="`${id}-hint`" class="hint">{{ hint }}</small>
  </div>
</template>
