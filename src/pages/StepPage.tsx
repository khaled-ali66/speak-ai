import { useEffect, useMemo, useRef, useState } from 'react'
import { Clock, Flag, Headphones, BookOpen, PenLine, Play, Square, CheckCircle2, XCircle, RotateCcw, Layers } from 'lucide-react'
import { PASSAGES, STEP_BANK, type StepQuestion, type StepSection } from '../data/stepBank'
import { useAuth } from '../lib/authContext'
import { updateUserStats, type UserStats } from '../lib/supabase'

type Mode = StepSection | 'mock'
type Stage = 'home' | 'test' | 'results'

const SECONDS_PER_Q: Record<StepSection, number> = { grammar: 45, reading: 75, listening: 60 }
const MAX_PLAYS = 2
const ORDER: StepSection[] = ['listening', 'grammar', 'reading']

const SECTION_META: Record<StepSection, { title: string; desc: string; Icon: React.ElementType; color: string }> = {
  grammar: { title: 'Grammar', desc: 'Structure & written expression', Icon: PenLine, color: '#7c3aed' },
  reading: { title: 'Reading', desc: 'Passages with comprehension questions', Icon: BookOpen, color: '#22c55e' },
  listening: { title: 'Listening', desc: 'Listen (max 2 plays), then answer', Icon: Headphones, color: '#f97316' },
}

// The bank holds 200 questions per section, so each test is a random sample of it.
const TEST_SIZE: Record<StepSection, number> = { grammar: 30, reading: 24, listening: 24 }

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function sampleSection(s: StepSection): StepQuestion[] {
  const qs = STEP_BANK.filter(q => q.section === s)
  if (s === 'grammar') return shuffle(qs).slice(0, TEST_SIZE.grammar)
  // reading / listening: pick whole passages (questions stay together and in order)
  const groups = new Map<string, StepQuestion[]>()
  for (const q of qs) {
    const k = q.passageId ?? q.id
    groups.set(k, [...(groups.get(k) ?? []), q])
  }
  const picked: StepQuestion[] = []
  for (const g of shuffle([...groups.values()])) {
    if (picked.length >= TEST_SIZE[s]) break
    picked.push(...g)
  }
  return picked
}

function buildTest(mode: Mode): StepQuestion[] {
  const sections = mode === 'mock' ? ORDER : [mode]
  return sections.flatMap(sampleSection)
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

interface Props { stats: UserStats | null; onStatsUpdate: (s: UserStats) => void }

export function StepPage({ stats, onStatsUpdate }: Props) {
  const { user } = useAuth()
  const [stage, setStage] = useState<Stage>('home')
  const [qs, setQs] = useState<StepQuestion[]>([])
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>([])
  const [flags, setFlags] = useState<boolean[]>([])
  const [left, setLeft] = useState(0)
  const [plays, setPlays] = useState<Record<string, number>>({})
  const [speaking, setSpeaking] = useState(false)
  const submitted = useRef(false)
  const deadline = useRef(0)
  const finishRef = useRef<() => void>(() => {})

  const counts = useMemo(() => ({
    grammar: STEP_BANK.filter(q => q.section === 'grammar').length,
    reading: STEP_BANK.filter(q => q.section === 'reading').length,
    listening: STEP_BANK.filter(q => q.section === 'listening').length,
  }), [])

  function start(m: Mode) {
    const t = buildTest(m)
    setQs(t); setIdx(0)
    setAnswers(new Array(t.length).fill(null)); setFlags(new Array(t.length).fill(false))
    const secs = t.reduce((a, q) => a + SECONDS_PER_Q[q.section], 0)
    setLeft(secs)
    // eslint-disable-next-line react-hooks/purity -- inside an event handler, not render
    deadline.current = Date.now() + secs * 1000
    setPlays({}); submitted.current = false
    setStage('test')
  }

  function stopAudio() { window.speechSynthesis?.cancel(); setSpeaking(false) }

  function finish() {
    if (submitted.current) return
    submitted.current = true
    stopAudio()
    setStage('results')
    const correct = qs.reduce((a, q, i) => a + (answers[i] === q.correctIndex ? 1 : 0), 0)
    if (user && stats) {
      updateUserStats(user.id, { xp: (stats.xp || 0) + correct * 10 }).then(u => { if (u) onStatsUpdate(u) })
    }
  }

  // countdown
  useEffect(() => {
    if (stage !== 'test') return
    const t = window.setInterval(() => {
      if (deadline.current - Date.now() <= 0) { window.clearInterval(t); finishRef.current() }
      else setLeft(Math.ceil((deadline.current - Date.now()) / 1000))
    }, 500)
    return () => window.clearInterval(t)
  }, [stage])
  useEffect(() => { finishRef.current = finish })
  useEffect(() => () => window.speechSynthesis?.cancel(), [])

  function go(i: number) { stopAudio(); setIdx(i) }

  function play(passageId: string) {
    const p = PASSAGES.find(x => x.id === passageId)
    if (!p || (plays[passageId] || 0) >= MAX_PLAYS) return
    if (p.audioUrl) {
      const a = new Audio(p.audioUrl); a.onended = () => setSpeaking(false); a.play(); setSpeaking(true)
    } else {
      const u = new SpeechSynthesisUtterance(p.text.replace(/^(Man|Woman):\s*/gm, ''))
      u.lang = 'en-US'; u.rate = 0.9
      const v = window.speechSynthesis.getVoices().find(v => v.lang.startsWith('en'))
      if (v) u.voice = v
      u.onend = () => setSpeaking(false)
      window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); setSpeaking(true)
    }
    setPlays(pl => ({ ...pl, [passageId]: (pl[passageId] || 0) + 1 }))
  }

  // ───────── HOME ─────────
  if (stage === 'home') {
    return (
      <div className="max-w-5xl mx-auto px-4 md:px-10 pt-10 pb-16">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-5xl font-extrabold mb-3 tracking-tight">
            STEP <span className="bg-gradient-to-r from-brand-purple-light to-purple-400 bg-clip-text text-transparent">Practice</span>
          </h1>
          <p className="text-slate-400 max-w-xl mx-auto">تدرّب على أسئلة على نمط اختبار STEP: Grammar و Reading و Listening، بتايمر ومراجعة تفصيلية للإجابات.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
          {(Object.keys(SECTION_META) as StepSection[]).map(s => {
            const { title, desc, Icon, color } = SECTION_META[s]
            return (
              <button key={s} onClick={() => start(s)} disabled={!counts[s]}
                className="text-left bg-brand-card border border-brand-border hover:border-brand-purple/50 rounded-2xl p-5 transition-all hover:-translate-y-0.5 disabled:opacity-40">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: `${color}22`, color }}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="font-bold text-white">{title}</div>
                <div className="text-sm text-slate-400 mb-3">{desc}</div>
                <div className="text-xs text-slate-500">{counts[s]} in bank · {TEST_SIZE[s]}-question test · {fmt(TEST_SIZE[s] * SECONDS_PER_Q[s])}</div>
              </button>
            )
          })}
        </div>
        <button onClick={() => start('mock')}
          className="w-full flex items-center justify-center gap-3 bg-brand-purple hover:bg-brand-purple-light text-white font-bold rounded-2xl py-4 transition-colors">
          <Layers className="w-5 h-5" /> Full Mock Test ({ORDER.reduce((a, k) => a + TEST_SIZE[k], 0)} random questions from {STEP_BANK.length})
        </button>
      </div>
    )
  }

  // ───────── RESULTS ─────────
  if (stage === 'results') {
    const bySection = ORDER.map(s => {
      const idxs = qs.map((q, i) => [q, i] as const).filter(([q]) => q.section === s)
      return { s, total: idxs.length, correct: idxs.filter(([q, i]) => answers[i] === q.correctIndex).length }
    }).filter(x => x.total)
    const total = qs.length
    const correct = bySection.reduce((a, x) => a + x.correct, 0)
    const pct = Math.round((correct / total) * 100)
    return (
      <div className="max-w-3xl mx-auto px-4 pt-10 pb-16">
        <div className="bg-brand-card border border-brand-border rounded-3xl p-8 text-center mb-6">
          <div className="text-6xl font-extrabold text-white mb-1">{pct}<span className="text-2xl text-slate-400">/100</span></div>
          <p className="text-slate-400 mb-5">{correct} of {total} correct · +{correct * 10} XP</p>
          <div className="grid grid-cols-3 gap-3 mb-6">
            {bySection.map(x => (
              <div key={x.s} className="bg-brand-bg/60 rounded-xl p-3">
                <div className="text-xs text-slate-400">{SECTION_META[x.s].title}</div>
                <div className="font-bold text-white">{x.correct}/{x.total}</div>
              </div>
            ))}
          </div>
          <button onClick={() => setStage('home')} className="inline-flex items-center gap-2 bg-brand-purple rounded-xl px-5 py-2.5 text-white font-semibold">
            <RotateCcw className="w-4 h-4" /> Back to tests
          </button>
          <p className="text-[11px] text-slate-500 mt-4">النتيجة نسبة مئوية تقريبية للتدريب، مش درجة STEP الرسمية.</p>
        </div>

        <h2 className="font-bold text-white mb-3">Review</h2>
        <div className="space-y-3">
          {qs.map((q, i) => {
            const ok = answers[i] === q.correctIndex
            return (
              <div key={q.id} className="bg-brand-card border border-brand-border rounded-2xl p-4">
                <div className="flex gap-2 items-start">
                  {ok ? <CheckCircle2 className="w-5 h-5 text-brand-green shrink-0" /> : <XCircle className="w-5 h-5 text-red-400 shrink-0" />}
                  <div className="text-sm text-white">{i + 1}. {q.question}</div>
                </div>
                <div className="mt-2 ml-7 text-sm space-y-1">
                  {answers[i] === null && <div className="text-slate-500">Not answered</div>}
                  {answers[i] !== null && !ok && <div className="text-red-400">Your answer: {q.options[answers[i]!]}</div>}
                  <div className="text-brand-green">Correct: {q.options[q.correctIndex]}</div>
                  <div className="text-slate-400">{q.explanation}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ───────── TEST ─────────
  const q = qs[idx]
  const passage = q.passageId ? PASSAGES.find(p => p.id === q.passageId) : undefined
  const answered = answers.filter(a => a !== null).length
  const used = passage ? plays[passage.id] || 0 : 0

  return (
    <div className="max-w-3xl mx-auto px-4 pt-6 pb-10">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-slate-400">{SECTION_META[q.section].title} · Q {idx + 1}/{qs.length} · {answered} answered</div>
        <div className={`flex items-center gap-1.5 font-mono font-bold ${left < 60 ? 'text-red-400' : 'text-white'}`}>
          <Clock className="w-4 h-4" /> {fmt(Math.max(left, 0))}
        </div>
      </div>

      {passage && q.section === 'reading' && (
        <div className="bg-brand-card border border-brand-border rounded-2xl p-5 mb-4 max-h-64 overflow-y-auto">
          <div className="font-bold text-white mb-2">{passage.title}</div>
          <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">{passage.text}</p>
        </div>
      )}
      {passage && q.section === 'listening' && (
        <div className="bg-brand-card border border-brand-border rounded-2xl p-5 mb-4 flex items-center gap-4">
          <button onClick={() => (speaking ? stopAudio() : play(passage.id))} disabled={!speaking && used >= MAX_PLAYS}
            className="w-12 h-12 rounded-full bg-brand-orange/20 text-brand-orange flex items-center justify-center disabled:opacity-40">
            {speaking ? <Square className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
          <div>
            <div className="font-bold text-white">{passage.title}</div>
            <div className="text-xs text-slate-400">Plays used: {used}/{MAX_PLAYS}</div>
          </div>
        </div>
      )}

      <div className="bg-brand-card border border-brand-border rounded-2xl p-5">
        <div className="text-white font-medium mb-4">{q.question}</div>
        <div className="space-y-2">
          {q.options.map((o, i) => (
            <button key={i} onClick={() => setAnswers(a => a.map((v, j) => (j === idx ? i : v)))}
              className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${answers[idx] === i
                ? 'bg-brand-purple/20 border-brand-purple text-white' : 'bg-brand-bg/50 border-brand-border text-slate-300 hover:border-brand-border-hover'}`}>
              <span className="font-bold mr-2">{'ABCD'[i]}.</span>{o}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between mt-5">
          <button onClick={() => setFlags(f => f.map((v, j) => (j === idx ? !v : v)))}
            className={`flex items-center gap-1.5 text-sm ${flags[idx] ? 'text-brand-orange' : 'text-slate-400'}`}>
            <Flag className="w-4 h-4" /> {flags[idx] ? 'Flagged' : 'Flag for review'}
          </button>
          <div className="flex gap-2">
            <button disabled={idx === 0} onClick={() => go(idx - 1)} className="px-4 py-2 rounded-xl bg-brand-card2 text-slate-300 text-sm disabled:opacity-30">Back</button>
            {idx < qs.length - 1
              ? <button onClick={() => go(idx + 1)} className="px-4 py-2 rounded-xl bg-brand-purple text-white text-sm font-semibold">Next</button>
              : <button onClick={finish} className="px-4 py-2 rounded-xl bg-brand-green text-black text-sm font-bold">Submit</button>}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-5">
        {qs.map((_, i) => (
          <button key={i} onClick={() => go(i)}
            className={`w-8 h-8 rounded-lg text-xs font-bold border ${i === idx ? 'border-white text-white' : 'border-transparent'} ${flags[i] ? 'bg-brand-orange/30 text-brand-orange' : answers[i] !== null ? 'bg-brand-purple/30 text-brand-purple-light' : 'bg-brand-card text-slate-500'}`}>
            {i + 1}
          </button>
        ))}
      </div>
      <button onClick={finish} className="mt-5 text-xs text-slate-500 hover:text-red-400 underline">End test now</button>
    </div>
  )
}
