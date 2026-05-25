import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Mic, Square, Keyboard, PhoneOff, Send,
  Bot, User, Briefcase, Coffee, Stethoscope,
  Plane, Users, AlertCircle, Loader2, ChevronDown, X,
  Phone, Star, TrendingUp, Award, Volume2,
} from 'lucide-react'
import { useAuth } from '../lib/authContext'
import { sendMessageToAI, getInitialGreeting, parseCorrections } from '../lib/ai'
import { saveSession, updateSession, updateUserStats, getUserStats } from '../lib/supabase'
import type { ChatMessage } from '../lib/supabase'

// ─── Speech Recognition types ──────────────────────────────
interface MySpeechRecognition {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  stop(): void
  onresult: ((event: MySpeechRecognitionEvent) => void) | null
  onerror: ((event: Event) => void) | null
  onend: (() => void) | null
}
interface MySpeechRecognitionEvent {
  results: { [index: number]: { [index: number]: { transcript: string } } }
}
type MySpeechRecognitionCtor = new () => MySpeechRecognition

function getSR(): MySpeechRecognitionCtor | null {
  const w = window as any
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

// ─── Types ─────────────────────────────────────────────────
interface AIMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  corrections?: string[]
  score?: number
}

interface CallSummary {
  totalMessages: number
  xpEarned: number
  allCorrections: { wrong: string; right: string }[]
  avgScore: number
  durationMins: number
}

interface Props {
  onStatsUpdate: () => void
}

// ─── Constants ─────────────────────────────────────────────
const SCENARIOS = [
  { id: 'Job Interview',       label: 'Job Interview',    Icon: Briefcase   },
  { id: 'Coffee Shop',         label: 'Coffee Shop',      Icon: Coffee      },
  { id: 'Medical Appointment', label: 'Medical Appt.',    Icon: Stethoscope },
  { id: 'Airport & Travel',    label: 'Airport & Travel', Icon: Plane       },
  { id: 'Business Meeting',    label: 'Business Meeting', Icon: Users       },
]

// ─── Helpers ───────────────────────────────────────────────
function speak(text: string) {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utter = new SpeechSynthesisUtterance(text)
  utter.lang = 'en-US'
  utter.rate = 0.95
  const voices = window.speechSynthesis.getVoices()
  const preferred =
    voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural'))) ||
    voices.find(v => v.lang.startsWith('en'))
  if (preferred) utter.voice = preferred
  window.speechSynthesis.speak(utter)
}

function parseCorrectionsDetailed(corrections: string[]): { wrong: string; right: string }[] {
  return corrections
    .filter(c => c && c !== 'No corrections needed')
    .map(c => {
      const m = c.match(/["']?(.+?)["']?\s*(?:→|->)\s*["']?(.+?)["']?$/)
      if (m) return { wrong: m[1].trim(), right: m[2].trim() }
      return { wrong: '', right: c }
    })
    .filter(c => c.right)
}

function scoreMessage(corrections: string[]): number {
  const n = corrections.filter(c => c && c !== 'No corrections needed').length
  if (n === 0) return 100
  if (n === 1) return 80
  if (n === 2) return 60
  if (n === 3) return 40
  return 20
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 90 ? 'text-brand-green bg-brand-green/10 border-brand-green/20' :
    score >= 70 ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' :
    score >= 50 ? 'text-orange-400 bg-orange-400/10 border-orange-400/20' :
                  'text-red-400 bg-red-400/10 border-red-400/20'
  const label = score >= 90 ? 'Excellent' : score >= 70 ? 'Good' : score >= 50 ? 'Fair' : 'Needs Work'
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${color}`}>
      <Star className="w-2.5 h-2.5 fill-current" />
      {score}% · {label}
    </div>
  )
}

// ─── Component ─────────────────────────────────────────────
export function ChatPage({ onStatsUpdate }: Props) {
  const { user } = useAuth()

  // Chat state
  const [scenario, setScenario]                   = useState('Job Interview')
  const [messages, setMessages]                   = useState<AIMessage[]>([])
  const [loading, setLoading]                     = useState(false)
  const [keyboardOpen, setKeyboardOpen]           = useState(false)
  const [micActive, setMicActive]                 = useState(false)
  const [inputText, setInputText]                 = useState('')
  const [sessionId, setSessionId]                 = useState<string | null>(null)
  const [error, setError]                         = useState<string | null>(null)
  const [initializing, setInitializing]           = useState(false)
  const [scenarioModalOpen, setScenarioModalOpen] = useState(false)

  // Call state
  const [callActive, setCallActive]     = useState(false)
  const [callSummary, setCallSummary]   = useState<CallSummary | null>(null)
  const [callMessages, setCallMessages] = useState<AIMessage[]>([])
  const [isSpeaking, setIsSpeaking]     = useState(false)

  // Refs
  const messagesEndRef    = useRef<HTMLDivElement>(null)
  const inputRef          = useRef<HTMLInputElement>(null)
  const hasInitialized    = useRef(false)
  const recognitionRef    = useRef<MySpeechRecognition | null>(null)
  const callMessagesRef   = useRef<AIMessage[]>([])
  const callStartTimeRef  = useRef<number>(0)
  const sessionStartRef   = useRef<number>(Date.now())
  const scenarioRef       = useRef(scenario)
  const sessionIdRef      = useRef<string | null>(null)

  // ─── Mobile viewport height fix ──────────────────────
  useEffect(() => {
    function setVh() {
      // Use visualViewport to get actual height excluding keyboard
      const h = window.visualViewport?.height ?? window.innerHeight
      document.documentElement.style.setProperty('--chat-height', `${h}px`)
    }
    setVh()
    window.visualViewport?.addEventListener('resize', setVh)
    window.addEventListener('resize', setVh)
    return () => {
      window.visualViewport?.removeEventListener('resize', setVh)
      window.removeEventListener('resize', setVh)
    }
  }, [])

  // Keep refs in sync
  useEffect(() => { scenarioRef.current = scenario }, [scenario])
  useEffect(() => { sessionIdRef.current = sessionId }, [sessionId])
  useEffect(() => { callMessagesRef.current = callMessages }, [callMessages])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // Track speaking minutes on unmount
  useEffect(() => {
    return () => {
      const mins = Math.round((Date.now() - sessionStartRef.current) / 60000)
      if (user && mins > 0) {
        getUserStats(user.id).then(stats => {
          if (stats) updateUserStats(user.id, {
            speaking_hours: (stats.speaking_hours || 0) + mins / 60,
          })
        })
      }
    }
  }, [user])

  // ─── startNewSession ───────────────────────────────────
  const startNewSession = useCallback(async (sc: string) => {
    setInitializing(true)
    setError(null)
    setMessages([])
    setSessionId(null)
    try {
      const greeting = await getInitialGreeting(sc)
      const { clean, corrections } = parseCorrections(greeting)
      const initialMsg: AIMessage = { role: 'assistant', content: clean, timestamp: new Date().toISOString(), corrections }
      setMessages([initialMsg])
      if (user) {
        const dbMessages: ChatMessage[] = [{ role: 'assistant', content: clean, timestamp: initialMsg.timestamp }]
        const session = await saveSession({ user_id: user.id, scenario: sc, messages: dbMessages })
        if (session) setSessionId(session.id)
        const stats = await getUserStats(user.id)
        if (stats) {
          await updateUserStats(user.id, { sessions_count: (stats.sessions_count || 0) + 1 })
          onStatsUpdate()
        }
      }
    } catch {
      setError('Could not connect to AI. Check your API key in .env')
    } finally {
      setInitializing(false)
    }
  }, [user, onStatsUpdate])

  useEffect(() => {
    if (hasInitialized.current) return
    hasInitialized.current = true
    sessionStartRef.current = Date.now()
    startNewSession('Job Interview')
  }, [startNewSession])

  // ─── handleSelectScenario ──────────────────────────────
  async function handleSelectScenario(sc: string) {
    if (sc === scenario && messages.length > 0) return
    setScenario(sc)
    setScenarioModalOpen(false)
    await startNewSession(sc)
  }

  // ─── sendMessage (chat mode) ───────────────────────────
  async function sendMessage(text: string) {
    if (!text.trim() || loading) return
    setError(null)
    const userMsg: AIMessage = { role: 'user', content: text.trim(), timestamp: new Date().toISOString() }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInputText('')
    setLoading(true)
    try {
      const history = updated.map(m => ({ role: m.role, content: m.content }))
      const aiRaw = await sendMessageToAI(history, scenarioRef.current)
      const { clean, corrections } = parseCorrections(aiRaw)
      const score = scoreMessage(corrections)
      const aiMsg: AIMessage = { role: 'assistant', content: clean, timestamp: new Date().toISOString(), corrections: [] }
      const finalMsgs = updated.map((m, i) =>
        i === updated.length - 1 ? { ...userMsg, corrections, score } : m
      )
      const withAi = [...finalMsgs, aiMsg]
      setMessages(withAi)

      const sid = sessionIdRef.current
      if (sid) {
        const dbMsgs: ChatMessage[] = withAi.map(m => ({ role: m.role, content: m.content, timestamp: m.timestamp }))
        await updateSession(sid, dbMsgs)
      }

      if (user) {
        const stats = await getUserStats(user.id)
        if (stats) {
          const xpGain = Math.round(score / 10)
          const newXp = (stats.xp || 0) + xpGain
          await updateUserStats(user.id, { xp: newXp, level: Math.floor(newXp / 500) + 1 })
          onStatsUpdate()
        }
      }
    } catch {
      setError('AI response failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ─── handleMic (chat mode) ─────────────────────────────
  function handleMic() {
    if (micActive) { setMicActive(false); return }
    const SR = getSR()
    if (!SR) { setKeyboardOpen(true); return }
    setMicActive(true)
    const r = new SR()
    r.lang = 'en-US'; r.continuous = false; r.interimResults = false
    r.onresult = (e) => { setMicActive(false); void sendMessage(e.results[0][0].transcript) }
    r.onerror = () => { setMicActive(false); setError('Microphone error. Please type instead.') }
    r.onend = () => setMicActive(false)
    r.start()
  }

  // ─── Call mode ─────────────────────────────────────────
  function listenForUser() {
    const SR = getSR()
    if (!SR) return
    const r = new SR()
    recognitionRef.current = r
    r.lang = 'en-US'; r.continuous = false; r.interimResults = false
    setMicActive(true)
    r.onresult = (e) => {
      setMicActive(false)
      void handleCallMessage(e.results[0][0].transcript)
    }
    r.onerror = () => setMicActive(false)
    r.onend   = () => setMicActive(false)
    r.start()
  }

  function speakAndListen(text: string) {
    if (!window.speechSynthesis) { listenForUser(); return }
    window.speechSynthesis.cancel()
    setIsSpeaking(true)
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = 'en-US'; utter.rate = 0.95
    const voices = window.speechSynthesis.getVoices()
    const pref = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural')))
      || voices.find(v => v.lang.startsWith('en'))
    if (pref) utter.voice = pref
    utter.onend = () => { setIsSpeaking(false); listenForUser() }
    window.speechSynthesis.speak(utter)
  }

  async function handleCallMessage(userText: string) {
    const userMsg: AIMessage = { role: 'user', content: userText, timestamp: new Date().toISOString() }
    const updated = [...callMessagesRef.current, userMsg]
    callMessagesRef.current = updated
    setCallMessages([...updated])
    setLoading(true)
    try {
      const history = updated.map(m => ({ role: m.role, content: m.content }))
      const aiRaw = await sendMessageToAI(history, scenarioRef.current)
      const { clean, corrections } = parseCorrections(aiRaw)
      const score = scoreMessage(corrections)
      const userMsgScored = { ...userMsg, corrections, score }
      const aiMsg: AIMessage = { role: 'assistant', content: clean, timestamp: new Date().toISOString() }
      const withScore = updated.map((m, i) => i === updated.length - 1 ? userMsgScored : m)
      const final = [...withScore, aiMsg]
      callMessagesRef.current = final
      setCallMessages([...final])
      speakAndListen(clean)
    } catch {
      setError('AI response failed.')
    } finally {
      setLoading(false)
    }
  }

  async function startCall() {
    setCallActive(true)
    setCallMessages([])
    callMessagesRef.current = []
    setCallSummary(null)
    callStartTimeRef.current = Date.now()
    const greeting = await getInitialGreeting(scenarioRef.current)
    const { clean } = parseCorrections(greeting)
    const greetMsg: AIMessage = { role: 'assistant', content: clean, timestamp: new Date().toISOString() }
    callMessagesRef.current = [greetMsg]
    setCallMessages([greetMsg])
    speakAndListen(clean)
  }

  async function endCall() {
    window.speechSynthesis?.cancel()
    recognitionRef.current?.stop()
    setMicActive(false); setIsSpeaking(false); setCallActive(false)

    const durationMins = Math.max(1, Math.round((Date.now() - callStartTimeRef.current) / 60000))
    const msgs = callMessagesRef.current
    const userMsgs = msgs.filter(m => m.role === 'user')
    const allCorrections: { wrong: string; right: string }[] = []
    let totalScore = 0; let scoredCount = 0

    userMsgs.forEach(m => {
      if (m.corrections) allCorrections.push(...parseCorrectionsDetailed(m.corrections))
      if (m.score !== undefined) { totalScore += m.score; scoredCount++ }
    })

    const avgScore  = scoredCount > 0 ? Math.round(totalScore / scoredCount) : 100
    const xpEarned  = userMsgs.length * 15 + Math.round(avgScore / 5)

    if (user) {
      const stats = await getUserStats(user.id)
      if (stats) {
        const newXp = (stats.xp || 0) + xpEarned
        await updateUserStats(user.id, {
          xp: newXp,
          level: Math.floor(newXp / 500) + 1,
          speaking_hours: (stats.speaking_hours || 0) + durationMins / 60,
        })
        onStatsUpdate()
      }
    }

    setCallSummary({ totalMessages: userMsgs.length, xpEarned, allCorrections, avgScore, durationMins })
  }

  const currentScenario = SCENARIOS.find(s => s.id === scenario)

  // ─── CALL SUMMARY SCREEN ───────────────────────────────
  if (callSummary) {
    return (
      <div className="min-h-[calc(100vh-68px)] flex items-center justify-center p-4 bg-brand-bg">
        <div className="w-full max-w-lg bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-brand-purple/20 to-purple-900/20 border-b border-brand-border p-6 text-center">
            <div className="w-16 h-16 bg-brand-purple/20 border-2 border-brand-purple/40 rounded-full flex items-center justify-center mx-auto mb-3">
              <Award className="w-8 h-8 text-brand-purple-light" />
            </div>
            <h2 className="text-2xl font-bold font-display mb-1">Call Summary</h2>
            <p className="text-slate-400 text-sm">Great practice! Here's how you did</p>
          </div>

          <div className="p-6 space-y-5">
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'XP Earned', value: `+${callSummary.xpEarned}`,        color: 'text-brand-green'        },
                { label: 'Avg Score', value: `${callSummary.avgScore}%`,         color: 'text-brand-purple-light' },
                { label: 'Responses', value: `${callSummary.totalMessages}`,     color: 'text-white'              },
                { label: 'Duration',  value: `${callSummary.durationMins}m`,     color: 'text-brand-gold'         },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-brand-secondary border border-brand-border rounded-xl p-3 text-center">
                  <div className={`text-xl font-bold ${color}`}>{value}</div>
                  <div className="text-[10px] text-slate-400 mt-1">{label}</div>
                </div>
              ))}
            </div>

            {callSummary.allCorrections.length > 0 ? (
              <div>
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-brand-purple-light" /> Grammar Corrections
                </h3>
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {callSummary.allCorrections.map((c, i) => (
                    <div key={i} className="bg-brand-secondary border border-brand-border rounded-xl px-4 py-3">
                      {c.wrong ? (
                        <div className="flex items-start gap-2 text-sm flex-wrap">
                          <span className="text-red-400 line-through opacity-70">{c.wrong}</span>
                          <span className="text-slate-400">→</span>
                          <span className="text-brand-green font-medium">{c.right}</span>
                        </div>
                      ) : (
                        <p className="text-sm text-brand-purple-light">✦ {c.right}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-brand-green/10 border border-brand-green/20 rounded-xl p-4 text-center">
                <p className="text-brand-green font-semibold text-sm">🎉 Perfect! No grammar mistakes!</p>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => { setCallSummary(null); setCallMessages([]) }}
                className="flex-1 bg-brand-card2 border border-brand-border hover:border-brand-purple text-white rounded-xl py-3 text-sm font-semibold transition-all">
                Back to Chat
              </button>
              <button onClick={() => { setCallSummary(null); setCallMessages([]); void startCall() }}
                className="flex-1 bg-brand-purple hover:bg-brand-purple-light text-white rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all">
                <Phone className="w-4 h-4" /> New Call
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── CALL ACTIVE SCREEN ────────────────────────────────
  if (callActive) {
    const lastAiMsg = [...callMessages].reverse().find(m => m.role === 'assistant')
    return (
      <div className="min-h-[calc(100vh-68px)] flex flex-col items-center justify-center bg-brand-bg p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-brand-purple/10 border border-brand-purple/20 px-4 py-2 rounded-full text-sm text-brand-purple-light font-medium mb-2">
              {currentScenario && <currentScenario.Icon className="w-4 h-4" />}
              {scenario}
            </div>
            <div className="text-slate-400 text-sm">AI Voice Call in Progress</div>
          </div>

          <div className="flex flex-col items-center mb-8">
            <div className={`w-28 h-28 rounded-full border-4 flex items-center justify-center mb-4 transition-all duration-300
              ${isSpeaking
                ? 'border-brand-purple bg-brand-purple/20 shadow-[0_0_40px_rgba(124,58,237,0.4)] scale-110'
                : micActive
                  ? 'border-brand-green bg-brand-green/10 shadow-[0_0_30px_rgba(29,158,117,0.3)]'
                  : 'border-brand-border bg-brand-card'}`}>
              <Bot className={`w-14 h-14 ${isSpeaking ? 'text-brand-purple-light' : 'text-slate-400'}`} />
            </div>
            <div className="text-white font-semibold mb-1">
              {isSpeaking ? 'AI is speaking...' : micActive ? 'Listening...' : 'Processing...'}
            </div>
            {(isSpeaking || micActive) && (
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <div key={i}
                    className={`w-1 rounded-full animate-pulse ${isSpeaking ? 'bg-brand-purple-light' : 'bg-brand-green'}`}
                    style={{ height: `${8 + (i % 3) * 8}px`, animationDelay: `${i * 0.1}s` }} />
                ))}
                {isSpeaking
                  ? <Volume2 className="w-4 h-4 text-brand-purple-light ml-1" />
                  : <Mic className="w-4 h-4 text-brand-green ml-1" />}
              </div>
            )}
          </div>

          {lastAiMsg && (
            <div className="bg-brand-card border border-brand-border rounded-2xl p-4 mb-4 text-sm text-slate-300 leading-relaxed text-center">
              "{lastAiMsg.content}"
            </div>
          )}
          <div className="text-center text-xs text-slate-500 mb-6">
            {callMessages.filter(m => m.role === 'user').length} responses so far
          </div>

          <button onClick={() => void endCall()}
            className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500 text-red-400 rounded-2xl py-4 text-sm font-bold flex items-center justify-center gap-3 transition-all">
            <PhoneOff className="w-5 h-5" /> End Call & See Results
          </button>
        </div>
      </div>
    )
  }

  // ─── NORMAL CHAT ───────────────────────────────────────
  return (
    <div className="grid grid-cols-1 md:grid-cols-[260px_1fr]" style={{ height: "calc(var(--chat-height, 100svh) - 68px)" }}>

      {/* Sidebar */}
      <div className="hidden md:flex bg-brand-secondary border-r border-brand-border flex-col py-5 overflow-hidden">
        <div className="px-5 pb-4 border-b border-brand-border">
          <h3 className="text-base font-bold font-display">Scenarios</h3>
          <p className="text-xs text-brand-muted mt-1">Choose your practice topic</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {SCENARIOS.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => void handleSelectScenario(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                ${scenario === id ? 'bg-brand-purple text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>
        <div className="px-3 space-y-2">
          <button onClick={() => void startCall()}
            className="w-full bg-brand-green/10 border border-brand-green/30 hover:border-brand-green hover:bg-brand-green/20 text-brand-green rounded-xl p-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all">
            <Phone className="w-4 h-4" /> Start Voice Call
          </button>
          <button onClick={() => void startNewSession(scenario)}
            className="w-full bg-brand-card border border-brand-border hover:border-brand-purple text-white rounded-xl p-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all">
            <span className="text-lg leading-none">+</span> New Session
          </button>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex flex-col h-full relative bg-brand-bg overflow-hidden">

        {/* Mobile header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-brand-border bg-brand-secondary">
          <div className="font-display text-sm font-bold flex items-center gap-2">
            {currentScenario && <currentScenario.Icon className="w-4 h-4 text-brand-purple-light" />}
            {scenario}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => void startCall()}
              className="flex items-center gap-1.5 text-xs bg-brand-green/10 border border-brand-green/30 px-3 py-1.5 rounded-md text-brand-green hover:bg-brand-green/20 transition-all">
              <Phone className="w-3 h-3" /> Call
            </button>
            <button onClick={() => setScenarioModalOpen(true)}
              className="flex items-center gap-1.5 text-xs bg-brand-card border border-brand-border px-3 py-1.5 rounded-md text-slate-300 hover:border-brand-purple transition-all">
              Change <ChevronDown className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-10 flex flex-col gap-5">
          {initializing && (
            <div className="flex items-center gap-3 text-slate-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin text-brand-purple-light" />
              Starting {scenario} session...
            </div>
          )}
          {error && (
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i}
              className={`flex items-start gap-2 md:gap-3 max-w-[90%] md:max-w-[680px] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 md:w-9 md:h-9 rounded-full flex-shrink-0 flex items-center justify-center
                ${msg.role === 'assistant' ? 'bg-brand-purple/10 border border-brand-purple/30' : 'bg-brand-card2 border border-brand-border'}`}>
                {msg.role === 'assistant'
                  ? <Bot  className="w-4 h-4 md:w-5 md:h-5 text-brand-purple-light" />
                  : <User className="w-4 h-4 md:w-5 md:h-5 text-slate-300" />}
              </div>
              <div className="flex flex-col gap-1.5">
                <div className={`px-4 py-3 md:px-5 md:py-3.5 rounded-2xl text-[14px] md:text-[15px] leading-relaxed
                  ${msg.role === 'assistant'
                    ? 'bg-brand-card border border-brand-border rounded-tl-sm'
                    : 'bg-brand-card2 border border-brand-border rounded-tr-sm'}`}>
                  {msg.content}
                </div>

                {msg.role === 'user' && msg.score !== undefined && (
                  <div className="flex justify-end"><ScoreBadge score={msg.score} /></div>
                )}

                {msg.corrections && msg.corrections.length > 0 && msg.corrections[0] !== 'No corrections needed' && (
                  <div className="bg-brand-purple/10 border border-brand-purple/20 rounded-xl px-4 py-2.5 text-xs text-brand-purple-light">
                    {msg.corrections.map((c, j) => (
                      <div key={j} className="flex items-start gap-2">
                        <span className="text-brand-purple font-bold mt-0.5">✦</span>
                        <span>{c}</span>
                      </div>
                    ))}
                  </div>
                )}

                {msg.role === 'assistant' && (
                  <button onClick={() => speak(msg.content)}
                    className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-brand-purple-light transition-colors self-start">
                    <Volume2 className="w-3 h-3" /> Listen
                  </button>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-start gap-2 md:gap-3 max-w-[90%] md:max-w-[680px]">
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-brand-purple/10 border border-brand-purple/30 flex-shrink-0 flex items-center justify-center">
                <Bot className="w-4 h-4 md:w-5 md:h-5 text-brand-purple-light" />
              </div>
              <div className="px-4 py-4 bg-brand-card border border-brand-border rounded-2xl rounded-tl-sm flex items-center gap-1.5">
                <div className="w-2 h-2 bg-brand-purple-light rounded-full typing-dot" />
                <div className="w-2 h-2 bg-brand-purple-light rounded-full typing-dot" />
                <div className="w-2 h-2 bg-brand-purple-light rounded-full typing-dot" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <div className="p-3 md:p-5 px-4 md:px-10 border-t border-brand-border bg-brand-bg flex-shrink-0">
          {!keyboardOpen ? (
            <div className="flex items-center justify-center gap-4 md:gap-6">
              <button onClick={() => setKeyboardOpen(true)}
                className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-brand-card border border-brand-border flex items-center justify-center text-slate-400 hover:bg-brand-card2 hover:text-white transition-all">
                <Keyboard className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              <button onClick={handleMic}
                className={`w-14 h-14 md:w-16 md:h-16 rounded-full bg-brand-purple border-none cursor-pointer flex items-center justify-center text-white shadow-[0_0_0_8px_rgba(124,58,237,0.12)] transition-all mic-btn ${micActive ? 'recording' : ''}`}>
                {micActive ? <Square className="w-6 h-6 md:w-7 md:h-7" /> : <Mic className="w-6 h-6 md:w-7 md:h-7" />}
              </button>
              <button onClick={() => { setMessages([]); void startNewSession(scenario) }}
                className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-all">
                <PhoneOff className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 md:gap-3 w-full max-w-3xl mx-auto">
              <button onClick={() => setKeyboardOpen(false)}
                className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-brand-card border border-brand-border flex items-center justify-center text-slate-400 hover:bg-brand-card2 hover:text-white flex-shrink-0">
                <Mic className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              <input ref={inputRef} type="text" value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') void sendMessage(inputText) }}
                placeholder="Type your message in English..."
                className="flex-1 bg-brand-card border border-brand-border rounded-xl px-3 py-2 md:px-4 md:py-3 text-brand-text text-[14px] md:text-[15px] outline-none focus:border-brand-purple placeholder-slate-500"
                autoFocus />
              <button onClick={() => void sendMessage(inputText)} disabled={loading || !inputText.trim()}
                className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-brand-purple text-white flex items-center justify-center hover:bg-brand-purple-light disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0">
                <Send className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Scenario Modal */}
      {scenarioModalOpen && (
        <div className="md:hidden fixed inset-0 z-[9999] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setScenarioModalOpen(false)} />
          <div className="relative w-full bg-brand-card border-t border-brand-border rounded-t-2xl p-5 pb-8 z-10">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold font-display">Choose Scenario</h3>
              <button onClick={() => setScenarioModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-brand-card2 border border-brand-border flex items-center justify-center text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {SCENARIOS.map(({ id, label, Icon }) => (
                <button key={id} onClick={() => void handleSelectScenario(id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
                    ${scenario === id ? 'bg-brand-purple text-white' : 'bg-brand-card2 border border-brand-border text-slate-300 hover:border-brand-purple hover:text-white'}`}>
                  <Icon className="w-4 h-4" /> {label}
                  {scenario === id && <span className="ml-auto text-xs opacity-70">Active</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}