

import { useState, useCallback } from 'react'
import { useFocusEffect } from 'expo-router'
import { supabase }       from '@/lib/supabase'

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────
export interface NoteRef {
  id:             string
  file_name:      string
  file_type:      string
  s3_key:         string
  has_questions:  boolean
  question_count: number
}

export interface SubtopicItem {
  id:    string
  title: string
  notes: NoteRef[]
}

export interface TopicItem {
  id:        string
  title:     string
  notes:     NoteRef[]
  subtopics: SubtopicItem[]
}

export interface FolderItem {
  id:     string
  title:  string
  topics: TopicItem[]
}

export interface CourseOverview {
  id:                string
  title:             string
  emoji:             string
  color:             string | null
  description:       string | null
  course_group:      string | null
  folders:           FolderItem[]
  unorganizedTopics: TopicItem[]
  flatNotes:         NoteRef[]
  totalNotes:        number
  totalQuestions:    number
  progressPct:       number
  gradePct:          number | null
  defaultSectionId:  string | null 
}

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
function mapNotes(notes: any[]): NoteRef[] {
  return (notes ?? []).map(n => ({
    id:             n.id,
    file_name:      n.file_name,
    file_type:      n.file_type,
    s3_key:         n.s3_key,
    has_questions:  (n.questions?.length ?? 0) > 0,
    question_count: n.questions?.length ?? 0,
  }))
}
// ─────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────
export function useCourseOverview(
  courseId: string | null,
  userId:   string | null
) {
  const [course,  setCourse]  = useState<CourseOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const fetchCourse = useCallback(async () => {
    if (!courseId || !userId) return
    try {
      setLoading(true)
      setError(null)

      const { data, error: err } = await supabase
        .from('courses')
        .select(`
          id, title, emoji, color, description, course_group,
          notes ( id, file_name, file_type, s3_key, questions (id) ),
          sections (
            id, title, is_default, order_index,
            lessons (
              id, title, order_index,
              notes ( id, file_name, file_type, s3_key, questions (id) ),
              sub_lessons (
                id, title, order_index,
                notes ( id, file_name, file_type, s3_key, questions (id) )
              )
            )
          )
        `)
        .eq('id', courseId)
        .single()

      if (err) throw err

      const sortedSections = (data.sections ?? [])
        .sort((a: any, b: any) => a.order_index - b.order_index)

      const buildTopic = (lesson: any): TopicItem => ({
        id:        lesson.id,
        title:     lesson.title,
        notes:     mapNotes(lesson.notes),
        subtopics: (lesson.sub_lessons ?? [])
          .sort((a: any, b: any) => a.order_index - b.order_index)
          .map((sub: any) => ({
            id:    sub.id,
            title: sub.title,
            notes: mapNotes(sub.notes),
          })),
      })

      const folders: FolderItem[] = sortedSections
        .filter((s: any) => !s.is_default)
        .map((s: any) => ({
          id:     s.id,
          title:  s.title,
          topics: (s.lessons ?? [])
            .sort((a: any, b: any) => a.order_index - b.order_index)
            .map(buildTopic),
        }))

      const defaultSection = sortedSections.find((s: any) => s.is_default)
      const unorganizedTopics: TopicItem[] = (defaultSection?.lessons ?? [])
        .sort((a: any, b: any) => a.order_index - b.order_index)
        .map(buildTopic)

      const flatNotes = mapNotes(data.notes)

      const totalNotes =
        flatNotes.length +
        folders.reduce((s, f) => s + f.topics.reduce((s2, t) =>
          s2 + t.notes.length + t.subtopics.reduce((s3, sub) => s3 + sub.notes.length, 0), 0), 0) +
        unorganizedTopics.reduce((s, t) =>
          s + t.notes.length + t.subtopics.reduce((s2, sub) => s2 + sub.notes.length, 0), 0)

      // ── Also fetch user_progress for every lesson/sub_lesson to compute progressPct ──
      const { data: progressRows } = await supabase
      .from('user_progress')
      .select('lesson_id, sub_lesson_id, status')
      .eq('user_id', userId)

      const passedLessonIds    = new Set((progressRows ?? []).filter(p => p.status === 'passed' && p.lesson_id).map(p => p.lesson_id))
      const passedSubLessonIds = new Set((progressRows ?? []).filter(p => p.status === 'passed' && p.sub_lesson_id).map(p => p.sub_lesson_id))

      // Collect every topic/subtopic id across folders + unorganized
     // hooks/useCourseOverview.ts — replace the progressPct calculation block
      const allTopics  = [...unorganizedTopics, ...folders.flatMap(f => f.topics)]
      const structuredTotal = allTopics.length + allTopics.reduce((s, t) => s + t.subtopics.length, 0)
      const structuredDone  =
        allTopics.filter(t => passedLessonIds.has(t.id)).length +
        allTopics.reduce((s, t) => s + t.subtopics.filter(sub => passedSubLessonIds.has(sub.id)).length, 0)

      // ── Flat notes bucket — one unit, done if any whole-course attempt passed ──
      const hasFlatNotes = flatNotes.length > 0
      let flatDone = false
      if (hasFlatNotes) {
        const { data: courseAttempts } = await supabase
          .from('quiz_attempts')
          .select('score, question_count')
          .eq('course_id', courseId)
          .eq('user_id', userId)
          .is('lesson_id', null)
          .is('sub_lesson_id', null)

        flatDone = (courseAttempts ?? []).some(a => a.question_count > 0 && a.score / a.question_count >= 0.8)
      }

      const totalUnits = structuredTotal + (hasFlatNotes ? 1 : 0)
      const doneUnits  = structuredDone + (hasFlatNotes && flatDone ? 1 : 0)
      const progressPct = totalUnits > 0 ? Math.round((doneUnits / totalUnits) * 100) : 0

      // ── Total questions — sum across everything ──
      const totalQuestions =
      flatNotes.reduce((s, n) => s + n.question_count, 0) +
      allTopics.reduce((s, t) =>
        s + t.notes.reduce((s2, n) => s2 + n.question_count, 0) +
        t.subtopics.reduce((s2, sub) => s2 + sub.notes.reduce((s3, n) => s3 + n.question_count, 0), 0), 0)

      // Grade — avg score % across all attempts tied to this course
      const { data: attempts } = await supabase
        .from('quiz_attempts')
        .select('score, question_count')
        .eq('course_id', courseId)
        .eq('user_id', userId)

      let gradePct: number | null = null
      if (attempts && attempts.length > 0) {
        const totalScore = attempts.reduce((s, a) => s + a.score, 0)
        const totalCount = attempts.reduce((s, a) => s + a.question_count, 0)
        gradePct = totalCount > 0 ? Math.round((totalScore / totalCount) * 100) : null
      }
      setCourse({
        id:          data.id,
        title:       data.title,
        emoji:       data.emoji,
        color:       data.color,
        description: data.description,
        course_group: data.course_group,
        folders,
        unorganizedTopics,
        flatNotes,
        totalNotes,
        totalQuestions,
        progressPct,
        gradePct,
        defaultSectionId: defaultSection?.id ?? null,
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [courseId, userId])

  useFocusEffect(
    useCallback(() => { fetchCourse() }, [fetchCourse])
  )

  return { course, loading, error, refetch: fetchCourse }
}

// ─────────────────────────────────────────
// DELETE FOLDER (section) — cascades to topics/subtopics/notes
// ─────────────────────────────────────────
export async function deleteFolder(folderId: string): Promise<void> {
  const { error } = await supabase.from('sections').delete().eq('id', folderId)
  if (error) throw error
}

// ─────────────────────────────────────────
// DELETE TOPIC (lesson) — cascades to subtopics/notes
// ─────────────────────────────────────────
export async function deleteTopic(topicId: string): Promise<void> {
  const { error } = await supabase.from('lessons').delete().eq('id', topicId)
  if (error) throw error
}

// ─────────────────────────────────────────
// DELETE SUBTOPIC (sub_lesson) — cascades to notes
// ─────────────────────────────────────────
export async function deleteSubtopic(subtopicId: string): Promise<void> {
  const { error } = await supabase.from('sub_lessons').delete().eq('id', subtopicId)
  if (error) throw error
}