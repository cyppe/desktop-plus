import assert from 'node:assert'
import { describe, it } from 'node:test'

import {
  catppuccinDiffTheme,
  defaultDiffTheme,
  getDiffThemeLabel,
  parseDiffTheme,
  standardDiffTheme,
} from '../../src/models/diff-theme'

describe('diff theme', () => {
  it('parses supported persisted themes', () => {
    assert.strictEqual(parseDiffTheme('default'), standardDiffTheme)
    assert.strictEqual(parseDiffTheme('catppuccin'), catppuccinDiffTheme)
  })

  it('falls back to the default for missing and unknown values', () => {
    assert.strictEqual(parseDiffTheme(null), catppuccinDiffTheme)
    assert.strictEqual(parseDiffTheme('unknown'), catppuccinDiffTheme)
    assert.strictEqual(defaultDiffTheme, catppuccinDiffTheme)
  })

  it('describes the adaptive Catppuccin palette', () => {
    assert.strictEqual(
      getDiffThemeLabel(catppuccinDiffTheme),
      'Catppuccin (matches app theme)'
    )
  })
})
