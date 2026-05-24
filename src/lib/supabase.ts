import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export interface ChatSession {
  id: string
  user_id: string
  scenario: string
  messages: ChatMessage[]
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface UserStats {
  id: string
  user_id: string
  xp: number
  level: number
  streak: number
  speaking_minutes: number   // دقائق حقيقية بدل ساعات
  vocabulary_count: number
  sessions_count: number
  last_active: string
  last_streak_date: string   // تاريخ آخر يوم احتسب فيه الـ streak
}

export async function getUserStats(userId: string): Promise<UserStats | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) { console.error('getUserStats error:', error); return null }

  if (data) return data

  const defaults = {
    user_id: userId,
    xp: 0,
    level: 1,
    streak: 0,
    speaking_minutes: 0,
    vocabulary_count: 0,
    sessions_count: 0,
    last_active: new Date().toISOString(),
    last_streak_date: '',
  }

  const { data: created, error: insertError } = await supabase
    .from('user_stats')
    .insert(defaults)
    .select()
    .single()

  if (insertError) { console.error('getUserStats insert error:', insertError); return null }
  return created
}

// ─── Streak logic: يزيد الـ streak لو المستخدم دخل يوم جديد ───
export async function checkAndUpdateStreak(userId: string, stats: UserStats): Promise<Partial<UserStats>> {
  const today = new Date().toISOString().split('T')[0] // "2025-05-24"
  const lastDate = stats.last_streak_date || ''

  if (lastDate === today) {
    // نفس اليوم — مش بيتغير
    return {}
  }

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  let newStreak: number
  if (lastDate === yesterdayStr) {
    // دخل امبارح وامبارح — streak يزيد
    newStreak = (stats.streak || 0) + 1
  } else if (!lastDate) {
    // أول مرة
    newStreak = 1
  } else {
    // انقطع — من أول
    newStreak = 1
  }

  return { streak: newStreak, last_streak_date: today }
}

export async function updateUserStats(userId: string, updates: Partial<UserStats>) {
  if (!supabase) return null
  const { data } = await supabase
    .from('user_stats')
    .update({ ...updates, last_active: new Date().toISOString() })
    .eq('user_id', userId)
    .select()
    .single()
  return data
}

// ─── إضافة دقائق حقيقية للـ session ───
export async function addSpeakingMinutes(userId: string, minutes: number) {
  if (!supabase || minutes <= 0) return
  const stats = await getUserStats(userId)
  if (!stats) return
  await updateUserStats(userId, {
    speaking_minutes: (stats.speaking_minutes || 0) + Math.round(minutes),
  })
}

export async function saveSession(session: Omit<ChatSession, 'id' | 'created_at' | 'updated_at'>) {
  if (!supabase) return null
  const { data } = await supabase.from('chat_sessions').insert(session).select().single()
  return data
}

export async function updateSession(sessionId: string, messages: ChatMessage[]) {
  if (!supabase) return null
  const { data } = await supabase
    .from('chat_sessions')
    .update({ messages, updated_at: new Date().toISOString() })
    .eq('id', sessionId)
    .select()
    .single()
  return data
}

export async function getUserSessions(userId: string): Promise<ChatSession[]> {
  if (!supabase) return []
  const { data } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(20)
  return data || []
}

export async function getLeaderboard() {
  if (!supabase) return []
  const { data } = await supabase
    .from('user_stats')
    .select('user_id, xp, level')
    .order('xp', { ascending: false })
    .limit(20)
  return data || []
}