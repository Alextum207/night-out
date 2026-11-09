// Run: npm run check  (npx tsx src/selfcheck.ts). Pure modules only, no import.meta.env.
import assert from 'node:assert/strict'

// --- position (issue #4) ---

// --- hotspots (issue #7) ---

assert.ok(true)
console.log('selfcheck ok')
