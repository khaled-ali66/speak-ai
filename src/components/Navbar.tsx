import { Brain, Bell, Zap, Home, MessageSquare, Trophy, User, LogIn, LogOut } from 'lucide-react'
import { useAuth } from '../lib/authContext'

type Page = 'home' | 'chat' | 'leaderboard' | 'profile'

interface NavbarProps {
  currentPage: Page
  onNavigate: (page: Page) => void
  xp: number
  onLoginClick: () => void
}

const desktopLinks: { id: Page; label: string }[] = [
  { id: 'home', label: 'Dashboard' },
  { id: 'chat', label: 'AI Chat' },
  { id: 'leaderboard', label: 'Leaderboard' },
  { id: 'profile', label: 'Profile' },
]

const mobileLinks: { id: Page; label: string; Icon: React.ElementType }[] = [
  { id: 'home', label: 'Home', Icon: Home },
  { id: 'chat', label: 'Chat', Icon: MessageSquare },
  { id: 'leaderboard', label: 'Rank', Icon: Trophy },
  { id: 'profile', label: 'Profile', Icon: User },
]

export function Navbar({ currentPage, onNavigate, xp, onLoginClick }: NavbarProps) {
  const { user, signOut } = useAuth()

  return (
    <>
      <nav className="fixed top-0 inset-x-0 h-[72px] bg-brand-bg/80 backdrop-blur-md border-b border-brand-border flex items-center justify-between px-4 md:px-10 z-50">
        <button onClick={() => onNavigate('home')} className="flex items-center gap-3 w-auto md:w-[250px]">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-tr from-brand-purple to-purple-500 rounded-xl flex items-center justify-center">
            <Brain className="text-white w-4 h-4 md:w-5 md:h-5" />
          </div>
          <div className="font-display text-[15px] md:text-[17px] font-bold text-white leading-none">SpeakSmart AI</div>
        </button>

        <div className="hidden md:flex flex-1 justify-center gap-8">
          {desktopLinks.map(({ id, label }) => (
            <button key={id} onClick={() => onNavigate(id)}
              className={`text-sm font-medium transition-colors relative pb-1 ${currentPage === id ? 'text-white' : 'text-slate-400 hover:text-white'}`}>
              {label}
              {currentPage === id && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand-purple rounded-full" />}
            </button>
          ))}
        </div>

        <div className="w-auto md:w-[250px] flex items-center justify-end gap-2 md:gap-3">
          {user && (
            <div className="hidden sm:flex items-center gap-2 bg-brand-green/10 border border-brand-green/20 text-brand-green px-3 py-1.5 rounded-full text-xs font-bold">
              <Zap className="w-3 h-3 fill-brand-green" /> +{xp.toLocaleString()} XP
            </div>
          )}
          <button className="text-slate-400 hover:text-white hidden md:block">
            <Bell className="w-5 h-5" />
          </button>

          {user ? (
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full bg-brand-purple/20 border border-brand-purple/40 flex items-center justify-center text-brand-purple-light font-bold text-sm cursor-pointer ml-1"
                onClick={() => onNavigate('profile')}
                title={user.email}
              >
                {user.firstName?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
              </div>
              <button
                onClick={signOut}
                title="Sign out"
                className="hidden md:flex w-8 h-8 rounded-lg bg-brand-card2 border border-brand-border items-center justify-center text-slate-400 hover:text-red-400 hover:border-red-500/30 transition-all"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onLoginClick}
              className="flex items-center gap-2 bg-brand-purple/10 hover:bg-brand-purple/20 border border-brand-purple/30 hover:border-brand-purple text-brand-purple-light px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-xs md:text-sm font-semibold transition-all"
            >
              <LogIn className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          )}
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 inset-x-0 h-[70px] bg-brand-card/95 backdrop-blur-md border-t border-brand-border flex items-center justify-around px-2 z-50">
        {mobileLinks.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => onNavigate(id)}
            className={`flex flex-col items-center gap-1 p-2 transition-colors ${currentPage === id ? 'text-brand-purple-light' : 'text-slate-400'}`}>
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        ))}
        {!user && (
          <button onClick={onLoginClick} className="flex flex-col items-center gap-1 p-2 text-brand-purple-light">
            <LogIn className="w-5 h-5" />
            <span className="text-[10px] font-medium">Sign In</span>
          </button>
        )}
      </div>
    </>
  )
}
