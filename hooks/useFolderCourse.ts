

import { useState, useCallback } from 'react'
import { useFocusEffect }        from 'expo-router'
import { supabase }              from '@/lib/supabase'

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────
export interface FolderNote {
  id:            string
  file_name:     string
  file_type:     string
  s3_key:        string
  created_at:    string
  has_questions: boolean
  selected:      boolean
}

export interface FolderCourse {
  id:          string
  title:       string
  emoji:       string
  description: string | null
  notes:       FolderNote[]
}

// ─────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────
export function useFolderCourse(
  courseId: string | null,
  userId:   string | null
) {
  const [course,  setCourse]  = useState<FolderCourse | null>(null)
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
          id, title, emoji, description,
          notes (
            id, file_name, file_type,
            s3_key, created_at,
            questions (id)
          )
        `)
        .eq('id', courseId)
        .single()

      if (err) throw err

      const notes: FolderNote[] = (data.notes ?? [])
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
          selected:      true, // default all selected
        }))

      setCourse({
        id:          data.id,
        title:       data.title,
        emoji:       data.emoji,
        description: data.description,
        notes,
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