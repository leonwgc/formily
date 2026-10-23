import { expect, test } from '@playwright/test'

for (const framework of ['react', 'vue']) {
  test(`${framework} demo validates, edits arrays, submits, and resets`, async ({ page }) => {
    await page.goto(`/${framework}.html`)
    await expect(page.getByRole('heading', { name: 'Build a better form.' })).toBeVisible()
    const source = page.getByRole('region', { name: 'Source code' })
    const mainFile = framework === 'react' ? 'react-app.tsx' : 'vue-app.vue'
    await expect(source.getByRole('button', { name: mainFile })).toHaveAttribute('aria-pressed', 'true')
    await source.getByRole('button', { name: 'shared.ts' }).click()
    await expect(source.locator('pre')).toContainText('export const initialValues')
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
    await source.getByRole('button', { name: 'Copy code' }).click()
    await expect(source.getByRole('button', { name: 'Copied' })).toBeVisible()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('export const initialValues')
    await source.getByRole('button', { name: mainFile }).click()
    await expect(source.getByRole('button', { name: mainFile })).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', { name: 'Submit form' }).click()
    await expect(page.getByText('Please fix the highlighted fields.')).toBeVisible()

    await page.getByLabel('Full name').fill('Ada Lovelace')
    await page.getByLabel('Email address').fill('ada@example.com')
    await page.getByLabel('Username').fill('taken')
    await page.getByLabel('Username').blur()
    await expect(page.getByText('This username is already taken.')).toBeVisible()
    await page.getByLabel('Username').fill('ada')
    await expect(page.getByText('This username is already taken.')).toBeHidden()

    await page.getByRole('button', { name: 'Add item' }).click()
    await page.getByRole('textbox', { name: 'Item 1' }).fill('Research')
    await page.getByRole('textbox', { name: 'Item 2' }).fill('Review')
    await page.getByRole('button', { name: 'Move last to first' }).click()
    await expect(page.getByRole('textbox', { name: 'Item 1' })).toHaveValue('Review')
    await page.getByRole('button', { name: 'Submit form' }).click()
    await expect(page.getByTestId('submission-result')).toContainText('Ada Lovelace')
    await expect(page.getByTestId('submission-result')).toContainText('Review')

    await page.getByRole('button', { name: 'Reset' }).click()
    await expect(page.getByLabel('Full name')).toHaveValue('')
    await expect(page.getByRole('textbox', { name: 'Item 1' })).toHaveValue('')
    await expect(page.getByRole('textbox', { name: 'Item 2' })).toHaveCount(0)
  })
}
