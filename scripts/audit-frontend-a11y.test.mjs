import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { findClickableNonInteractiveElements } from './audit-frontend-a11y.mjs'

test('finds clickable divs that should be real interactive elements', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rotifolk-a11y-'))
  fs.mkdirSync(path.join(root, 'apps/web/src/pages/demo'), { recursive: true })
  fs.writeFileSync(
    path.join(root, 'apps/web/src/pages/demo/Demo.tsx'),
    `
      export function Demo() {
        return <div className="row" onClick={() => {}}>Open</div>
      }
    `,
  )

  assert.deepEqual(findClickableNonInteractiveElements(root), [
    {
      tag: 'div',
      source: 'apps/web/src/pages/demo/Demo.tsx:3',
    },
  ])
})
