import { useState, useRef, useEffect } from 'react'
import {
  Mic, Square, Keyboard, PhoneOff, Send,
  Bot, User, Briefcase, Coffee, Stethoscope,
  Plane, Users, AlertCircle, Loader2, ChevronDown, X,
} from 'lucide-react'
import { useAuth } from '../lib/authContext'
import { sendMessageToAI, getInitialGreeting, parseCorrections } from '../lib/ai'
import { saveSession, updateSession, updateUserStats, getUserStats } from '../lib/supabase'
import type { ChatMessage } from '../lib/supabase'

interface AIMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  corrections?: string[]
}

const SCENARIOS = [
  { id: 'Job Interview',       label: 'Job Interview',    Icon: Briefcase   },
  { id: 'Coffee Shop',         label: 'Coffee Shop',      Icon: Coffee      },
  { id: 'Medical Appointment', label: 'Medical Appt.',    Icon: Stethoscope },
  { id: 'Airport & Travel',    label: 'Airport & Travel', Icon: Plane       },
  { id: 'Business Meeting',    label: 'Business Meeting', Icon: Users       },
]

export function ChatPage() {
  const { user } = useAuth()
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

  const messagesEndRef  = useRef<HTMLDivElement>(null)
  const inputRef        = useRef<HTMLInputElement>(null)
  const hasInitialized  = useRef(false)

  useEffect(() => {
    if (hasInitialized.current) return
    hasInitialized.current = true
    startNewSession('Job Interview')
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function startNewSession(sc: string) {
    setInitializing(true)
    setError(null)
    setMessages([])
    setSessionId(null)
    try {
      const greeting = await getInitialGreeting(sc)
      const { clean, corrections } = parseCorrections(greeting)
      const initialMsg: AIMessage = {
        role: 'assistant',
        content: clean,
        timestamp: new Date().toISOString(),
        corrections,
      }
      setMessages([initialMsg])
      if (user) {
        const dbMessages: ChatMessage[] = [
          { role: 'assistant', content: clean, timestamp: initialMsg.timestamp },
        ]
        const session = await saveSession({
          user_id: user.id,
          scenario: sc,
          messages: dbMessages,
        })
        if (session) setSessionId(session.id)

        // Increment sessions count in user stats
        const stats = await getUserStats(user.id)
        if (stats) {
          await updateUserStats(user.id, {
            sessions_count: (stats.sessions_count || 0) + 1,
          })
        }
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
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInputText('')
    setLoading(true)
    try {
      const history = updated.map(m => ({ role: m.role, content: m.content }))
      const aiRaw = await sendMessageToAI(history, scenario)
      const { clean, corrections } = parseCorrections(aiRaw)
      const aiMsg: AIMessage = {
        role: 'assistant',
        content: clean,
        timestamp: new Date().toISOString(),
        corrections,
      }
      const final = [...updated, aiMsg]
      setMessages(final)

      // Update session in DB
      if (sessionId) {
        const dbMsgs: ChatMessage[] = final.map(m => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        }))
        await updateSession(sessionId, dbMsgs)
      }

      // Award XP per AI response (10 XP per message)
      if (user) {
        const stats = await getUserStats(user.id)
        if (stats) {
          const newXp = (stats.xp || 0) + 10
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
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.lang            = 'en-US'
      recognition.continuous      = false
      recognition.interimResults  = false
      recognition.onresult = (event: any) => {
        setMicActive(false)
        sendMessage(event.results[0][0].transcript)
      }
      recognition.onerror = () => {
        setMicActive(false)
        setError('Microphone error. Please type instead.')
      }
      recognition.onend = () => setMicActive(false)
      recognition.start()
    } else {
      setTimeout(() => {
        setMicActive(false)
        setKeyboardOpen(true)
        setTimeout(() => inputRef.current?.focus(), 100)
      }, 1500)
    }
  }

  const currentScenario = SCENARIOS.find(s => s.id === scenario)

  return (
    <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] h-[calc(100vh-68px-70px)] md:h-[calc(100vh-68px)]">

      {/* ── Sidebar (desktop) ── */}
      <div className="hidden md:flex bg-brand-secondary border-r border-brand-border flex-col py-5 overflow-hidden">
        <div className="px-5 pb-4 border-b border-brand-border">
          <h3 className="text-base font-bold font-display">Scenarios</h3>
          <p className="text-xs text-brand-muted mt-1">Choose your practice topic</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {SCENARIOS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => handleSelectScenario(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                ${scenario === id
                  ? 'bg-brand-purple text-white'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>
        <div className="px-3">
          <button
            onClick={() => startNewSession(scenario)}
            className="w-full bg-brand-card border border-brand-border hover:border-brand-purple text-white rounded-xl p-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all"
          >
            <span className="text-lg leading-none">+</span> New Session
          </button>
        </div>
      </div>

      {/* ── Chat area ── */}
      <div className="flex flex-col h-full relative bg-brand-bg">

        {/* Mobile header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-brand-border bg-brand-secondary">
          <div className="font-display text-sm font-bold flex items-center gap-2">
            {currentScenario && <currentScenario.Icon className="w-4 h-4 text-brand-purple-light" />}
            {scenario}
          </div>
          <button
            onClick={() => setScenarioModalOpen(true)}
            className="flex items-center gap-1.5 text-xs bg-brand-card border border-brand-border px-3 py-1.5 rounded-md text-slate-300 hover:border-brand-purple transition-all"
          >
            Change <ChevronDown className="w-3 h-3" />
          </button>
        </div>

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
            <div
              key={i}
              className={`flex items-start gap-2 md:gap-3 max-w-[90%] md:max-w-[680px]
                ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
            >
              <div className={`w-8 h-8 md:w-9 md:h-9 rounded-full flex-shrink-0 flex items-center justify-center
                ${msg.role === 'assistant'
                  ? 'bg-brand-purple/10 border border-brand-purple/30'
                  : 'bg-brand-card2 border border-brand-border'}`}
              >
                {msg.role === 'assistant'
                  ? <Bot  className="w-4 h-4 md:w-5 md:h-5 text-brand-purple-light" />
                  : <User className="w-4 h-4 md:w-5 md:h-5 text-slate-300" />}
              </div>
              <div className="flex flex-col gap-2">
                <div className={`px-4 py-3 md:px-5 md:py-3.5 rounded-2xl text-[14px] md:text-[15px] leading-relaxed
                  ${msg.role === 'assistant'
                    ? 'bg-brand-card border border-brand-border rounded-tl-sm'
                    : 'bg-brand-card2 border border-brand-border rounded-tr-sm'}`}
                >
                  {msg.content}
                </div>
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
              <button
                onClick={() => setKeyboardOpen(true)}
                className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-brand-card border border-brand-border flex items-center justify-center text-slate-400 hover:bg-brand-card2 hover:text-white transition-all"
              >
                <Keyboard className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              <button
                onClick={handleMic}
                className={`w-14 h-14 md:w-16 md:h-16 rounded-full bg-brand-purple border-none cursor-pointer flex items-center justify-center text-white shadow-[0_0_0_8px_rgba(124,58,237,0.12)] transition-all mic-btn ${micActive ? 'recording' : ''}`}
              >
                {micActive
                  ? <Square className="w-6 h-6 md:w-7 md:h-7" />
                  : <Mic   className="w-6 h-6 md:w-7 md:h-7" />}
              </button>
              <button
                onClick={() => { setMessages([]); startNewSession(scenario) }}
                className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-all"
              >
                <PhoneOff className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 md:gap-3 w-full max-w-3xl mx-auto">
              <button
                onClick={() => setKeyboardOpen(false)}
                className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-brand-card border border-brand-border flex items-center justify-center text-slate-400 hover:bg-brand-card2 hover:text-white flex-shrink-0"
              >
                <Mic className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') sendMessage(inputText) }}
                placeholder="Type your message in English..."
                className="flex-1 bg-brand-card border border-brand-border rounded-xl px-3 py-2 md:px-4 md:py-3 text-brand-text text-[14px] md:text-[15px] outline-none focus:border-brand-purple placeholder-slate-500"
                autoFocus
              />
              <button
                onClick={() => sendMessage(inputText)}
                disabled={loading || !inputText.trim()}
                className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-brand-purple text-white flex items-center justify-center hover:bg-brand-purple-light disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              >
                <Send className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile Scenario Modal ── */}
      {scenarioModalOpen && (
        <div className="md:hidden fixed inset-0 z-[9999] flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setScenarioModalOpen(false)}
          />
          <div className="relative w-full bg-brand-card border-t border-brand-border rounded-t-2xl p-5 pb-8 z-10">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold font-display">Choose Scenario</h3>
              <button
                onClick={() => setScenarioModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-brand-card2 border border-brand-border flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {SCENARIOS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => handleSelectScenario(id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
                    ${scenario === id
                      ? 'bg-brand-purple text-white'
                      : 'bg-brand-card2 border border-brand-border text-slate-300 hover:border-brand-purple hover:text-white'}`}
                >
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
