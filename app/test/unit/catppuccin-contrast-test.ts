import assert from 'node:assert'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it } from 'node:test'

type CssVariables = ReadonlyMap<string, string>

const themeSource = readFileSync(
  resolve(__dirname, '../../styles/themes/_catppuccin.scss'),
  'utf8'
)

const [lightSource, darkSource] = themeSource.split(
  'body.theme-dark #desktop-app-chrome.diff-theme-catppuccin'
)

assert.ok(darkSource !== undefined, 'the adaptive dark palette must exist')

function parseVariables(source: string): Map<string, string> {
  const variables = new Map<string, string>()
  const declaration = /--([a-z0-9-]+):\s*([^;]+);/g

  for (const match of source.matchAll(declaration)) {
    variables.set(match[1], match[2].trim())
  }

  return variables
}

function resolveHexColor(variables: CssVariables, name: string): string {
  const visited = new Set<string>()
  let currentName = name

  while (!visited.has(currentName)) {
    visited.add(currentName)
    const value = variables.get(currentName)
    assert.ok(value !== undefined, `missing --${currentName}`)

    const variableReference = value.match(/^var\(--([a-z0-9-]+)\)$/)
    if (variableReference !== null) {
      currentName = variableReference[1]
      continue
    }

    assert.match(value, /^#[0-9a-f]{6}$/i, `--${currentName} is not a color`)
    return value
  }

  throw new Error(`circular CSS variable reference from --${name}`)
}

function luminance(hex: string): number {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)
    ?.map(channel => parseInt(channel, 16) / 255)

  assert.ok(channels !== undefined)

  const linear = channels.map(channel =>
    channel <= 0.04045
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4)
  )

  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722
}

function contrastRatio(foreground: string, background: string): number {
  const lighter = Math.max(luminance(foreground), luminance(background))
  const darker = Math.min(luminance(foreground), luminance(background))
  return (lighter + 0.05) / (darker + 0.05)
}

function hexChannels(hex: string): ReadonlyArray<number> {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)
    ?.map(channel => parseInt(channel, 16))

  assert.ok(channels !== undefined)
  return channels
}

function rgbaComposite(
  foreground: string,
  background: string,
  alpha: number
): string {
  const foregroundChannels = hexChannels(foreground)
  const backgroundChannels = hexChannels(background)

  return `#${foregroundChannels
    .map((channel, index) =>
      Math.round(channel * alpha + backgroundChannels[index] * (1 - alpha))
        .toString(16)
        .padStart(2, '0')
    )
    .join('')}`
}

const sharedVariables = parseVariables(lightSource)
const palettes = new Map<string, CssVariables>([
  ['Latte', sharedVariables],
  ['Mocha', new Map([...sharedVariables, ...parseVariables(darkSource)])],
])

const readablePairs: ReadonlyArray<
  readonly [label: string, foreground: string, background: string]
> = [
  ['body text', 'text-color', 'background-color'],
  ['secondary text', 'text-secondary-color', 'background-color'],
  ['input placeholder', 'box-placeholder-color', 'box-background-color'],
  [
    'diff line number',
    'diff-line-number-color',
    'diff-gutter-background-color',
  ],
  ['syntax comment', 'syntax-comment-color', 'diff-background-color'],
  ['primary button', 'button-text-color', 'button-background'],
  ['primary button hover', 'button-text-color', 'button-hover-background'],
  [
    'disabled primary button',
    'button-disabled-text-color',
    'button-disabled-background',
  ],
  ['outlined New pill', 'call-to-action-bubble-color', 'background-color'],
]

describe('Catppuccin application contrast', () => {
  for (const [paletteName, variables] of palettes) {
    it(`${paletteName} keeps high-use text at WCAG AA contrast`, () => {
      for (const [label, foregroundName, backgroundName] of readablePairs) {
        const foreground = resolveHexColor(variables, foregroundName)
        const background = resolveHexColor(variables, backgroundName)
        const ratio = contrastRatio(foreground, background)

        assert.ok(
          ratio >= 4.5,
          `${label} is ${ratio.toFixed(2)}:1 in ${paletteName}`
        )
      }
    })

    it(`${paletteName} keeps changed-line numbers readable over tinted gutters`, () => {
      const lineNumber = resolveHexColor(
        variables,
        'diff-changed-line-number-color'
      )
      const base = resolveHexColor(variables, 'ctp-base')

      for (const [label, tintName] of [
        ['added', 'ctp-green'],
        ['deleted', 'ctp-red'],
      ] as const) {
        const gutter = rgbaComposite(
          resolveHexColor(variables, tintName),
          base,
          0.18
        )
        const ratio = contrastRatio(lineNumber, gutter)

        assert.ok(
          ratio >= 4.5,
          `${label} line number is ${ratio.toFixed(2)}:1 in ${paletteName}`
        )
      }
    })
  }
})
