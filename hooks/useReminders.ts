

import { useState, useCallback } from 'react'
import { useFocusEffect } from 'expo-router'
import { supabase }       from '@/lib/supabase'

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────
export type ScopeType   = 'all' | 'folder' | 'topic' | 'subtopic'
export type SessionType = 'quiz' | 'blurt'

export interface ReminderTimeSlot {
  id:             string
  time_of_day:    string  // 'HH:MM:SS'
  session_type:   SessionType
  question_count: number | null
  order_index:    number
}

export interface Reminder {
  id:            string
  label:         string
  scope_type:    ScopeType
  scope_id:      string | null
  days_of_week:  number[]
  is_active:     boolean
  time_slots:    ReminderTimeSlot[]
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
        .select(`
          id, label, scope_type, scope_id, days_of_week, is_active,
          reminder_time_slots ( id, time_of_day, session_type, question_count, order_index )
        `)
        .eq('course_id', courseId)
        .eq('user_id', userId)
        .order('created_at', { ascending: true })

      if (err) throw err

      setReminders((data ?? []).map((r: any) => ({
        id:           r.id,
        label:        r.label,
        scope_type:   r.scope_type,
        scope_id:     r.scope_id,
        days_of_week: r.days_of_week ?? [],
        is_active:    r.is_active,
        time_slots:   (r.reminder_time_slots ?? []).sort((a: any, b: any) => a.order_index - b.order_index),
      })))
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
// CREATE REMINDER (with time slots)
// ─────────────────────────────────────────
export async function createReminder(params: {
  userId:      string
  courseId:    string
  label:       string
  scopeType:   ScopeType
  scopeId:     string | null
  daysOfWeek:  number[]
  timeSlots: {
    time:          string  // 'HH:MM:SS'
    sessionType:   SessionType
    questionCount: number | null
  }[]
}): Promise<void> {
  const { data: reminder, error: reminderErr } = await supabase
    .from('reminders')
    .insert({
      user_id:      params.userId,
      course_id:    params.courseId,
      label:        params.label,
      scope_type:   params.scopeType,
      scope_id:     params.scopeId,
      days_of_week: params.daysOfWeek,
    })
    .select('id')
    .single()

  if (reminderErr) throw reminderErr

  if (params.timeSlots.length > 0) {
    const { error: slotsErr } = await supabase
      .from('reminder_time_slots')
      .insert(params.timeSlots.map((slot, idx) => ({
        reminder_id:    reminder.id,
        time_of_day:    slot.time,
        session_type:   slot.sessionType,
        question_count: slot.sessionType === 'quiz' ? slot.questionCount : null,
        order_index:    idx,
      })))
    if (slotsErr) throw slotsErr
  }
}

// ─────────────────────────────────────────
// FETCH SINGLE REMINDER (for edit pre-fill)
// ─────────────────────────────────────────
export async function getReminder(reminderId: string): Promise<Reminder | null> {
    const { data, error } = await supabase
      .from('reminders')
      .select(`
        id, label, scope_type, scope_id, days_of_week, is_active,
        reminder_time_slots ( id, time_of_day, session_type, question_count, order_index )
      `)
      .eq('id', reminderId)
      .single()
  
    if (error) throw error
    if (!data) return null
  
    return {
      id:           data.id,
      label:        data.label,
      scope_type:   data.scope_type,
      scope_id:     data.scope_id,
      days_of_week: data.days_of_week ?? [],
      is_active:    data.is_active,
      time_slots:   (data.reminder_time_slots ?? []).sort((a: any, b: any) => a.order_index - b.order_index),
    }
  }
  
  // ─────────────────────────────────────────
  // UPDATE REMINDER — replace all slots (simplest correct approach
  // given the nesting; no diffing of individual slot changes)
  // ─────────────────────────────────────────
  export async function updateReminder(params: {
    reminderId: string
    label:      string
    scopeType:  ScopeType
    scopeId:    string | null
    daysOfWeek: number[]
    timeSlots: {
      time:          string
      sessionType:   SessionType
      questionCount: number | null
    }[]
  }): Promise<void> {
    const { error: updateErr } = await supabase
      .from('reminders')
      .update({
        label:        params.label,
        scope_type:   params.scopeType,
        scope_id:     params.scopeId,
        days_of_week: params.daysOfWeek,
      })
      .eq('id', params.reminderId)
  
    if (updateErr) throw updateErr
  
    const { error: deleteErr } = await supabase
      .from('reminder_time_slots')
      .delete()
      .eq('reminder_id', params.reminderId)
  
    if (deleteErr) throw deleteErr
  
    if (params.timeSlots.length > 0) {
      const { error: insertErr } = await supabase
        .from('reminder_time_slots')
        .insert(params.timeSlots.map((slot, idx) => ({
          reminder_id:    params.reminderId,
          time_of_day:    slot.time,
          session_type:   slot.sessionType,
          question_count: slot.sessionType === 'quiz' ? slot.questionCount : null,
          order_index:    idx,
        })))
      if (insertErr) throw insertErr
    }
  }

  // ─────────────────────────────────────────
// RESOLVE A REMINDER'S SCOPE INTO NOTE IDS
// Mirrors the note-resolution logic in useQuiz.ts,
// but keyed off scope_type/scope_id instead of a QuizMode.
// ─────────────────────────────────────────
export async function resolveReminderNoteIds(
  scopeType: ScopeType,
  scopeId:   string | null
): Promise<string[]> {
  if (scopeType === 'all' || !scopeId) {
    // 'all' scope is resolved by the caller (course-level flat notes + everything under it)
    // since this function doesn't know which course it belongs to on its own.
    return []
  }

  if (scopeType === 'subtopic') {
    const { data } = await supabase.from('notes').select('id').eq('sub_lesson_id', scopeId)
    return (data ?? []).map(n => n.id)
  }

  if (scopeType === 'topic') {
    const { data: ownNotes } = await supabase.from('notes').select('id').eq('lesson_id', scopeId)
    const { data: subs } = await supabase.from('sub_lessons').select('id').eq('lesson_id', scopeId)
    const subIds = (subs ?? []).map(s => s.id)
    const subNotes = subIds.length
      ? (await supabase.from('notes').select('id').in('sub_lesson_id', subIds)).data ?? []
      : []
    return [...(ownNotes ?? []).map(n => n.id), ...subNotes.map(n => n.id)]
  }

  if (scopeType === 'folder') {
    const { data: lessons } = await supabase.from('lessons').select('id').eq('section_id', scopeId)
    const all: string[] = []
    for (const l of lessons ?? []) {
      all.push(...await resolveReminderNoteIds('topic', l.id))
    }
    return all
  }

  return []
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