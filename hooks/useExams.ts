

import { useState, useCallback } from 'react'
import { useFocusEffect } from 'expo-router'
import { supabase }       from '@/lib/supabase'

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────
export interface Exam {
  id:                 string
  course_id:          string
  title:              string
  exam_type:          string
  exam_date:          string
  status:             string
  location:           string | null
  notes:              string | null
  remind_days_before: number | null
  material_note_ids:  string[] 
  days_left:          number
}

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
function getDaysLeft(dateStr: string): number {
  const exam = new Date(dateStr)
  const now  = new Date()
  exam.setHours(0, 0, 0, 0)
  now.setHours(0, 0, 0, 0)
  return Math.ceil(
    (exam.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  )
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day:   'numeric',
    year:  'numeric',
  })
}

// ─────────────────────────────────────────
// FETCH EXAMS FOR COURSE
// ─────────────────────────────────────────
export function useExams(
  courseId: string | null,
  userId:   string | null
) {
  const [exams,     setExams]     = useState<Exam[]>([])
  const [pastExams, setPastExams] = useState<Exam[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)

  const fetchExams = useCallback(async () => {
    if (!courseId || !userId) {
      setExams([])
      setPastExams([])
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      setError(null)

      const { data, error: err } = await supabase
        .from('exams')
        .select('*')
        .eq('course_id', courseId)
        .eq('user_id',   userId)
        .order('exam_date', { ascending: true })

      if (err) throw err

      const withDays = (data ?? []).map(e => ({
        ...e,
        days_left: getDaysLeft(e.exam_date),
      }))

      setExams(withDays.filter(e => e.days_left >= 0))
      setPastExams(
        withDays.filter(e => e.days_left < 0).sort((a, b) => b.days_left - a.days_left)
      )
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [courseId, userId])

  useFocusEffect(
    useCallback(() => { fetchExams() }, [fetchExams])
  )

  return { exams, pastExams, loading, error, refetch: fetchExams }
}

// ─────────────────────────────────────────
// CREATE EXAM
// ─────────────────────────────────────────
export async function createExam(params: {
  userId:    string
  courseId:  string
  title:     string
  examType:  string
  examDate:  string
  location?: string
  notes?:    string
  materialNoteIds?: string[]
}): Promise<void> {
  const { error } = await supabase
    .from('exams')
    .insert({
      user_id:           params.userId,
      course_id:         params.courseId,
      title:             params.title,
      exam_type:         params.examType,
      exam_date:         params.examDate,
      status:            'upcoming',
      location:          params.location ?? null,
      notes:             params.notes    ?? null,
      material_note_ids: params.materialNoteIds ?? [],
    })
  if (error) throw error
}

// ─────────────────────────────────────────
// FETCH SINGLE EXAM (for edit pre-fill)
// ─────────────────────────────────────────
export async function getExam(examId: string): Promise<Exam | null> {
  const { data, error } = await supabase
    .from('exams')
    .select('*')
    .eq('id', examId)
    .single()

  if (error) throw error
  if (!data) return null

  return { ...data, days_left: getDaysLeft(data.exam_date) }
}

// ─────────────────────────────────────────
// UPDATE EXAM
// ─────────────────────────────────────────
export async function updateExam(params: {
  examId:    string
  title:     string
  examType:  string
  examDate:  string
  location?: string
  notes?:    string
  materialNoteIds?: string[]
}): Promise<void> {
  const { error } = await supabase
    .from('exams')
    .update({
      title:             params.title,
      exam_type:         params.examType,
      exam_date:         params.examDate,
      location:          params.location ?? null,
      notes:             params.notes    ?? null,
      material_note_ids: params.materialNoteIds ?? [],
    })
    .eq('id', params.examId)
  if (error) throw error
}

// ─────────────────────────────────────────
// DELETE EXAM
// ─────────────────────────────────────────
export async function deleteExam(examId: string): Promise<void> {
  const { error } = await supabase
    .from('exams')
    .delete()
    .eq('id', examId)
  if (error) throw error
}

export { formatDate, getDaysLeft }