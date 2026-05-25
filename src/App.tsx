import { useState, useEffect } from 'react'
import { useAuth } from './lib/authContext'
import { Navbar } from './components/Navbar'
import { Toast } from './components/Toast'
import { HomePage } from './pages/HomePage'
import { ChatPage } from './pages/ChatPage'
import { LeaderboardPage } from './pages/LeaderboardPage'
import { ProfilePage } from './pages/ProfilePage'
import { LoginModal } from './components/LoginModal'
import { getUserStats, updateUserStats, upsertUserStats, type UserStats } from './lib/supabase'
import { useToast } from './hooks/useToast'

type Page = 'home' | 'chat' | 'leaderboard' | 'profile'
const PROTECTED: Page[] = ['chat', 'leaderboard', 'profile']

function App() {
  const { user, isLoaded } = useAuth()
  const [currentPage, setCurrentPage] = useState<Page>('home')
  const [stats, setStats] = useState<UserStats | null>(null)
  const { toast, showToast } = useToast()
  const [loginOpen, setLoginOpen] = useState(false)
  const [pendingPage, setPendingPage] = useState<Page | null>(null)

  useEffect(() => {
    if (user) {
      const displayName = user.firstName || user.email.split('@')[0] || 'User'
      // Sync display name and create stats row if missing
      upsertUserStats(user.id, displayName).then(() => {
        getUserStats(user.id).then(s => { if (s) setStats(s) })
      })
    } else {
      setStats(null)
    }
  }, [user])

  function refreshStats() {
    if (user) getUserStats(user.id).then(s => { if (s) setStats(s) })
  }

  function navigate(page: Page) {
    if (PROTECTED.includes(page) && !user) {
      setPendingPage(page)
      setLoginOpen(true)
      return
    }
    setCurrentPage(page)
    window.scrollTo(0, 0)
  }

  function handleLoginSuccess() {
    setLoginOpen(false)
    if (pendingPage) {
      setCurrentPage(pendingPage)
      setPendingPage(null)
    }
  }

  async function claimQuest() {
    if (!user) { setLoginOpen(true); return }
    showToast('Daily Quest claimed! +200 XP earned!')
    if (stats) {
      const updated = await updateUserStats(user.id, { xp: (stats.xp || 0) + 200 })
      if (updated) setStats(updated)
    }
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-tr from-brand-purple to-purple-500 rounded-2xl animate-pulse" />
          <p className="text-slate-400 text-sm">Loading SpeakSmart AI...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Navbar
        currentPage={currentPage}
        onNavigate={navigate}
        xp={stats?.xp ?? 0}
        onLoginClick={() => setLoginOpen(true)}
      />

      <main className="pt-[72px] pb-[70px] md:pb-0">
        {currentPage === 'home' && (
          <HomePage onNavigate={navigate} stats={stats} onClaimQuest={claimQuest} />
        )}
        {currentPage === 'chat' && user && <ChatPage onStatsUpdate={refreshStats} />}
        {currentPage === 'leaderboard' && user && <LeaderboardPage />}
        {currentPage === 'profile' && user && <ProfilePage stats={stats} />}
      </main>

      <Toast msg={toast.msg} visible={toast.visible} />

      <LoginModal
        open={loginOpen}
        onClose={() => { setLoginOpen(false); setPendingPage(null) }}
        onSuccess={handleLoginSuccess}
      />
    </>
  )
}

export default App