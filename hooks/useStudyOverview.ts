

import { useState, useCallback } from 'react'
import { useFocusEffect } from 'expo-router'
import { supabase } from '@/lib/supabase'

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────
export interface QuizRecentAttempt {
  kind:          'quiz'
  id:            string
  courseTitle:   string
  courseIcon:    string
  courseColor:   string | null
  scopeLabel:    string
  questionCount: number
  scorePct:      number
  date:          string
  mode:          'course' | 'lesson' | 'sublesson' | 'quick'
  targetId:      string
}

export interface BlurtRecentAttempt {
  kind:         'blurt'
  id:           string
  courseTitle:  string
  courseIcon:   string
  courseColor:  string | null
  scopeLabel:   string
  promptCount:  number
  rating:       'strong' | 'partial' | 'weak'
  date:         string
  scopeType:    'topic' | 'subtopic'
  scopeId:      string
  ids:          string[]
}

export type RecentAttempt = QuizRecentAttempt | BlurtRecentAttempt

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
  const [recentAttempts, setRecentAttempts] = useState<RecentAttempt[]>([])
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const fetchOverview = useCallback(async () => {
    if (!userId) { setLoading(false); return }
    try {
      setLoading(true)
      setError(null)

      // ── Course structure — used both to resolve course info for blurt
      // attempts (which don't store course_id directly, only
      // lesson_id/sub_lesson_id) and for the staleness recommendations below ──
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

      const lessonInfo    = new Map<string, { courseId: string; courseTitle: string; courseIcon: string; courseColor: string | null; title: string }>()
      const subLessonInfo = new Map<string, { courseId: string; courseTitle: string; courseIcon: string; courseColor: string | null; title: string }>()
      for (const course of coursesData ?? []) {
        for (const section of course.sections ?? []) {
          for (const lesson of section.lessons ?? []) {
            lessonInfo.set(lesson.id, {
              courseId: course.id, courseTitle: course.title,
              courseIcon: course.emoji, courseColor: course.color, title: lesson.title,
            })
            for (const sub of lesson.sub_lessons ?? []) {
              subLessonInfo.set(sub.id, {
                courseId: course.id, courseTitle: course.title,
                courseIcon: course.emoji, courseColor: course.color, title: sub.title,
              })
            }
          }
        }
      }

      // ── All quiz attempts, joined to course, for recent history ──
      const { data: attempts, error: attErr } = await supabase
        .from('quiz_attempts')
        .select(`
          id, score, question_count, completed_at, lesson_id, sub_lesson_id, course_id,
          courses ( id, title, emoji, color ),
          lessons ( title ),
          sub_lessons ( title )
        `)
        .eq('user_id', userId)
        .order('completed_at', { ascending: false })

      if (attErr) throw attErr

      // Quick Quiz ("all courses") and Review Mistakes attempts have no
      // course_id/lesson_id/sub_lesson_id — they span every course, so
      // they can't be attributed to one. Show them as a generic entry
      // instead of dropping them from Recently entirely.
      const quizRecent: QuizRecentAttempt[] = (attempts ?? []).map((a: any) => {
        const mode: QuizRecentAttempt['mode'] = a.sub_lesson_id ? 'sublesson' : a.lesson_id ? 'lesson' : a.course_id ? 'course' : 'quick'
        const targetId = a.sub_lesson_id ?? a.lesson_id ?? a.course_id ?? 'all'

        return {
          kind:          'quiz',
          id:            a.id,
          courseTitle:   a.courses?.title ?? 'Quick Quiz',
          courseIcon:    a.courses?.emoji ?? 'shuffle-variant',
          courseColor:   a.courses?.color ?? null,
          scopeLabel:    a.sub_lessons?.title ?? a.lessons?.title ?? (a.course_id ? 'Whole course' : 'All courses'),
          questionCount: a.question_count,
          scorePct:      a.question_count > 0 ? Math.round((a.score / a.question_count) * 100) : 0,
          date:          a.completed_at,
          mode,
          targetId,
        }
      })

      // ── Blurt attempts — one row per graded prompt, no session id of
      // its own. Group consecutive attempts on the same topic/subtopic
      // within a short window into a single "session" row for display ──
      const { data: blurtRows, error: blurtErr } = await supabase
        .from('blurt_attempts')
        .select('id, scope_type, lesson_id, sub_lesson_id, rating, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })

      if (blurtErr) throw blurtErr

      const SESSION_WINDOW_MS = 15 * 60 * 1000
      type BlurtGroup = { scopeType: 'topic' | 'subtopic'; scopeId: string; ratings: string[]; lastTime: number; lastId: string; ids: string[] }
      const blurtGroups: BlurtGroup[] = []
      for (const row of blurtRows ?? []) {
        const scopeId = row.lesson_id ?? row.sub_lesson_id
        if (!scopeId) continue
        const t = new Date(row.created_at).getTime()
        const last = blurtGroups[blurtGroups.length - 1]
        if (last && last.scopeId === scopeId && t - last.lastTime <= SESSION_WINDOW_MS) {
          last.ratings.push(row.rating)
          last.lastTime = t
          last.lastId = row.id
          last.ids.push(row.id)
        } else {
          blurtGroups.push({ scopeType: row.scope_type, scopeId, ratings: [row.rating], lastTime: t, lastId: row.id, ids: [row.id] })
        }
      }

      const blurtRecent: BlurtRecentAttempt[] = blurtGroups.reverse().flatMap(group => {
        const info = group.scopeType === 'topic' ? lessonInfo.get(group.scopeId) : subLessonInfo.get(group.scopeId)
        if (!info) return []

        const counts: Record<string, number> = { strong: 0, partial: 0, weak: 0 }
        group.ratings.forEach(r => { counts[r] = (counts[r] ?? 0) + 1 })
        const rating = (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'partial') as BlurtRecentAttempt['rating']

        return [{
          kind:        'blurt' as const,
          id:          group.lastId,
          courseTitle: info.courseTitle,
          courseIcon:  info.courseIcon,
          courseColor: info.courseColor,
          scopeLabel:  info.title,
          promptCount: group.ratings.length,
          rating,
          date:        new Date(group.lastTime).toISOString(),
          scopeType:   group.scopeType,
          scopeId:     group.scopeId,
          ids:         group.ids,
        }]
      })

      // Merge, sort by actual recency, keep the last 5 across both kinds
      const recent: RecentAttempt[] = [...quizRecent, ...blurtRecent]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5)
        .map(a => ({ ...a, date: new Date(a.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }))

      setRecentAttempts(recent)

      // ── Recommendations: staleness + upcoming-test proximity ──
      const { data: examRows } = await supabase
        .from('exams')
        .select('course_id, exam_date, material_note_ids')
        .eq('user_id', userId)
        .eq('status', 'upcoming')
        .gte('exam_date', new Date().toISOString().split('T')[0])

      const attemptsByLesson = new Map<string, string>()
      const attemptsBySubLesson = new Map<string, string>()
      ;(attempts ?? []).forEach((a: any) => {
        if (a.lesson_id && !attemptsByLesson.has(a.lesson_id)) attemptsByLesson.set(a.lesson_id, a.completed_at)
        if (a.sub_lesson_id && !attemptsBySubLesson.has(a.sub_lesson_id)) attemptsBySubLesson.set(a.sub_lesson_id, a.completed_at)
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
      console.error('[StudyOverview] fetchOverview failed:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useFocusEffect(
    useCallback(() => { fetchOverview() }, [fetchOverview])
  )

  return { recentAttempts, recommendations, loading, error, refetch: fetchOverview }
}

// ─────────────────────────────────────────
// FETCH A PAST BLURT SESSION'S FULL DETAIL
// Recently only stores one representative row per grouped session, so
// viewing a past session's results re-fetches every prompt in it by id.
// ─────────────────────────────────────────
export async function fetchBlurtSessionDetail(ids: string[]): Promise<{
  rating: 'strong' | 'partial' | 'weak'
  feedback: string
  review_pointers: string[]
}[]> {
  const { data, error } = await supabase
    .from('blurt_attempts')
    .select('rating, feedback, review_pointers, created_at')
    .in('id', ids)
    .order('created_at', { ascending: true })

  if (error) throw error

  return (data ?? []).map((r: any) => ({
    rating:          r.rating,
    feedback:        r.feedback,
    review_pointers: r.review_pointers ?? [],
  }))
}

// ─────────────────────────────────────────
// PICK A RANDOM TOPIC/SUBTOPIC FOR QUICK BLURT
// Unlike Quick Quiz (which can pool questions from every note at once),
// a blurt prompt is generated for one topic's material — so "quick"
// here means picking a random topic that has notes, not mixing topics.
// ─────────────────────────────────────────
export async function pickRandomBlurtScope(userId: string): Promise<{
  scopeType: 'topic' | 'subtopic'
  scopeId:   string
  title:     string
} | null> {
  const { data, error } = await supabase
    .from('courses')
    .select(`
      sections (
        lessons (
          id, title,
          notes ( parsed_text ),
          sub_lessons ( id, title, notes ( parsed_text ) )
        )
      )
    `)
    .eq('user_id', userId)

  if (error) throw error

  const candidates: { scopeType: 'topic' | 'subtopic'; scopeId: string; title: string }[] = []
  for (const course of data ?? []) {
    for (const section of course.sections ?? []) {
      for (const lesson of section.lessons ?? []) {
        if ((lesson.notes ?? []).some((n: any) => n.parsed_text)) {
          candidates.push({ scopeType: 'topic', scopeId: lesson.id, title: lesson.title })
        }
        for (const sub of lesson.sub_lessons ?? []) {
          if ((sub.notes ?? []).some((n: any) => n.parsed_text)) {
            candidates.push({ scopeType: 'subtopic', scopeId: sub.id, title: sub.title })
          }
        }
      }
    }
  }

  if (!candidates.length) return null
  return candidates[Math.floor(Math.random() * candidates.length)]
}