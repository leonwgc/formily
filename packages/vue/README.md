# formily-vue

Vue 3 composables for `formily-core`. Vue 3.3 or newer is required as a peer dependency.

```vue
<script setup lang="ts">
import { useForm, useTextField } from 'formily-vue'

const form = useForm({ initialValues: { name: '' } })
const name = useTextField(form, 'name', { validate: (value) => value ? undefined : 'Required' })
</script>

<template>
  <form @submit.prevent="form.submit(console.log)">
    <label for="name">Name</label>
    <input id="name" v-model="name.model" name="name" @blur="name.onBlur" :aria-invalid="!!name.error" />
    <span v-if="name.error" role="alert">{{ name.error }}</span>
    <button>Submit</button>
  </form>
</template>
```

`useTextField` provides a writable model for text inputs and textareas. Use `useField` for other controls and `useFieldArray` for repeatable rows. See the [repository README](https://github.com/leonwgc/formily#readme) for validation, state, and array behavior.
