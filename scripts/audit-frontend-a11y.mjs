import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CLICKABLE_NON_INTERACTIVE_RE = /<(div|span)\b[^>]*\bonClick\s*=/g

export function findClickableNonInteractiveElements(root = ROOT) {
  const srcDir = path.join(root, 'apps/web/src')
  const files = listFiles(srcDir, (file) => {
    if (!/\.(tsx)$/.test(file)) return false
    if (/\.(test|spec)\.tsx$/.test(file)) return false
    return true
  })
  const findings = []

  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8')
    for (const match of text.matchAll(CLICKABLE_NON_INTERACTIVE_RE)) {
      findings.push({
        tag: match[1],
        source: sourceRef(root, file, text, match.index ?? 0),
      })
    }
  }

  return findings
}

function listFiles(dir, predicate) {
  const out = []
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue
      out.push(...listFiles(full, predicate))
    } else if (predicate(full)) {
      out.push(full)
    }
  }
  return out
}

function sourceRef(root, file, text, index) {
  const line = text.slice(0, index).split('\n').length
  return `${path.relative(root, file)}:${line}`
}

function main() {
  const findings = findClickableNonInteractiveElements()
  if (findings.length === 0) {
    console.log('frontend a11y audit passed: no clickable non-interactive elements')
    return
  }

  console.error(`frontend a11y audit failed: ${findings.length} issue(s)`)
  for (const finding of findings) {
    console.error(` - <${finding.tag}> with onClick should be a button/link (${finding.source})`)
  }
  process.exit(1)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
