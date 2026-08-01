

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────
export interface SubLessonWithStatus {
  id:           string
  lesson_id:    string
  title:        string
  order_index:  number
  status:       'passed' | 'in_progress' | 'not_started' | 'locked'
  progress:     number
  note_count:   number
}

export interface LessonDetail {
  id:           string
  title:        string
  section_id:   string
  description:  string | null
  order_index:  number
  course_title: string
  course_emoji: string
  section_title: string
  status:       string | null
  has_sublessons: boolean
  sub_lessons:  SubLessonWithStatus[]
  notes:        NoteItem[]
}

export interface NoteItem {
  id:          string
  file_name:   string
  file_type:   string
  s3_key:      string
  parsed_text: string | null
  created_at:  string
  question_count: number
}

// ─────────────────────────────────────────
// FETCH LESSON DETAIL
// ─────────────────────────────────────────
export function useLessonDetail(
  lessonId: string | null,
  userId:   string | null
) {
  const [lesson,  setLesson]  = useState<LessonDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const fetchLesson = useCallback(async () => {
    if (!lessonId || !userId) return
    try {
      setLoading(true)
      setError(null)

      const { data, error: err } = await supabase
        .from('lessons')
        .select(`
          *,
          sections (
            title,
            courses ( title, emoji )
          ),
          sub_lessons (
            *,
            user_progress!left ( status )
          ),
          notes (
            *,
            questions ( id )
          ),
          user_progress!left ( status )
        `)
        .eq('id', lessonId)
        .eq('sub_lessons.user_progress.user_id',   userId)
        .eq('user_progress.user_id',               userId)
        .single()

      if (err) throw err

      // Build sub-lessons with status
      const subLessons: SubLessonWithStatus[] = (data.sub_lessons ?? [])
        .sort((a: any, b: any) => a.order_index - b.order_index)
        .map((sl: any, idx: number) => {
          const status   = sl.user_progress?.[0]?.status ?? null
          const prevSl   = data.sub_lessons?.[idx - 1]
          const prevStatus = prevSl
            ? prevSl.user_progress?.[0]?.status
            : 'passed'

          let resolvedStatus: SubLessonWithStatus['status']
          if (idx === 0) {
            resolvedStatus = status ?? 'not_started'
          } else if (prevStatus === 'passed') {
            resolvedStatus = status ?? 'not_started'
          } else {
            resolvedStatus = 'locked'
          }

          return {
            id:          sl.id,
            lesson_id:   sl.lesson_id,
            title:       sl.title,
            order_index: sl.order_index,
            status:      resolvedStatus,
            progress:    status === 'passed' ? 100
                       : status === 'in_progress' ? 50 : 0,
            note_count:  0,
          }
        })

      // Build notes
      const notes: NoteItem[] = (data.notes ?? []).map((n: any) => ({
        id:             n.id,
        file_name:      n.file_name,
        file_type:      n.file_type,
        s3_key:         n.s3_key,
        parsed_text:    n.parsed_text,
        created_at:     n.created_at,
        question_count: n.questions?.length ?? 0,
      }))

      setLesson({
        id:             data.id,
        title:          data.title,
        section_id:     data.section_id,
        description:    data.description,
        order_index:    data.order_index,
        course_title:   data.sections?.courses?.title ?? '',
        course_emoji:   data.sections?.courses?.emoji ?? '',
        section_title:  data.sections?.title ?? '',
        status:         data.user_progress?.[0]?.status ?? null,
        has_sublessons: subLessons.length > 0,
        sub_lessons:    subLessons,
        notes,
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [lessonId, userId])

  useEffect(() => { fetchLesson() }, [fetchLesson])

  return { lesson, loading, error, refetch: fetchLesson }
}

// ─────────────────────────────────────────
// FETCH SUB-LESSON DETAIL
// ─────────────────────────────────────────
export function useSubLessonDetail(
  subLessonId: string | null,
  userId:      string | null
) {
  const [subLesson, setSubLesson] = useState<any | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)

  const fetchSubLesson = useCallback(async () => {
    if (!subLessonId || !userId) return
    try {
      setLoading(true)
      setError(null)

      const { data, error: err } = await supabase
        .from('sub_lessons')
        .select(`
          *,
          lessons (
            title,
            sections (
              title,
              courses ( title, emoji )
            )
          ),
          notes (
            *,
            questions ( id )
          ),
          user_progress!left ( status )
        `)
        .eq('id', subLessonId)
        .eq('user_progress.user_id', userId)
        .single()

      if (err) throw err

      const notes: NoteItem[] = (data.notes ?? []).map((n: any) => ({
        id:             n.id,
        file_name:      n.file_name,
        file_type:      n.file_type,
        s3_key:         n.s3_key,
        parsed_text:    n.parsed_text,
        created_at:     n.created_at,
        question_count: n.questions?.length ?? 0,
      }))

      setSubLesson({
        id:            data.id,
        title:         data.title,
        lesson_title:  data.lessons?.title ?? '',
        course_title:  data.lessons?.sections?.courses?.title ?? '',
        course_emoji:  data.lessons?.sections?.courses?.emoji ?? '',
        section_title: data.lessons?.sections?.title ?? '',
        status:        data.user_progress?.[0]?.status ?? null,
        notes,
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [subLessonId, userId])

  useEffect(() => { fetchSubLesson() }, [fetchSubLesson])

  return { subLesson, loading, error, refetch: fetchSubLesson }
}

// ─────────────────────────────────────────
// CREATE NOTE IN SUPABASE
// ─────────────────────────────────────────
export async function createNote(params: {
  lessonId?:    string
  subLessonId?: string
  fileName:     string
  fileType:     string
  s3Key:        string
}): Promise<string> {
  const { data, error } = await supabase
    .from('notes')
    .insert({
      lesson_id:     params.lessonId     ?? null,
      sub_lesson_id: params.subLessonId  ?? null,
      file_name:     params.fileName,
      file_type:     params.fileType,
      s3_key:        params.s3Key,
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

// ─────────────────────────────────────────
// DELETE NOTE
// ─────────────────────────────────────────
export async function deleteNote(noteId: string): Promise<void> {
  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', noteId)
  if (error) throw error
}