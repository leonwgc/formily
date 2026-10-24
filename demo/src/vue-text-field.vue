<script setup lang="ts">
import { useTextField } from 'formily-vue'
import type { FieldValidator, Form } from 'formily-core'
import type { DemoValues } from './shared.js'

const props = defineProps<{
  form: Form<DemoValues>
  path: string
  label: string
  validate: FieldValidator<DemoValues>
  hint?: string
}>()
const { model, error, onBlur } = useTextField(props.form, () => props.path, { validate: props.validate })
const id = `vue-${props.path.replace(/[^a-z\d]/gi, '-')}`
</script>

<template>
  <div class="field">
    <label :for="id">{{ label }}</label>
    <input :id="id" v-model="model" :name="path" :aria-invalid="!!error"
      :aria-describedby="error ? `${id}-error` : hint ? `${id}-hint` : undefined"
      @blur="onBlur" />
    <small v-if="error" :id="`${id}-error`" class="error" role="alert">{{ error }}</small>
    <small v-else-if="hint" :id="`${id}-hint`" class="hint">{{ hint }}</small>
  </div>
</template>
