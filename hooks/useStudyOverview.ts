

import { useState, useCallback } from 'react'
import { useFocusEffect } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { formatTime, formatDaysOfWeek, ScopeType, SessionType } from '@/hooks/useReminders'

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────
export interface ScheduledReminder {
  id:             string
  label:          string
  courseId:       string
  courseTitle:    string
  courseIcon:     string
  courseColor:    string | null
  time:           string
  daysLabel:      string
  scopeType:      ScopeType
  scopeId:        string | null
  sessionType:    SessionType
  questionCount:  number | null
}

export interface WeakestCourse {
  courseId:   string
  title:      string
  icon:       string
  color:      string | null
  gradePct:   number
}

export interface RecentAttempt {
  id:            string
  courseTitle:   string
  courseIcon:    string
  courseColor:   string | null
  scopeLabel:    string
  questionCount: number
  scorePct:      number
  date:          string
}

export interface Recommendation {
  id:          string
  scopeType:   'topic' | 'subtopic'
  title:       string
  courseId:    string
  courseTitle: string
  courseIcon:  string
  courseColor: string | null
  reason:      string
  noteIds:     string[]
  urgent:      boolean
}

// ─────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────
export function useStudyOverview(userId: string | null) {
  const [scheduled,      setScheduled]      = useState<ScheduledReminder[]>([])
  const [weakestCourse,  setWeakestCourse]  = useState<WeakestCourse | null>(null)
  const [recentAttempts, setRecentAttempts] = useState<RecentAttempt[]>([])
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const fetchOverview = useCallback(async () => {
    if (!userId) { setLoading(false); return }
    try {
      setLoading(true)
      setError(null)

      // ── Scheduled reminders across all courses ──
      const { data: reminderRows, error: remErr } = await supabase
        .from('reminders')
        .select(`
          id, label, scope_type, scope_id, is_active,
          courses ( id, title, emoji, color ),
          reminder_time_slots ( time_of_day, session_type, question_count, order_index )
        `)
        .eq('user_id', userId)
        .eq('is_active', true)

      if (remErr) throw remErr

      const flatScheduled: ScheduledReminder[] = []
      ;(reminderRows ?? []).forEach((r: any) => {
        const firstSlot = (r.reminder_time_slots ?? []).sort((a: any, b: any) => a.order_index - b.order_index)[0]
        if (!firstSlot || !r.courses) return
        flatScheduled.push({
          id:            r.id,
          label:         r.label,
          courseId:      r.courses.id,
          courseTitle:   r.courses.title,
          courseIcon:    r.courses.emoji,
          courseColor:   r.courses.color,
          time:          formatTime(firstSlot.time_of_day),
          daysLabel:     '',
          scopeType:     r.scope_type,
          scopeId:       r.scope_id,
          sessionType:   firstSlot.session_type,
          questionCount: firstSlot.question_count,
        })
      })
      setScheduled(flatScheduled)

      // ── All quiz attempts, joined to course, for weakest-course + recent history ──
      const { data: attempts, error: attErr } = await supabase
        .from('quiz_attempts')
        .select(`
          id, score, question_count, created_at, lesson_id, sub_lesson_id, course_id,
          courses ( id, title, emoji, color ),
          lessons ( title ),
          sub_lessons ( title )
        `)
        .eq('user_id', userId)
        .not('course_id', 'is', null)
        .order('created_at', { ascending: false })

      if (attErr) throw attErr

      // Weakest course — average score% grouped by course
      const byCourse = new Map<string, { title: string; icon: string; color: string | null; totalScore: number; totalCount: number }>()
      ;(attempts ?? []).forEach((a: any) => {
        if (!a.courses) return
        const entry = byCourse.get(a.course_id) ?? { title: a.courses.title, icon: a.courses.emoji, color: a.courses.color, totalScore: 0, totalCount: 0 }
        entry.totalScore += a.score
        entry.totalCount += a.question_count
        byCourse.set(a.course_id, entry)
      })

      let weakest: WeakestCourse | null = null
      byCourse.forEach((v, courseId) => {
        if (v.totalCount === 0) return
        const pct = Math.round((v.totalScore / v.totalCount) * 100)
        if (!weakest || pct < weakest.gradePct) {
          weakest = { courseId, title: v.title, icon: v.icon, color: v.color, gradePct: pct }
        }
      })
      setWeakestCourse(weakest)

      // Recent attempts — last 5
      const recent: RecentAttempt[] = (attempts ?? []).slice(0, 5).map((a: any) => ({
        id:            a.id,
        courseTitle:   a.courses?.title ?? 'Unknown course',
        courseIcon:    a.courses?.emoji ?? 'book-open-variant',
        courseColor:   a.courses?.color ?? null,
        scopeLabel:    a.sub_lessons?.title ?? a.lessons?.title ?? 'Whole course',
        questionCount: a.question_count,
        scorePct:      a.question_count > 0 ? Math.round((a.score / a.question_count) * 100) : 0,
        date:          new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      }))
      setRecentAttempts(recent)

      // ── Recommendations: staleness + upcoming-test proximity ──
      const { data: coursesData } = await supabase
        .from('courses')
        .select(`
          id, title, emoji, color,
          sections (
            lessons (
              id, title,
              notes ( id, parsed_text ),
              sub_lessons (
                id, title,
                notes ( id, parsed_text )
              )
            )
          )
        `)
        .eq('user_id', userId)

      const { data: examRows } = await supabase
        .from('exams')
        .select('course_id, exam_date, material_note_ids')
        .eq('user_id', userId)
        .eq('status', 'upcoming')
        .gte('exam_date', new Date().toISOString().split('T')[0])

      const attemptsByLesson = new Map<string, string>()
      const attemptsBySubLesson = new Map<string, string>()
      ;(attempts ?? []).forEach((a: any) => {
        if (a.lesson_id && !attemptsByLesson.has(a.lesson_id)) attemptsByLesson.set(a.lesson_id, a.created_at)
        if (a.sub_lesson_id && !attemptsBySubLesson.has(a.sub_lesson_id)) attemptsBySubLesson.set(a.sub_lesson_id, a.created_at)
      })

      const daysAgo = (dateStr: string) => Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
      const daysUntil = (dateStr: string) => Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24))

      const candidates: (Recommendation & { sortKey: number; tier: 1 | 2 })[] = []

      for (const course of coursesData ?? []) {
        const courseExams = (examRows ?? []).filter((e: any) => e.course_id === course.id)

        for (const section of course.sections ?? []) {
          for (const lesson of section.lessons ?? []) {
            const lessonNoteIds = (lesson.notes ?? []).filter((n: any) => n.parsed_text).map((n: any) => n.id)
            const lastAttempt = attemptsByLesson.get(lesson.id)

            if (lessonNoteIds.length > 0 && lastAttempt) {
              const linkedExam = courseExams.find((e: any) =>
                (e.material_note_ids ?? []).some((id: string) => lessonNoteIds.includes(id)))
              if (linkedExam) {
                const dUntil = daysUntil(linkedExam.exam_date)
                if (dUntil <= 7) {
                  candidates.push({
                    id: lesson.id, scopeType: 'topic', title: lesson.title,
                    courseId: course.id, courseTitle: course.title, courseIcon: course.emoji, courseColor: course.color,
                    reason: dUntil <= 0 ? 'Test today' : dUntil === 1 ? 'Test tomorrow' : `Test in ${dUntil} days`,
                    noteIds: lessonNoteIds, urgent: true, tier: 1, sortKey: dUntil,
                  })
                  continue
                }
              }
              const dAgo = daysAgo(lastAttempt)
              candidates.push({
                id: lesson.id, scopeType: 'topic', title: lesson.title,
                courseId: course.id, courseTitle: course.title, courseIcon: course.emoji, courseColor: course.color,
                reason: dAgo === 0 ? 'Studied today' : dAgo === 1 ? 'Last studied yesterday' : `Last studied ${dAgo} days ago`,
                noteIds: lessonNoteIds, urgent: false, tier: 2, sortKey: -dAgo,
              })
            }

            for (const sub of lesson.sub_lessons ?? []) {
              const subNoteIds = (sub.notes ?? []).filter((n: any) => n.parsed_text).map((n: any) => n.id)
              const lastSubAttempt = attemptsBySubLesson.get(sub.id)
              if (subNoteIds.length === 0 || !lastSubAttempt) continue

              const linkedExam = courseExams.find((e: any) =>
                (e.material_note_ids ?? []).some((id: string) => subNoteIds.includes(id)))
              if (linkedExam) {
                const dUntil = daysUntil(linkedExam.exam_date)
                if (dUntil <= 7) {
                  candidates.push({
                    id: sub.id, scopeType: 'subtopic', title: sub.title,
                    courseId: course.id, courseTitle: course.title, courseIcon: course.emoji, courseColor: course.color,
                    reason: dUntil <= 0 ? 'Test today' : dUntil === 1 ? 'Test tomorrow' : `Test in ${dUntil} days`,
                    noteIds: subNoteIds, urgent: true, tier: 1, sortKey: dUntil,
                  })
                  continue
                }
              }
              const dAgo = daysAgo(lastSubAttempt)
              candidates.push({
                id: sub.id, scopeType: 'subtopic', title: sub.title,
                courseId: course.id, courseTitle: course.title, courseIcon: course.emoji, courseColor: course.color,
                reason: dAgo === 0 ? 'Studied today' : dAgo === 1 ? 'Last studied yesterday' : `Last studied ${dAgo} days ago`,
                noteIds: subNoteIds, urgent: false, tier: 2, sortKey: -dAgo,
              })
            }
          }
        }
      }

      candidates.sort((a, b) => a.tier - b.tier || a.sortKey - b.sortKey)
      setRecommendations(candidates.slice(0, 5).map(({ tier, sortKey, ...r }) => r))

    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useFocusEffect(
    useCallback(() => { fetchOverview() }, [fetchOverview])
  )

  return { scheduled, weakestCourse, recentAttempts, recommendations, loading, error, refetch: fetchOverview }
}