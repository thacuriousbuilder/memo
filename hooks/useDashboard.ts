

import { useState, useCallback } from 'react'
import { useFocusEffect }        from 'expo-router'
import { supabase }              from '@/lib/supabase'
import { formatTime, ScopeItem, SessionType, ReminderMode } from '@/hooks/useReminders'
import { parseLocalDate } from '@/hooks/useExams'
import { rankTopicsForCourse, RankedCandidate } from '@/hooks/useStudyOverview'

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────
export interface PlanItem {
  reminderId:    string
  reminderMode:  ReminderMode
  label:         string
  courseId:      string
  courseTitle:   string
  courseEmoji:   string
  courseColor:   string | null
  time:          string
  timeValue:     number
  sessionType:   SessionType
  questionCount: number | null
  scopeItems:    ScopeItem[]
  done:          boolean
  doneVia:       'self' | 'scope' | null
  resolvedScopeType?: 'topic' | 'subtopic'
  resolvedScopeId?:   string
  resolvedTitle?:     string
}

export interface WeekPlanItem {
  reminderId:    string
  dayIndex:      number
  label:         string
  courseId:      string
  courseTitle:   string
  courseEmoji:   string
  courseColor:   string | null
  time:          string
  timeValue:     number
  sessionType:   SessionType
  questionCount: number | null
}

export interface EndedAutoPlan {
  reminderId:       string
  label:            string
  courseId:         string
  courseTitle:      string
  courseEmoji:      string
  courseColor:      string | null
  planDurationDays: number | null
  planEndDate:      string | null
}

export interface NeedsMaterialsPlan {
  reminderId:  string
  label:       string
  courseId:    string
  courseTitle: string
  courseEmoji: string
  courseColor: string | null
}

export interface UpcomingExam {
  id:        string
  title:     string
  course:    string
  emoji:     string
  exam_date: string
  days_left: number
}

export interface RecentSession {
  id:           string
  title:        string
  course:       string
  questions:    number
  score:        number
  when:         string
  completed_at: string
}

export interface WeekStats {
  questions:  number
  accuracy:   number
  study_time: string
}

export interface DashboardData {
  next_up:         PlanItem | null
  later_today:     PlanItem[]
  upcoming_exams:  UpcomingExam[]
  recent_sessions: RecentSession[]
  week_stats:      WeekStats
  week_plan:       WeekPlanItem[]
  ended_auto_plans:   EndedAutoPlan[]
  needs_materials:    NeedsMaterialsPlan[]
  streak:          number
}

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

// How many of a reminder's scheduled weekdays have occurred from
// plan_start_date through targetDate inclusive — pure calendar math, not
// contingent on whether those sessions were actually completed. Uses
// parseLocalDate for both endpoints to stay consistent with the rest of
// the app's local-day-boundary convention.
function sessionOrdinalForDate(planStartDate: string, daysOfWeek: number[], targetDate: Date): number {
  const start = parseLocalDate(planStartDate)
  start.setHours(0, 0, 0, 0)
  const end = new Date(targetDate)
  end.setHours(0, 0, 0, 0)
  if (end < start) return 0

  let count = 0
  const cursor = new Date(start)
  while (cursor <= end) {
    if (daysOfWeek.includes(cursor.getDay())) count++
    cursor.setDate(cursor.getDate() + 1)
  }
  return count
}

function getRelativeTime(dateStr: string): string {
  const date   = new Date(dateStr)
  const now    = new Date()
  const diffH  = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
  const diffD  = Math.floor(diffH / 24)
  if (diffH < 24) return 'Today'
  if (diffD === 1) return 'Yesterday'
  return `${diffD} days ago`
}

function getDaysLeft(dateStr: string): number {
  const exam = parseLocalDate(dateStr)
  const now  = new Date()
  exam.setHours(0, 0, 0, 0)
  now.setHours(0, 0, 0, 0)
  return Math.ceil((exam.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}


function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function mapScopeItems(raw: any[]): ScopeItem[] {
  return (raw ?? []).map((s: any) => ({ scopeType: s.scope_type, scopeId: s.scope_id, title: s.title }))
}

// ─────────────────────────────────────────
// MAIN HOOK
// ─────────────────────────────────────────
export function useDashboard(userId: string | null) {
  const [data,    setData]    = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const fetchDashboard = useCallback(async () => {
    if (!userId) { setLoading(false); return }
    try {
      setLoading(true)
      setError(null)

      const todayDow = new Date().getDay()
      const todayStr = new Date().toDateString()

      const [remindersRes, attemptsRes, examsRes, profileRes, blurtRes] = await Promise.all([
        supabase
          .from('reminders')
          .select(`
            id, label, scope_items, days_of_week, is_active,
            time_of_day, session_type, question_count,
            reminder_mode, plan_duration_days, plan_start_date, plan_end_date,
            auto_question_level, auto_session_style,
            courses ( id, title, emoji, color )
          `)
          .eq('user_id', userId)
          .eq('is_active', true),

        supabase
          .from('quiz_attempts')
          .select('id, score, question_count, completed_at, course_id, lesson_id, sub_lesson_id, reminder_id, lessons(title, sections(courses(title))), sub_lessons(title, lessons(sections(courses(title))))')
          .eq('user_id', userId)
          .order('completed_at', { ascending: false })
          .limit(30),

        supabase
          .from('exams')
          .select(`id, title, exam_date, exam_type, courses (title, emoji)`)
          .eq('user_id', userId)
          .eq('status', 'upcoming')
          .gte('exam_date', new Date().toISOString().split('T')[0])
          .order('exam_date', { ascending: true })
          .limit(10),

        supabase
          .from('profiles')
          .select('streak_count')
          .eq('id', userId)
          .single(),

        // Only reminder_id/created_at needed — used purely for today's Auto
        // done-check, not displayed. quiz_attempts already covers Manual's
        // scope-heuristic side; this covers the reminder_id side for both.
        supabase
          .from('blurt_attempts')
          .select('reminder_id, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(30),
      ])

      // Supabase-js returns { data: null, error } on failure rather than
      // throwing — without this, a failed query silently degrades to an
      // empty array/null instead of surfacing anywhere.
      if (remindersRes.error) throw remindersRes.error
      if (attemptsRes.error)  throw attemptsRes.error
      if (examsRes.error)     throw examsRes.error
      if (profileRes.error)   throw profileRes.error
      if (blurtRes.error)     throw blurtRes.error

      const reminders: any[] = remindersRes.data ?? []
      const attempts  = attemptsRes.data  ?? []
      const exams     = examsRes.data     ?? []
      const profile   = profileRes.data
      const blurtAttempts = blurtRes.data ?? []

      const todayAttempts = attempts.filter(
        (a: any) => new Date(a.completed_at).toDateString() === todayStr
      )
      const todayBlurtAttempts = blurtAttempts.filter(
        (a: any) => new Date(a.created_at).toDateString() === todayStr
      )
      const todayNow = new Date()
      const todayMidnight = new Date()
      todayMidnight.setHours(0, 0, 0, 0)

      const planItems: PlanItem[] = []
      const endedAutoPlans: EndedAutoPlan[] = []
      const needsMaterials: NeedsMaterialsPlan[] = []

      // ── Manual reminders scheduled today — unchanged path, plus the
      // additive reminder_id ("self") signal alongside the existing
      // scope heuristic ──
      const manualToday = reminders.filter((r: any) =>
        r.courses && r.reminder_mode !== 'auto' && (r.days_of_week ?? []).includes(todayDow)
      )
      for (const r of manualToday) {
        const scopeItems = mapScopeItems(r.scope_items)

        const selfDone = todayAttempts.some((a: any) => a.reminder_id === r.id) ||
          todayBlurtAttempts.some((a: any) => a.reminder_id === r.id)
        const scopeDone = todayAttempts.some((a: any) => {
          if (scopeItems.length === 0) return a.course_id === r.courses.id
          return scopeItems.some((s: ScopeItem) =>
            (s.scopeType === 'topic' && a.lesson_id === s.scopeId) ||
            (s.scopeType === 'subtopic' && a.sub_lesson_id === s.scopeId)
          )
        })

        planItems.push({
          reminderId:    r.id,
          reminderMode:  'manual',
          label:         r.label,
          courseId:      r.courses.id,
          courseTitle:   r.courses.title,
          courseEmoji:   r.courses.emoji,
          courseColor:   r.courses.color,
          time:          formatTime(r.time_of_day),
          timeValue:     timeToMinutes(r.time_of_day),
          sessionType:   r.session_type,
          questionCount: r.question_count,
          scopeItems,
          done:          selfDone || scopeDone,
          doneVia:       selfDone ? 'self' : scopeDone ? 'scope' : null,
        })
      }

      // ── Auto reminders — split into ended / due-today, resolve each
      // due-today reminder's course via rankTopicsForCourse (cached per
      // course, since two Auto reminders can share one course) ──
      const autoReminders = reminders.filter((r: any) => r.courses && r.reminder_mode === 'auto')
      const rankingCache = new Map<string, Promise<RankedCandidate[]>>()
      const getRanking = (courseId: string) => {
        if (!rankingCache.has(courseId)) {
          rankingCache.set(courseId, rankTopicsForCourse(courseId, userId))
        }
        return rankingCache.get(courseId)!
      }

      const autoDueToday: any[] = []
      for (const r of autoReminders) {
        if (r.plan_end_date && parseLocalDate(r.plan_end_date) < todayMidnight) {
          endedAutoPlans.push({
            reminderId: r.id, label: r.label,
            courseId: r.courses.id, courseTitle: r.courses.title,
            courseEmoji: r.courses.emoji, courseColor: r.courses.color,
            planDurationDays: r.plan_duration_days, planEndDate: r.plan_end_date,
          })
          continue
        }
        if ((r.days_of_week ?? []).includes(todayDow)) autoDueToday.push(r)
      }

      await Promise.all(autoDueToday.map((r: any) => getRanking(r.courses.id)))

      for (const r of autoDueToday) {
        const candidates = await getRanking(r.courses.id)
        if (candidates.length === 0) {
          needsMaterials.push({
            reminderId: r.id, label: r.label,
            courseId: r.courses.id, courseTitle: r.courses.title,
            courseEmoji: r.courses.emoji, courseColor: r.courses.color,
          })
          continue
        }

        const top = candidates[0]
        const ordinal = sessionOrdinalForDate(r.plan_start_date, r.days_of_week ?? [], todayNow)
        // Milestone 1 only builds the Alternating style; Combo (fast-follow)
        // will extend this branch once its chained-flow UI exists.
        const sessionType: SessionType = ordinal > 0 && ordinal % 4 === 0 ? 'blurt' : 'quiz'
        const questionCount = sessionType === 'quiz'
          ? (top.hasHistory ? (r.auto_question_level ?? 5) : Math.min(r.auto_question_level ?? 5, 5))
          : null

        const selfDone = sessionType === 'quiz'
          ? todayAttempts.some((a: any) => a.reminder_id === r.id)
          : todayBlurtAttempts.some((a: any) => a.reminder_id === r.id)

        planItems.push({
          reminderId:    r.id,
          reminderMode:  'auto',
          label:         r.label,
          courseId:      r.courses.id,
          courseTitle:   r.courses.title,
          courseEmoji:   r.courses.emoji,
          courseColor:   r.courses.color,
          time:          formatTime(r.time_of_day),
          timeValue:     timeToMinutes(r.time_of_day),
          sessionType,
          questionCount,
          scopeItems:    [],
          done:          selfDone,
          doneVia:       selfDone ? 'self' : null,
          resolvedScopeType: top.scopeType,
          resolvedScopeId:   top.id,
          resolvedTitle:     top.title,
        })
      }

      planItems.sort((a, b) => a.timeValue - b.timeValue)
      const nextUp = planItems.find(i => !i.done) ?? null
      // Done items sink to the bottom; not-done items stay in time order.
      const laterToday = planItems
        .filter(i => i !== nextUp)
        .sort((a, b) => Number(a.done) - Number(b.done) || a.timeValue - b.timeValue)

      // ── Full week plan (all days) — Auto entries show today's resolved
      // session type/level as a representative approximation rather than
      // re-resolving every future date, since the actual pick only ever
      // matters live, the day it happens ──
      const weekPlan: WeekPlanItem[] = []
      for (const r of reminders) {
        if (!r.courses) continue
        if (r.reminder_mode === 'auto' && r.plan_end_date && parseLocalDate(r.plan_end_date) < todayMidnight) continue
        for (const dow of r.days_of_week ?? []) {
          const dayIndex = (dow + 6) % 7
          weekPlan.push({
            reminderId:    r.id,
            dayIndex,
            label:         r.label,
            courseId:      r.courses.id,
            courseTitle:   r.courses.title,
            courseEmoji:   r.courses.emoji,
            courseColor:   r.courses.color,
            time:          formatTime(r.time_of_day),
            timeValue:     timeToMinutes(r.time_of_day),
            sessionType:   r.reminder_mode === 'auto' ? 'quiz' : r.session_type,
            questionCount: r.reminder_mode === 'auto' ? (r.auto_question_level ?? 5) : r.question_count,
          })
        }
      }
      weekPlan.sort((a, b) => a.timeValue - b.timeValue)

      const upcomingExams: UpcomingExam[] = exams.map((e: any) => ({
        id: e.id, title: e.title, course: e.courses?.title ?? '',
        emoji: e.courses?.emoji ?? 'book-open-variant', exam_date: e.exam_date,
        days_left: getDaysLeft(e.exam_date),
      }))

      const recentSessions: RecentSession[] = attempts.slice(0, 10).map((a: any) => ({
        id: a.id,
        title: a.lessons?.title ?? a.sub_lessons?.title ?? 'Quiz',
        course: a.lessons?.sections?.courses?.title ?? a.sub_lessons?.lessons?.sections?.courses?.title ?? '',
        questions: a.question_count,
        score: a.question_count > 0 ? Math.round((a.score / a.question_count) * 100) : 0,
        when: getRelativeTime(a.completed_at),
        completed_at: a.completed_at,
      }))

      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - 7)
      const weekAttempts  = attempts.filter((a: any) => new Date(a.completed_at) >= weekStart)
      const weekQuestions = weekAttempts.reduce((s: number, a: any) => s + a.question_count, 0)
      const weekCorrect   = weekAttempts.reduce((s: number, a: any) => s + a.score, 0)
      const weekAccuracy  = weekQuestions > 0 ? Math.round((weekCorrect / weekQuestions) * 100) : 0
      const weekHours     = Math.floor(weekQuestions / 60)
      const weekTime      = weekHours > 0 ? `${weekHours}h ${weekQuestions % 60}m` : `${weekQuestions}m`

      setData({
        next_up: nextUp,
        later_today: laterToday,
        upcoming_exams: upcomingExams,
        recent_sessions: recentSessions,
        week_stats: { questions: weekQuestions, accuracy: weekAccuracy, study_time: weekTime },
        week_plan: weekPlan,
        ended_auto_plans: endedAutoPlans,
        needs_materials: needsMaterials,
        streak: profile?.streak_count ?? 0,
      })
    } catch (err: any) {
      setError(err.message)
      console.error('Dashboard fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useFocusEffect(useCallback(() => { fetchDashboard() }, [fetchDashboard]))

  return { data, loading, error, refetch: fetchDashboard }
}