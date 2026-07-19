

import { useState, useEffect, useCallback } from 'react'
import { supabase }   from '@/lib/supabase'
import { FilesAPI, QuizAPI }   from '@/lib/api'
import {
  buildS3Key,
  getFileType,
  getContentType,
  uploadFileToS3,
} from '@/lib/aws'
import * as DocumentPicker from 'expo-document-picker'


// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────
export type UploadStage =
  | 'idle'
  | 'uploading'
  | 'parsing'
  | 'generating'
  | 'done'

export type LessonStatus = 'passed' | 'in_progress' | 'not_started' | 'locked'
export type ItemStatus   = LessonStatus

export interface NoteItem {
  id:            string
  file_name:     string
  file_type:     string
  s3_key:        string
  created_at:    string
  has_questions: boolean
}

export interface SubLessonItem {
  id:             string
  title:          string
  order_index:    number
  status:         ItemStatus
  progress:       number
  question_count: number
}

export interface LessonDetail {
  id:               string
  title:            string
  section_id:       string
  status:           ItemStatus
  lesson_progress:  number
  sub_avg_progress: number
  avg_progress:     number
  question_count:   number
  total_questions:  number
  notes:            NoteItem[]
  sub_lessons:      SubLessonItem[]
  has_sub_lessons:  boolean
}

export interface SubLessonWithStatus {
  id:             string
  lesson_id:      string
  title:          string
  order_index:    number
  question_count: number
  status:         LessonStatus
  progress:       number
}

export interface LessonWithStatus {
  id:               string
  section_id:       string
  title:            string
  description:      string | null
  order_index:      number
  sub_lesson_count: number
  question_count:   number
  status:           LessonStatus
  progress:         number
  sub_lessons:      SubLessonWithStatus[]
}

export interface SectionWithStatus {
  id:             string
  course_id:      string
  title:          string
  order_index:    number
  is_default:     boolean
  total_lessons:  number
  done_lessons:   number
  progress_pct:   number
  lessons:        LessonWithStatus[]
}

export interface CourseDetail {
  id:              string
  title:           string
  emoji:           string
  color:           string | null
  semester:        string | null
  description:     string | null
  total_lessons:   number
  done_lessons:    number
  progress_pct:    number
  total_questions: number
  sections:        SectionWithStatus[]
}

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
function resolveStatus(
  rawStatus:  string | null,
  prevStatus: string | null,
  isFirst:    boolean
): LessonStatus {
  if (isFirst) return (rawStatus as LessonStatus) ?? 'not_started'
  if (prevStatus === 'passed') return (rawStatus as LessonStatus) ?? 'not_started'
  if (!rawStatus) return 'locked'
  return rawStatus as LessonStatus
}

function statusToProgress(status: LessonStatus): number {
  if (status === 'passed')      return 100
  if (status === 'in_progress') return 50
  return 0
}

// ─────────────────────────────────────────
// FETCH COURSE DETAIL
// ─────────────────────────────────────────
export function useCourseDetail(
  courseId: string | null,
  userId:   string | null
) {
  const [course,  setCourse]  = useState<CourseDetail | null>(null)
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
          *,
          sections (
            *,
            lessons (
              *,
              sub_lessons (
                *,
                user_progress!left (status),
                notes (id, questions(id))
              ),
              notes (id, questions(id)),
              user_progress!left (status)
            )
          )
        `)
        .eq('id', courseId)
        .single()

      if (err) throw err

      let globalLessonIndex = 0

      const sections: SectionWithStatus[] = (data.sections ?? [])
        .sort((a: any, b: any) => a.order_index - b.order_index)
        .map((section: any) => {
          const sortedLessons = (section.lessons ?? [])
            .sort((a: any, b: any) => a.order_index - b.order_index)

          const lessons: LessonWithStatus[] = sortedLessons.map(
            (lesson: any, lIdx: number) => {
              const rawStatus  = lesson.user_progress?.[0]?.status ?? null
              const prevLesson = sortedLessons[lIdx - 1]
              const prevStatus = prevLesson
                ? prevLesson.user_progress?.[0]?.status ?? null
                : 'passed'

              const isFirst = globalLessonIndex === 0
              const status  = resolveStatus(rawStatus, prevStatus, isFirst)
              globalLessonIndex++

              const sortedSubs = (lesson.sub_lessons ?? [])
                .sort((a: any, b: any) => a.order_index - b.order_index)

              const subLessons: SubLessonWithStatus[] = sortedSubs.map(
                (sub: any, sIdx: number) => {
                  const subRaw    = sub.user_progress?.[0]?.status ?? null
                  const prevSub   = sortedSubs[sIdx - 1]
                  const prevSubSt = prevSub
                    ? prevSub.user_progress?.[0]?.status ?? null
                    : 'passed'

                  const subStatus = resolveStatus(subRaw, prevSubSt, sIdx === 0)
                  const qCount    = (sub.notes ?? [])
                    .flatMap((n: any) => n.questions ?? []).length

                  return {
                    id:             sub.id,
                    lesson_id:      sub.lesson_id,
                    title:          sub.title,
                    order_index:    sub.order_index,
                    question_count: qCount,
                    status:         subStatus,
                    progress:       statusToProgress(subStatus),
                  }
                }
              )

              const lessonQCount = (lesson.notes ?? [])
                .flatMap((n: any) => n.questions ?? []).length
              const totalQCount  = lessonQCount +
                subLessons.reduce((s, sl) => s + sl.question_count, 0)

              return {
                id:               lesson.id,
                section_id:       lesson.section_id,
                title:            lesson.title,
                description:      lesson.description,
                order_index:      lesson.order_index,
                sub_lesson_count: subLessons.length,
                question_count:   totalQCount,
                status,
                progress:         statusToProgress(status),
                sub_lessons:      subLessons,
              }
            }
          )

          const doneLessons = lessons.filter(
            l => l.status === 'passed'
          ).length

          return {
            ...section,
            lessons,
            total_lessons: lessons.length,
            done_lessons:  doneLessons,
            progress_pct:  lessons.length > 0
              ? Math.round((doneLessons / lessons.length) * 100)
              : 0,
          }
        })

      const allLessons     = sections.flatMap(s => s.lessons)
      const totalLessons   = allLessons.length
      const doneLessons    = allLessons.filter(l => l.status === 'passed').length
      const totalQuestions = allLessons.reduce(
        (s, l) => s + l.question_count, 0
      )

      setCourse({
        id:              data.id,
        title:           data.title,
        emoji:           data.emoji,
        color:           data.color,
        semester:        data.semester ?? null,
        description:     data.description,
        total_lessons:   totalLessons,
        done_lessons:    doneLessons,
        progress_pct:    totalLessons > 0
          ? Math.round((doneLessons / totalLessons) * 100)
          : 0,
        total_questions: totalQuestions,
        sections,
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [courseId, userId])

  useEffect(() => { fetchCourse() }, [fetchCourse])

  return { course, loading, error, refetch: fetchCourse }
}

// ─────────────────────────────────────────
// FETCH LESSON DETAIL
// ─────────────────────────────────────────
export function useLesson(
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
          user_progress!left (status),
          notes (
            id, file_name, file_type, s3_key, created_at,
            questions (id)
          ),
          sub_lessons (
            id, title, order_index,
            user_progress!left (status),
            notes (
              id,
              questions (id)
            )
          )
        `)
        .eq('id', lessonId)
        .eq('user_progress.user_id', userId)
        .single()

      if (err) throw err

      const notes: NoteItem[] = (data.notes ?? [])
        .sort((a: any, b: any) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
        )
        .map((n: any) => ({
          id:            n.id,
          file_name:     n.file_name,
          file_type:     n.file_type,
          s3_key:        n.s3_key,
          created_at:    n.created_at,
          has_questions: (n.questions?.length ?? 0) > 0,
        }))

      const lessonQCount   = notes.filter(n => n.has_questions).length
      const lessonStatus   = data.user_progress?.[0]?.status ?? 'not_started'
      const lessonProgress = lessonStatus === 'passed'      ? 100
                           : lessonStatus === 'in_progress' ? 50
                           : 0

      const sortedSubs = (data.sub_lessons ?? [])
        .sort((a: any, b: any) => a.order_index - b.order_index)

      const subLessons: SubLessonItem[] = sortedSubs.map(
        (sub: any, idx: number) => {
          const prevSub    = sortedSubs[idx - 1]
          const prevStatus = prevSub
            ? prevSub.user_progress?.[0]?.status ?? null
            : 'passed'

          const rawStatus = sub.user_progress?.[0]?.status ?? null
          const status    = resolveStatus(rawStatus, prevStatus, idx === 0)
          const progress  = statusToProgress(status)
          const qCount    = (sub.notes ?? [])
            .flatMap((n: any) => n.questions ?? []).length

          return {
            id:             sub.id,
            title:          sub.title,
            order_index:    sub.order_index,
            status,
            progress,
            question_count: qCount,
          }
        }
      )

      const subAvg = subLessons.length > 0
        ? Math.round(
            subLessons.reduce((s, sl) => s + sl.progress, 0) /
            subLessons.length
          )
        : 0

      const allProgress = [
        ...(lessonProgress > 0 ? [lessonProgress] : []),
        ...subLessons.map(sl => sl.progress),
      ]
      const avgProgress = allProgress.length > 0
        ? Math.round(
            allProgress.reduce((s, p) => s + p, 0) / allProgress.length
          )
        : 0

      const totalQuestions = lessonQCount +
        subLessons.reduce((s, sl) => s + sl.question_count, 0)

      setLesson({
        id:               data.id,
        title:            data.title,
        section_id:       data.section_id,
        status:           lessonStatus as ItemStatus,
        lesson_progress:  lessonProgress,
        sub_avg_progress: subAvg,
        avg_progress:     avgProgress,
        question_count:   lessonQCount,
        total_questions:  totalQuestions,
        notes,
        sub_lessons:      subLessons,
        has_sub_lessons:  subLessons.length > 0,
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
// SHARED UPLOAD CORE — synchronous pipeline
// ─────────────────────────────────────────
async function uploadAssetToLesson(params: {
  userId:      string
  lessonId:    string
  asset: {
    uri:       string
    name:      string
    mimeType?: string
  }
  onProgress?: (stage: UploadStage) => void
}): Promise<string | null> {
  const { userId, lessonId, asset, onProgress } = params

  const fileType    = getFileType(asset.uri)
  const contentType = getContentType(fileType)
  const s3Key       = buildS3Key(userId, lessonId, asset.name)

  // 1. Presign + Upload
  onProgress?.('uploading')
  const { upload_url } = await FilesAPI.presign({
    s3_key:       s3Key,
    content_type: contentType,
    user_id:      userId,
  })
  await uploadFileToS3(asset.uri, upload_url, contentType)

  // 2. Create note record
  const { data: note, error } = await supabase
    .from('notes')
    .insert({
      lesson_id:     lessonId,
      sub_lesson_id: null,
      file_name:     asset.name,
      file_type:     fileType,
      s3_key:        s3Key,
    })
    .select('id')
    .single()

  if (error) throw error

  // 3. Parse — synchronous
  onProgress?.('parsing')
  await FilesAPI.parse({
    s3_key:    s3Key,
    user_id:   userId,
    note_id:   note.id,
    file_type: fileType,
  })

  // 4. Generate — synchronous
  onProgress?.('generating')
  await QuizAPI.generate({
    note_id:        note.id,
    user_id:        userId,
    question_count: 10,
    lesson_id:      lessonId,
    sub_lesson_id:  null,
  })

  onProgress?.('done')
  return note.id
}

// ─────────────────────────────────────────
// UPLOAD FROM PICKER — lesson/[id].tsx
// ─────────────────────────────────────────
export async function uploadLessonNote(params: {
  userId:      string
  lessonId:    string
  onProgress?: (stage: UploadStage) => void
}): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: [
      'application/pdf',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    multiple: false,
  })

  if (result.canceled || !result.assets?.[0]) return null

  return uploadAssetToLesson({
    userId:     params.userId,
    lessonId:   params.lessonId,
    asset:      result.assets[0],
    onProgress: params.onProgress,
  })
}

// ─────────────────────────────────────────
// UPLOAD PRE-PICKED ASSET — course/[id].tsx
// ─────────────────────────────────────────
export async function uploadLessonNoteFromAsset(params: {
  userId:      string
  lessonId:    string
  asset: {
    uri:       string
    name:      string
    mimeType?: string
  }
  onProgress?: (stage: UploadStage) => void
}): Promise<string | null> {
  return uploadAssetToLesson(params)
}

// ─────────────────────────────────────────
// DELETE NOTE
// ─────────────────────────────────────────
export async function deleteLessonNote(params: {
  noteId: string
  s3Key:  string
  userId: string
}): Promise<void> {
  await supabase.from('notes').delete().eq('id', params.noteId)
  await FilesAPI.delete({
    s3_key:  params.s3Key,
    user_id: params.userId,
  })
}

// ─────────────────────────────────────────
// CREATE SECTION
// ─────────────────────────────────────────
export async function createSection(params: {
  courseId:   string
  title:      string
  orderIndex: number
}): Promise<void> {
  const { error } = await supabase
    .from('sections')
    .insert({
      course_id:   params.courseId,
      title:       params.title,
      order_index: params.orderIndex,
      is_default:  false,
    })
  if (error) throw error
}

// ─────────────────────────────────────────
// CREATE LESSON
// ─────────────────────────────────────────
export async function createLesson(params: {
  sectionId:  string
  title:      string
  orderIndex: number
}): Promise<string> {
  const { data, error } = await supabase
    .from('lessons')
    .insert({
      section_id:  params.sectionId,
      title:       params.title,
      order_index: params.orderIndex,
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

// ─────────────────────────────────────────
// ADD SUB-LESSON
// ─────────────────────────────────────────
export async function addSubLesson(params: {
  lessonId:   string
  title:      string
  orderIndex: number
}): Promise<void> {
  const { error } = await supabase
    .from('sub_lessons')
    .insert({
      lesson_id:   params.lessonId,
      title:       params.title,
      order_index: params.orderIndex,
    })
  if (error) throw error
}