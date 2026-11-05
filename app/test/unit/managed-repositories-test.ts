import { describe, it } from 'node:test'
import assert from 'node:assert'
import { mkdtemp, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import * as Path from 'path'
import {
  ManagedRepositoriesFileName,
  parseManagedRepositories,
  planManagedRepositories,
  readManagedRepositories,
} from '../../src/lib/managed-repositories'

describe('managed-repositories', () => {
  describe('parseManagedRepositories', () => {
    it('expands ~ and defaults group and pinned', () => {
      const parsed = parseManagedRepositories(
        JSON.stringify({
          repositories: [
            { path: '~/Projects/app', group: 'Work', pinned: true },
            { path: '/srv/repo' },
            { path: '~/notes', group: '  ' },
          ],
        }),
        '/home/me'
      )
      assert.deepStrictEqual(parsed, [
        { path: '/home/me/Projects/app', group: 'Work', pinned: true },
        { path: '/srv/repo', group: null, pinned: false },
        { path: '/home/me/notes', group: null, pinned: false },
      ])
    })

    it('rejects a file without a repositories array', () => {
      assert.throws(
        () => parseManagedRepositories('{}'),
        /"repositories" must be an array/
      )
    })

    it('names the entry that is malformed', () => {
      assert.throws(
        () =>
          parseManagedRepositories(
            JSON.stringify({ repositories: [{ path: '/a' }, { group: 'x' }] })
          ),
        /repositories\[1\]\.path/
      )
      assert.throws(
        () =>
          parseManagedRepositories(
            JSON.stringify({ repositories: [{ path: '/a', pinned: 'yes' }] })
          ),
        /repositories\[0\]\.pinned/
      )
    })
  })

  describe('readManagedRepositories', () => {
    it('returns null when the file does not exist', async () => {
      const dir = await mkdtemp(Path.join(tmpdir(), 'managed-repositories-'))
      try {
        assert.strictEqual(await readManagedRepositories(dir), null)
      } finally {
        await rm(dir, { recursive: true, force: true })
      }
    })

    it('reads and parses the file in the user data directory', async () => {
      const dir = await mkdtemp(Path.join(tmpdir(), 'managed-repositories-'))
      try {
        await writeFile(
          Path.join(dir, ManagedRepositoriesFileName),
          JSON.stringify({
            repositories: [{ path: '/srv/repo', group: 'Work' }],
          })
        )
        assert.deepStrictEqual(await readManagedRepositories(dir), [
          { path: '/srv/repo', group: 'Work', pinned: false },
        ])
      } finally {
        await rm(dir, { recursive: true, force: true })
      }
    })
  })

  describe('planManagedRepositories', () => {
    it('adds, groups and pins new repositories', () => {
      const plan = planManagedRepositories(
        [
          { path: '/a', group: 'Work', pinned: true },
          { path: '/b', group: 'Work', pinned: false },
          { path: '/c', group: null, pinned: false },
        ],
        new Map()
      )
      assert.deepStrictEqual(plan.toAdd, ['/a', '/b', '/c'])
      assert.deepStrictEqual([...plan.groups], [['Work', ['/a', '/b']]])
      assert.deepStrictEqual(plan.toPin, ['/a'])
    })

    it('groups an existing repository only when it has no group yet', () => {
      const plan = planManagedRepositories(
        [
          { path: '/ungrouped', group: 'Work', pinned: true },
          { path: '/regrouped-by-hand', group: 'Work', pinned: false },
        ],
        new Map([
          ['/ungrouped', null],
          ['/regrouped-by-hand', 'Mine'],
        ])
      )
      assert.deepStrictEqual(plan.toAdd, [])
      assert.deepStrictEqual([...plan.groups], [['Work', ['/ungrouped']]])
      // Pins are applied only when the repository is added, so an unpin by hand stays.
      assert.deepStrictEqual(plan.toPin, [])
    })

    it('ignores a path listed twice', () => {
      const plan = planManagedRepositories(
        [
          { path: '/a', group: 'One', pinned: false },
          { path: '/a', group: 'Two', pinned: true },
        ],
        new Map()
      )
      assert.deepStrictEqual(plan.toAdd, ['/a'])
      assert.deepStrictEqual([...plan.groups], [['One', ['/a']]])
      assert.deepStrictEqual(plan.toPin, [])
    })
  })
})
