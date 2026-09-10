

import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator, Platform, KeyboardAvoidingView
} from 'react-native'
import { useState, useEffect } from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'
import { Colors, Spacing, Radius, Typography, CardBase } from '@/constants/theme'
import { useSession } from '@/hooks/useSession'
import { useCourseOverview, TopicItem } from '@/hooks/useCourseOverview'
import {
  ScopeItem, SessionType, ReminderMode, SessionStyle,
  createReminder, updateReminder, getReminder, deleteReminder,
  createAutoReminder, updateAutoReminder,
  hasActiveReminderForCourse, autoReminderHasProgress, findConflictingReminder,
} from '@/hooks/useReminders'
import { requestPermission, registerForPushNotifications } from '@/lib/notifications'

const DAYS = [
  { value: 0, label: 'S' }, { value: 1, label: 'M' }, { value: 2, label: 'T' },
  { value: 3, label: 'W' }, { value: 4, label: 'T' }, { value: 5, label: 'F' },
  { value: 6, label: 'S' },
]

const DURATION_PRESETS = [
  { days: 7,  label: '1 week' },
  { days: 14, label: '2 weeks' },
  { days: 30, label: '1 month' },
]

function toTimeString(date: Date): string {
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:00`
}
function formatTime12h(date: Date): string {
  let h = date.getHours()
  const m = date.getMinutes()
  const period = h >= 12 ? 'PM' : 'AM'
  h = h % 12 === 0 ? 12 : h % 12
  return `${h}:${m.toString().padStart(2, '0')} ${period}`
}

// ─────────────────────────────────────────
// SCOPE ROW (checkbox)
// ─────────────────────────────────────────
function ScopeRow({
  icon, label, indent, checked, onPress, disabled,
}: {
  icon: React.ReactNode; label: string; indent?: number
  checked: boolean; onPress: () => void; disabled?: boolean
}) {
  return (
    <TouchableOpacity
      style={[styles.scopeRow, { paddingLeft: Spacing.md + (indent ?? 0) }, disabled && styles.scopeRowDisabled]}
      onPress={onPress}
      activeOpacity={disabled ? 1 : 0.7}
    >
      {icon}
      <Text style={styles.scopeLabel} numberOfLines={1}>{label}</Text>
      <View style={[styles.checkbox, checked && styles.checkboxActive]}>
        {checked && <Ionicons name="checkmark" size={13} color="#fff" />}
      </View>
    </TouchableOpacity>
  )
}

export default function NewReminderScreen() {
  const { id: courseId, reminderId } = useLocalSearchParams<{ id: string; reminderId?: string }>()
  const isEditing = !!reminderId
  const { user } = useSession()
  const { course, loading } = useCourseOverview(courseId ?? null, user?.id ?? null)

  const [label,       setLabel]       = useState('')
  const [scopeItems,  setScopeItems]  = useState<ScopeItem[]>([])   // empty = All materials
  const [days,        setDays]        = useState<Set<number>>(new Set([1, 2, 3, 4, 5]))
  const [time,        setTime]        = useState(new Date(new Date().setHours(8, 0, 0, 0)))
  const [showPicker,  setShowPicker]  = useState(false)
  const [sessionType, setSessionType] = useState<SessionType>('quiz')
  const [questionCount, setQuestionCount] = useState(5)
  const [saving,      setSaving]      = useState(false)
  const [prefilling,  setPrefilling]  = useState(isEditing)

  const [reminderMode,  setReminderMode]  = useState<ReminderMode>('auto')
  const [initialMode,   setInitialMode]   = useState<ReminderMode>('manual')
  const [planDurationDays, setPlanDurationDays] = useState(7)
  const [sessionStyle,  setSessionStyle]  = useState<SessionStyle>('alternating')
  const [autoQuestionLevel, setAutoQuestionLevel] = useState<number | null>(null)

  useEffect(() => {
    if (!reminderId) return
    getReminder(reminderId).then(reminder => {
      if (!reminder) return
      setLabel(reminder.label)
      setScopeItems(reminder.scopeItems)
      setDays(new Set(reminder.daysOfWeek))
      const [h, m] = reminder.timeOfDay.split(':').map(Number)
      const d = new Date(); d.setHours(h, m, 0, 0)
      setTime(d)
      setSessionType(reminder.sessionType)
      setQuestionCount(reminder.questionCount ?? 5)
      setReminderMode(reminder.mode)
      setInitialMode(reminder.mode)
      setPlanDurationDays(reminder.planDurationDays ?? 7)
      setSessionStyle(reminder.sessionStyle ?? 'alternating')
      setAutoQuestionLevel(reminder.autoQuestionLevel)
      setPrefilling(false)
    }).catch(() => setPrefilling(false))
  }, [reminderId])

  // Data-loss confirm wording: specific when there's real progress/config
  // to lose, generic otherwise. Shared by the delete flow and the
  // Auto<->Manual mode-switch flow, since mode-switch is delete+recreate.
  const getDeleteWarning = async (mode: ReminderMode): Promise<string | null> => {
    if (!reminderId) return null
    if (mode === 'auto') {
      const hasProgress = await autoReminderHasProgress(reminderId, autoQuestionLevel)
      return hasProgress
        ? `This plan has grown to ${autoQuestionLevel ?? 5} questions per session. Deleting it will lose this progress permanently.`
        : null
    }
    return scopeItems.length > 0
      ? `This will discard your selected study materials checklist.`
      : null
  }

  const toggleAllMaterials = () => {
    if (sessionType === 'blurt') return
    setScopeItems([])
  }

  const toggleScopeItem = (item: ScopeItem) => {
    const checked = scopeItems.some(s => s.scopeId === item.scopeId)
    if (sessionType === 'blurt' && item.scopeType === 'folder' && !checked) return
    setScopeItems(prev => {
      const exists = prev.some(s => s.scopeId === item.scopeId)
      return exists ? prev.filter(s => s.scopeId !== item.scopeId) : [...prev, item]
    })
  }

  const toggleDay = (d: number) => {
    setDays(prev => { const next = new Set(prev); next.has(d) ? next.delete(d) : next.add(d); return next })
  }
  const applyQuickDays = (preset: 'every' | 'weekdays' | 'weekends') => {
    if (preset === 'every') setDays(new Set([0,1,2,3,4,5,6]))
    if (preset === 'weekdays') setDays(new Set([1,2,3,4,5]))
    if (preset === 'weekends') setDays(new Set([0,6]))
  }

  const isScopeChecked = (scopeId: string) => scopeItems.some(s => s.scopeId === scopeId)

  const renderTopic = (topic: TopicItem) => {
    // Blurt reads a topic's own notes plus its subtopics' notes; a topic with
    // neither has no material to blurt from, same as an empty subtopic.
    const topicHasMaterial = topic.notes.length > 0 || topic.subtopics.some(sub => sub.notes.length > 0)

    return (
      <View key={topic.id}>
        <ScopeRow
          icon={<View style={styles.dot} />}
          label={topic.title}
          checked={isScopeChecked(topic.id)}
          onPress={() => {
            if (sessionType === 'blurt' && !topicHasMaterial) return
            toggleScopeItem({ scopeType: 'topic', scopeId: topic.id, title: topic.title })
          }}
          disabled={sessionType === 'blurt' && !topicHasMaterial}
        />
        {topic.subtopics.map(sub => {
          const subHasMaterial = sub.notes.length > 0
          return (
            <ScopeRow
              key={sub.id}
              icon={<Ionicons name="return-down-forward" size={14} color={Colors.textMuted} />}
              label={sub.title}
              indent={24}
              checked={isScopeChecked(sub.id)}
              onPress={() => {
                if (sessionType === 'blurt' && !subHasMaterial) return
                toggleScopeItem({ scopeType: 'subtopic', scopeId: sub.id, title: sub.title })
              }}
              disabled={sessionType === 'blurt' && !subHasMaterial}
            />
          )
        })}
      </View>
    )
  }

  const handleSave = async () => {
    if (!user || !courseId) return
    if (!label.trim()) { Alert.alert('Required', 'Please enter a label.'); return }
    if (days.size === 0) { Alert.alert('Required', 'Select at least one day.'); return }
    if (reminderMode === 'manual' && sessionType === 'blurt' &&
        (scopeItems.length === 0 || scopeItems.some(s => s.scopeType === 'folder'))) {
      Alert.alert('Select a topic', 'Blurt needs a specific topic or subtopic — pick one below.')
      return
    }

    setSaving(true)
    try {
      const conflict = await findConflictingReminder({
        userId: user.id,
        daysOfWeek: Array.from(days),
        time: toTimeString(time),
        excludeReminderId: isEditing ? reminderId : undefined,
      })
      if (conflict) {
        Alert.alert(
          'Time conflict',
          `"${conflict.label}" (${conflict.courseTitle}) is already scheduled at ${formatTime12h(time)} on that day. Pick a different time or day.`
        )
        setSaving(false)
        return
      }

      // Overlap heads-up: check BEFORE inserting, since a self-count after
      // insert would always be >=1 and defeat the check.
      const hadOtherActiveReminder = !isEditing
        ? await hasActiveReminderForCourse(courseId, user.id)
        : false

      if (reminderMode === 'auto') {
        if (isEditing && reminderId) {
          await updateAutoReminder({
            reminderId, label: label.trim(), daysOfWeek: Array.from(days),
            time: toTimeString(time), sessionStyle,
          })
        } else {
          await createAutoReminder({
            userId: user.id, courseId, label: label.trim(), daysOfWeek: Array.from(days),
            time: toTimeString(time), planDurationDays, sessionStyle,
          })
        }
      } else {
        const payload = {
          label: label.trim(),
          scopeItems,
          daysOfWeek: Array.from(days),
          time: toTimeString(time),
          sessionType,
          questionCount: sessionType === 'quiz' ? questionCount : null,
        }
        if (isEditing && reminderId) {
          await updateReminder({ reminderId, ...payload })
        } else {
          await createReminder({ userId: user.id, courseId, ...payload })
        }
      }

      // Lazily ask for notification permission on first-ever reminder
      // creation, in context — never blocks the save if it fails.
      if (!isEditing) {
        try {
          const granted = await requestPermission()
          if (granted) await registerForPushNotifications(user.id)
        } catch (err) {
          console.warn('[handleSave] notification registration failed:', err)
        }
      }

      if (hadOtherActiveReminder) {
        Alert.alert(
          'Heads up',
          'You already have a reminder for this course — sessions may occasionally cover the same material.',
          [{ text: 'Got it', onPress: () => router.replace(`/course/${courseId}`) }]
        )
      } else {
        router.replace(`/course/${courseId}`)
      }
    } catch (err: any) {
      Alert.alert('Error', err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!reminderId || !courseId) return
    const warning = await getDeleteWarning(reminderMode)
    Alert.alert(
      'Delete Reminder',
      warning ? `${warning} Delete "${label}"?` : `Delete "${label}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
            try { await deleteReminder(reminderId); router.replace(`/course/${courseId}`) }
            catch (err: any) { Alert.alert('Error', err.message) }
          }},
      ]
    )
  }

  // Auto<->Manual is delete-and-recreate, not an in-place field change —
  // schedule fields (label/days/time) carry over, mode-specific config
  // (scope, or Auto's duration/style) resets to sensible defaults.
  const handleModeSwitch = async (newMode: ReminderMode) => {
    if (newMode === reminderMode) return
    if (!isEditing || !reminderId || !user || !courseId) { setReminderMode(newMode); return }

    const warning = await getDeleteWarning(reminderMode)
    const modeLabel = newMode === 'auto' ? 'Smart' : 'Custom'
    Alert.alert(
      `Switch to ${modeLabel}?`,
      (warning ? `${warning} ` : '') + `Switching modes deletes this reminder and creates a new one.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Switch', style: 'destructive', onPress: async () => {
            const conflict = await findConflictingReminder({
              userId: user.id,
              daysOfWeek: Array.from(days),
              time: toTimeString(time),
              excludeReminderId: reminderId,
            })
            if (conflict) {
              Alert.alert(
                'Time conflict',
                `"${conflict.label}" (${conflict.courseTitle}) is already scheduled at ${formatTime12h(time)} on that day. Pick a different time or day.`
              )
              return
            }

            // Create the replacement FIRST, delete the old one only after
            // it succeeds — if create fails, the original reminder must
            // still exist, not be silently lost.
            try {
              if (newMode === 'auto') {
                await createAutoReminder({
                  userId: user.id, courseId, label: label.trim() || 'Reminder',
                  daysOfWeek: Array.from(days), time: toTimeString(time),
                  planDurationDays: 7, sessionStyle: 'alternating',
                })
              } else {
                await createReminder({
                  userId: user.id, courseId, label: label.trim() || 'Reminder',
                  scopeItems: [], daysOfWeek: Array.from(days), time: toTimeString(time),
                  sessionType: 'quiz', questionCount: 5,
                })
              }
            } catch (err: any) {
              Alert.alert('Error', err.message)
              return
            }
            try {
              await deleteReminder(reminderId)
            } catch (err: any) {
              Alert.alert('Partial error', `The new reminder was created, but the old one couldn't be removed: ${err.message}`)
            }
            router.replace(`/course/${courseId}`)
          }},
      ]
    )
  }

  if (loading || !course || prefilling) return (
    <View style={[styles.root, styles.center]}>
      <ActivityIndicator color={Colors.primary} size="large" />
    </View>
  )

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEditing ? 'Edit reminder' : 'New reminder'}</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color={Colors.primary} /> : <Text style={styles.saveText}>Save</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <TextInput
            style={styles.input}
            value={label}
            onChangeText={setLabel}
            placeholder="Label (e.g. Morning revision)"
            placeholderTextColor={Colors.textMuted}
          />

          <Text style={styles.fieldLabel}>Session plan</Text>
          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[styles.modeBtn, reminderMode === 'auto' && styles.modeBtnActive]}
              onPress={() => handleModeSwitch('auto')}
            >
              <Ionicons name="sparkles-outline" size={16} color={reminderMode === 'auto' ? '#fff' : Colors.textSecondary} />
              <Text style={[styles.modeBtnText, reminderMode === 'auto' && styles.modeBtnTextActive]}>Smart</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, reminderMode === 'manual' && styles.modeBtnActive]}
              onPress={() => handleModeSwitch('manual')}
            >
              <Ionicons name="options-outline" size={16} color={reminderMode === 'manual' ? '#fff' : Colors.textSecondary} />
              <Text style={[styles.modeBtnText, reminderMode === 'manual' && styles.modeBtnTextActive]}>Custom</Text>
            </TouchableOpacity>
          </View>

          {reminderMode === 'auto' && (
            <View style={styles.smartBanner}>
              <Ionicons name="sparkles" size={16} color={Colors.primary} />
              <Text style={styles.smartBannerText}>
                MEMO picks the topic, question count, and quiz or blurt for each session automatically.
              </Text>
            </View>
          )}

          {reminderMode === 'manual' && (
            <>
              <Text style={styles.fieldLabel}>Study mode</Text>
              <View style={styles.modeRow}>
                <TouchableOpacity
                  style={[styles.modeBtn, sessionType === 'quiz' && styles.modeBtnActive]}
                  onPress={() => setSessionType('quiz')}
                >
                  <Ionicons name="checkbox-outline" size={16} color={sessionType === 'quiz' ? '#fff' : Colors.textSecondary} />
                  <Text style={[styles.modeBtnText, sessionType === 'quiz' && styles.modeBtnTextActive]}>Quiz</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeBtn, sessionType === 'blurt' && styles.modeBtnActive]}
                  onPress={() => setSessionType('blurt')}
                >
                  <MaterialCommunityIcons name="account-voice" size={16} color={sessionType === 'blurt' ? '#fff' : Colors.textSecondary} />
                  <Text style={[styles.modeBtnText, sessionType === 'blurt' && styles.modeBtnTextActive]}>Blurt</Text>
                </TouchableOpacity>
              </View>

              {sessionType === 'quiz' && (
                <>
                  <Text style={styles.fieldLabel}>Questions</Text>
                  <View style={styles.stepperRow}>
                    <Text style={styles.stepperHint}>How many to answer</Text>
                    <View style={styles.stepper}>
                      <TouchableOpacity style={styles.stepperBtn} onPress={() => setQuestionCount(c => Math.max(1, c - 1))}>
                        <Ionicons name="remove" size={16} color={Colors.textPrimary} />
                      </TouchableOpacity>
                      <Text style={styles.stepperValue}>{questionCount}</Text>
                      <TouchableOpacity style={styles.stepperBtn} onPress={() => setQuestionCount(c => Math.min(30, c + 1))}>
                        <Ionicons name="add" size={16} color={Colors.textPrimary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              )}
            </>
          )}

          {reminderMode === 'auto' && (
            <>
              <Text style={styles.fieldLabel}>Plan duration</Text>
              <View style={styles.quickDayRow}>
                {DURATION_PRESETS.map(preset => (
                  <TouchableOpacity
                    key={preset.days}
                    style={[styles.quickDayChip, planDurationDays === preset.days && styles.modeBtnActive]}
                    onPress={() => setPlanDurationDays(preset.days)}
                  >
                    <Text style={[styles.quickDayChipText, planDurationDays === preset.days && styles.modeBtnTextActive]}>
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <Text style={styles.fieldLabel}>Repeat on</Text>
          <View style={styles.quickDayRow}>
            <TouchableOpacity style={styles.quickDayChip} onPress={() => applyQuickDays('every')}>
              <Text style={styles.quickDayChipText}>Every day</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickDayChip} onPress={() => applyQuickDays('weekdays')}>
              <Text style={styles.quickDayChipText}>Weekdays</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickDayChip} onPress={() => applyQuickDays('weekends')}>
              <Text style={styles.quickDayChipText}>Weekends</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.dayRow}>
            {DAYS.map(d => (
              <TouchableOpacity
                key={d.value}
                style={[styles.dayCircle, days.has(d.value) && styles.dayCircleActive]}
                onPress={() => toggleDay(d.value)}
              >
                <Text style={[styles.dayText, days.has(d.value) && styles.dayTextActive]}>{d.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Time</Text>
          <TouchableOpacity style={styles.timeCard} onPress={() => setShowPicker(true)} activeOpacity={0.7}>
            <Ionicons name="time-outline" size={18} color={Colors.textSecondary} />
            <Text style={styles.timeText}>{formatTime12h(time)}</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
          {showPicker && (
              <View style={styles.pickerWrapper}>
                <DateTimePicker
                  value={time}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  themeVariant="light"
                  onChange={(_, selected) => {
                    if (Platform.OS !== 'ios') setShowPicker(false)
                    if (selected) setTime(selected)
                  }}
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity style={styles.pickerDoneBtn} onPress={() => setShowPicker(false)}>
                    <Text style={styles.pickerDoneText}>Done</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

          {reminderMode === 'manual' && (
            <>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.fieldLabel}>Study from</Text>
                <Text style={styles.sectionSummary}>
                  {scopeItems.length === 0 ? 'All materials' : `${scopeItems.length} selected`}
                </Text>
              </View>
              {sessionType === 'blurt' && (
                <Text style={styles.scopeHint}>
                  Blurt needs a specific topic or subtopic, whole-course and folder selections aren't supported yet.
                </Text>
              )}
              <View style={styles.scopeList}>
                <ScopeRow
                  icon={<Ionicons name="layers-outline" size={16} color={Colors.primary} />}
                  label="All materials"
                  checked={scopeItems.length === 0}
                  onPress={toggleAllMaterials}
                  disabled={sessionType === 'blurt'}
                />
              {course.folders.map(folder => (
              <View key={folder.id}>
                <ScopeRow
                  icon={<Ionicons name="folder-outline" size={16} color={Colors.primary} />}
                  label={folder.title}
                  checked={isScopeChecked(folder.id)}
                  onPress={() => toggleScopeItem({ scopeType: 'folder', scopeId: folder.id, title: folder.title })}
                  disabled={sessionType === 'blurt' && !isScopeChecked(folder.id)}
                />
                {folder.topics.map(renderTopic)}
              </View>
            ))}
                {course.unorganizedTopics.map(renderTopic)}
              </View>
            </>
          )}

          {isEditing && (
            <TouchableOpacity style={styles.deleteRow} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={16} color={Colors.error} />
              <Text style={styles.deleteRowText}>Delete reminder</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingTop: Spacing.xl + 32, paddingBottom: Spacing.md,
  },
  headerTitle: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary },
  saveText: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.primary },
  container: { paddingHorizontal: Spacing.base, paddingBottom: Spacing.xxxl },
  input: {
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.full,
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.md, fontSize: Typography.base, color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fieldLabel: { fontSize: Typography.sm, fontWeight: Typography.medium, color: Colors.textPrimary, marginTop: Spacing.lg, marginBottom: Spacing.xs },
  sectionSummary: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: Spacing.lg },
  scopeHint: { fontSize: Typography.xs, color: Colors.warning, marginBottom: Spacing.xs },
  smartBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    backgroundColor: Colors.primaryMuted, borderRadius: Radius.lg,
    padding: Spacing.md, marginTop: Spacing.sm,
  },
  smartBannerText: { flex: 1, fontSize: Typography.sm, color: Colors.primary, lineHeight: 19 },
  scopeList: { ...CardBase, overflow: 'hidden', padding: 0 },
  scopeRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.md, paddingRight: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  scopeRowDisabled: { opacity: 0.4 },
  folderHeaderRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.md, paddingLeft: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  folderLabel: { fontSize: Typography.sm, fontWeight: Typography.bold, color: Colors.textPrimary },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.textMuted },
  scopeLabel: { flex: 1, fontSize: Typography.sm, color: Colors.textPrimary },
  checkbox: {
    width: 22, height: 22, borderRadius: Radius.full, borderWidth: 2,
    borderColor: Colors.border, alignItems: 'center', justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  quickDayRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  quickDayChip: {
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card,
  },
  quickDayChipText: { fontSize: Typography.xs, color: Colors.textSecondary, fontWeight: Typography.medium },
  dayRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCircle: {
    width: 40, height: 40, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.card,
  },
  dayCircleActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dayText: { fontSize: Typography.sm, color: Colors.textSecondary },
  dayTextActive: { color: '#fff', fontWeight: Typography.semibold },
  timeCard: {
    ...CardBase, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.md,
  },
  timeText: { flex: 1, fontSize: Typography.md, fontWeight: Typography.bold, color: Colors.textPrimary },
  modeRow: { flexDirection: 'row', gap: Spacing.sm },
  modeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs,
    paddingVertical: Spacing.md, borderRadius: Radius.full, backgroundColor: Colors.card,
    borderWidth: 1, borderColor: Colors.border,
  },
  modeBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  modeBtnText: { fontSize: Typography.sm, color: Colors.textSecondary, fontWeight: Typography.medium },
  modeBtnTextActive: { color: '#fff' },
  stepperRow: {
    ...CardBase, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing.md,
  },
  stepperHint: { fontSize: Typography.sm, color: Colors.textSecondary },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  stepperBtn: {
    width: 28, height: 28, borderRadius: Radius.full, backgroundColor: Colors.cardElevated,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center',
  },
  stepperValue: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary, minWidth: 20, textAlign: 'center' },
  deleteRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs,
    marginTop: Spacing.xl, paddingVertical: Spacing.md,
  },
  deleteRowText: { fontSize: Typography.sm, color: Colors.error, fontWeight: Typography.medium },
  pickerWrapper: { alignItems: 'center' },
pickerDoneBtn: {
  backgroundColor: Colors.primary, borderRadius: Radius.md,
  paddingVertical: Spacing.sm, paddingHorizontal: Spacing.xl,
  marginTop: Spacing.sm, alignSelf: 'stretch', alignItems: 'center',
},
pickerDoneText: { fontSize: Typography.base, fontWeight: Typography.semibold, color: '#fff' },
})