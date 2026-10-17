// Usage: npm run ingest                      (all curricula; RESUMES where it stopped, skips finished ones)
//        npm run ingest -- curriculum-2      (one curriculum only)
//        npm run ingest -- curriculum-2 --fresh   (delete it and re-ingest from zero)
// Reads every .pdf/.txt/.md inside knowledge/<curriculum>/, chunks, embeds with Gemini,
// stores in Supabase (curriculum_chunks). Needs in .env:
//   VITE_GEMINI_API_KEY, VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (service key: NEVER prefix with VITE_)
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const { VITE_GEMINI_API_KEY: GKEY, VITE_SUPABASE_URL: SURL, SUPABASE_SERVICE_ROLE_KEY: SKEY } = process.env
if (!GKEY || !SURL || !SKEY) {
  console.error('Missing env: VITE_GEMINI_API_KEY, VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (see .env.example)')
  process.exit(1)
}
const supabase = createClient(SURL, SKEY)
const ROOT = path.resolve('knowledge')
const CHUNK = 1000, OVERLAP = 150, BATCH = 20, PAUSE_MS = 8000
const EMBED_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents'

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function readPages(file) {
  const ext = path.extname(file).toLowerCase()
  if (ext === '.pdf') {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
    const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(file)), useSystemFonts: true }).promise
    const pages = []
    for (let i = 1; i <= doc.numPages; i++) {
      const tc = await (await doc.getPage(i)).getTextContent()
      pages.push({ page: i, text: tc.items.map(it => it.str).join(' ').replace(/\s+/g, ' ').trim() })
    }
    return pages
  }
  if (ext === '.txt' || ext === '.md') return [{ page: null, text: fs.readFileSync(file, 'utf8') }]
  return null
}

function chunkText(text) {
  const clean = text.replace(/\s+/g, ' ').trim()
  const out = []
  for (let i = 0; i < clean.length; i += CHUNK - OVERLAP) {
    const piece = clean.slice(i, i + CHUNK).trim()
    if (piece.length > 40) out.push(piece)
    if (i + CHUNK >= clean.length) break
  }
  return out
}

async function embed(texts) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const res = await fetch(`${EMBED_URL}?key=${GKEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: texts.map(t => ({
          model: 'models/gemini-embedding-001',
          content: { parts: [{ text: t }] },
          taskType: 'RETRIEVAL_DOCUMENT',
          outputDimensionality: 768,
        })),
      }),
    })
    if (res.ok) return (await res.json()).embeddings.map(e => e.values)
    const body = await res.text()
    if (res.status === 429 || res.status >= 500) {
      const wait = Math.min(65000, 10000 * (attempt + 1))
      console.warn(`\n  Gemini ${res.status} (attempt ${attempt + 1}/8) - waiting ${wait / 1000}s. ${body.replace(/\s+/g, ' ').slice(0, 300)}`)
      await sleep(wait); continue
    }
    throw new Error(`Embedding error ${res.status}: ${body}`)
  }
  throw new Error('Gemini kept refusing (rate/daily quota). Progress is SAVED - run `npm run ingest` again later and it will continue.')
}

async function ingestCurriculum(name) {
  const dir = path.join(ROOT, name)
  const files = fs.readdirSync(dir).filter(f => /\.(pdf|txt|md)$/i.test(f) && f !== 'PUT_FILES_HERE.txt')
  if (!files.length) { console.warn(`[${name}] no .pdf/.txt/.md files, skipped`); return }

  const rows = []
  for (const f of files) {
    const pages = await readPages(path.join(dir, f))
    let n = 0
    for (const p of pages) for (const c of chunkText(p.text)) { rows.push({ curriculum: name, source: f, page: p.page, content: c }); n++ }
    console.log(`[${name}] ${f}: ${n} chunks`)
    if (n === 0) console.warn(`  ⚠ no text extracted from ${f} (scanned PDF? needs OCR first)`)
  }
  if (!rows.length) return

  // Resume: chunking is deterministic and rows are inserted in order, so rows already stored = first N chunks
  let done = 0
  if (!FRESH) {
    const { count, error } = await supabase.from('curriculum_chunks').select('id', { count: 'exact', head: true }).eq('curriculum', name)
    if (error) throw error
    done = count || 0
    if (done > rows.length) done = 0 // files changed -> start over
  }
  if (done === 0) {
    const { error: delErr } = await supabase.from('curriculum_chunks').delete().eq('curriculum', name)
    if (delErr) throw delErr
  } else if (done === rows.length) {
    console.log(`[${name}] already complete (${done} chunks), skipped. Use --fresh to redo.`); return
  } else console.log(`[${name}] resuming from chunk ${done}/${rows.length}`)

  for (let i = done; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const vecs = await embed(batch.map(r => r.content))
    const { error } = await supabase.from('curriculum_chunks')
      .insert(batch.map((r, j) => ({ ...r, embedding: JSON.stringify(vecs[j]) })))
    if (error) throw error
    process.stdout.write(`\r[${name}] embedded ${Math.min(i + BATCH, rows.length)}/${rows.length}`)
    await sleep(PAUSE_MS)
  }
  console.log(`\n[${name}] done ✓`)
}

const FRESH = process.argv.includes('--fresh')
const only = process.argv.slice(2).find(a => !a.startsWith('--'))
const names = fs.readdirSync(ROOT, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name)
  .filter(n => !only || n === only)
if (!names.length) { console.error('No curriculum folder found in knowledge/'); process.exit(1) }
for (const n of names) await ingestCurriculum(n)
