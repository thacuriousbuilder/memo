

import { useState, useEffect, useCallback } from 'react'
import { supabase }  from '@/lib/supabase'
import { Course, Section, Lesson, Exam, UpcomingExam } from '@/types'

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────
export interface CourseWithMeta extends Course {
  semester:       string | null
  sections:       SectionWithLessons[]
  upcoming_exams: UpcomingExam[]
  total_lessons:  number
  done_lessons:   number
  progress_pct:   number
}

export interface SectionWithLessons extends Section {
  lessons: LessonWithMeta[]
}

export interface LessonWithMeta extends Lesson {
  sub_lesson_count: number
  progress_status:  string | null
}

// ─────────────────────────────────────────
// FETCH ALL COURSES FOR USER
// ─────────────────────────────────────────
export function useCourses(userId: string | null) {
  const [courses, setCourses] = useState<CourseWithMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const fetchCourses = useCallback(async () => {
    if (!userId) {
      setCourses([])
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      setError(null)

      // Fetch courses with sections → lessons → sub_lessons
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select(`
          *,
          sections (
            *,
            lessons (
              *,
              sub_lessons (id),
              user_progress (status)
            )
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (coursesError) throw coursesError

      // Fetch upcoming exams for all courses
      const { data: examsData } = await supabase
        .from('exams')
        .select('*, courses(title, emoji)')
        .eq('user_id',  userId)
        .eq('status',   'upcoming')
        .order('exam_date', { ascending: true })

      const now = new Date()

      // Build enriched courses
      const enriched: CourseWithMeta[] = (coursesData ?? []).map(course => {
        const sections: SectionWithLessons[] = (course.sections ?? [])
          .sort((a: any, b: any) => a.order_index - b.order_index)
          .map((section: any) => {
            const lessons: LessonWithMeta[] = (section.lessons ?? [])
              .sort((a: any, b: any) => a.order_index - b.order_index)
              .map((lesson: any) => ({
                ...lesson,
                sub_lesson_count: lesson.sub_lessons?.length ?? 0,
                progress_status:  lesson.user_progress?.[0]?.status ?? null,
              }))
            return { ...section, lessons }
          })

        const allLessons   = sections.flatMap(s => s.lessons)
        const totalLessons = allLessons.length
        const doneLessons  = allLessons.filter(
          l => l.progress_status === 'passed'
        ).length
        const progressPct  = totalLessons > 0
          ? Math.round((doneLessons / totalLessons) * 100)
          : 0

        // Upcoming exams for this course
        const courseExams: UpcomingExam[] = (examsData ?? [])
          .filter((e: any) => e.course_id === course.id)
          .map((e: any) => {
            const examDate = new Date(e.exam_date)
            const daysUntil = Math.ceil(
              (examDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            )
            return {
              ...e,
              course_title: course.title,
              course_emoji: course.emoji,
              days_until:   daysUntil,
            }
          })

        return {
          ...course,
          sections,
          upcoming_exams: courseExams,
          total_lessons:  totalLessons,
          done_lessons:   doneLessons,
          progress_pct:   progressPct,
        }
      })

      setCourses(enriched)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchCourses()
  }, [fetchCourses])

  return { courses, loading, error, refetch: fetchCourses }
}

// ─────────────────────────────────────────
// CREATE COURSE
// ─────────────────────────────────────────

export async function createCourse(params: {
  userId:      string
  title:       string
  description: string
  emoji:       string
  color:       string
  semester?:   string
}): Promise<Course> {
  // 1. Create course — store semester as metadata
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .insert({
      user_id:     params.userId,
      title:       params.title,
      description: params.description || null,
      emoji:       params.emoji,
      color:       params.color,
      semester:    params.semester || null,  // ← just metadata
    })
    .select()
    .single()
    console.log('Result:', course, courseError)
  if (courseError) throw courseError

  // 2. Always create one hidden default section
  // User never sees this — it holds lessons until
  // they explicitly create named sections
  const { error: sectionError } = await supabase
    .from('sections')
    .insert({
      course_id:   course.id,
      title:       'General',
      order_index: 0,
      is_default:  true,       // ← hidden in UI
    })

  if (sectionError) throw sectionError

  return course
}

// ─────────────────────────────────────────
// DELETE COURSE
// ─────────────────────────────────────────
export async function deleteCourse(courseId: string): Promise<void> {
  const { error } = await supabase
    .from('courses')
    .delete()
    .eq('id', courseId)
  if (error) throw error
}

// ─────────────────────────────────────────
// GET EXAM BADGE TEXT
// ─────────────────────────────────────────
export function getExamBadge(
  exams: UpcomingExam[]
): { label: string; urgent: boolean } | null {
  if (!exams.length) return null
  const next = exams[0]
  const days = next.days_until

  if (days <= 0)  return { label: 'Today!',       urgent: true  }
  if (days === 1) return { label: 'Tomorrow',      urgent: true  }
  if (days <= 3)  return { label: `${next.exam_type.charAt(0).toUpperCase() + next.exam_type.slice(1)} in ${days}d`, urgent: true  }
  if (days <= 14) return { label: `${next.exam_type.charAt(0).toUpperCase() + next.exam_type.slice(1)} in ${days}d`, urgent: false }
  return null
}