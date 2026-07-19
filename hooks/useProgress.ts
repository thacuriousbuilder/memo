

import { useState, useCallback } from 'react'
import { supabase }              from '@/lib/supabase'
import { UserProgress, ProgressStatus } from '@/types'

export function useProgress(userId: string | null) {

  const [loading, setLoading] = useState(false)

  // Get progress for a lesson
  const getLessonProgress = useCallback(async (
    lessonId: string
  ): Promise<UserProgress | null> => {
    if (!userId) return null
    const { data } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id',   userId)
      .eq('lesson_id', lessonId)
      .single()
    return data
  }, [userId])

  // Get progress for a sub-lesson
  const getSubLessonProgress = useCallback(async (
    subLessonId: string
  ): Promise<UserProgress | null> => {
    if (!userId) return null
    const { data } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id',       userId)
      .eq('sub_lesson_id', subLessonId)
      .single()
    return data
  }, [userId])

  // Update or create progress entry
  const updateProgress = useCallback(async (params: {
    lesson_id?:     string
    sub_lesson_id?: string
    status:         ProgressStatus
  }) => {
    if (!userId) return
    setLoading(true)
    try {
      await supabase
        .from('user_progress')
        .upsert({
          user_id:       userId,
          lesson_id:     params.lesson_id     ?? null,
          sub_lesson_id: params.sub_lesson_id ?? null,
          status:        params.status,
          updated_at:    new Date().toISOString(),
        })
    } finally {
      setLoading(false)
    }
  }, [userId])

  // Mark lesson as passed (after 80% quiz score)
  const markPassed = useCallback(async (params: {
    lesson_id?:     string
    sub_lesson_id?: string
  }) => {
    await updateProgress({ ...params, status: 'passed' })
  }, [updateProgress])

  // Mark lesson as in_progress
  const markInProgress = useCallback(async (params: {
    lesson_id?:     string
    sub_lesson_id?: string
  }) => {
    await updateProgress({ ...params, status: 'in_progress' })
  }, [updateProgress])

  return {
    loading,
    getLessonProgress,
    getSubLessonProgress,
    updateProgress,
    markPassed,
    markInProgress,
  }
}