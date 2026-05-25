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
  speaking_hours: number
  vocabulary_count: number
  sessions_count: number
  last_active: string
  display_name?: string
}

export async function getUserStats(userId: string): Promise<UserStats | null> {
  if (!supabase) return null

  // Use maybeSingle() instead of single() — returns null instead of 406 when no row found
  const { data, error } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('getUserStats error:', error)
    return null
  }

  // Row exists, return it
  if (data) return data

  // Row doesn't exist — create it
  const defaults = {
    user_id: userId,
    xp: 0,
    level: 1,
    streak: 0,
    speaking_hours: 0,
    vocabulary_count: 0,
    sessions_count: 0,
    last_active: new Date().toISOString(),
  }

  const { data: created, error: insertError } = await supabase
    .from('user_stats')
    .insert(defaults)
    .select()
    .single()

  if (insertError) {
    console.error('getUserStats insert error:', insertError)
    return null
  }

  return created
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

export async function getLeaderboard(): Promise<{ user_id: string; xp: number; level: number; display_name?: string }[]> {
  if (!supabase) return []
  const { data } = await supabase
    .from('user_stats')
    .select('user_id, xp, level, display_name')
    .order('xp', { ascending: false })
    .limit(50)
  return data || []
}

// Call this once when user logs in to keep display_name in sync
export async function upsertUserStats(userId: string, displayName: string): Promise<void> {
  if (!supabase) return
  const { data: existing } = await supabase
    .from('user_stats')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) {
    // Update display_name if it changed
    await supabase
      .from('user_stats')
      .update({ display_name: displayName, last_active: new Date().toISOString() })
      .eq('user_id', userId)
  } else {
    // Create fresh row for new user
    await supabase
      .from('user_stats')
      .insert({
        user_id: userId,
        display_name: displayName,
        xp: 0, level: 1, streak: 0,
        speaking_hours: 0, vocabulary_count: 0, sessions_count: 0,
        last_active: new Date().toISOString(),
      })
  }
}