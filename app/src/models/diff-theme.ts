export type DiffTheme = 'default' | 'catppuccin'

export const standardDiffTheme: DiffTheme = 'default'
export const catppuccinDiffTheme: DiffTheme = 'catppuccin'
export const defaultDiffTheme: DiffTheme = catppuccinDiffTheme

export const availableDiffThemes: ReadonlyArray<DiffTheme> = [
  standardDiffTheme,
  catppuccinDiffTheme,
]

const diffThemeLabels: Readonly<Record<DiffTheme, string>> = {
  default: 'Default',
  catppuccin: 'Catppuccin (matches app theme)',
}

export function parseDiffTheme(value: string | null): DiffTheme {
  return availableDiffThemes.includes(value as DiffTheme)
    ? (value as DiffTheme)
    : defaultDiffTheme
}

export function getDiffThemeLabel(theme: DiffTheme): string {
  return diffThemeLabels[theme]
}
