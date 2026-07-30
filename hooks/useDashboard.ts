

import { useState, useCallback } from 'react'
import { useFocusEffect }        from 'expo-router'
import { supabase }              from '@/lib/supabase'
import { formatTime, ScopeItem, SessionType } from '@/hooks/useReminders'
import { parseLocalDate } from '@/hooks/useExams'

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────
export interface PlanItem {
  reminderId:    string
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
  streak:          number
}

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
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

      const [remindersRes, attemptsRes, examsRes, profileRes] = await Promise.all([
        supabase
          .from('reminders')
          .select(`
            id, label, scope_items, days_of_week, is_active,
            time_of_day, session_type, question_count,
            courses ( id, title, emoji, color )
          `)
          .eq('user_id', userId)
          .eq('is_active', true),

        supabase
          .from('quiz_attempts')
          .select('id, score, question_count, created_at, course_id, lesson_id, sub_lesson_id, lessons(title, sections(courses(title))), sub_lessons(title, lessons(sections(courses(title))))')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
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
      ])

      const reminders: any[] = remindersRes.data ?? []
      const attempts  = attemptsRes.data  ?? []
      const exams     = examsRes.data     ?? []
      const profile   = profileRes.data

      const todayAttempts = attempts.filter(
        (a: any) => new Date(a.created_at).toDateString() === todayStr
      )

      // ── Today's plan — one item per reminder scheduled for today ──
      const planItems: PlanItem[] = []
      for (const r of reminders) {
        if (!r.courses || !(r.days_of_week ?? []).includes(todayDow)) continue

        const scopeItems = mapScopeItems(r.scope_items)

        const done = todayAttempts.some((a: any) => {
          if (scopeItems.length === 0) return a.course_id === r.courses.id
          return scopeItems.some(s =>
            (s.scopeType === 'topic' && a.lesson_id === s.scopeId) ||
            (s.scopeType === 'subtopic' && a.sub_lesson_id === s.scopeId)
          )
        })

        planItems.push({
          reminderId:    r.id,
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
          done,
        })
      }

      planItems.sort((a, b) => a.timeValue - b.timeValue)
      const nextUp = planItems.find(i => !i.done) ?? null
      const laterToday = planItems.filter(i => i !== nextUp)

      // ── Full week plan (all days) ──
      const weekPlan: WeekPlanItem[] = []
      for (const r of reminders) {
        if (!r.courses) continue
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
            sessionType:   r.session_type,
            questionCount: r.question_count,
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
        when: getRelativeTime(a.created_at),
        completed_at: a.created_at,
      }))

      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - 7)
      const weekAttempts  = attempts.filter((a: any) => new Date(a.created_at) >= weekStart)
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