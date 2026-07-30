

import { useState, useCallback } from 'react'
import { useFocusEffect } from 'expo-router'
import { supabase }       from '@/lib/supabase'

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────
export type ScopeType   = 'folder' | 'topic' | 'subtopic'
export type SessionType = 'quiz' | 'blurt'

export interface ScopeItem {
  scopeType: ScopeType
  scopeId:   string
  title:     string
}

export interface Reminder {
  id:             string
  label:          string
  scopeItems:     ScopeItem[]   // empty array = All materials
  daysOfWeek:     number[]
  isActive:       boolean
  timeOfDay:      string        // 'HH:MM:SS'
  sessionType:    SessionType
  questionCount:  number | null
}

// ─────────────────────────────────────────
// FETCH REMINDERS FOR A COURSE
// ─────────────────────────────────────────
export function useReminders(
  courseId: string | null,
  userId:   string | null
) {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)

  const fetchReminders = useCallback(async () => {
    if (!courseId || !userId) {
      setReminders([])
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      setError(null)

      const { data, error: err } = await supabase
        .from('reminders')
        .select('id, label, scope_items, days_of_week, is_active, time_of_day, session_type, question_count')
        .eq('course_id', courseId)
        .eq('user_id', userId)
        .order('created_at', { ascending: true })

      if (err) throw err

      setReminders((data ?? []).map(mapRow))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [courseId, userId])

  useFocusEffect(
    useCallback(() => { fetchReminders() }, [fetchReminders])
  )

  return { reminders, loading, error, refetch: fetchReminders }
}

// ─────────────────────────────────────────
// ROW MAPPER
// ─────────────────────────────────────────
function mapRow(r: any): Reminder {
  return {
    id:            r.id,
    label:         r.label,
    scopeItems:    (r.scope_items ?? []).map((s: any) => ({
      scopeType: s.scope_type, scopeId: s.scope_id, title: s.title,
    })),
    daysOfWeek:    r.days_of_week ?? [],
    isActive:      r.is_active,
    timeOfDay:     r.time_of_day,
    sessionType:   r.session_type,
    questionCount: r.question_count,
  }
}

// ─────────────────────────────────────────
// CREATE REMINDER
// ─────────────────────────────────────────
export async function createReminder(params: {
  userId:        string
  courseId:      string
  label:         string
  scopeItems:    ScopeItem[]
  daysOfWeek:    number[]
  time:          string
  sessionType:   SessionType
  questionCount: number | null
}): Promise<void> {
  const { error } = await supabase
    .from('reminders')
    .insert({
      user_id:        params.userId,
      course_id:      params.courseId,
      label:          params.label,
      scope_items:    params.scopeItems.map(s => ({ scope_type: s.scopeType, scope_id: s.scopeId, title: s.title })),
      days_of_week:   params.daysOfWeek,
      time_of_day:    params.time,
      session_type:   params.sessionType,
      question_count: params.sessionType === 'quiz' ? params.questionCount : null,
    })
  if (error) throw error
}

// ─────────────────────────────────────────
// FETCH SINGLE REMINDER (for edit pre-fill)
// ─────────────────────────────────────────
export async function getReminder(reminderId: string): Promise<Reminder | null> {
  const { data, error } = await supabase
    .from('reminders')
    .select('id, label, scope_items, days_of_week, is_active, time_of_day, session_type, question_count')
    .eq('id', reminderId)
    .single()

  if (error) throw error
  if (!data) return null
  return mapRow(data)
}

// ─────────────────────────────────────────
// UPDATE REMINDER
// ─────────────────────────────────────────
export async function updateReminder(params: {
  reminderId:    string
  label:         string
  scopeItems:    ScopeItem[]
  daysOfWeek:    number[]
  time:          string
  sessionType:   SessionType
  questionCount: number | null
}): Promise<void> {
  const { error } = await supabase
    .from('reminders')
    .update({
      label:          params.label,
      scope_items:    params.scopeItems.map(s => ({ scope_type: s.scopeType, scope_id: s.scopeId, title: s.title })),
      days_of_week:   params.daysOfWeek,
      time_of_day:    params.time,
      session_type:   params.sessionType,
      question_count: params.sessionType === 'quiz' ? params.questionCount : null,
    })
    .eq('id', params.reminderId)
  if (error) throw error
}

// ─────────────────────────────────────────
// RESOLVE A SINGLE SCOPE ITEM INTO NOTE IDS
// ─────────────────────────────────────────
async function resolveScopeItemNoteIds(item: ScopeItem): Promise<string[]> {
  if (item.scopeType === 'subtopic') {
    const { data } = await supabase.from('notes').select('id').eq('sub_lesson_id', item.scopeId)
    return (data ?? []).map(n => n.id)
  }

  if (item.scopeType === 'topic') {
    const { data: ownNotes } = await supabase.from('notes').select('id').eq('lesson_id', item.scopeId)
    const { data: subs } = await supabase.from('sub_lessons').select('id').eq('lesson_id', item.scopeId)
    const subIds = (subs ?? []).map(s => s.id)
    const subNotes = subIds.length
      ? (await supabase.from('notes').select('id').in('sub_lesson_id', subIds)).data ?? []
      : []
    return [...(ownNotes ?? []).map(n => n.id), ...subNotes.map(n => n.id)]
  }

  if (item.scopeType === 'folder') {
    const { data: lessons } = await supabase.from('lessons').select('id').eq('section_id', item.scopeId)
    const all: string[] = []
    for (const l of lessons ?? []) {
      all.push(...await resolveScopeItemNoteIds({ scopeType: 'topic', scopeId: l.id, title: '' }))
    }
    return all
  }

  return []
}

// ─────────────────────────────────────────
// RESOLVE A REMINDER'S FULL SCOPE INTO NOTE IDS
// Empty scopeItems means "All materials" — resolved by
// the caller using the course-wide 'course' quiz mode instead,
// since this function has no course context of its own.
// ─────────────────────────────────────────
export async function resolveReminderNoteIds(scopeItems: ScopeItem[]): Promise<string[]> {
  if (scopeItems.length === 0) return []

  const results = await Promise.all(scopeItems.map(resolveScopeItemNoteIds))
  const unique = new Set(results.flat())
  return Array.from(unique)
}

// ─────────────────────────────────────────
// TOGGLE ACTIVE
// ─────────────────────────────────────────
export async function toggleReminder(reminderId: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from('reminders')
    .update({ is_active: isActive })
    .eq('id', reminderId)
  if (error) throw error
}

// ─────────────────────────────────────────
// DELETE REMINDER
// ─────────────────────────────────────────
export async function deleteReminder(reminderId: string): Promise<void> {
  const { error } = await supabase
    .from('reminders')
    .delete()
    .eq('id', reminderId)
  if (error) throw error
}

// ─────────────────────────────────────────
// FORMAT HELPERS
// ─────────────────────────────────────────
const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export function formatDaysOfWeek(days: number[]): string {
  if (days.length === 7) return 'Every day'
  return [...days].sort((a, b) => a - b).map(d => DAY_LABELS[d]).join(', ')
}

export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`
}