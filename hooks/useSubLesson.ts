

import { useState, useEffect, useCallback } from 'react'
import { supabase }        from '@/lib/supabase'
import { FilesAPI, QuizAPI } from '@/lib/api'
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

export type SubLessonStatus =
  | 'passed'
  | 'in_progress'
  | 'not_started'
  | 'locked'

export interface SubLessonNote {
  id:            string
  file_name:     string
  file_type:     string
  s3_key:        string
  created_at:    string
  has_questions: boolean
}

export interface SubLessonDetail {
  id:             string
  lesson_id:      string
  title:          string
  order_index:    number
  status:         SubLessonStatus
  progress:       number
  question_count: number
  notes:          SubLessonNote[]
  lesson_title:   string
  course_title:   string
}

// ─────────────────────────────────────────
// FETCH SUB-LESSON DETAIL
// ─────────────────────────────────────────
export function useSubLesson(
  subLessonId: string | null,
  userId:      string | null
) {
  const [subLesson, setSubLesson] = useState<SubLessonDetail | null>(null)
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
          user_progress!left (status),
          notes (
            id, file_name, file_type,
            s3_key, created_at,
            questions (id)
          ),
          lessons (
            id, title,
            sections (
              courses (title)
            )
          )
        `)
        .eq('id', subLessonId)
        .eq('user_progress.user_id', userId)
        .single()

      if (err) throw err

      const rawStatus = data.user_progress?.[0]?.status ?? 'not_started'
      const progress  = rawStatus === 'passed'      ? 100
                      : rawStatus === 'in_progress' ? 50
                      : 0

      const notes: SubLessonNote[] = (data.notes ?? [])
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

      const questionCount = notes.reduce(
        (s, n) => s + (n.has_questions ? 1 : 0), 0
      )

      setSubLesson({
        id:             data.id,
        lesson_id:      data.lesson_id,
        title:          data.title,
        order_index:    data.order_index,
        status:         rawStatus as SubLessonStatus,
        progress,
        question_count: questionCount,
        notes,
        lesson_title:   data.lessons?.title ?? '',
        course_title:   data.lessons?.sections?.courses?.title ?? '',
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
// CREATE SUB-LESSON
// ─────────────────────────────────────────
export async function createSubLesson(params: {
  lessonId:   string
  title:      string
  orderIndex: number
}): Promise<string> {
  const { data, error } = await supabase
    .from('sub_lessons')
    .insert({
      lesson_id:   params.lessonId,
      title:       params.title,
      order_index: params.orderIndex,
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

// ─────────────────────────────────────────
// UPLOAD NOTE — synchronous pipeline
// ─────────────────────────────────────────
export async function uploadSubLessonNote(params: {
  userId:      string
  subLessonId: string
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

  const asset       = result.assets[0]
  const fileType    = getFileType(asset.uri)
  const contentType = getContentType(fileType)
  const s3Key       = buildS3Key(
    params.userId,
    params.subLessonId,
    asset.name
  )

  // 1. Presign + Upload
  params.onProgress?.('uploading')
  const { upload_url } = await FilesAPI.presign({
    s3_key:       s3Key,
    content_type: contentType,
    user_id:      params.userId,
  })
  await uploadFileToS3(asset.uri, upload_url, contentType)

  // 2. Create note record
  const { data: note, error } = await supabase
    .from('notes')
    .insert({
      lesson_id:     null,
      sub_lesson_id: params.subLessonId,
      file_name:     asset.name,
      file_type:     fileType,
      s3_key:        s3Key,
    })
    .select('id')
    .single()

  if (error) throw error

  // 3. Parse — synchronous
  params.onProgress?.('parsing')
  await FilesAPI.parse({
    s3_key:    s3Key,
    user_id:   params.userId,
    note_id:   note.id,
    file_type: fileType,
  })

  // 4. Generate — synchronous
  params.onProgress?.('generating')
  await QuizAPI.generate({
    note_id:        note.id,
    user_id:        params.userId,
    question_count: 10,
    lesson_id:      null,
    sub_lesson_id:  params.subLessonId,
  })

  params.onProgress?.('done')
  return note.id
}

// ─────────────────────────────────────────
// DELETE NOTE
// ─────────────────────────────────────────
export async function deleteSubLessonNote(params: {
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