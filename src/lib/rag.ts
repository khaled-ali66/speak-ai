import { supabase } from './supabase'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''
const BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

// Below this cosine similarity we consider the question "not covered" and do NOT call the LLM at all.
const MIN_SIMILARITY = 0.55
const TOP_K = 6

export interface Curriculum { curriculum: string; chunks: number }
export interface Source { id: number; source: string; page: number | null; content: string; similarity: number }
export interface RagAnswer { answer: string; sources: Source[]; grounded: boolean }

export const NOT_FOUND_MSG =
  'مش لاقي إجابة السؤال ده في المنهج المختار. جرّب تصيغه بشكل تاني أو اختار منهج تاني.\n(I could not find this in the selected curriculum.)'

export async function listCurricula(): Promise<Curriculum[]> {
  if (!supabase) return []
  const { data, error } = await supabase.rpc('list_curricula')
  if (error) { console.error(error); return [] }
  return (data || []).map((r: { curriculum: string; chunks: number | string }) => ({ curriculum: r.curriculum, chunks: Number(r.chunks) }))
}

async function embedQuery(text: string): Promise<number[]> {
  const res = await fetch(`${BASE}/gemini-embedding-001:embedContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'models/gemini-embedding-001',
      content: { parts: [{ text }] },
      taskType: 'RETRIEVAL_QUERY',
      outputDimensionality: 768,
    }),
  })
  if (!res.ok) throw new Error(`Embedding error ${res.status}`)
  return (await res.json()).embedding.values
}

const SYSTEM = `You are a study tutor. You answer ONLY from the numbered CONTEXT excerpts taken from the student's curriculum.

Rules:
- Use ONLY facts stated in the CONTEXT. Never use outside knowledge, never guess, never fill gaps.
- If the CONTEXT does not contain the answer, reply exactly: NOT_IN_CURRICULUM
- If it only partly answers, answer the covered part and clearly say which part is not in the curriculum.
- Cite the excerpts you used inline like [1] or [2][3].
- Reply in the same language as the student's question (Egyptian Arabic is fine). Keep technical terms in their original language.
- Explain simply, step by step, as a teacher would.`

export async function askCurriculum(
  question: string,
  curriculum: string,
  history: { role: 'user' | 'assistant'; content: string }[] = []
): Promise<RagAnswer> {
  if (!supabase) throw new Error('Supabase is not configured')
  if (!GEMINI_API_KEY) throw new Error('VITE_GEMINI_API_KEY is missing')

  const qEmb = await embedQuery(question)
  const { data, error } = await supabase.rpc('match_curriculum_chunks', {
    query_embedding: JSON.stringify(qEmb),
    p_curriculum: curriculum,
    match_count: TOP_K,
  })
  if (error) throw error

  const sources = ((data || []) as Source[]).filter(s => s.similarity >= MIN_SIMILARITY)
  if (!sources.length) return { answer: NOT_FOUND_MSG, sources: [], grounded: false }

  const context = sources
    .map((s, i) => `[${i + 1}] (${s.source}${s.page ? `, p.${s.page}` : ''})\n${s.content}`)
    .join('\n\n')

  const contents = [
    ...history.slice(-4).map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
    { role: 'user', parts: [{ text: `CONTEXT:\n${context}\n\nQUESTION: ${question}` }] },
  ]

  const res = await fetch(`${BASE}/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM }] },
      contents,
      generationConfig: { temperature: 0.1, maxOutputTokens: 1200, thinkingConfig: { thinkingBudget: 0 } },
    }),
  })
  if (!res.ok) throw new Error(`Gemini error ${res.status}`)
  const out = await res.json()
  const text: string = (out?.candidates?.[0]?.content?.parts?.[0]?.text || '').trim()

  if (!text || text.includes('NOT_IN_CURRICULUM')) return { answer: NOT_FOUND_MSG, sources: [], grounded: false }
  return { answer: text, sources, grounded: true }
}
