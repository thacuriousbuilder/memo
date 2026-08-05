

import { useState, useCallback } from 'react'
import { useFocusEffect } from 'expo-router'
import { supabase }       from '@/lib/supabase'
import { parseLocalDate } from '@/hooks/useExams'

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────
export type ScopeType     = 'folder' | 'topic' | 'subtopic'
export type SessionType   = 'quiz' | 'blurt'
export type ReminderMode  = 'manual' | 'auto'
export type SessionStyle  = 'alternating' | 'combo'

export interface ScopeItem {
  scopeType: ScopeType
  scopeId:   string
  title:     string
}

export interface Reminder {
  id:             string
  label:          string
  scopeItems:     ScopeItem[]   // empty array = All materials (Manual only — Auto never stores scope)
  daysOfWeek:     number[]
  isActive:       boolean
  timeOfDay:      string        // 'HH:MM:SS'
  sessionType:    SessionType
  questionCount:  number | null
  mode:             ReminderMode
  planDurationDays: number | null
  planStartDate:    string | null   // 'YYYY-MM-DD'
  planEndDate:      string | null   // 'YYYY-MM-DD'
  autoQuestionLevel: number | null
  sessionStyle:      SessionStyle | null
}

const REMINDER_COLUMNS = `
  id, label, scope_items, days_of_week, is_active, time_of_day, session_type, question_count,
  reminder_mode, plan_duration_days, plan_start_date, plan_end_date, auto_question_level, auto_session_style
`

// ─────────────────────────────────────────
// LOCAL-DAY DATE HELPERS (matches hooks/useExams.ts's parseLocalDate
// convention — avoid UTC-shift bugs when computing plan_end_date)
// ─────────────────────────────────────────
function toDateString(date: Date): string {
  const mm = (date.getMonth() + 1).toString().padStart(2, '0')
  const dd = date.getDate().toString().padStart(2, '0')
  return `${date.getFullYear()}-${mm}-${dd}`
}
function todayDateString(): string {
  return toDateString(new Date())
}
function addDays(dateStr: string, days: number): string {
  const d = parseLocalDate(dateStr)
  d.setDate(d.getDate() + days)
  return toDateString(d)
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
        .select(REMINDER_COLUMNS)
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
    mode:              r.reminder_mode ?? 'manual',
    planDurationDays:  r.plan_duration_days ?? null,
    planStartDate:     r.plan_start_date ?? null,
    planEndDate:       r.plan_end_date ?? null,
    autoQuestionLevel: r.auto_question_level ?? null,
    sessionStyle:      r.auto_session_style ?? null,
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
    .select(REMINDER_COLUMNS)
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
// CREATE AUTO REMINDER
// scope_items/session_type/question_count are left empty/null — Auto
// resolves those live per session instead of storing them.
// ─────────────────────────────────────────
export async function createAutoReminder(params: {
  userId:           string
  courseId:         string
  label:            string
  daysOfWeek:       number[]
  time:             string
  planDurationDays: number
  sessionStyle:     SessionStyle
}): Promise<void> {
  const planStartDate = todayDateString()
  const planEndDate   = addDays(planStartDate, params.planDurationDays - 1)

  const { error } = await supabase
    .from('reminders')
    .insert({
      user_id:             params.userId,
      course_id:           params.courseId,
      label:               params.label,
      scope_items:         [],
      days_of_week:        params.daysOfWeek,
      time_of_day:         params.time,
      session_type:        null,
      question_count:      null,
      reminder_mode:       'auto',
      plan_duration_days:  params.planDurationDays,
      plan_start_date:     planStartDate,
      plan_end_date:       planEndDate,
      auto_question_level: 5,
      auto_session_style:  params.sessionStyle,
    })
  if (error) throw error
}

// ─────────────────────────────────────────
// UPDATE AUTO REMINDER
// Schedule fields (label/days/time) and session style are all editable
// in place — none of them discard plan progress. Switching mode itself
// (Auto ↔ Manual) is a separate delete-and-recreate flow, not this.
// ─────────────────────────────────────────
export async function updateAutoReminder(params: {
  reminderId:   string
  label:        string
  daysOfWeek:   number[]
  time:         string
  sessionStyle: SessionStyle
}): Promise<void> {
  const { error } = await supabase
    .from('reminders')
    .update({
      label:              params.label,
      days_of_week:       params.daysOfWeek,
      time_of_day:        params.time,
      auto_session_style: params.sessionStyle,
    })
    .eq('id', params.reminderId)
  if (error) throw error
}

// ─────────────────────────────────────────
// RENEW AN ENDED AUTO PLAN
// auto_question_level is deliberately left untouched — renewing
// continues the plan rather than restarting it.
// ─────────────────────────────────────────
export async function renewAutoPlan(reminderId: string, planDurationDays: number): Promise<void> {
  const planStartDate = todayDateString()
  const planEndDate   = addDays(planStartDate, planDurationDays - 1)

  const { error } = await supabase
    .from('reminders')
    .update({
      plan_duration_days: planDurationDays,
      plan_start_date:    planStartDate,
      plan_end_date:      planEndDate,
    })
    .eq('id', reminderId)
  if (error) throw error
}

// ─────────────────────────────────────────
// BUMP AUTO PLAN LEVEL AFTER A QUIZ ATTEMPT
// Only advances on a pass, and only if the attempt was actually taken at
// the plan's current level (a manual retake at a different count
// shouldn't move the dial). Never steps down on failure.
// ─────────────────────────────────────────
const AUTO_LEVEL_CAP = 30
const AUTO_LEVEL_STEP = 5

export async function bumpAutoPlanLevel(
  reminderId: string,
  passed: boolean,
  attemptQuestionCount: number
): Promise<void> {
  if (!passed) return

  const { data: reminder } = await supabase
    .from('reminders')
    .select('reminder_mode, auto_question_level')
    .eq('id', reminderId)
    .single()

  if (!reminder || reminder.reminder_mode !== 'auto') return
  if (reminder.auto_question_level !== attemptQuestionCount) return

  const nextLevel = Math.min(reminder.auto_question_level + AUTO_LEVEL_STEP, AUTO_LEVEL_CAP)
  if (nextLevel === reminder.auto_question_level) return

  const { error } = await supabase
    .from('reminders')
    .update({ auto_question_level: nextLevel })
    .eq('id', reminderId)
  if (error) throw error
}

// ─────────────────────────────────────────
// GUARDRAIL HELPERS
// ─────────────────────────────────────────

// Overlap heads-up at creation time: does this course already have another
// active reminder (Auto or Manual)? Also reused (with mode: 'auto') for
// the exam-creation notice, which specifically checks for an Auto
// reminder able to react to the new exam.
export async function hasActiveReminderForCourse(
  courseId: string,
  userId: string,
  opts?: { excludeReminderId?: string; mode?: ReminderMode }
): Promise<boolean> {
  let query = supabase
    .from('reminders')
    .select('id', { count: 'exact', head: true })
    .eq('course_id', courseId)
    .eq('user_id', userId)
    .eq('is_active', true)

  if (opts?.excludeReminderId) query = query.neq('id', opts.excludeReminderId)
  if (opts?.mode) query = query.eq('reminder_mode', opts.mode)

  const { count, error } = await query
  if (error) throw error
  return (count ?? 0) > 0
}

// Data-loss confirmation: does this Auto reminder have real progress
// (ramped past the starting level, or has at least one linked attempt)?
export async function autoReminderHasProgress(reminderId: string, autoQuestionLevel: number | null): Promise<boolean> {
  if ((autoQuestionLevel ?? 5) > 5) return true

  const [quizRes, blurtRes] = await Promise.all([
    supabase.from('quiz_attempts').select('id', { count: 'exact', head: true }).eq('reminder_id', reminderId),
    supabase.from('blurt_attempts').select('id', { count: 'exact', head: true }).eq('reminder_id', reminderId),
  ])
  return (quizRes.count ?? 0) > 0 || (blurtRes.count ?? 0) > 0
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