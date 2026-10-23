<script setup lang="ts">
import { computed, ref } from 'vue'
import { useFieldArray, useForm, useFormState } from 'formily-vue'
import { email, formOptions, required, username, type DemoValues } from './shared.js'
import VueTextField from './vue-text-field.vue'
import VueItemField from './vue-item-field.vue'
import vueAppSource from './vue-app.vue?raw'
import vueTextFieldSource from './vue-text-field.vue?raw'
import vueItemFieldSource from './vue-item-field.vue?raw'
import vueMainSource from './vue-main.ts?raw'
import sharedSource from './shared.ts?raw'

const sourceFiles = [
  { name: 'vue-app.vue', source: vueAppSource },
  { name: 'vue-text-field.vue', source: vueTextFieldSource },
  { name: 'vue-item-field.vue', source: vueItemFieldSource },
  { name: 'shared.ts', source: sharedSource },
  { name: 'vue-main.ts', source: vueMainSource },
]
const selectedSource = ref(0)
const copyStatus = ref('Copy code')
const currentSource = computed(() => sourceFiles[selectedSource.value]!)

async function copySource() {
  try {
    await navigator.clipboard.writeText(currentSource.value.source)
    copyStatus.value = 'Copied'
  } catch {
    copyStatus.value = 'Copy unavailable'
  }
}

function selectSource(index: number) {
  selectedSource.value = index
  copyStatus.value = 'Copy code'
}

const form = useForm(formOptions)
const state = useFormState(form)
const { items, append, remove, move } = useFieldArray<DemoValues, { label: string }>(form, 'items')
const result = ref('')

async function submit() {
  const outcome = await form.submit(async (values) => {
    await new Promise((resolve) => setTimeout(resolve, 300))
    return values
  })
  result.value = outcome.ok ? JSON.stringify(outcome.data, null, 2) : 'Please fix the highlighted fields.'
}

function reset() {
  form.reset()
  result.value = ''
}
</script>

<template>
  <main class="page-shell">
    <header class="page-header"><a href="./index.html" class="back-link">← All demos</a><span class="framework-tag">Vue 3</span></header>
    <div class="hero"><span class="eyebrow">Framework adapter / 02</span><h1>Build a better form.</h1>
      <p>Try nested values, field arrays, async validation, and submission through the Vue 3 composables adapter.</p></div>
    <div class="demo-grid">
      <form class="form-card" novalidate @submit.prevent="submit">
        <div class="section-heading"><span>01</span><div><h2>Profile details</h2><p>Each field subscribes to its own state.</p></div></div>
        <div class="field-grid">
          <VueTextField :form="form" path="name" label="Full name" :validate="required" />
          <VueTextField :form="form" path="contact.email" label="Email address" :validate="email" />
        </div>
        <VueTextField :form="form" path="username" label="Username" :validate="username" hint="Try “taken” to see async validation." />
        <div class="section-heading array-heading"><span>02</span><div><h2>Project items</h2><p>Add, remove, and reorder entries.</p></div></div>
        <div class="array-list"><VueItemField v-for="item in items" :key="item.key" :form="form" :index="item.index" @remove="remove(item.index)" /></div>
        <div class="array-actions"><button type="button" class="quiet-button" @click="append({ label: '' })">+ Add item</button>
          <button v-if="items.length > 1" type="button" class="quiet-button" @click="move(items.length - 1, 0)">Move last to first</button></div>
        <p v-if="state.formError" class="error" role="alert">{{ state.formError }}</p>
        <div class="form-actions"><button type="submit" :disabled="state.isSubmitting">{{ state.isSubmitting ? 'Submitting…' : 'Submit form' }}</button>
          <button type="button" class="reset-button" @click="reset">Reset</button></div>
      </form>
      <aside class="state-card"><div class="state-top"><span class="eyebrow">Live form state</span><span :class="['status', { dirty: state.isDirty }]">{{ state.isDirty ? 'Unsaved changes' : 'Pristine' }}</span></div>
        <dl><div><dt>Submissions</dt><dd>{{ state.submitCount }}</dd></div><div><dt>Validating</dt><dd>{{ state.isValidating ? 'Yes' : 'No' }}</dd></div><div><dt>Errors</dt><dd>{{ Object.keys(state.errors).length }}</dd></div></dl>
        <h3>Values</h3><pre>{{ JSON.stringify(state.values, null, 2) }}</pre>
        <template v-if="result"><h3>Submission result</h3><pre data-testid="submission-result">{{ result }}</pre></template>
      </aside>
    </div>
    <section class="source-card" aria-labelledby="vue-source-title">
      <div class="source-heading">
        <div><span class="eyebrow">Explore the implementation</span><h2 id="vue-source-title">Source code</h2>
          <p>These files are loaded directly from the Vue 3 demo source.</p></div>
        <button class="copy-button" type="button" aria-live="polite" @click="copySource">{{ copyStatus }}</button>
      </div>
      <div class="source-files" aria-label="Source files">
        <button v-for="(file, index) in sourceFiles" :key="file.name" type="button" :aria-pressed="selectedSource === index"
          @click="selectSource(index)">{{ file.name }}</button>
      </div>
      <pre class="source-code"><code>{{ currentSource.source }}</code></pre>
    </section>
  </main>
</template>
