// hooks/useDashboard.ts

import { useState, useCallback } from 'react'
import { useFocusEffect }        from 'expo-router'
import { supabase }              from '@/lib/supabase'

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────
export interface NextUpLesson {
  id:          string
  title:        string
  course_title: string
  course_emoji: string
  questions:    number
  progress:     number
  mode:         'lesson' | 'lesson_all'
}

export interface TodayCourse {
  id:           string
  lesson_id:    string
  emoji:        string
  title:        string
  questions:    number
  done:         boolean
  score:        number
}

export interface UpcomingExam {
  id:           string
  title:        string
  course:       string
  emoji:        string
  exam_date:    string
  days_left:    number
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
  next_up:        NextUpLesson | null
  today_courses:  TodayCourse[]
  upcoming_exams: UpcomingExam[]
  recent_sessions: RecentSession[]
  week_stats:     WeekStats
  streak:         number
}

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
function getRelativeTime(dateStr: string): string {
  const date  = new Date(dateStr)
  const now   = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffH  = diffMs / (1000 * 60 * 60)
  const diffD  = Math.floor(diffH / 24)

  if (diffH < 24) return 'Today'
  if (diffD === 1) return 'Yesterday'
  return `${diffD} days ago`
}

function getDaysLeft(dateStr: string): number {
  const exam = new Date(dateStr)
  const now  = new Date()
  exam.setHours(0, 0, 0, 0)
  now.setHours(0, 0, 0, 0)
  return Math.ceil(
    (exam.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  )
}

// ─────────────────────────────────────────
// MAIN HOOK
// ─────────────────────────────────────────
export function useDashboard(userId: string | null) {
  const [data,    setData]    = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const fetchDashboard = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      setError(null)

      // Run all queries in parallel
      const [
        coursesRes,
        attemptsRes,
        examsRes,
        progressRes,
        profileRes,
      ] = await Promise.all([
        // All courses with sections → lessons
        supabase
          .from('courses')
          .select(`
            id, title, emoji, color,
            sections (
              id,
              lessons (
                id, title, order_index,
                user_progress!left (status),
                notes (id, questions(id)),
                sub_lessons (
                  id,
                  notes (id, questions(id))
                )
              )
            )
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),

        // Recent quiz attempts
        supabase
          .from('quiz_attempts')
          .select(`
            id, score, question_count, created_at,
            lessons (id, title, sections(courses(title, emoji))),
            sub_lessons (id, title, lessons(sections(courses(title, emoji))))
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20),

        // Upcoming exams
        supabase
          .from('exams')
          .select(`
            id, title, exam_date, exam_type,
            courses (title, emoji)
          `)
          .eq('user_id', userId)
          .eq('status', 'upcoming')
          .gte('exam_date', new Date().toISOString().split('T')[0])
          .order('exam_date', { ascending: true })
          .limit(10),

        // User progress
        supabase
          .from('user_progress')
          .select('lesson_id, sub_lesson_id, status, updated_at')
          .eq('user_id', userId),

        // Profile for streak
        supabase
          .from('profiles')
          .select('streak_count, last_studied_at')
          .eq('id', userId)
          .single(),
      ])

      const courses  = coursesRes.data  ?? []
      const attempts = attemptsRes.data ?? []
      const exams    = examsRes.data    ?? []
      const progress = progressRes.data ?? []
      const profile  = profileRes.data

      // ── Build progress map ──
      const progressMap = new Map<string, string>()
      progress.forEach((p: any) => {
        if (p.lesson_id)     progressMap.set(p.lesson_id,     p.status)
        if (p.sub_lesson_id) progressMap.set(p.sub_lesson_id, p.status)
      })

      // ── Today's courses ──
      // Get all lessons that have questions, build today's quiz list
      const today = new Date()
      const todayStr = today.toDateString()

      const todayAttemptLessonIds = new Set(
        attempts
          .filter((a: any) =>
            new Date(a.created_at).toDateString() === todayStr
          )
          .map((a: any) => a.lessons?.id)
          .filter(Boolean)
      )

      const todayCourses: TodayCourse[] = []
      for (const course of courses) {
        for (const section of course.sections ?? []) {
          for (const lesson of section.lessons ?? []) {
            const hasQuestions =
              (lesson.notes ?? []).some((n: any) => n.questions?.length > 0) ||
              (lesson.sub_lessons ?? []).some((sl: any) =>
                sl.notes?.some((n: any) => n.questions?.length > 0)
              )

            if (!hasQuestions) continue

            const done     = todayAttemptLessonIds.has(lesson.id)
            const todayAtt = attempts.find(
              (a: any) =>
                a.lessons?.id === lesson.id &&
                new Date(a.created_at).toDateString() === todayStr
            )
            const score = todayAtt
              ? Math.round((todayAtt.score / todayAtt.question_count) * 100)
              : 0

            const qCount =
              (lesson.notes ?? [])
                .flatMap((n: any) => n.questions ?? []).length +
              (lesson.sub_lessons ?? [])
                .flatMap((sl: any) =>
                  (sl.notes ?? []).flatMap((n: any) => n.questions ?? [])
                ).length

            todayCourses.push({
              id:        course.id,
              lesson_id: lesson.id,
              emoji:     course.emoji,
              title:     course.title,
              questions: qCount,
              done,
              score,
            })
          }
        }
      }

      // ── Next Up ──
      // First in_progress lesson, else first not_started with questions
      let nextUp: NextUpLesson | null = null
      for (const course of courses) {
        if (nextUp) break
        for (const section of course.sections ?? []) {
          if (nextUp) break
          const sorted = [...(section.lessons ?? [])].sort(
            (a: any, b: any) => a.order_index - b.order_index
          )
          for (const lesson of sorted) {
            const status = progressMap.get(lesson.id)
            if (status === 'passed') continue

            const hasQ =
              (lesson.notes ?? []).some((n: any) => n.questions?.length > 0) ||
              (lesson.sub_lessons ?? []).some((sl: any) =>
                sl.notes?.some((n: any) => n.questions?.length > 0)
              )
            if (!hasQ) continue

            const qCount =
              (lesson.notes ?? [])
                .flatMap((n: any) => n.questions ?? []).length +
              (lesson.sub_lessons ?? [])
                .flatMap((sl: any) =>
                  (sl.notes ?? []).flatMap((n: any) => n.questions ?? [])
                ).length

            const hasSubs = (lesson.sub_lessons ?? []).length > 0

            nextUp = {
              id:           lesson.id,
              title:        lesson.title,
              course_title: course.title,
              course_emoji: course.emoji,
              questions:    qCount,
              progress:     status === 'in_progress' ? 50 : 0,
              mode:         hasSubs ? 'lesson_all' : 'lesson',
            }
            break
          }
        }
      }

      // ── Upcoming Exams ──
      const upcomingExams: UpcomingExam[] = exams.map((e: any) => ({
        id:        e.id,
        title:     e.title,
        course:    e.courses?.title ?? '',
        emoji:     e.courses?.emoji ?? '📄',
        exam_date: e.exam_date,
        days_left: getDaysLeft(e.exam_date),
      }))

      // ── Recent Sessions ──
      const recentSessions: RecentSession[] = attempts
        .slice(0, 10)
        .map((a: any) => {
          const lessonTitle =
            a.lessons?.title ??
            a.sub_lessons?.title ??
            'Quiz'

          const courseTitle =
            a.lessons?.sections?.courses?.title ??
            a.sub_lessons?.lessons?.sections?.courses?.title ??
            ''

          const courseEmoji =
            a.lessons?.sections?.courses?.emoji ??
            a.sub_lessons?.lessons?.sections?.courses?.emoji ??
            '📚'

          return {
            id:           a.id,
            title:        lessonTitle,
            course:       courseTitle,
            questions:    a.question_count,
            score:        Math.round((a.score / a.question_count) * 100),
            when:         getRelativeTime(a.created_at),
            completed_at: a.created_at,
          }
        })

      // ── Week Stats ──
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - 7)

      const weekAttempts = attempts.filter(
        (a: any) => new Date(a.created_at) >= weekStart
      )

      const weekQuestions = weekAttempts.reduce(
        (s: number, a: any) => s + a.question_count, 0
      )
      const weekCorrect = weekAttempts.reduce(
        (s: number, a: any) => s + a.score, 0
      )
      const weekAccuracy = weekQuestions > 0
        ? Math.round((weekCorrect / weekQuestions) * 100)
        : 0

      // Estimate study time: ~1 min per question
      const weekMins  = weekQuestions
      const weekHours = Math.floor(weekMins / 60)
      const weekRemMins = weekMins % 60
      const weekTime  = weekHours > 0
        ? `${weekHours}h ${weekRemMins}m`
        : `${weekMins}m`

      setData({
        next_up:         nextUp,
        today_courses:   todayCourses.slice(0, 5),
        upcoming_exams:  upcomingExams,
        recent_sessions: recentSessions,
        week_stats: {
          questions:  weekQuestions,
          accuracy:   weekAccuracy,
          study_time: weekTime,
        },
        streak: profile?.streak_count ?? 0,
      })
    } catch (err: any) {
      setError(err.message)
      console.error('Dashboard fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [userId])

  // Refetch every time screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchDashboard()
    }, [fetchDashboard])
  )

  return { data, loading, error, refetch: fetchDashboard }
}