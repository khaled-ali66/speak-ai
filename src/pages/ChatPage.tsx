import { useState, useRef, useEffect } from 'react'
import {
  Mic, Square, Keyboard, PhoneOff, Send,
  Bot, User, Briefcase, Coffee, Stethoscope,
  Plane, Users, AlertCircle, Loader2, ChevronDown, X,
  Phone, Star, CheckCircle, XCircle, Zap, TrendingUp,
} from 'lucide-react'
import { useAuth } from '../lib/authContext'
import { sendMessageToAI, getInitialGreeting, parseCorrections, generateCallSummary } from '../lib/ai'
import type { CallSummary } from '../lib/ai'
import { saveSession, updateSession, updateUserStats, getUserStats } from '../lib/supabase'
import type { ChatMessage } from '../lib/supabase'

interface AIMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  corrections?: string[]
  score?: number | null
  scoreFeedback?: string | null
}

type AppMode = 'chat' | 'call'

const SCENARIOS = [
  { id: 'Job Interview',       label: 'Job Interview',    Icon: Briefcase   },
  { id: 'Coffee Shop',         label: 'Coffee Shop',      Icon: Coffee      },
  { id: 'Medical Appointment', label: 'Medical Appt.',    Icon: Stethoscope },
  { id: 'Airport & Travel',    label: 'Airport & Travel', Icon: Plane       },
  { id: 'Business Meeting',    label: 'Business Meeting', Icon: Users       },
]

function ScoreChip({ score, feedback }: { score: number; feedback?: string | null }) {
  const color =
    score >= 8 ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' :
    score >= 5 ? 'bg-amber-500/15 text-amber-400 border-amber-500/20' :
                 'bg-red-500/15 text-red-400 border-red-500/20'
  return (
    <div className={`inline-flex items-center gap-1.5 text-[11px] font-bold border rounded-full px-2.5 py-1 ${color}`}>
      <Star className="w-3 h-3" />
      {score}/10 {feedback && <span className="font-normal opacity-80">· {feedback}</span>}
    </div>
  )
}

function CallSummaryModal({ summary, onClose, onNewCall }: {
  summary: CallSummary
  onClose: () => void
  onNewCall: () => void
}) {
  const scoreColor =
    summary.overallScore >= 8 ? 'text-emerald-400' :
    summary.overallScore >= 5 ? 'text-amber-400' : 'text-red-400'

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-brand-card border border-brand-border rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-brand-purple to-transparent" />

        {/* Header */}
        <div className="p-6 pb-4 border-b border-brand-border flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold font-display">Call Summary</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-lg bg-brand-card2 border border-brand-border flex items-center justify-center text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          {/* Score + XP */}
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className={`text-5xl font-extrabold ${scoreColor}`}>{summary.overallScore}</div>
              <div className="text-xs text-slate-400 mt-1">out of 10</div>
            </div>
            <div className="flex-1">
              <div className="h-3 bg-white/5 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${(summary.overallScore / 10) * 100}%`,
                    background: summary.overallScore >= 8 ? '#10b981' : summary.overallScore >= 5 ? '#f59e0b' : '#ef4444'
                  }}
                />
              </div>
              <div className="flex items-center gap-2 text-brand-purple-light font-bold text-sm">
                <Zap className="w-4 h-4 text-brand-gold" />
                +{summary.totalXp} XP earned!
              </div>
              <p className="text-xs text-slate-400 mt-1">{summary.encouragement}</p>
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Strengths */}
          {summary.strengths.length > 0 && (
            <div>
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-emerald-400">
                <TrendingUp className="w-4 h-4" /> Strengths
              </h3>
              <div className="space-y-2">
                {summary.strengths.map((s, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-slate-300">
                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    {s}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mistakes */}
          {summary.mistakes.length > 0 ? (
            <div>
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-red-400">
                <XCircle className="w-4 h-4" /> Corrections
              </h3>
              <div className="space-y-3">
                {summary.mistakes.map((m, i) => (
                  <div key={i} className="bg-brand-card2 border border-brand-border rounded-xl p-3">
                    <div className="flex flex-wrap gap-2 items-center mb-1">
                      <span className="text-red-400 text-sm line-through opacity-70">"{m.wrong}"</span>
                      <span className="text-slate-500 text-xs">→</span>
                      <span className="text-emerald-400 text-sm font-semibold">"{m.correct}"</span>
                    </div>
                    <p className="text-[11px] text-slate-400">{m.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm text-slate-300 font-semibold">No major mistakes!</p>
              <p className="text-xs text-slate-500">Your English was excellent this session.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-brand-border flex gap-3 flex-shrink-0">
          <button onClick={onClose} className="flex-1 bg-brand-card2 border border-brand-border text-slate-300 rounded-xl py-3 text-sm font-semibold hover:border-brand-purple transition-all">
            Back to Chat
          </button>
          <button onClick={onNewCall} className="flex-1 bg-brand-purple text-white rounded-xl py-3 text-sm font-semibold hover:bg-brand-purple-light transition-all flex items-center justify-center gap-2">
            <Phone className="w-4 h-4" /> New Call
          </button>
        </div>
      </div>
    </div>
  )
}

export function ChatPage() {
  const { user } = useAuth()
  const [appMode, setAppMode]         = useState<AppMode>('chat')
  const [scenario, setScenario]       = useState('Job Interview')
  const [messages, setMessages]       = useState<AIMessage[]>([])
  const [loading, setLoading]         = useState(false)
  const [keyboardOpen, setKeyboardOpen] = useState(false)
  const [micActive, setMicActive]     = useState(false)
  const [inputText, setInputText]     = useState('')
  const [sessionId, setSessionId]     = useState<string | null>(null)
  const [error, setError]             = useState<string | null>(null)
  const [initializing, setInitializing] = useState(false)
  const [scenarioModalOpen, setScenarioModalOpen] = useState(false)

  // Call mode state
  const [callActive, setCallActive]   = useState(false)
  const [callMessages, setCallMessages] = useState<AIMessage[]>([])
  const [callLoading, setCallLoading] = useState(false)
  const [callSummary, setCallSummary] = useState<CallSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const callRecognitionRef = useRef<any>(null)
  const callActiveRef = useRef(false)
  const callMessagesRef = useRef<AIMessage[]>([])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef       = useRef<HTMLInputElement>(null)
  const hasInitialized = useRef(false)

  useEffect(() => {
    if (hasInitialized.current) return
    hasInitialized.current = true
    startNewSession('Job Interview')
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Call timer
  useEffect(() => {
    if (callActive) {
      setCallDuration(0)
      callTimerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000)
    } else {
      if (callTimerRef.current) clearInterval(callTimerRef.current)
    }
    return () => { if (callTimerRef.current) clearInterval(callTimerRef.current) }
  }, [callActive])

  function formatDuration(s: number) {
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  }

  // ─── Chat mode functions ───────────────────────────────────────────────────

  async function startNewSession(sc: string) {
    setInitializing(true)
    setError(null)
    setMessages([])
    setSessionId(null)
    try {
      const greeting = await getInitialGreeting(sc)
      const { clean, corrections, score, scoreFeedback } = parseCorrections(greeting)
      const initialMsg: AIMessage = {
        role: 'assistant', content: clean, timestamp: new Date().toISOString(),
        corrections, score, scoreFeedback,
      }
      setMessages([initialMsg])
      if (user) {
        const dbMessages: ChatMessage[] = [{ role: 'assistant', content: clean, timestamp: initialMsg.timestamp }]
        const session = await saveSession({ user_id: user.id, scenario: sc, messages: dbMessages })
        if (session) setSessionId(session.id)
        const stats = await getUserStats(user.id)
        if (stats) await updateUserStats(user.id, { sessions_count: (stats.sessions_count || 0) + 1 })
      }
    } catch {
      setError('Could not connect to AI. Check your API key in .env')
    } finally {
      setInitializing(false)
    }
  }

  async function handleSelectScenario(sc: string) {
    if (sc === scenario && messages.length > 0) return
    setScenario(sc)
    setScenarioModalOpen(false)
    await startNewSession(sc)
  }

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return
    setError(null)
    const userMsg: AIMessage = {
      role: 'user', content: text.trim(), timestamp: new Date().toISOString(),
    }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInputText('')
    setLoading(true)
    try {
      const history = updated.map(m => ({ role: m.role, content: m.content }))
      const aiRaw = await sendMessageToAI(history, scenario)
      const { clean, corrections, score, scoreFeedback } = parseCorrections(aiRaw)
      const aiMsg: AIMessage = {
        role: 'assistant', content: clean, timestamp: new Date().toISOString(),
        corrections, score, scoreFeedback,
      }
      const final = [...updated, aiMsg]
      setMessages(final)
      if (sessionId) {
        const dbMsgs: ChatMessage[] = final.map(m => ({ role: m.role, content: m.content, timestamp: m.timestamp }))
        await updateSession(sessionId, dbMsgs)
      }
      // XP: score-based (score * 5) or flat 10
      if (user) {
        const stats = await getUserStats(user.id)
        if (stats) {
          const xpGain = score ? score * 5 : 10
          const newXp = (stats.xp || 0) + xpGain
          const newLevel = Math.floor(newXp / 500) + 1
          await updateUserStats(user.id, { xp: newXp, level: newLevel })
        }
      }
    } catch {
      setError('AI response failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleMic() {
    if (micActive) { setMicActive(false); return }
    setMicActive(true)
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SR) {
      const r = new SR()
      r.lang = 'en-US'; r.continuous = false; r.interimResults = false
      r.onresult = (e: any) => { setMicActive(false); sendMessage(e.results[0][0].transcript) }
      r.onerror = () => { setMicActive(false); setError('Microphone error. Please type instead.') }
      r.onend = () => setMicActive(false)
      r.start()
    } else {
      setTimeout(() => { setMicActive(false); setKeyboardOpen(true) }, 1500)
    }
  }

  // ─── Call mode functions ───────────────────────────────────────────────────

  async function startCall() {
    callActiveRef.current = true
    setCallActive(true)
    setCallMessages([])
    callMessagesRef.current = []
    setCallSummary(null)
    setCallLoading(true)
    try {
      const greeting = await getInitialGreeting(scenario)
      const { clean } = parseCorrections(greeting)
      const msg: AIMessage = { role: 'assistant', content: clean, timestamp: new Date().toISOString() }
      callMessagesRef.current = [msg]
      setCallMessages([msg])
      speakText(clean)
    } catch {
      callActiveRef.current = false
      setCallActive(false)
    } finally {
      setCallLoading(false)
    }
  }

  function speakText(text: string) {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = 0.95
    utterance.pitch = 1
    const voices = window.speechSynthesis.getVoices()
    const eng = voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('female'))
      || voices.find(v => v.lang.startsWith('en'))
    if (eng) utterance.voice = eng
    utterance.onend = () => {
      // Use ref — not stale closure state
      if (callActiveRef.current) startCallListening()
    }
    window.speechSynthesis.speak(utterance)
  }

  function startCallListening() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR || !callActiveRef.current) return
    const r = new SR()
    callRecognitionRef.current = r
    r.lang = 'en-US'; r.continuous = false; r.interimResults = false
    r.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript
      handleCallUserSpeech(transcript)
    }
    r.onerror = (e: any) => {
      // Retry listening on no-speech error
      if (e.error === 'no-speech' && callActiveRef.current) {
        setTimeout(() => startCallListening(), 500)
      }
    }
    r.onend = () => {
      // If call still active and no result triggered, restart
      if (callActiveRef.current && !callRecognitionRef.current?._gotResult) {
        setTimeout(() => startCallListening(), 300)
      }
    }
    r._gotResult = false
    r.start()
  }

  async function handleCallUserSpeech(text: string) {
    if (!callActiveRef.current) return
    // Mark that we got a result so onend doesn't restart
    if (callRecognitionRef.current) callRecognitionRef.current._gotResult = true

    const userMsg: AIMessage = { role: 'user', content: text, timestamp: new Date().toISOString() }
    const updatedMsgs = [...callMessagesRef.current, userMsg]
    callMessagesRef.current = updatedMsgs
    setCallMessages([...updatedMsgs])
    setCallLoading(true)

    try {
      const history = updatedMsgs.map(m => ({ role: m.role, content: m.content }))
      const aiRaw = await sendMessageToAI(history, scenario)
      const { clean } = parseCorrections(aiRaw)
      const aiMsg: AIMessage = { role: 'assistant', content: clean, timestamp: new Date().toISOString() }
      const finalMsgs = [...callMessagesRef.current, aiMsg]
      callMessagesRef.current = finalMsgs
      setCallMessages([...finalMsgs])
      setCallLoading(false)
      if (callActiveRef.current) speakText(clean)
    } catch {
      setCallLoading(false)
      if (callActiveRef.current) startCallListening()
    }
  }

  async function endCall() {
    callActiveRef.current = false
    setCallActive(false)
    window.speechSynthesis?.cancel()
    callRecognitionRef.current?.stop()
    if (callTimerRef.current) clearInterval(callTimerRef.current)

    const userMessages = callMessagesRef.current
      .filter(m => m.role === 'user')
      .map(m => m.content)

    if (userMessages.length === 0) {
      setCallMessages([])
      return
    }

    setSummaryLoading(true)
    try {
      const summary = await generateCallSummary(userMessages, scenario)
      setCallSummary(summary)

      // Save XP
      if (user) {
        const stats = await getUserStats(user.id)
        if (stats) {
          const newXp = (stats.xp || 0) + summary.totalXp
          const newLevel = Math.floor(newXp / 500) + 1
          await updateUserStats(user.id, { xp: newXp, level: newLevel })
        }
      }
    } catch {
      setCallSummary({
        overallScore: 7,
        totalXp: userMessages.length * 15,
        strengths: ['Good effort'],
        mistakes: [],
        encouragement: 'Keep practicing!',
      })
    } finally {
      setSummaryLoading(false)
    }
  }

  const currentScenario = SCENARIOS.find(s => s.id === scenario)

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] h-[calc(100vh-68px-70px)] md:h-[calc(100vh-68px)]">

      {/* ── Sidebar ── */}
      <div className="hidden md:flex bg-brand-secondary border-r border-brand-border flex-col py-5 overflow-hidden">
        <div className="px-5 pb-4 border-b border-brand-border">
          <h3 className="text-base font-bold font-display">Scenarios</h3>
          <p className="text-xs text-brand-muted mt-1">Choose your practice topic</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {SCENARIOS.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => handleSelectScenario(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                ${scenario === id ? 'bg-brand-purple text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>
        {/* Mode switcher */}
        <div className="px-3 mt-2 mb-2">
          <div className="flex bg-brand-card2 border border-brand-border rounded-xl p-1 gap-1">
            <button onClick={() => setAppMode('chat')}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all
                ${appMode === 'chat' ? 'bg-brand-purple text-white' : 'text-slate-400 hover:text-white'}`}>
              <Keyboard className="w-3 h-3" /> Chat
            </button>
            <button onClick={() => setAppMode('call')}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all
                ${appMode === 'call' ? 'bg-brand-purple text-white' : 'text-slate-400 hover:text-white'}`}>
              <Phone className="w-3 h-3" /> Call
            </button>
          </div>
        </div>
        <div className="px-3">
          <button onClick={() => startNewSession(scenario)}
            className="w-full bg-brand-card border border-brand-border hover:border-brand-purple text-white rounded-xl p-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all">
            <span className="text-lg leading-none">+</span> New Session
          </button>
        </div>
      </div>

      {/* ── Main area ── */}
      <div className="flex flex-col h-full relative bg-brand-bg">

        {/* Mobile header */}
        <div className="md:hidden flex items-center justify-between p-3 border-b border-brand-border bg-brand-secondary gap-2">
          <div className="font-display text-sm font-bold flex items-center gap-2 min-w-0">
            {currentScenario && <currentScenario.Icon className="w-4 h-4 text-brand-purple-light flex-shrink-0" />}
            <span className="truncate">{scenario}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Mobile mode toggle */}
            <div className="flex bg-brand-card2 border border-brand-border rounded-lg p-0.5 gap-0.5">
              <button onClick={() => setAppMode('chat')}
                className={`px-2 py-1 rounded text-[10px] font-semibold flex items-center gap-1 transition-all
                  ${appMode === 'chat' ? 'bg-brand-purple text-white' : 'text-slate-400'}`}>
                <Keyboard className="w-3 h-3" /> Chat
              </button>
              <button onClick={() => setAppMode('call')}
                className={`px-2 py-1 rounded text-[10px] font-semibold flex items-center gap-1 transition-all
                  ${appMode === 'call' ? 'bg-brand-purple text-white' : 'text-slate-400'}`}>
                <Phone className="w-3 h-3" /> Call
              </button>
            </div>
            <button onClick={() => setScenarioModalOpen(true)}
              className="flex items-center gap-1 text-[11px] bg-brand-card border border-brand-border px-2 py-1.5 rounded-md text-slate-300">
              Change <ChevronDown className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* ═══ CALL MODE ═══════════════════════════════════════════════════ */}
        {appMode === 'call' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
            {!callActive && !summaryLoading && (
              <>
                <div className="text-center">
                  <div className="w-24 h-24 rounded-full bg-brand-purple/10 border-2 border-brand-purple/30 flex items-center justify-center mx-auto mb-4">
                    {currentScenario && <currentScenario.Icon className="w-10 h-10 text-brand-purple-light" />}
                  </div>
                  <h2 className="text-xl font-bold mb-1">{scenario}</h2>
                  <p className="text-sm text-slate-400 max-w-xs">
                    Start a voice call with your AI tutor. Speak naturally in English and get a full analysis when you're done.
                  </p>
                </div>
                <button onClick={startCall}
                  className="w-20 h-20 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center shadow-[0_0_0_12px_rgba(16,185,129,0.15)] transition-all hover:scale-105">
                  <Phone className="w-8 h-8" />
                </button>
                <p className="text-xs text-slate-500">Tap to start call</p>
              </>
            )}

            {summaryLoading && (
              <div className="text-center">
                <Loader2 className="w-10 h-10 animate-spin text-brand-purple-light mx-auto mb-4" />
                <p className="text-slate-400 text-sm">Analyzing your session...</p>
              </div>
            )}

            {callActive && (
              <div className="w-full max-w-sm flex flex-col items-center gap-6">
                {/* Duration */}
                <div className="text-center">
                  <div className="text-4xl font-mono font-bold text-white mb-1">{formatDuration(callDuration)}</div>
                  <div className="text-xs text-slate-400">{scenario} · AI Tutor</div>
                </div>

                {/* AI avatar with pulse */}
                <div className="relative">
                  <div className={`w-28 h-28 rounded-full bg-brand-purple/20 border-2 border-brand-purple/40 flex items-center justify-center ${callLoading ? 'animate-pulse' : ''}`}>
                    <Bot className="w-12 h-12 text-brand-purple-light" />
                  </div>
                  {callLoading && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-1 bg-brand-card border border-brand-border rounded-full px-3 py-1.5">
                      <div className="w-1.5 h-1.5 bg-brand-purple-light rounded-full typing-dot" />
                      <div className="w-1.5 h-1.5 bg-brand-purple-light rounded-full typing-dot" />
                      <div className="w-1.5 h-1.5 bg-brand-purple-light rounded-full typing-dot" />
                    </div>
                  )}
                </div>

                {/* Last message bubble */}
                {callMessages.length > 0 && (
                  <div className="w-full bg-brand-card border border-brand-border rounded-2xl p-4 text-sm text-center max-h-24 overflow-hidden">
                    <p className="text-slate-300 line-clamp-3">
                      {callMessages[callMessages.length - 1].content}
                    </p>
                  </div>
                )}

                {/* Messages count */}
                <p className="text-xs text-slate-500">
                  {callMessages.filter(m => m.role === 'user').length} responses so far
                </p>

                {/* End call */}
                <button onClick={endCall}
                  className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-400 text-white flex items-center justify-center shadow-[0_0_0_8px_rgba(239,68,68,0.15)] transition-all">
                  <PhoneOff className="w-6 h-6" />
                </button>
                <p className="text-xs text-slate-500 -mt-4">Tap to end & get your results</p>
              </div>
            )}
          </div>
        )}

        {/* ═══ CHAT MODE ═══════════════════════════════════════════════════ */}
        {appMode === 'chat' && (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 md:p-10 flex flex-col gap-5">
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
                  className={`flex items-start gap-2 md:gap-3 max-w-[90%] md:max-w-[680px]
                    ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
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
                    {/* Score chip on user messages */}
                    {msg.role === 'user' && msg.score != null && (
                      <div className="flex justify-end">
                        <ScoreChip score={msg.score} feedback={msg.scoreFeedback} />
                      </div>
                    )}
                    {/* Corrections on assistant messages (after user's turn) */}
                    {msg.role === 'assistant' && msg.corrections && msg.corrections.length > 0 && msg.corrections[0] !== 'No corrections needed' && (
                      <div className="bg-brand-purple/10 border border-brand-purple/20 rounded-xl px-4 py-2.5 text-xs text-brand-purple-light">
                        {msg.corrections.map((c, j) => (
                          <div key={j} className="flex items-start gap-2">
                            <span className="text-brand-purple font-bold mt-0.5">✦</span>
                            <span>{c}</span>
                          </div>
                        ))}
                      </div>
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
            <div className="p-3 md:p-5 px-4 md:px-10 border-t border-brand-border bg-brand-bg/95 backdrop-blur">
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
                  <button onClick={() => { setMessages([]); startNewSession(scenario) }}
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
                    onKeyDown={e => { if (e.key === 'Enter') sendMessage(inputText) }}
                    placeholder="Type your message in English..."
                    className="flex-1 bg-brand-card border border-brand-border rounded-xl px-3 py-2 md:px-4 md:py-3 text-brand-text text-[14px] md:text-[15px] outline-none focus:border-brand-purple placeholder-slate-500"
                    autoFocus />
                  <button onClick={() => sendMessage(inputText)}
                    disabled={loading || !inputText.trim()}
                    className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-brand-purple text-white flex items-center justify-center hover:bg-brand-purple-light disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0">
                    <Send className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Mobile Scenario Modal ── */}
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
                <button key={id} onClick={() => handleSelectScenario(id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
                    ${scenario === id
                      ? 'bg-brand-purple text-white'
                      : 'bg-brand-card2 border border-brand-border text-slate-300 hover:border-brand-purple hover:text-white'}`}>
                  <Icon className="w-4 h-4" /> {label}
                  {scenario === id && <span className="ml-auto text-xs opacity-70">Active</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Call Summary Modal ── */}
      {callSummary && (
        <CallSummaryModal
          summary={callSummary}
          onClose={() => { setCallSummary(null); setCallMessages([]) }}
          onNewCall={() => { setCallSummary(null); setCallMessages([]); startCall() }}
        />
      )}
    </div>
  )
}