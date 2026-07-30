

import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator,
  Alert
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { Colors, Spacing, Radius, Typography, CardBase } from '@/constants/theme'
import { useSession } from '@/hooks/useSession'
import { useCourseOverview } from '@/hooks/useCourseOverview'
import { useExams, createExam, deleteExam } from '@/hooks/useExams'
import StudyMaterialsList from '@/components/studyMaterialsList'
import { useReminders, toggleReminder, formatDaysOfWeek, formatTime } from '@/hooks/useReminders'
import { Switch } from 'react-native'

// ─────────────────────────────────────────
// GRADE BADGE
// ─────────────────────────────────────────
function GradeBadge({ pct }: { pct: number | null }) {
  if (pct === null) {
    return (
      <View style={[styles.gradeBadge, { backgroundColor: Colors.cardElevated }]}>
        <Text style={[styles.gradePct, { color: Colors.textMuted }]}>—</Text>
        <Text style={[styles.gradeLabel, { color: Colors.textMuted }]}>GRADE</Text>
      </View>
    )
  }
  const color = pct >= 80 ? Colors.success : pct >= 60 ? Colors.warning : Colors.error
  return (
    <View style={[styles.gradeBadge, { backgroundColor: color + '1A' }]}>
      <Text style={[styles.gradePct, { color }]}>{pct}%</Text>
      <Text style={[styles.gradeLabel, { color }]}>GRADE</Text>
    </View>
  )
}

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useSession()

  const { course, loading, error, refetch } = useCourseOverview(id ?? null, user?.id ?? null)
  const { exams, pastExams, refetch: refetchExams } = useExams(id ?? null, user?.id ?? null)
  const [showPastExams, setShowPastExams] = useState(false)

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const { reminders, refetch: refetchReminders } = useReminders(id ?? null, user?.id ?? null)
  const [managingMaterials, setManagingMaterials] = useState(false)



  const handleToggle = (ids: string[]) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      const allSelected = ids.every(id => next.has(id))
      ids.forEach(id => allSelected ? next.delete(id) : next.add(id))
      return next
    })
  }
  const handleToggleReminder = async (reminderId: string, value: boolean) => {
    try {
      await toggleReminder(reminderId, value)
      refetchReminders()
    } catch (err: any) {
      Alert.alert('Error', err.message)
    }
  }

  const getDaysLabel = (daysLeft: number): string => {
    if (daysLeft === 0)  return 'Today'
    if (daysLeft === 1)  return 'Tomorrow'
    if (daysLeft > 1)    return `${daysLeft} days`
    if (daysLeft === -1) return 'Yesterday'
    return `${Math.abs(daysLeft)} days ago`
  }
  

  if (loading || !course) return (
    <View style={[styles.root, styles.center]}>
      <ActivityIndicator color={Colors.primary} size="large" />
    </View>
  )

  if (error) return (
    <View style={[styles.root, styles.center]}>
      <Text style={styles.errorText}>{error}</Text>
    </View>
  )

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={Colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{course.title}</Text>
        <TouchableOpacity onPress={() => router.push(`/course/edit/${course.id}`)}>
          <Ionicons name="pencil-outline" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Course summary */}
      <View style={styles.summaryRow}>
        <View style={[styles.iconBadge, { backgroundColor: (course.color ?? Colors.primary) + '22' }]}>
          <MaterialCommunityIcons name={course.emoji as any} size={26} color={course.color ?? Colors.primary} />
        </View>
        <View style={styles.summaryInfo}>
          <Text style={styles.summaryMeta}>
            {course.totalNotes} {course.totalNotes === 1 ? 'note' : 'notes'} · {course.totalQuestions} {course.totalQuestions === 1 ? 'question' : 'questions'}
          </Text>
          {course.course_group && (
            <Text style={styles.summaryGroup}>{course.course_group}</Text>
          )}
        </View>
        <GradeBadge pct={course.gradePct} />
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${course.progressPct}%` }]} />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>STUDY REMINDERS</Text>
          <TouchableOpacity onPress={() => router.push(`/course/${course.id}/reminder/new`)}>
            <Text style={styles.addText}>+ Add</Text>
          </TouchableOpacity>
        </View>
        {reminders.length === 0 ? (
          <TouchableOpacity
            style={styles.reminderEmptyState}
            onPress={() => router.push(`/course/${course.id}/reminder/new`)}
            activeOpacity={0.7}
          >
            <View style={styles.reminderIcon}>
              <Ionicons name="notifications" size={18} color={Colors.primary} />
            </View>
            <View style={styles.examInfo}>
              <Text style={styles.examTitle}>Set a study reminder</Text>
              <Text style={styles.examDate}>Pick times and days to review</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={{ gap: Spacing.sm }}>
            {reminders.map(reminder => (
            <TouchableOpacity
              key={reminder.id}
              style={styles.reminderRow}
              onPress={() => router.push(`/course/${course.id}/reminder/new?reminderId=${reminder.id}`)}
              activeOpacity={0.7}
            >
              <View style={styles.reminderIcon}>
                <Ionicons name="notifications" size={18} color={Colors.primary} />
              </View>
              <View style={styles.examInfo}>
                <Text style={styles.examTitle}>{reminder.label}</Text>
                <Text style={styles.examDate}>
                  {formatTime(reminder.timeOfDay)} · {formatDaysOfWeek(reminder.daysOfWeek)}
                </Text>
              </View>
              <Switch
                value={reminder.isActive}
                onValueChange={(v) => handleToggleReminder(reminder.id, v)}
                trackColor={{ false: Colors.border, true: Colors.primary }}
                thumbColor="#fff"
              />
            </TouchableOpacity>
          ))}
          </View>
        )}
      </View>

        {/* Upcoming Tests */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>UPCOMING TESTS</Text>
            <TouchableOpacity onPress={() => router.push(`/course/${course.id}/exam/new`)}>
              <Text style={styles.addText}>+ Add</Text>
            </TouchableOpacity>
          </View>

          {exams.length === 0 ? (
            <View style={styles.emptyTextRow}>
              <Text style={styles.emptyTextRowText}>No tests scheduled.</Text>
            </View>
          ) : (
            <View style={styles.examList}>
              {exams.map((exam, index) => {
                const color = exam.days_left <= 3 ? Colors.error : exam.days_left <= 7 ? Colors.warning : Colors.textSecondary
                return (
                  <TouchableOpacity
                  key={exam.id}
                  style={[styles.examRow, index < exams.length - 1 && styles.examRowBorder]}
                  onPress={() => router.push(`/course/${course.id}/exam/new?examId=${exam.id}`)}
                >
                    <View style={[styles.examIcon, { backgroundColor: color + '22' }]}>
                      <Ionicons name="document-text" size={18} color={color} />
                    </View>
                    <View style={styles.examInfo}>
                      <Text style={styles.examTitle}>{exam.title}</Text>
                      <Text style={styles.examDate}>
                        {new Date(exam.exam_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                      </Text>
                    </View>
                   <Text style={[styles.examDays, { color }]}>
                    {getDaysLabel(exam.days_left)}
                  </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          )}
        </View>
        {pastExams.length > 0 && (
        <>
          <TouchableOpacity
            style={styles.pastTestsToggle}
            onPress={() => setShowPastExams(prev => !prev)}
          >
            <Text style={styles.pastTestsToggleText}>
              {showPastExams ? 'Hide' : 'Show'} past tests ({pastExams.length})
            </Text>
            <Ionicons
              name={showPastExams ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={Colors.textMuted}
            />
          </TouchableOpacity>

          {showPastExams && (
            <View style={styles.examList}>
              {pastExams.map((exam, index) => (
                <TouchableOpacity
                  key={exam.id}
                  style={[styles.examRow, index < pastExams.length - 1 && styles.examRowBorder, { opacity: 0.6 }]}
                  onPress={() => router.push(`/course/${course.id}/exam/new?examId=${exam.id}`)}
                >
                  <View style={[styles.examIcon, { backgroundColor: Colors.textMuted + '22' }]}>
                    <Ionicons name="document-text" size={18} color={Colors.textMuted} />
                  </View>
                  <View style={styles.examInfo}>
                    <Text style={styles.examTitle}>{exam.title}</Text>
                    <Text style={styles.examDate}>
                      {new Date(exam.exam_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                    </Text>
                  </View>
                  <Text style={[styles.examDays, { color: Colors.textMuted }]}>
                    {getDaysLabel(exam.days_left)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>STUDY MATERIALS</Text>
          <View style={styles.headerActions}>
            {!managingMaterials && (
              <TouchableOpacity onPress={() => router.push(`/course/${course.id}/material/new`)}>
                <Text style={styles.addText}>+ Add</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => setManagingMaterials(prev => !prev)}>
              {managingMaterials
                ? <Text style={styles.addText}>Done</Text>
                : <Ionicons name="pencil-outline" size={16} color={Colors.textSecondary} />
              }
            </TouchableOpacity>
          </View>
        </View>
        {!managingMaterials && (
          <Text style={styles.materialsHint}>Select materials to build a quiz</Text>
        )}
        <StudyMaterialsList
          course={course}
          selectedIds={selectedIds}
          onToggle={handleToggle}
          managing={managingMaterials}
          onRefetch={refetch}
        />
      </View>
      <TouchableOpacity
        style={styles.quizButton}
        activeOpacity={0.8}
        onPress={() => {
          const hasSelection = selectedIds.size > 0
          router.push({
            pathname: '/study/[id]',
            params: {
              id:      course.id,
              mode:    hasSelection ? 'custom' : 'course',
              title:   course.title,
              ...(hasSelection ? { noteIds: JSON.stringify(Array.from(selectedIds)) } : {}),
            },
          })
        }}
      >
        <Ionicons name="play" size={16} color="#fff" />
        <Text style={styles.quizButtonText}>
          {selectedIds.size === 0
            ? 'Study whole course'
            : selectedIds.size === 1
            ? 'Study 1 selected file'
            : `Study ${selectedIds.size} selected files`}
        </Text>
      </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: Typography.sm, color: Colors.error, textAlign: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingTop: Spacing.xl + 32, paddingBottom: Spacing.md,
  },
  headerTitle: {
    flex:        1,
    textAlign:   'left',
    fontSize:    Typography.lg,
    fontWeight:  Typography.bold,
    color:       Colors.textPrimary,
    marginLeft:  Spacing.sm,
  },
  container: { paddingHorizontal: Spacing.base, paddingBottom: Spacing.xxxl, gap: Spacing.xl },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  iconBadge: { width: 52, height: 52, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  summaryInfo: { flex: 1 },
  summaryMeta:  { fontSize: Typography.sm, fontWeight: Typography.medium, color: Colors.textPrimary },
  summaryGroup: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 1 },
  gradeBadge: { alignItems: 'center', borderRadius: Radius.md, paddingVertical: Spacing.xs, paddingHorizontal: Spacing.md },
  gradePct: { fontSize: Typography.lg, fontWeight: Typography.bold },
  gradeLabel: { fontSize: 9, fontWeight: Typography.bold, letterSpacing: 0.5 },
  section: { gap: Spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionLabel: { fontSize: Typography.xs, fontWeight: Typography.bold, color: Colors.textSecondary, letterSpacing: 1 },
  addText: { fontSize: Typography.sm, fontWeight: Typography.medium, color: Colors.primary },
  addTestEmpty: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed', borderRadius: Radius.lg, paddingVertical: Spacing.md },
  addTestEmptyText: { fontSize: Typography.sm, color: Colors.textMuted },
  examList: { ...CardBase, overflow: 'hidden', padding: 0 },
  examRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, paddingHorizontal: Spacing.base, gap: Spacing.md },
  examRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  examIcon: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  examInfo: { flex: 1 },
  examTitle: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  examDate: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 2 },
  examDays: { fontSize: Typography.sm, fontWeight: Typography.semibold },
  emptyTextRow: {
    ...CardBase, padding: Spacing.md,
  },
  emptyTextRowText: {
    fontSize: Typography.sm, color: Colors.textSecondary,
  },
  placeholderBox: { borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed', borderRadius: Radius.lg, padding: Spacing.xl, alignItems: 'center' },
  placeholderText: { fontSize: Typography.sm, color: Colors.textMuted },
  progressTrack: {
    height: 4, backgroundColor: Colors.progressTrack, borderRadius: Radius.full,
    overflow: 'hidden', marginTop: -Spacing.md,
  },
  progressFill: { height: 4, backgroundColor: Colors.primary, borderRadius: Radius.full },
  pastTestsToggle: {
  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
  paddingVertical: Spacing.sm,
},
pastTestsToggleText: { fontSize: Typography.xs, color: Colors.textMuted, fontWeight: Typography.medium },
  quizButton: {
  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
  backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: Spacing.md,
},
  quizButtonText: { fontSize: Typography.base, fontWeight: Typography.semibold, color: '#fff' },
  materialsHint: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: -Spacing.xs, marginBottom: Spacing.xs },
  reminderRow: {
    ...CardBase,
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md,
  },
  reminderIcon: {
    width: 40, height: 40, borderRadius: Radius.full, backgroundColor: Colors.primaryMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  reminderEmptyState: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    borderRadius: Radius.lg, padding: Spacing.md, backgroundColor: Colors.card,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xl },
})