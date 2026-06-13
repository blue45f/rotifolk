import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {
  compareRouteSets,
  extractFrontendDynamicApiCalls,
  normalizeRoutePath,
  routeKey,
} from './audit-api-contracts.mjs'

test('normalizes API route paths across frontend templates and Nest routes', () => {
  assert.equal(
    normalizeRoutePath('parties/${partyId}/matching/my-matches'),
    'parties/:param/matching/my-matches'
  )
  assert.equal(normalizeRoutePath('payments/me?partyId=${partyId}'), 'payments/me')
  assert.equal(normalizeRoutePath('/api/venues/:id/menu'), 'venues/:param/menu')
  assert.equal(
    normalizeRoutePath('${API}/chat/rooms/:roomId/messages'),
    'chat/rooms/:param/messages'
  )
})

test('builds stable route keys', () => {
  assert.equal(routeKey('get', 'parties/:partyId'), 'GET parties/:param')
})

test('compares route sets by normalized method and path', () => {
  const used = [
    { method: 'GET', path: 'parties/${partyId}', source: 'web.tsx:1' },
    { method: 'POST', path: 'chat/rooms/${roomId}/read', source: 'chat.ts:2' },
  ]
  const available = [{ method: 'GET', path: 'parties/:id', source: 'api.ts:1' }]

  assert.deepEqual(compareRouteSets(used, available), [
    {
      key: 'POST chat/rooms/:param/read',
      method: 'POST',
      path: 'chat/rooms/:param/read',
      source: 'chat.ts:2',
    },
  ])
})

test('reports frontend API calls whose route cannot be statically audited', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rotifolk-api-contract-'))
  fs.mkdirSync(path.join(root, 'apps/web/src/features'), { recursive: true })
  fs.writeFileSync(
    path.join(root, 'apps/web/src/features/dynamic.ts'),
    `
      import { api } from '@services/api'
      const path = 'parties'
      export function load() {
        return api.get(path)
      }
    `
  )

  assert.deepEqual(extractFrontendDynamicApiCalls(root), [
    {
      method: 'GET',
      expression: 'path',
      source: 'apps/web/src/features/dynamic.ts:5',
    },
  ])
})
