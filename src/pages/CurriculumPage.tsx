import { useEffect, useRef, useState } from 'react'
import { BookOpen, Send, Loader2, FileText } from 'lucide-react'
import { askCurriculum, listCurricula, type Curriculum, type Source } from '../lib/rag'

interface Msg { role: 'user' | 'assistant'; content: string; sources?: Source[]; grounded?: boolean }

export function CurriculumPage() {
  const [list, setList] = useState<Curriculum[] | null>(null)
  const [active, setActive] = useState<string | null>(null)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { listCurricula().then(l => { setList(l); if (l[0]) setActive(l[0].curriculum) }) }, [])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, busy])

  function pick(name: string) { setActive(name); setMsgs([]) }

  async function send() {
    const q = input.trim()
    if (!q || !active || busy) return
    setInput(''); setBusy(true)
    const history = msgs.map(m => ({ role: m.role, content: m.content }))
    setMsgs(m => [...m, { role: 'user', content: q }])
    try {
      const r = await askCurriculum(q, active, history)
      setMsgs(m => [...m, { role: 'assistant', content: r.answer, sources: r.sources, grounded: r.grounded }])
    } catch (e) {
      console.error(e)
      setMsgs(m => [...m, { role: 'assistant', content: 'حصل خطأ، حاول تاني بعد شوية.', grounded: false }])
    } finally { setBusy(false) }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col h-[calc(100vh-72px-70px)] md:h-[calc(100vh-72px)]">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="w-5 h-5 text-brand-purple-light" />
        <h1 className="font-display text-xl font-bold text-white">Curriculum Tutor</h1>
      </div>

      {list === null && <p className="text-slate-400 text-sm">Loading...</p>}
      {list?.length === 0 && (
        <p className="text-slate-400 text-sm">No curricula found. Put your files in <code>knowledge/</code> and run <code>npm run ingest</code>.</p>
      )}

      {!!list?.length && (
        <>
          <div className="flex gap-2 flex-wrap mb-4">
            {list.map(c => (
              <button key={c.curriculum} onClick={() => pick(c.curriculum)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${active === c.curriculum
                  ? 'bg-brand-purple/20 border-brand-purple text-white'
                  : 'bg-brand-card border-brand-border text-slate-400 hover:text-white'}`}>
                {c.curriculum}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {msgs.length === 0 && <p className="text-slate-500 text-sm">اسأل أي سؤال وهجاوبك من منهج <b>{active}</b> بس.</p>}
            {msgs.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div dir="auto" className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed ${m.role === 'user'
                  ? 'bg-brand-purple text-white' : 'bg-brand-card border border-brand-border text-brand-text'}`}>
                  {m.content}
                  {!!m.sources?.length && (
                    <details className="mt-3 text-xs text-slate-400">
                      <summary className="cursor-pointer">المصادر ({m.sources.length})</summary>
                      <ul className="mt-2 space-y-2">
                        {m.sources.map((s, j) => (
                          <li key={s.id} dir="auto" className="bg-brand-bg/60 rounded-lg p-2">
                            <div className="flex items-center gap-1 text-brand-purple-light mb-1">
                              <FileText className="w-3 h-3" /> [{j + 1}] {s.source}{s.page ? ` — p.${s.page}` : ''}
                            </div>
                            {s.content.slice(0, 280)}{s.content.length > 280 ? '…' : ''}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              </div>
            ))}
            {busy && <Loader2 className="w-5 h-5 text-brand-purple-light animate-spin-slow" />}
            <div ref={endRef} />
          </div>

          <form onSubmit={e => { e.preventDefault(); send() }} className="mt-4 flex gap-2">
            <input dir="auto" value={input} onChange={e => setInput(e.target.value)} placeholder="اكتب سؤالك عن المنهج..."
              className="flex-1 bg-brand-card border border-brand-border rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-brand-purple" />
            <button disabled={busy || !input.trim()} className="bg-brand-purple disabled:opacity-40 rounded-xl px-4 text-white">
              <Send className="w-4 h-4" />
            </button>
          </form>
        </>
      )}
    </div>
  )
}
