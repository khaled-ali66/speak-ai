import { useEffect, useState } from 'react'
import { Globe2, Crown, Loader2 } from 'lucide-react'
import { useAuth } from '../lib/authContext'
import { getLeaderboard, getUserStats } from '../lib/supabase'

interface LeaderEntry {
  user_id: string
  xp: number
  level: number
  displayName: string
  isMe: boolean
  rank: number
}

export function LeaderboardPage() {
  const { user } = useAuth()
  const [entries, setEntries] = useState<LeaderEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [myRank, setMyRank] = useState<number | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const data = await getLeaderboard()
      
      // Map entries with display names and rank
      const mapped: LeaderEntry[] = data.map((d, i) => {
        const isMe = user ? d.user_id === user.id : false
        return {
          user_id: d.user_id,
          xp: d.xp,
          level: d.level,
          displayName: isMe
            ? (user?.firstName || user?.email?.split('@')[0] || 'You')
            : `Player ${d.user_id.slice(-4).toUpperCase()}`,
          isMe,
          rank: i + 1,
        }
      })

      setEntries(mapped)

      // Find my rank
      if (user) {
        const myEntry = mapped.find(e => e.isMe)
        if (myEntry) {
          setMyRank(myEntry.rank)
        } else {
          // If user not in top 20, fetch their stats separately
          const stats = await getUserStats(user.id)
          if (stats) {
            const myXp = stats.xp
            // Approximate rank
            const above = mapped.filter(e => e.xp > myXp).length
            setMyRank(above + 1)
          }
        }
      }

      setLoading(false)
    }
    load()
  }, [user])

  const top3 = entries.slice(0, 3)
  const rest = entries.slice(3)

  // If user not in top entries, add them to the bottom of the list
  const userInTop = entries.some(e => e.isMe)

  // Sort top3 for podium display: rank2, rank1, rank3
  const podiumOrder = top3.length >= 3
    ? [top3[1], top3[0], top3[2]]
    : top3

  const podiumStyles: Record<number, { color: string; borderColor: string; cardBorder: string; shadow: string; size: string; rankSize: string }> = {
    1: { color: 'text-brand-gold', borderColor: 'border-brand-gold', cardBorder: 'border-brand-gold', shadow: 'shadow-[0_0_30px_rgba(234,179,8,0.1)]', size: 'w-20 h-20 md:w-24 md:h-24', rankSize: 'text-3xl md:text-4xl' },
    2: { color: 'text-slate-400', borderColor: 'border-slate-400', cardBorder: 'border-brand-border', shadow: '', size: 'w-16 h-16 md:w-20 md:h-20', rankSize: 'text-2xl md:text-3xl' },
    3: { color: 'text-amber-600', borderColor: 'border-amber-600', cardBorder: 'border-brand-border', shadow: '', size: 'w-16 h-16 md:w-20 md:h-20', rankSize: 'text-2xl md:text-3xl' },
  }

  return (
    <div className="max-w-4xl mx-auto py-8 md:py-12 px-4 md:px-6">
      <div className="text-center mb-10 md:mb-12 animate-fade-up">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-3 flex items-center justify-center gap-2 md:gap-3">
          <Globe2 className="text-brand-purple-light w-7 h-7 md:w-9 md:h-9" /> Global Elite
        </h1>
        <p className="text-slate-400 text-sm md:text-base max-w-lg mx-auto">
          The top language learners ranked by XP. Compete, earn XP, and secure your place among the best.
        </p>
        {myRank && user && (
          <div className="mt-4 inline-flex items-center gap-2 bg-brand-purple/10 border border-brand-purple/20 text-brand-purple-light px-4 py-2 rounded-full text-sm font-semibold">
            🏅 Your rank: #{myRank}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-4 py-20 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-brand-purple-light" />
          <p className="text-sm">Loading leaderboard...</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <Globe2 className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-semibold mb-2">No entries yet</p>
          <p className="text-sm">Be the first to earn XP and claim the top spot!</p>
        </div>
      ) : (
        <>
          {/* Podium */}
          {top3.length > 0 && (
            <div className="flex flex-wrap md:grid md:grid-cols-3 justify-center gap-4 items-end mb-10 md:mb-12 animate-fade-up" style={{ animationDelay: '0.05s' }}>
              {podiumOrder.map((p) => {
                const s = podiumStyles[p.rank] || podiumStyles[2]
                return (
                  <div
                    key={p.user_id}
                    className={`text-center relative ${p.rank === 1 ? 'order-1 md:order-2 w-full md:w-auto mb-4 md:mb-0' : p.rank === 2 ? 'order-2 md:order-1 w-[45%] md:w-auto' : 'order-3 w-[45%] md:w-auto'}`}
                  >
                    {p.rank === 1 && (
                      <div className="absolute -top-5 md:-top-7 left-1/2 -translate-x-1/2 text-brand-gold z-10">
                        <Crown className="w-6 h-6 md:w-7 md:h-7 fill-brand-gold animate-bounce" />
                      </div>
                    )}
                    <div className={`${s.size} rounded-full mx-auto mb-2 md:mb-3 border-4 ${s.borderColor} bg-brand-card flex items-center justify-center shadow-xl ${p.isMe ? 'ring-2 ring-brand-purple ring-offset-2 ring-offset-brand-bg' : ''}`}>
                      <span className={`text-2xl font-bold ${s.color}`}>{p.displayName.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className={`bg-brand-card border ${p.isMe ? 'border-brand-purple' : s.cardBorder} rounded-xl py-3 md:py-4 px-2 shadow-md ${s.shadow}`}>
                      <div className={`${s.rankSize} font-extrabold ${s.color}`}>{p.rank}</div>
                      <div className={`${p.rank === 1 ? 'text-[14px] md:text-[16px]' : 'text-[13px] md:text-[15px]'} font-bold mt-1 mb-1 md:mb-2 truncate ${p.isMe ? 'text-brand-purple-light' : ''}`}>
                        {p.isMe ? `You` : p.displayName}
                      </div>
                      <span className={`inline-block rounded-full px-2 py-0.5 md:px-3 md:py-1 text-[10px] md:text-xs font-bold ${p.rank === 1 ? 'bg-brand-gold/15 text-brand-gold' : 'bg-brand-purple/15 text-brand-purple-light'}`}>
                        {p.xp.toLocaleString()} XP
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Rest of leaderboard */}
          {rest.length > 0 && (
            <div className="bg-brand-card border border-brand-border rounded-2xl overflow-x-auto animate-fade-up shadow-2xl" style={{ animationDelay: '0.1s' }}>
              <div className="min-w-[400px]">
                <div className="grid grid-cols-[50px_1fr_90px] md:grid-cols-[60px_1fr_100px] px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-xs tracking-wider text-brand-muted uppercase font-semibold border-b border-brand-border bg-brand-card2/50">
                  <div>Rank</div><div>Student</div><div className="text-right">Total XP</div>
                </div>
                <div className="divide-y divide-brand-border">
                  {rest.map((d) => (
                    <div key={d.user_id} className={`grid grid-cols-[50px_1fr_90px] md:grid-cols-[60px_1fr_100px] px-4 md:px-6 py-3 md:py-4 items-center transition-colors hover:bg-white/5 ${d.isMe ? 'bg-brand-purple/10 border-l-4 border-brand-purple' : ''}`}>
                      <div className="text-xs md:text-sm font-bold text-slate-500">{d.rank}</div>
                      <div className="flex items-center gap-2 md:gap-3">
                        <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-brand-card2 border border-brand-border flex items-center justify-center text-[10px] md:text-xs font-bold">
                          {d.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div className={`text-[12px] md:text-[14px] font-semibold ${d.isMe ? 'text-brand-purple-light' : ''}`}>
                          {d.isMe ? `You (${user?.firstName || user?.email?.split('@')[0] || 'You'})` : d.displayName}
                        </div>
                      </div>
                      <div className={`text-[11px] md:text-[13px] text-right font-medium ${d.isMe ? 'text-brand-purple-light font-bold' : 'text-slate-400'}`}>
                        {d.xp.toLocaleString()} XP
                      </div>
                    </div>
                  ))}

                  {/* Show current user if not in top 20 */}
                  {!userInTop && user && myRank && (
                    <>
                      <div className="px-6 py-2 text-center text-slate-600 text-xs">· · ·</div>
                      <div className="grid grid-cols-[50px_1fr_90px] md:grid-cols-[60px_1fr_100px] px-4 md:px-6 py-3 md:py-4 items-center bg-brand-purple/10 border-l-4 border-brand-purple">
                        <div className="text-xs md:text-sm font-bold text-slate-500">#{myRank}</div>
                        <div className="flex items-center gap-2 md:gap-3">
                          <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-brand-card2 border border-brand-purple/40 flex items-center justify-center text-[10px] md:text-xs font-bold text-brand-purple-light">
                            {(user.firstName || user.email).charAt(0).toUpperCase()}
                          </div>
                          <div className="text-[12px] md:text-[14px] font-semibold text-brand-purple-light">
                            You ({user.firstName || user.email.split('@')[0]})
                          </div>
                        </div>
                        <div className="text-[11px] md:text-[13px] text-right font-bold text-brand-purple-light">
                          — XP
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
