import { Mic, ArrowRight, BarChart2, Trophy, Flame } from 'lucide-react'
import { useAuth } from '../lib/authContext'
import { type UserStats } from '../lib/supabase'
import heroImage from '../assets/images/ChatGPT Image May 20, 2026, 03_40_25 PM.png'
type Page = 'home' | 'chat' | 'leaderboard' | 'profile'

interface HomePageProps {
  onNavigate: (page: Page) => void
  stats: UserStats | null
  onClaimQuest: () => void
}

export function HomePage({ onNavigate, stats, onClaimQuest }: HomePageProps) {
  const { user } = useAuth()
  const firstName = user?.firstName || 'there'

  // Only show streak data if stats exist (real user data)
  const streak = stats?.streak ?? 0
  const streakGoal = 7
  const streakPct = Math.min(100, Math.round((streak / streakGoal) * 100))

  return (
    <div className="min-h-[calc(100vh-120px)] pt-10 md:pt-20 pb-10 md:pb-20 px-4 md:px-10 max-w-7xl mx-auto">
      {/* Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_460px] gap-10 md:gap-16 items-center mb-10 md:mb-16">
        <div className="animate-fade-up flex flex-col justify-center py-6 text-center lg:text-left">
          {user && (
            <div className="inline-flex items-center gap-2 bg-brand-purple/10 border border-brand-purple/20 text-brand-purple-light px-4 py-2 rounded-full text-sm font-semibold mb-6 self-center lg:self-start">
              <span className="w-2 h-2 bg-brand-green rounded-full animate-pulse" />
              Welcome back, {firstName}!
            </div>
          )}
          <h1 className="text-3xl lg:text-6xl font-extrabold leading-[1.15] mb-4 md:mb-6 tracking-tight">
            Empower Your English Communication Through{' '}
            <span className="bg-gradient-to-r from-brand-purple-light to-purple-400 bg-clip-text text-transparent">
              Artificial Intelligence
            </span>
          </h1>
          <p className="text-slate-400 text-base md:text-lg leading-relaxed mb-8 md:mb-10 max-w-2xl mx-auto lg:mx-0">
            Practice speaking naturally, master pronunciation, and break the fear barrier with instant AI feedback.
          </p>
          <div className="flex justify-center lg:justify-start gap-4">
            <button
              onClick={() => onNavigate('chat')}
              className="inline-flex items-center gap-3 bg-brand-purple text-white px-6 md:px-8 py-3 md:py-4 rounded-xl text-[15px] md:text-[16px] font-semibold hover:bg-brand-purple-light transition-all shadow-lg shadow-brand-purple/20"
            >
              <Mic className="w-5 h-5" /> Start AI Conversation
            </button>
          </div>
        </div>

        <div
          className="bg-brand-card rounded-[24px] md:rounded-[32px] border border-brand-border overflow-hidden aspect-[4/3] lg:aspect-square relative animate-fade-up shadow-2xl"
          style={{ animationDelay: '0.1s' }}
        >
          <img
            src={heroImage}
            alt="AI English Practice"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-bg/60 via-transparent to-brand-purple/10 pointer-events-none" />
        </div>
      </div>

      {/* Streak Banner */}
      <div
        className="bg-brand-card border border-brand-border rounded-xl p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4 md:gap-5 animate-fade-up mt-8 mb-10"
        style={{ animationDelay: '0.15s' }}
      >
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="w-11 h-11 bg-brand-orange/15 rounded-xl flex items-center justify-center flex-shrink-0">
            <Flame className="w-6 h-6 text-brand-orange fill-orange-500/20" />
          </div>
          <div>
            <h4 className="text-base font-bold mb-0.5">
              {streak > 0 ? `${streak} Day${streak > 1 ? 's' : ''} Streak!` : 'Start Your Streak!'}
            </h4>
            <p className="text-xs md:text-sm text-slate-400">
              {streak > 0 ? 'Keep up the momentum.' : 'Practice daily to build your streak.'}
            </p>
          </div>
        </div>
        <div className="md:ml-auto flex flex-col w-full md:w-auto md:items-end gap-1.5 md:min-w-[280px]">
          <div className="flex justify-between w-full text-xs text-slate-400">
            <span>Progress to Weekly Goal</span>
            <span className="text-brand-green font-semibold">{streak}/{streakGoal} Days</span>
          </div>
          <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-green to-emerald-300 rounded-full transition-all duration-700"
              style={{ width: `${streakPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Quick Access */}
      <div className="pb-10 md:pb-20 animate-fade-up" style={{ animationDelay: '0.2s' }}>
        <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">Quick Access</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">

          <button
            onClick={() => onNavigate('chat')}
            className="bg-brand-card border border-brand-border rounded-[18px] p-5 md:p-6 transition-all hover:border-brand-purple text-left group"
          >
            <div className="w-10 h-10 md:w-12 md:h-12 bg-brand-card2 rounded-xl flex items-center justify-center mb-4 text-brand-text group-hover:text-brand-purple transition-colors">
              <Mic className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <h3 className="text-base md:text-lg font-bold mb-2">AI Voice Chat</h3>
            <p className="text-xs md:text-sm text-slate-400 leading-relaxed mb-4">
              Start a live spoken conversation with your AI tutor in real-life scenarios.
            </p>
            <div className="text-brand-green text-xs md:text-sm font-semibold flex items-center gap-1">
              Start Now <ArrowRight className="w-3 h-3 md:w-4 md:h-4" />
            </div>
          </button>

          <button
            onClick={() => onNavigate('profile')}
            className="bg-brand-card border border-brand-border rounded-[18px] p-5 md:p-6 transition-all hover:border-brand-purple text-left group"
          >
            <div className="w-10 h-10 md:w-12 md:h-12 bg-brand-green/10 rounded-xl flex items-center justify-center mb-4 text-brand-green">
              <BarChart2 className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <h3 className="text-base md:text-lg font-bold mb-2">Your Progress</h3>
            <p className="text-xs md:text-sm text-slate-400 leading-relaxed mb-4">
              Track your fluency growth, vocabulary, and speaking hours over time.
            </p>
            <div className="text-brand-green text-xs md:text-sm font-semibold flex items-center gap-1">
              View Analytics <ArrowRight className="w-3 h-3 md:w-4 md:h-4" />
            </div>
          </button>

          <button
            onClick={() => onNavigate('chat')}
            className="bg-brand-card border border-brand-border rounded-[18px] p-5 md:p-6 transition-all hover:border-brand-purple text-left group sm:col-span-2 md:col-span-1"
          >
            <div className="w-10 h-10 md:w-12 md:h-12 bg-brand-gold/10 rounded-xl flex items-center justify-center mb-4 text-brand-gold">
              <Trophy className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <h3 className="text-base md:text-lg font-bold mb-2">Daily Quest</h3>
            <p className="text-xs md:text-sm text-slate-400 leading-relaxed mb-4">
              Complete a 5-minute topic today to earn{' '}
              <span className="text-brand-green font-bold">200 bonus XP</span>.
            </p>
            <div className="text-brand-purple-light text-xs md:text-sm font-semibold flex items-center gap-1">
              Claim Quest <ArrowRight className="w-3 h-3 md:w-4 md:h-4" />
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}