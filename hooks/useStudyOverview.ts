

import { useState, useCallback } from 'react'
import { useFocusEffect } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { getLatestCorrectnessMap } from '@/hooks/useQuiz'

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
  id:           string
  scopeType:    'topic' | 'subtopic'
  title:        string
  courseId:     string
  courseTitle:  string
  courseIcon:   string
  courseColor:  string | null
  reason:       string
  noteIds:      string[]
  urgent:       boolean
  tier:         1 | 2 | 3
  lastScorePct: number | null
  blurtRating:  'strong' | 'partial' | 'weak' | null
}

export interface RankedCandidate extends Recommendation {
  sortKey:     number
  hasHistory:  boolean   // false only for brand-new/never-attempted topics (Tier 2, or a zero-attempt Tier 1) — drives the Auto-plan zero-attempt question-count guardrail
}

// ─────────────────────────────────────────
// PER-COURSE RANKING (shared by the Study tab and Auto reminder plans)
// Three always-on tiers, each independently evaluated every time (no
// empty-list-only fallback):
//   Tier 1 — exam-linked within 7 days, regardless of attempt history
//   Tier 2 — has notes, zero attempts (new course material, or a brand-new
//            course) — this is what lets newly uploaded content actually
//            enter an Auto plan's rotation instead of staying invisible
//   Tier 3 — has attempt history, sorted by staleness (most days since
//            last touch first)
// Extracted so Auto plans can resolve a single course's top pick without
// recomputing every course's structure.
// ─────────────────────────────────────────
function daysAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}
function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

// ── Blend quiz + Blurt "last touched" maps — a topic studied only via
// Blurt should count as touched, not invisible to ranking ──
function maxDate(a?: string, b?: string): string | undefined {
  if (!a) return b
  if (!b) return a
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b
}
function combineAttemptMaps(quiz: Map<string, string>, blurt: Map<string, string>): Map<string, string> {
  const combined = new Map<string, string>()
  for (const id of new Set([...quiz.keys(), ...blurt.keys()])) {
    const date = maxDate(quiz.get(id), blurt.get(id))
    if (date) combined.set(id, date)
  }
  return combined
}

export function rankCourseTopics(
  course: any,
  courseExams: any[],
  attemptsByLesson: Map<string, string>,
  attemptsBySubLesson: Map<string, string>,
): RankedCandidate[] {
  const candidates: RankedCandidate[] = []

  const rankUnit = (
    id: string, scopeType: 'topic' | 'subtopic', title: string, noteIds: string[], lastAttempt: string | undefined
  ) => {
    if (noteIds.length === 0) return

    const linkedExam = courseExams.find((e: any) =>
      (e.material_note_ids ?? []).some((nid: string) => noteIds.includes(nid)))
    if (linkedExam) {
      const dUntil = daysUntil(linkedExam.exam_date)
      if (dUntil <= 7) {
        candidates.push({
          id, scopeType, title,
          courseId: course.id, courseTitle: course.title, courseIcon: course.emoji, courseColor: course.color,
          reason: dUntil <= 0 ? 'Test today' : dUntil === 1 ? 'Test tomorrow' : `Test in ${dUntil} days`,
          noteIds, urgent: true, tier: 1, sortKey: dUntil, hasHistory: !!lastAttempt,
          lastScorePct: null, blurtRating: null,
        })
        return
      }
    }

    if (lastAttempt) {
      const dAgo = daysAgo(lastAttempt)
      candidates.push({
        id, scopeType, title,
        courseId: course.id, courseTitle: course.title, courseIcon: course.emoji, courseColor: course.color,
        reason: dAgo === 0 ? 'Studied today' : dAgo === 1 ? 'Last studied yesterday' : `Last studied ${dAgo} days ago`,
        noteIds, urgent: false, tier: 3, sortKey: -dAgo, hasHistory: true,
        lastScorePct: null, blurtRating: null,
      })
      return
    }

    candidates.push({
      id, scopeType, title,
      courseId: course.id, courseTitle: course.title, courseIcon: course.emoji, courseColor: course.color,
      reason: 'Not started yet',
      noteIds, urgent: false, tier: 2, sortKey: 0, hasHistory: false,
      lastScorePct: null, blurtRating: null,
    })
  }

  for (const section of course.sections ?? []) {
    for (const lesson of section.lessons ?? []) {
      const lessonNoteIds = (lesson.notes ?? []).filter((n: any) => n.parsed_text).map((n: any) => n.id)
      rankUnit(lesson.id, 'topic', lesson.title, lessonNoteIds, attemptsByLesson.get(lesson.id))

      for (const sub of lesson.sub_lessons ?? []) {
        const subNoteIds = (sub.notes ?? []).filter((n: any) => n.parsed_text).map((n: any) => n.id)
        rankUnit(sub.id, 'subtopic', sub.title, subNoteIds, attemptsBySubLesson.get(sub.id))
      }
    }
  }

  return candidates
}

// ─────────────────────────────────────────
// SCOPED RANKING FOR ONE COURSE (used by Auto reminder plans to resolve
// "what should today's session cover" without pulling every course's
// structure the way the Study tab's fetchOverview does). Returns [] when
// the course has zero parsed notes anywhere — callers should treat that
// as a distinct "nothing to study yet" state, not an error.
// ─────────────────────────────────────────
export async function rankTopicsForCourse(courseId: string, userId: string): Promise<RankedCandidate[]> {
  const { data: course } = await supabase
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
    .eq('id', courseId)
    .single()

  if (!course) return []

  const lessonIds: string[] = []
  const subLessonIds: string[] = []
  for (const section of course.sections ?? []) {
    for (const lesson of section.lessons ?? []) {
      lessonIds.push(lesson.id)
      for (const sub of lesson.sub_lessons ?? []) subLessonIds.push(sub.id)
    }
  }

  const scopeFilter = [
    lessonIds.length    ? `lesson_id.in.(${lessonIds.join(',')})`       : null,
    subLessonIds.length ? `sub_lesson_id.in.(${subLessonIds.join(',')})` : null,
  ].filter(Boolean).join(',')

  const [examRes, attemptsRes, blurtRes] = await Promise.all([
    supabase
      .from('exams')
      .select('course_id, exam_date, material_note_ids')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .eq('status', 'upcoming')
      .gte('exam_date', new Date().toISOString().split('T')[0]),
    scopeFilter
      ? supabase.from('quiz_attempts').select('lesson_id, sub_lesson_id, completed_at').eq('user_id', userId).or(scopeFilter).order('completed_at', { ascending: false })
      : Promise.resolve({ data: [] as any[] }),
    scopeFilter
      ? supabase.from('blurt_attempts').select('lesson_id, sub_lesson_id, created_at').eq('user_id', userId).or(scopeFilter).order('created_at', { ascending: true })
      : Promise.resolve({ data: [] as any[] }),
  ])

  const attemptsByLesson = new Map<string, string>()
  const attemptsBySubLesson = new Map<string, string>()
  ;(attemptsRes.data ?? []).forEach((a: any) => {
    if (a.lesson_id && !attemptsByLesson.has(a.lesson_id)) attemptsByLesson.set(a.lesson_id, a.completed_at)
    if (a.sub_lesson_id && !attemptsBySubLesson.has(a.sub_lesson_id)) attemptsBySubLesson.set(a.sub_lesson_id, a.completed_at)
  })

  const blurtByLesson = new Map<string, string>()
  const blurtBySubLesson = new Map<string, string>()
  ;(blurtRes.data ?? []).forEach((r: any) => {
    if (r.lesson_id) blurtByLesson.set(r.lesson_id, r.created_at)
    if (r.sub_lesson_id) blurtBySubLesson.set(r.sub_lesson_id, r.created_at)
  })

  const combinedByLesson    = combineAttemptMaps(attemptsByLesson, blurtByLesson)
  const combinedBySubLesson = combineAttemptMaps(attemptsBySubLesson, blurtBySubLesson)

  return rankCourseTopics(course, examRes.data ?? [], combinedByLesson, combinedBySubLesson)
}

// ─────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────
export function useStudyOverview(userId: string | null) {
  const [recentAttempts, setRecentAttempts] = useState<RecentAttempt[]>([])
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  // True only until the first fetch (success or failure) completes — lets
  // the screen show a blocking spinner on first load only, and keep
  // existing content visible during a silent background refetch on refocus.
  const [initialLoading, setInitialLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const fetchOverview = useCallback(async () => {
    // No userId yet almost always means useSession() hasn't resolved this
    // screen's own session/profile fetch yet (each screen instantiates its
    // own useSession independently) — a transient startup state, not "no
    // user." Leave initialLoading true so the spinner keeps showing instead
    // of flashing the empty state before the real fetch (once userId
    // arrives) has a chance to run.
    if (!userId) { setLoading(false); return }
    try {
      setLoading(true)
      setError(null)

      // ── Four independent queries (none depend on each other's result,
      // only on userId) — fire them all at once instead of one after
      // another. Capped at 200 rows on the two history tables so a long
      // history doesn't make every Study-tab focus progressively slower
      // (matches the capped pattern useDashboard already uses, scaled up
      // since this feeds cross-course staleness ranking, not just a
      // 5-item "recent" list). ──
      const [coursesRes, attemptsRes, blurtRes, examsRes] = await Promise.all([
        // Course structure — used both to resolve course info for blurt
        // attempts (which don't store course_id directly, only
        // lesson_id/sub_lesson_id) and for the staleness recommendations below.
        supabase
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
          .eq('user_id', userId),

        // All quiz attempts, joined to course, for recent history.
        supabase
          .from('quiz_attempts')
          .select(`
            id, score, question_count, completed_at, lesson_id, sub_lesson_id, course_id,
            courses ( id, title, emoji, color ),
            lessons ( title ),
            sub_lessons ( title )
          `)
          .eq('user_id', userId)
          .order('completed_at', { ascending: false })
          .limit(200),

        // Blurt attempts — one row per graded prompt.
        supabase
          .from('blurt_attempts')
          .select('id, scope_type, lesson_id, sub_lesson_id, rating, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: true })
          .limit(200),

        // Recommendations: staleness + upcoming-test proximity.
        supabase
          .from('exams')
          .select('course_id, exam_date, material_note_ids')
          .eq('user_id', userId)
          .eq('status', 'upcoming')
          .gte('exam_date', new Date().toISOString().split('T')[0]),
      ])

      const { data: coursesData } = coursesRes
      const { data: attempts, error: attErr } = attemptsRes
      const { data: blurtRows, error: blurtErr } = blurtRes
      const { data: examRows } = examsRes

      if (attErr) throw attErr
      if (blurtErr) throw blurtErr

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

      const attemptsByLesson = new Map<string, string>()
      const attemptsBySubLesson = new Map<string, string>()
      // Recommendation-card enrichment — last quiz score per scope, purely
      // additive (attempts is already ordered completed_at desc, same as
      // the date maps above, so this naturally lands on the latest attempt).
      const scoresByLesson = new Map<string, number>()
      const scoresBySubLesson = new Map<string, number>()
      ;(attempts ?? []).forEach((a: any) => {
        if (a.lesson_id && !attemptsByLesson.has(a.lesson_id)) {
          attemptsByLesson.set(a.lesson_id, a.completed_at)
          if (a.question_count > 0) scoresByLesson.set(a.lesson_id, Math.round((a.score / a.question_count) * 100))
        }
        if (a.sub_lesson_id && !attemptsBySubLesson.has(a.sub_lesson_id)) {
          attemptsBySubLesson.set(a.sub_lesson_id, a.completed_at)
          if (a.question_count > 0) scoresBySubLesson.set(a.sub_lesson_id, Math.round((a.score / a.question_count) * 100))
        }
      })

      // ── Blend Blurt into the same "last touched" signal — a topic
      // studied only via Blurt should count as touched, not invisible ──
      const blurtByLesson = new Map<string, string>()
      const blurtBySubLesson = new Map<string, string>()
      // Recommendation-card enrichment — latest Blurt rating per scope.
      const blurtRatingByLesson = new Map<string, string>()
      const blurtRatingBySubLesson = new Map<string, string>()
      ;(blurtRows ?? []).forEach((r: any) => {
        if (r.lesson_id) {
          blurtByLesson.set(r.lesson_id, r.created_at)      // blurtRows is ascending, so last write wins = most recent
          blurtRatingByLesson.set(r.lesson_id, r.rating)
        }
        if (r.sub_lesson_id) {
          blurtBySubLesson.set(r.sub_lesson_id, r.created_at)
          blurtRatingBySubLesson.set(r.sub_lesson_id, r.rating)
        }
      })

      const combinedAttemptsByLesson    = combineAttemptMaps(attemptsByLesson, blurtByLesson)
      const combinedAttemptsBySubLesson = combineAttemptMaps(attemptsBySubLesson, blurtBySubLesson)

      const candidates: RankedCandidate[] = []

      for (const course of coursesData ?? []) {
        const courseExams = (examRows ?? []).filter((e: any) => e.course_id === course.id)
        candidates.push(...rankCourseTopics(course, courseExams, combinedAttemptsByLesson, combinedAttemptsBySubLesson))
      }

      // Attach the enrichment fields rankCourseTopics doesn't know about
      // (it's shared with Auto-plan resolution, which never reads them).
      for (const c of candidates) {
        const scores  = c.scopeType === 'topic' ? scoresByLesson      : scoresBySubLesson
        const ratings = c.scopeType === 'topic' ? blurtRatingByLesson : blurtRatingBySubLesson
        c.lastScorePct = scores.get(c.id) ?? null
        c.blurtRating  = (ratings.get(c.id) as 'strong' | 'partial' | 'weak' | undefined) ?? null
      }

      candidates.sort((a, b) => a.tier - b.tier || a.sortKey - b.sortKey)

      // Cap per course so one course's urgent/stale topics can't crowd out
      // every other course's recommendations — backfill remaining slots
      // from the next-best candidates of any course.
      const MAX_PER_COURSE = 2
      const MAX_RECOMMENDATIONS = 3
      const perCourseCount = new Map<string, number>()
      const capped: RankedCandidate[] = []
      for (const c of candidates) {
        if (capped.length >= MAX_RECOMMENDATIONS) break
        const count = perCourseCount.get(c.courseId) ?? 0
        if (count >= MAX_PER_COURSE) continue
        perCourseCount.set(c.courseId, count + 1)
        capped.push(c)
      }
      setRecommendations(capped.map(({ sortKey, ...r }) => r))

    } catch (err: any) {
      console.error('[StudyOverview] fetchOverview failed:', err)
      setError(err.message)
    } finally {
      setLoading(false)
      setInitialLoading(false)
    }
  }, [userId])

  useFocusEffect(
    useCallback(() => { fetchOverview() }, [fetchOverview])
  )

  return { recentAttempts, recommendations, loading, initialLoading, error, refetch: fetchOverview }
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
export async function pickRandomBlurtScope(
  userId:    string,
  courseId?: string
): Promise<{
  scopeType: 'topic' | 'subtopic'
  scopeId:   string
  title:     string
} | null> {
  let query = supabase
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

  if (courseId) query = query.eq('id', courseId)

  const { data, error } = await query

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

// ─────────────────────────────────────────
// LATEST BLURT RATING PER TOPIC/SUBTOPIC — mastery gate primitive.
// Blurt has no stable per-prompt identity to pool the way quiz question
// ids are pooled, so this just keeps the single most recent rating per
// scope, mirroring getLatestCorrectnessMap's "latest attempt wins" rule.
// ─────────────────────────────────────────
export async function getLatestBlurtRatingMap(
  userId:       string,
  lessonIds:    string[],
  subLessonIds: string[]
): Promise<{ byLesson: Map<string, string>; bySubLesson: Map<string, string> }> {
  const byLesson    = new Map<string, string>()
  const bySubLesson = new Map<string, string>()

  const scopeFilter = [
    lessonIds.length    ? `lesson_id.in.(${lessonIds.join(',')})`       : null,
    subLessonIds.length ? `sub_lesson_id.in.(${subLessonIds.join(',')})` : null,
  ].filter(Boolean).join(',')

  if (!scopeFilter) return { byLesson, bySubLesson }

  const { data, error } = await supabase
    .from('blurt_attempts')
    .select('lesson_id, sub_lesson_id, rating, created_at')
    .eq('user_id', userId)
    .or(scopeFilter)
    .order('created_at', { ascending: true })

  if (error) throw error

  ;(data ?? []).forEach((r: any) => {
    if (r.lesson_id) byLesson.set(r.lesson_id, r.rating)          // ascending order → last write = most recent
    if (r.sub_lesson_id) bySubLesson.set(r.sub_lesson_id, r.rating)
  })

  return { byLesson, bySubLesson }
}

// ─────────────────────────────────────────
// ALREADY BLURTED TODAY — dedup guard for the "Confirm with Blurt" quiz
// CTA. Blurt's prompt-generation/grading calls are the expensive part of
// the loop (unlike quiz, which pools pre-generated questions), so this
// keeps a passed quiz from re-suggesting Blurt on a topic already
// exercised today.
// ─────────────────────────────────────────
export async function hasBlurtedToday(
  userId:    string,
  scopeType: 'topic' | 'subtopic',
  scopeId:   string
): Promise<boolean> {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from('blurt_attempts')
    .select('id')
    .eq(scopeType === 'topic' ? 'lesson_id' : 'sub_lesson_id', scopeId)
    .eq('user_id', userId)
    .gte('created_at', startOfToday.toISOString())
    .limit(1)

  if (error) throw error
  return (data ?? []).length > 0
}

// ─────────────────────────────────────────
// WEAK SPOTS — cross-course, one card per still-missed quiz question, for
// the passive review deck (app/review.tsx). Blurt deliberately excluded:
// it has no stable per-prompt content to show as a card's front (a Blurt
// prompt is regenerated fresh per session, and blurt_attempts only stores
// rating/feedback/review_pointers, never the prompt text itself), so a
// Blurt-derived card can't have the same concrete question/explanation
// shape as a quiz card — tried it, read as weaker filler, removed.
// ─────────────────────────────────────────
export interface ReviewCard {
  id:           string
  questionText: string
  explanation:  string | null
  scopeType:    'topic' | 'subtopic'
  scopeId:      string
  topicTitle:   string
  courseTitle:  string
  courseIcon:   string
  courseColor:  string | null
}

export async function getReviewCards(userId: string): Promise<ReviewCard[]> {
  const [coursesRes, wrongRes] = await Promise.all([
    // Course structure — for topic/subtopic titles + course info, same
    // shape as the lessonInfo/subLessonInfo maps built in fetchOverview.
    supabase
      .from('courses')
      .select(`
        id, title, emoji, color,
        sections ( lessons ( id, title, sub_lessons ( id, title ) ) )
      `)
      .eq('user_id', userId),

    // Every wrong answer the user has ever given — graduation-checked
    // below via getLatestCorrectnessMap, same "latest attempt wins" rule
    // used everywhere else in the app. No count cap: this needs the full
    // still-missed set, not a quiz-sized sample.
    supabase
      .from('attempt_answers')
      .select('question_id, quiz_attempts!inner(user_id)')
      .eq('quiz_attempts.user_id', userId)
      .eq('is_correct', false),
  ])

  const { data: coursesData } = coursesRes
  const { data: wrongRows, error: wrongErr } = wrongRes
  if (wrongErr) throw wrongErr

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

  // Graduation check — only questions whose MOST RECENT attempt is still
  // wrong count as missed (a later correct answer clears it immediately).
  const uniqueWrongIds = [...new Set((wrongRows ?? []).map((r: any) => r.question_id))]
  const correctness = await getLatestCorrectnessMap(userId, uniqueWrongIds)
  const stillMissedIds = uniqueWrongIds.filter(id => correctness.get(id) === false)

  if (!stillMissedIds.length) return []

  // questions has no lesson_id/sub_lesson_id of its own — only notes does
  // (same table getNotesByLesson/getNotesBySubLesson query), so scope has
  // to be resolved via each question's note_id.
  const { data: missedQuestions, error: qErr } = await supabase
    .from('questions')
    .select('id, question_text, explanation, note_id')
    .in('id', stillMissedIds)
  if (qErr) throw qErr

  const missedNoteIds = [...new Set((missedQuestions ?? []).map(q => q.note_id).filter(Boolean))]
  const { data: notesForMissed, error: notesErr } = missedNoteIds.length
    ? await supabase.from('notes').select('id, lesson_id, sub_lesson_id').in('id', missedNoteIds)
    : { data: [] as any[], error: null }
  if (notesErr) throw notesErr

  const noteScope = new Map<string, string>() // note_id -> lesson_id ?? sub_lesson_id
  for (const n of notesForMissed ?? []) {
    const scopeId = n.lesson_id ?? n.sub_lesson_id
    if (scopeId) noteScope.set(n.id, scopeId)
  }

  const cards: ReviewCard[] = []
  for (const q of missedQuestions ?? []) {
    const scopeId = q.note_id ? noteScope.get(q.note_id) : undefined
    if (!scopeId) continue
    const isTopic = lessonInfo.has(scopeId)
    const info = isTopic ? lessonInfo.get(scopeId) : subLessonInfo.get(scopeId)
    if (!info) continue

    cards.push({
      id: q.id,
      questionText: q.question_text,
      explanation: q.explanation,
      scopeType: isTopic ? 'topic' : 'subtopic',
      scopeId,
      topicTitle: info.title,
      courseTitle: info.courseTitle,
      courseIcon: info.courseIcon,
      courseColor: info.courseColor,
    })
  }

  return cards
}