import { useEffect, useRef, useState } from 'react'
import { Clock, BookOpen, MessageSquare, TrendingUp, Flame, ShieldCheck, Lock, BarChart2, BookIcon, Settings, LogOut } from 'lucide-react'
import { useAuth } from '../lib/authContext'
import { Chart, registerables } from 'chart.js'
import type { UserStats } from '../lib/supabase'

Chart.register(...registerables)

interface ProfilePageProps { stats: UserStats | null }
type Tab = '1W' | '4W' | '1Y'

function getChartData(t: Tab) {
  if (t === '1W') return { labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], data: [42,58,71,85,78,88,90] }
  if (t === '4W') return { labels: Array.from({length:16},(_,i)=>`Day ${i+1}`), data: [30,45,55,60,68,72,78,80,84,86,88,90,91,89,92,95] }
  return { labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], data: [20,35,45,55,60,65,70,73,78,81,85,90] }
}

function getLevelTitle(level: number): string {
  if (level < 5)  return 'Beginner A1'
  if (level < 10) return 'Elementary A2'
  if (level < 15) return 'Intermediate B1'
  if (level < 20) return 'Upper-Intermediate B2'
  if (level < 25) return 'Advanced C1'
  return 'Proficient C2'
}

export function ProfilePage({ stats }: ProfilePageProps) {
  const { user, signOut } = useAuth()
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstance = useRef<Chart | null>(null)
  const [tab, setTab] = useState<Tab>('1W')

  useEffect(() => {
    if (!chartRef.current) return
    if (chartInstance.current) chartInstance.current.destroy()
    const { labels, data } = getChartData(tab)
    chartInstance.current = new Chart(chartRef.current, {
      type: 'line',
      data: { labels, datasets: [{ label: 'Fluency', data, borderColor: '#9d5ff5', backgroundColor: 'rgba(157,95,245,0.08)', fill: true, tension: 0.4, borderWidth: 2, pointRadius: 3, pointBackgroundColor: '#9d5ff5' }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9896b0', maxTicksLimit: 6 } },
          y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9896b0' }, min: 0, max: 100 }
        }
      }
    })
    return () => { chartInstance.current?.destroy() }
  }, [tab])

  // Use real stats if available, otherwise 0
  const xp             = stats?.xp ?? 0
  const level          = stats?.level ?? 1
  const streak         = stats?.streak ?? 0
  const speakingHours  = stats?.speaking_hours ?? 0
  const vocabulary     = stats?.vocabulary_count ?? 0
  const sessions       = stats?.sessions_count ?? 0
  const levelTitle     = getLevelTitle(level)

  // XP progress to next level (every 500 XP = 1 level)
  const xpInLevel      = xp % 500
  const xpProgress     = Math.round((xpInLevel / 500) * 100)

  return (
    <div className="flex flex-col md:grid md:grid-cols-[240px_1fr] min-h-[calc(100vh-68px)]">
      {/* Sidebar */}
      <div className="bg-brand-secondary border-b md:border-b-0 md:border-r border-brand-border p-4 md:p-5 flex flex-col gap-2">
        <div className="text-center pb-4 md:pb-6 mb-2 border-b border-brand-border flex flex-row md:flex-col items-center md:justify-center gap-4 md:gap-0 text-left md:text-center">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-brand-purple/20 border-2 border-brand-purple md:mx-auto mb-0 md:mb-3 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold text-brand-purple-light">
              {user?.firstName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <div>
            <div className="text-[16px] md:text-[17px] font-bold mb-1">{user?.firstName || 'Student'}</div>
            <div className="text-[12px] md:text-[13px] text-slate-400">Level {level} · {levelTitle}</div>
            <div className="mt-2 bg-brand-purple/10 border border-brand-purple/20 text-brand-purple-light px-3 py-1 rounded-full text-xs font-bold inline-block">
              {xp.toLocaleString()} XP
            </div>
            {/* XP progress bar */}
            <div className="mt-2 w-full max-w-[160px] mx-auto md:mx-0">
              <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                <span>Lvl {level}</span>
                <span>Lvl {level + 1}</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-brand-purple rounded-full transition-all duration-700" style={{ width: `${xpProgress}%` }} />
              </div>
              <div className="text-[10px] text-slate-500 mt-1 text-center">{xpInLevel}/500 XP</div>
            </div>
            <div className="mt-1 text-[11px] text-slate-500">{user?.email}</div>
          </div>
        </div>
        <div className="hidden md:flex flex-col gap-2">
          {[
            { label: 'Dashboard', Icon: BarChart2, active: true },
            { label: 'Lessons', Icon: BookIcon, active: false },
            { label: 'Settings', Icon: Settings, active: false },
          ].map(({ label, Icon, active }) => (
            <button key={label} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${active ? 'font-semibold text-brand-purple-light bg-brand-purple/15' : 'font-medium text-slate-400 hover:bg-white/5 hover:text-white'}`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
          <button onClick={signOut} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all mt-1">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
        <button className="mt-2 md:mt-auto bg-gradient-to-r from-brand-purple to-purple-400 text-white rounded-xl py-3 text-sm font-bold shadow-lg shadow-brand-purple/20">
          Upgrade to Pro
        </button>
      </div>

      {/* Main content */}
      <div className="p-4 md:p-10 max-w-5xl mx-auto w-full">
        <h1 className="text-2xl md:text-3xl font-extrabold mb-1 animate-fade-up">Analytics Overview</h1>
        <p className="text-[13px] md:text-[15px] text-slate-400 mb-6 md:mb-8 animate-fade-up" style={{ animationDelay: '0.05s' }}>
          Track your progress and mastery over time.
        </p>

        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 mb-6 md:mb-8 animate-fade-up" style={{ animationDelay: '0.1s' }}>
          {[
            { label: 'Speaking Time', value: speakingHours.toFixed(1), unit: 'hrs', color: 'text-brand-purple-light', trend: sessions > 0 ? `${sessions} sessions total` : 'Start chatting!', Icon: Clock },
            { label: 'Vocabulary', value: vocabulary.toLocaleString(), unit: '', color: 'text-brand-green', trend: vocabulary > 0 ? `${vocabulary} words learned` : 'Build your vocab!', Icon: BookOpen },
            { label: 'Sessions', value: sessions.toString(), unit: '', color: 'text-brand-orange', trend: sessions > 0 ? 'Completed sessions' : 'Start your first!', Icon: MessageSquare },
            { label: 'Streak', value: streak.toString(), unit: streak === 1 ? 'day' : 'days', color: 'text-brand-gold', trend: streak > 0 ? 'Keep it up!' : 'Come back daily!', Icon: Flame },
          ].map(({ label, value, unit, color, trend, Icon }) => (
            <div key={label} className="bg-brand-card border border-brand-border rounded-[18px] p-5">
              <div className="flex justify-between items-center mb-3">
                <div className="text-[10px] md:text-[11px] tracking-[1.5px] text-brand-muted uppercase font-semibold">{label}</div>
                <Icon className="w-4 h-4 md:w-5 md:h-5 text-brand-muted" />
              </div>
              <div className={`text-3xl md:text-4xl font-bold ${color} mb-2`}>
                {value}{unit && <small className="text-sm font-sans opacity-70 ml-1">{unit}</small>}
              </div>
              <div className="text-[11px] md:text-xs text-brand-green font-medium flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> {trend}
              </div>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="bg-brand-card border border-brand-border rounded-[18px] p-5 md:p-6 mb-6 md:mb-8 animate-fade-up" style={{ animationDelay: '0.15s' }}>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4 md:mb-6">
            <h2 className="text-base md:text-lg font-bold">Fluency Trends</h2>
            <div className="flex gap-1 bg-brand-card2 rounded-lg p-1 self-start sm:self-auto">
              {(['1W', '4W', '1Y'] as Tab[]).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-3 md:px-4 py-1.5 rounded-md text-[12px] md:text-[13px] font-medium transition-colors ${tab === t ? 'bg-brand-card text-white font-semibold' : 'text-slate-400 hover:text-white'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="relative h-[200px] md:h-[250px] w-full">
            <canvas ref={chartRef} />
          </div>
        </div>

        {/* Milestones */}
        <div className="bg-brand-card border border-brand-border rounded-[18px] p-5 md:p-6 animate-fade-up" style={{ animationDelay: '0.2s' }}>
          <h2 className="text-base md:text-lg font-bold mb-4 md:mb-5">Milestones</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
            {[
              { label: '30-Day Streak', sub: streak >= 30 ? 'Achieved! 🎉' : `${streak}/30 days`, Icon: Flame, bg: 'bg-brand-orange/15', color: 'text-brand-orange', locked: streak < 30 },
              { label: 'Scenario Master', sub: sessions >= 50 ? 'Achieved! 🎉' : `${sessions}/50 sessions`, Icon: ShieldCheck, bg: 'bg-brand-green/15', color: 'text-brand-green', locked: sessions < 50 },
              { label: 'Grammar Pro', sub: level >= 15 ? 'Achieved! 🎉' : `Unlock at Lvl 15 (now ${level})`, Icon: Lock, bg: 'bg-white/5', color: 'text-slate-400', locked: level < 15 },
            ].map(({ label, sub, Icon, bg, color, locked }) => (
              <div key={label} className={`bg-brand-card2 border border-brand-border rounded-2xl p-4 md:p-5 text-center ${locked ? 'opacity-50 grayscale' : ''}`}>
                <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full ${bg} ${color} mx-auto mb-2 md:mb-3 flex items-center justify-center`}>
                  <Icon className="w-6 h-6 md:w-8 md:h-8" />
                </div>
                <div className="text-[13px] md:text-[14px] font-bold mb-1">{label}</div>
                <div className="text-[11px] md:text-xs text-slate-400">{sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile sign out */}
        <button
          onClick={signOut}
          className="md:hidden mt-6 w-full flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-sm font-medium text-red-400 bg-red-500/10 border border-red-500/20 transition-all"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </div>
  )
}