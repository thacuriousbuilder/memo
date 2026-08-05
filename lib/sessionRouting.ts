

import { router } from 'expo-router'
import { Alert }  from 'react-native'
import {
  ReminderMode, ScopeItem, SessionType,
  getReminder, resolveReminderNoteIds,
} from '@/hooks/useReminders'
import { sessionOrdinalForDate } from '@/hooks/useDashboard'
import { rankTopicsForCourse }   from '@/hooks/useStudyOverview'

interface SessionRouteParams {
  reminderId:    string
  reminderMode:  ReminderMode
  courseId:      string
  label:         string
  sessionType:   SessionType
  questionCount: number | null
  scopeItems:    ScopeItem[]              // manual only; [] for auto
  resolvedScopeType?: 'topic' | 'subtopic' // auto only, already resolved
  resolvedScopeId?:   string
  resolvedTitle?:     string
}

// ─────────────────────────────────────────
// SHARED ROUTING — the exact logic Home's "Start" button uses
// (app/(tabs)/index.tsx), extracted so a cold notification-tap can reuse
// it instead of re-deriving navigation params by hand.
// ─────────────────────────────────────────
export async function buildSessionRoute(item: SessionRouteParams): Promise<void> {
  if (item.reminderMode === 'auto') {
    if (!item.resolvedScopeType || !item.resolvedScopeId) {
      Alert.alert('Nothing to study yet', 'This plan has no resolved topic for today.')
      return
    }
    if (item.sessionType === 'blurt') {
      router.replace({
        pathname: '/blurt/[id]',
        params: {
          id: item.courseId,
          scopeType: item.resolvedScopeType,
          scopeId: item.resolvedScopeId,
          title: item.resolvedTitle ?? item.label,
          reminderId: item.reminderId,
        },
      })
      return
    }
    router.push({
      pathname: '/study/[id]',
      params: {
        id: item.resolvedScopeId,
        mode: item.resolvedScopeType === 'subtopic' ? 'sublesson' : 'lesson',
        title: item.resolvedTitle ?? item.label,
        presetCount: String(item.questionCount ?? 5),
        reminderId: item.reminderId,
        returnTo: 'home',
      },
    })
    return
  }

  if (item.sessionType === 'blurt') {
    const scope = item.scopeItems[0]
    if (!scope || scope.scopeType === 'folder') {
      Alert.alert('No materials', 'This reminder isn\'t scoped to a specific topic yet.')
      return
    }
    router.replace({
      pathname: '/blurt/[id]',
      params: {
        id: item.courseId,
        scopeType: scope.scopeType,
        scopeId: scope.scopeId,
        title: item.label,
        reminderId: item.reminderId,
      },
    })
    return
  }
  try {
    if (item.scopeItems.length === 0) {
      router.push({
        pathname: '/study/[id]',
        params: {
          id: item.courseId, mode: 'course', title: item.label,
          presetCount: String(item.questionCount ?? 10),
          reminderId: item.reminderId,
          returnTo: 'home',
        },
      })
      return
    }
    const noteIds = await resolveReminderNoteIds(item.scopeItems)
    if (!noteIds.length) {
      Alert.alert('No materials', 'This reminder\'s materials couldn\'t be found.')
      return
    }
    router.push({
      pathname: '/study/[id]',
      params: {
        id: item.courseId, mode: 'custom', title: item.label,
        noteIds: JSON.stringify(noteIds),
        presetCount: String(item.questionCount ?? 10),
        reminderId: item.reminderId,
        returnTo: 'home',
      },
    })
  } catch (err: any) {
    Alert.alert('Error', err.message)
  }
}

// ─────────────────────────────────────────
// COLD-START ENTRY POINT — resolves a bare reminderId (e.g. from a tapped
// push notification) into the same route a Home-screen "Start" tap would
// produce, mirroring useDashboard.ts's Auto-mode resolution (top-ranked
// candidate + sessionOrdinalForDate) since there's no PlanItem to read
// pre-resolved fields off of here.
// ─────────────────────────────────────────
export async function startSessionForReminder(reminderId: string, userId: string): Promise<void> {
  const reminder = await getReminder(reminderId)
  if (!reminder) {
    Alert.alert('Reminder not found', 'This reminder may have been deleted.')
    return
  }

  if (reminder.mode === 'auto') {
    const candidates = await rankTopicsForCourse(reminder.courseId, userId)
    if (candidates.length === 0) {
      router.push(`/course/${reminder.courseId}`)
      return
    }
    const top = candidates[0]
    const ordinal = sessionOrdinalForDate(
      reminder.planStartDate ?? new Date().toISOString().slice(0, 10),
      reminder.daysOfWeek,
      new Date()
    )
    // Mirrors useDashboard.ts's Alternating-style resolution.
    const sessionType: SessionType = ordinal > 0 && ordinal % 4 === 0 ? 'blurt' : 'quiz'
    const questionCount = sessionType === 'quiz'
      ? (top.hasHistory ? (reminder.autoQuestionLevel ?? 5) : Math.min(reminder.autoQuestionLevel ?? 5, 5))
      : null

    await buildSessionRoute({
      reminderId:  reminder.id,
      reminderMode: 'auto',
      courseId:    reminder.courseId,
      label:       reminder.label,
      sessionType,
      questionCount,
      scopeItems:  [],
      resolvedScopeType: top.scopeType,
      resolvedScopeId:   top.id,
      resolvedTitle:     top.title,
    })
    return
  }

  await buildSessionRoute({
    reminderId:    reminder.id,
    reminderMode:  'manual',
    courseId:      reminder.courseId,
    label:         reminder.label,
    sessionType:   reminder.sessionType,
    questionCount: reminder.questionCount,
    scopeItems:    reminder.scopeItems,
  })
}
