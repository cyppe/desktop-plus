import { readFile } from 'fs/promises'
import { homedir } from 'os'
import * as Path from 'path'

/**
 * A repository list kept outside the app (for example by dotfiles), read from
 * `managed-repositories.json` in the user data directory at startup:
 *
 *   { "repositories": [
 *       { "path": "~/Projects/app", "group": "Work", "pinned": true } ] }
 *
 * Listed repositories that exist on disk and are not in the app yet are added
 * with their group and pin. A repository that is already in the app only gets
 * the listed group when it has no group yet, so groups changed by hand stay.
 * Nothing is ever removed.
 */
export const ManagedRepositoriesFileName = 'managed-repositories.json'

export interface IManagedRepository {
  readonly path: string
  readonly group: string | null
  readonly pinned: boolean
}

/** What to change, given the managed list and the repositories in the app. */
export interface IManagedRepositoriesPlan {
  /** Managed paths not in the app yet. */
  readonly toAdd: ReadonlyArray<string>
  /** Group name -> paths to put in that group. */
  readonly groups: ReadonlyMap<string, ReadonlyArray<string>>
  /** Paths to pin (newly added ones listed with `pinned: true`). */
  readonly toPin: ReadonlyArray<string>
}

function expandPath(path: string, home: string): string {
  if (path === '~') {
    return home
  }
  if (path.startsWith('~/')) {
    return Path.join(home, path.slice(2))
  }
  return Path.resolve(path)
}

/** Parses the file's text; throws with a readable message when it is malformed. */
export function parseManagedRepositories(
  text: string,
  home: string = homedir()
): ReadonlyArray<IManagedRepository> {
  const data: unknown = JSON.parse(text)
  const list =
    typeof data === 'object' && data !== null
      ? (data as { repositories?: unknown }).repositories
      : undefined
  if (!Array.isArray(list)) {
    throw new Error(
      `${ManagedRepositoriesFileName}: "repositories" must be an array`
    )
  }

  return list.map((entry: unknown, index: number) => {
    const where = `${ManagedRepositoriesFileName}: repositories[${index}]`
    if (typeof entry !== 'object' || entry === null) {
      throw new Error(`${where} must be an object`)
    }
    const { path, group, pinned } = entry as {
      path?: unknown
      group?: unknown
      pinned?: unknown
    }
    if (typeof path !== 'string' || path.trim() === '') {
      throw new Error(`${where}.path must be a non-empty string`)
    }
    if (group !== undefined && group !== null && typeof group !== 'string') {
      throw new Error(`${where}.group must be a string or null`)
    }
    if (pinned !== undefined && typeof pinned !== 'boolean') {
      throw new Error(`${where}.pinned must be true or false`)
    }
    const groupName = typeof group === 'string' ? group.trim() : ''
    return {
      path: expandPath(path.trim(), home),
      group: groupName === '' ? null : groupName,
      pinned: pinned === true,
    }
  })
}

/**
 * Reads the managed list from the user data directory. Returns null when the
 * file does not exist; any other read or parse error is thrown.
 */
export async function readManagedRepositories(
  userDataPath: string
): Promise<ReadonlyArray<IManagedRepository> | null> {
  let text: string
  try {
    text = await readFile(
      Path.join(userDataPath, ManagedRepositoriesFileName),
      'utf8'
    )
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
      return null
    }
    throw e
  }
  return parseManagedRepositories(text)
}

/**
 * Decides what to add, group and pin.
 *
 * @param managed   The managed list, with paths resolved to repository roots,
 *                  already filtered to repositories that exist on disk.
 * @param existing  Path -> current group name of each repository in the app.
 */
export function planManagedRepositories(
  managed: ReadonlyArray<IManagedRepository>,
  existing: ReadonlyMap<string, string | null>
): IManagedRepositoriesPlan {
  const toAdd = new Array<string>()
  const toPin = new Array<string>()
  const groups = new Map<string, Array<string>>()
  const seen = new Set<string>()

  for (const repository of managed) {
    if (seen.has(repository.path)) {
      continue
    }
    seen.add(repository.path)

    const isNew = !existing.has(repository.path)
    if (isNew) {
      toAdd.push(repository.path)
      if (repository.pinned) {
        toPin.push(repository.path)
      }
    }

    const currentGroup = isNew ? null : existing.get(repository.path) ?? null
    if (repository.group !== null && currentGroup === null) {
      const paths = groups.get(repository.group) ?? []
      paths.push(repository.path)
      groups.set(repository.group, paths)
    }
  }

  return { toAdd, groups, toPin }
}
