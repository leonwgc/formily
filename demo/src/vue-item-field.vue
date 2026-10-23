<script setup lang="ts">
import { computed } from 'vue'
import { useField } from 'formily-vue'
import type { Form } from 'formily-core'
import { required, type DemoValues } from './shared.js'

const props = defineProps<{ form: Form<DemoValues>; index: number }>()
const emit = defineEmits<{ remove: [] }>()
const path = computed(() => `items.${props.index}.label`)
const { value, error, onChange, onBlur } = useField<DemoValues, string>(props.form, path, { validate: required })
const id = computed(() => `vue-item-${props.index}`)
</script>

<template>
  <div class="array-row">
    <div class="field">
      <label :for="id">Item {{ index + 1 }}</label>
      <input :id="id" :value="value ?? ''" :aria-invalid="!!error"
        :aria-describedby="error ? `${id}-error` : undefined"
        @input="onChange(($event.target as HTMLInputElement).value)" @blur="onBlur" />
      <small v-if="error" :id="`${id}-error`" class="error" role="alert">{{ error }}</small>
    </div>
    <button type="button" class="icon-button" :aria-label="`Remove item ${index + 1}`" @click="emit('remove')">×</button>
  </div>
</template>
