import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, XCircle, Clock, Trophy, ArrowLeft, Loader2, RotateCcw } from 'lucide-react'
import {
  QUIZ_TOPICS,
  QUESTIONS_PER_TOPIC,
  generateQuizQuestions,
  type QuizTopic,
  type QuizQuestion,
} from '../lib/quizData'
import { useAuth } from '../lib/authContext'
import { updateUserStats, type UserStats } from '../lib/supabase'

type Stage = 'topics' | 'setup' | 'loading' | 'playing' | 'results'

const COUNT_OPTIONS = [10, 25, 50, 100]
const SECONDS_PER_QUESTION = 20

interface QuizPageProps {
  stats: UserStats | null
  onStatsUpdate: (s: UserStats) => void
}

export function QuizPage({ stats, onStatsUpdate }: QuizPageProps) {
  const { user } = useAuth()
  const [stage, setStage] = useState<Stage>('topics')
  const [topic, setTopic] = useState<QuizTopic | null>(null)
  const [count, setCount] = useState(10)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [answers, setAnswers] = useState<(number | null)[]>([])
  const [timeLeft, setTimeLeft] = useState(SECONDS_PER_QUESTION)
  const timerRef = useRef<number | null>(null)

  function pickTopic(t: QuizTopic) {
    setTopic(t)
    setStage('setup')
  }

  async function startQuiz() {
    if (!topic) return
    setStage('loading')
    const qs = await generateQuizQuestions(topic.id, count)
    setQuestions(qs)
    setAnswers(new Array(qs.length).fill(null))
    setCurrent(0)
    setSelected(null)
    setTimeLeft(SECONDS_PER_QUESTION)
    setStage('playing')
  }

  // Countdown timer per question
  useEffect(() => {
    if (stage !== 'playing') return
    if (timerRef.current) window.clearInterval(timerRef.current)
    timerRef.current = window.setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          window.clearInterval(timerRef.current!)
          handleAnswer(null)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, stage])

  function handleAnswer(optionIndex: number | null) {
    if (selected !== null) return // already answered this question
    setSelected(optionIndex ?? -1)
    setAnswers(prev => {
      const next = [...prev]
      next[current] = optionIndex
      return next
    })
    window.setTimeout(() => {
      if (current + 1 < questions.length) {
        setCurrent(c => c + 1)
        setSelected(null)
        setTimeLeft(SECONDS_PER_QUESTION)
      } else {
        finishQuiz()
      }
    }, 1200)
  }

  async function finishQuiz() {
    setStage('results')
    const correctCount = answers.reduce<number>(
      (acc, a, i) => acc + (a === questions[i].correctIndex ? 1 : 0),
      0
    )
    const earnedXP = correctCount * 10
    if (user && stats) {
      const updated = await updateUserStats(user.id, { xp: (stats.xp || 0) + earnedXP })
      if (updated) onStatsUpdate(updated)
    }
  }

  function scoreCount() {
    return answers.reduce<number>((acc, a, i) => acc + (a === questions[i]?.correctIndex ? 1 : 0), 0)
  }

  function reset() {
    setStage('topics')
    setTopic(null)
    setQuestions([])
    setAnswers([])
    setCurrent(0)
    setSelected(null)
  }

  // ---------- TOPICS ----------
  if (stage === 'topics') {
    return (
      <div className="min-h-[calc(100vh-120px)] pt-10 md:pt-16 pb-16 px-4 md:px-10 max-w-6xl mx-auto">
        <div className="mb-10 text-center">
          <h1 className="text-3xl md:text-5xl font-extrabold mb-3 tracking-tight">
            Quiz <span className="bg-gradient-to-r from-brand-purple-light to-purple-400 bg-clip-text text-transparent">Arena</span>
          </h1>
          <p className="text-slate-400 max-w-xl mx-auto">
            Pick a topic and test your English. Each topic has a bank of {QUESTIONS_PER_TOPIC} questions — play 10, 25, 50, or go for all 100.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {QUIZ_TOPICS.map(t => (
            <button
              key={t.id}
              onClick={() => pickTopic(t)}
              className="text-left bg-brand-card border border-brand-border hover:border-brand-purple/50 rounded-2xl p-5 transition-all hover:-translate-y-0.5 group"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4"
                style={{ backgroundColor: `${t.color}22` }}
              >
                {t.icon}
              </div>
              <h3 className="font-display font-bold text-lg text-white mb-1 group-hover:text-brand-purple-light transition-colors">
                {t.title}
              </h3>
              <p className="text-slate-400 text-sm">{t.description}</p>
              <div className="mt-4 text-xs font-semibold text-slate-500">{QUESTIONS_PER_TOPIC} questions available</div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ---------- SETUP ----------
  if (stage === 'setup' && topic) {
    return (
      <div className="min-h-[calc(100vh-120px)] pt-10 md:pt-16 pb-16 px-4 md:px-10 max-w-2xl mx-auto">
        <button onClick={reset} className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to topics
        </button>

        <div className="bg-brand-card border border-brand-border rounded-2xl p-6 md:p-8 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4"
            style={{ backgroundColor: `${topic.color}22` }}
          >
            {topic.icon}
          </div>
          <h2 className="font-display text-2xl font-bold text-white mb-2">{topic.title}</h2>
          <p className="text-slate-400 mb-8">{topic.description}</p>

          <p className="text-sm font-semibold text-slate-300 mb-3">How many questions?</p>
          <div className="grid grid-cols-4 gap-3 mb-8">
            {COUNT_OPTIONS.map(c => (
              <button
                key={c}
                onClick={() => setCount(c)}
                className={`py-3 rounded-xl font-bold text-sm border transition-all ${
                  count === c
                    ? 'bg-brand-purple text-white border-brand-purple'
                    : 'bg-brand-card2 text-slate-300 border-brand-border hover:border-brand-purple/50'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <button
            onClick={startQuiz}
            className="w-full bg-brand-purple hover:bg-brand-purple-light text-white py-3.5 rounded-xl font-semibold transition-all shadow-lg shadow-brand-purple/20"
          >
            Start Quiz
          </button>
        </div>
      </div>
    )
  }

  // ---------- LOADING ----------
  if (stage === 'loading') {
    return (
      <div className="min-h-[calc(100vh-120px)] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-brand-purple animate-spin" />
        <p className="text-slate-400 text-sm">Preparing your {count} questions...</p>
      </div>
    )
  }

  // ---------- PLAYING ----------
  if (stage === 'playing' && questions.length > 0) {
    const q = questions[current]
    const progressPct = Math.round((current / questions.length) * 100)

    return (
      <div className="min-h-[calc(100vh-120px)] pt-8 md:pt-12 pb-16 px-4 md:px-10 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4 text-sm text-slate-400">
          <span>Question {current + 1} / {questions.length}</span>
          <span className="flex items-center gap-1 font-semibold text-brand-purple-light">
            <Clock className="w-4 h-4" /> {timeLeft}s
          </span>
        </div>

        <div className="w-full h-2 bg-brand-card2 rounded-full mb-8 overflow-hidden">
          <div
            className="h-full bg-brand-purple transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="bg-brand-card border border-brand-border rounded-2xl p-6 md:p-8 mb-6">
          <h2 className="font-display text-xl md:text-2xl font-bold text-white leading-snug">{q.question}</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {q.options.map((opt, i) => {
            const isCorrect = i === q.correctIndex
            const isSelected = selected === i
            const revealed = selected !== null

            let styles = 'bg-brand-card2 border-brand-border text-slate-200 hover:border-brand-purple/50'
            if (revealed && isCorrect) styles = 'bg-brand-green/15 border-brand-green text-brand-green'
            else if (revealed && isSelected && !isCorrect) styles = 'bg-red-500/15 border-red-500 text-red-400'
            else if (revealed) styles = 'bg-brand-card2 border-brand-border text-slate-500 opacity-60'

            return (
              <button
                key={i}
                disabled={selected !== null}
                onClick={() => handleAnswer(i)}
                className={`flex items-center justify-between gap-3 text-left px-5 py-4 rounded-xl border font-medium transition-all ${styles}`}
              >
                <span>{opt}</span>
                {revealed && isCorrect && <CheckCircle2 className="w-5 h-5 flex-shrink-0" />}
                {revealed && isSelected && !isCorrect && <XCircle className="w-5 h-5 flex-shrink-0" />}
              </button>
            )
          })}
        </div>

        {selected !== null && q.explanation && (
          <p className="mt-5 text-sm text-slate-400 bg-brand-card2 border border-brand-border rounded-xl p-4">
            💡 {q.explanation}
          </p>
        )}
      </div>
    )
  }

  // ---------- RESULTS ----------
  if (stage === 'results') {
    const correct = scoreCount()
    const total = questions.length
    const pct = Math.round((correct / total) * 100)
    const xpEarned = correct * 10

    return (
      <div className="min-h-[calc(100vh-120px)] flex items-center justify-center px-4">
        <div className="bg-brand-card border border-brand-border rounded-2xl p-8 max-w-md w-full text-center">
          <Trophy className="w-14 h-14 text-brand-gold mx-auto mb-4" />
          <h2 className="font-display text-2xl font-bold text-white mb-1">Quiz Complete!</h2>
          <p className="text-slate-400 mb-6">{topic?.title}</p>

          <div className="text-5xl font-extrabold text-brand-purple-light mb-2">{pct}%</div>
          <p className="text-slate-300 mb-6">
            {correct} out of {total} correct
          </p>

          <div className="flex items-center justify-center gap-2 bg-brand-green/10 border border-brand-green/20 text-brand-green px-4 py-2 rounded-full text-sm font-bold mb-8 w-fit mx-auto">
            +{xpEarned} XP earned
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStage('setup')}
              className="flex-1 flex items-center justify-center gap-2 bg-brand-card2 border border-brand-border text-slate-200 py-3 rounded-xl font-semibold hover:border-brand-purple/50 transition-all"
            >
              <RotateCcw className="w-4 h-4" /> Retry
            </button>
            <button
              onClick={reset}
              className="flex-1 bg-brand-purple hover:bg-brand-purple-light text-white py-3 rounded-xl font-semibold transition-all"
            >
              More Topics
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
