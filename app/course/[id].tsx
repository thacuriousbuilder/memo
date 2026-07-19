

import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, LayoutAnimation, Platform,
  UIManager, Switch, ActivityIndicator, Alert
} from 'react-native'
import { useState } from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Colors, Spacing, Radius, Typography, CardBase } from '@/constants/theme'
import NewLessonModal  from '@/components/modals/newLessonModal'
import NewSectionModal from '@/components/modals/newSectionModal'
import { useSession }  from '@/hooks/useSession'
import NewExamModal from '@/components/modals/newExamModal'
import { useExams, createExam, deleteExam, getDaysLeft } from '@/hooks/useExams'
import {
  useCourseDetail,
  createSection,
  createLesson,
  SectionWithStatus,
  LessonWithStatus,
} from '@/hooks/useLessons'
import { uploadLessonNoteFromAsset } from '@/hooks/useLessons'

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true)
}

// ─────────────────────────────────────────
// REMINDER CONSTANTS
// ─────────────────────────────────────────
type DayKey = 'M' | 'T' | 'W' | 'Th' | 'F' | 'S' | 'Su'
const DAYS: DayKey[] = ['M', 'T', 'W', 'Th', 'F', 'S', 'Su']
const TIME_SLOTS = [
  '6-8 AM', '8-10 AM', '10-12 PM', '12-2 PM',
  '2-4 PM', '4-6 PM',  '6-8 PM',  '8-10 PM',
]
const PRESETS: { label: string; days: DayKey[] }[] = [
  { label: 'Every day', days: ['M','T','W','Th','F','S','Su'] },
  { label: 'Weekdays',  days: ['M','T','W','Th','F']          },
  { label: 'Weekends',  days: ['S','Su']                      },
]


// ─────────────────────────────────────────
// EXAM COLOR
// ─────────────────────────────────────────
function getExamColor(daysLeft: number): string {
  if (daysLeft <= 3)  return Colors.error
  if (daysLeft <= 7)  return Colors.warning
  return Colors.textSecondary
}

// ─────────────────────────────────────────
// LESSON INDICATOR
// ─────────────────────────────────────────
function LessonIndicator({
  status, index
}: { status: LessonWithStatus['status']; index: number }) {
  if (status === 'passed') return (
    <View style={[styles.indicator, styles.indicatorPassed]}>
      <Ionicons name="checkmark" size={14} color={Colors.success} />
    </View>
  )
  if (status === 'locked') return (
    <View style={[styles.indicator, styles.indicatorLocked]}>
      <Ionicons name="lock-closed" size={12} color={Colors.lockedText} />
    </View>
  )
  return (
    <View style={[styles.indicator, styles.indicatorActive]}>
      <Text style={styles.indicatorNum}>{index + 1}</Text>
    </View>
  )
}

// ─────────────────────────────────────────
// LESSON ROW
// ─────────────────────────────────────────
function LessonRow({
  lesson, index
}: { lesson: LessonWithStatus; index: number }) {
  const isLocked  = lesson.status === 'locked'
  const isActive  = lesson.status === 'in_progress'
  const showPct   = isActive && lesson.progress > 0

  return (
    <TouchableOpacity
      style={[
        styles.lessonRow,
        isLocked && styles.lessonRowLocked,
      ]}
      activeOpacity={isLocked ? 1 : 0.8}
      disabled={isLocked}
      onPress={() => router.push(`/lesson/${lesson.id}`)}
    >
      <LessonIndicator status={lesson.status} index={index} />

      <View style={styles.lessonInfo}>
        <Text style={[
          styles.lessonTitle,
          isLocked && styles.lockedText,
        ]}>
          {lesson.title}
        </Text>
        <View style={styles.lessonMeta}>
          {lesson.sub_lesson_count > 0 && (
            <Text style={[styles.metaText, isLocked && styles.lockedText]}>
              {lesson.sub_lesson_count} sub-lessons
            </Text>
          )}
          {lesson.question_count > 0 && (
            <>
              {lesson.sub_lesson_count > 0 && (
                <Text style={styles.metaDot}>·</Text>
              )}
              <Text style={[styles.metaText, isLocked && styles.lockedText]}>
                {lesson.question_count} questions
              </Text>
            </>
          )}
        </View>
      </View>

      {showPct && (
        <Text style={styles.lessonPct}>{lesson.progress}%</Text>
      )}

      {!isLocked && (
        <Ionicons
          name="chevron-forward"
          size={16}
          color={Colors.textMuted}
        />
      )}
    </TouchableOpacity>
  )
}

// ─────────────────────────────────────────
// GENERATE QUIZ LOCKED CARD
// ─────────────────────────────────────────
function LockedQuizCard({ label, subtitle }: {
  label:    string
  subtitle: string
}) {
  return (
    <View style={styles.lockedQuizCard}>
      <View style={styles.lockedQuizIcon}>
        <Ionicons name="lock-closed" size={16} color={Colors.textMuted} />
      </View>
      <View style={styles.lockedQuizInfo}>
        <Text style={styles.lockedQuizLabel}>{label}</Text>
        <Text style={styles.lockedQuizSub}>{subtitle}</Text>
      </View>
    </View>
  )
}

// ─────────────────────────────────────────
// REMINDER CARD
// ─────────────────────────────────────────
function ReminderCard() {
  const [expanded,     setExpanded]     = useState(false)
  const [enabled,      setEnabled]      = useState(true)
  const [selectedTime, setSelectedTime] = useState('8-10 AM')
  const [selectedDays, setSelectedDays] = useState<DayKey[]>(['M','W','F'])

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setExpanded(prev => !prev)
  }

  const toggleDay = (day: DayKey) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  const activePreset = PRESETS.find(p =>
    p.days.length === selectedDays.length &&
    p.days.every(d => selectedDays.includes(d))
  )

  return (
    <View style={[styles.reminderCard, expanded && styles.reminderCardExpanded]}>
      <TouchableOpacity
        style={styles.reminderHeader}
        onPress={toggleExpand}
        activeOpacity={0.8}
      >
        <View style={styles.reminderIconWrapper}>
          <Ionicons name="notifications-outline" size={18} color={Colors.primary} />
        </View>
        <View style={styles.reminderInfo}>
          <Text style={styles.reminderTitle}>Study Reminders</Text>
          <Text style={styles.reminderSubtitle}>
            {enabled && selectedDays.length > 0
              ? `${selectedTime} • ${selectedDays.join(', ')}`
              : 'Reminders off'
            }
          </Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={setEnabled}
          trackColor={{ false: Colors.border, true: Colors.primary }}
          thumbColor="#fff"
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.reminderExpanded}>
          <View style={styles.expandDivider} />
          <Text style={styles.expandLabel}>Preferred time</Text>
          <View style={styles.timeGrid}>
            {TIME_SLOTS.map(slot => (
              <TouchableOpacity
                key={slot}
                style={[styles.timeChip, selectedTime === slot && styles.timeChipActive]}
                onPress={() => setSelectedTime(slot)}
              >
                <Text style={[
                  styles.timeChipText,
                  selectedTime === slot && styles.timeChipTextActive,
                ]}>
                  {slot}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.expandLabel}>Repeat on</Text>
          <View style={styles.dayRow}>
            {DAYS.map(day => (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dayCircle,
                  selectedDays.includes(day) && styles.dayCircleActive,
                ]}
                onPress={() => toggleDay(day)}
              >
                <Text style={[
                  styles.dayText,
                  selectedDays.includes(day) && styles.dayTextActive,
                ]}>
                  {day === 'Th' ? 'T' : day === 'Su' ? 'S' : day}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.presetRow}>
            {PRESETS.map(preset => (
              <TouchableOpacity
                key={preset.label}
                style={[
                  styles.presetChip,
                  activePreset?.label === preset.label && styles.presetChipActive,
                ]}
                onPress={() => setSelectedDays(preset.days)}
              >
                <Text style={[
                  styles.presetText,
                  activePreset?.label === preset.label && styles.presetTextActive,
                ]}>
                  {preset.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  )
}

// ─────────────────────────────────────────
// UPCOMING TESTS SECTION
// ─────────────────────────────────────────

function UpcomingTestsSection({
  exams,
  onAddTest,
  onDeleteExam,
}: {
  exams:        ReturnType<typeof useExams>['exams']
  onAddTest:    () => void
  onDeleteExam: (id: string) => void
}) {
  return (
    <View style={styles.testsSection}>
      <View style={styles.testsSectionHeader}>
        <Text style={styles.sectionLabel}>UPCOMING TESTS</Text>
        <TouchableOpacity onPress={onAddTest}>
          <Text style={styles.addTestText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {exams.length === 0 ? (
        <TouchableOpacity
          style={styles.addTestEmpty}
          onPress={onAddTest}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color={Colors.textMuted} />
          <Text style={styles.addTestEmptyText}>Add Upcoming Test</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.examList}>
          {exams.map((exam, index) => {
            const color = getExamColor(exam.days_left)
            const dateStr = new Date(exam.exam_date)
              .toLocaleDateString('en-US', {
                month: 'long', day: 'numeric'
              })
            return (
              <TouchableOpacity
                key={exam.id}
                style={[
                  styles.examRow,
                  index < exams.length - 1 && styles.examRowBorder,
                ]}
                onLongPress={() => onDeleteExam(exam.id)}
                activeOpacity={0.8}
              >
                <View style={[
                  styles.examIcon,
                  { backgroundColor: color + '22' }
                ]}>
                  <Ionicons
                    name="document-text"
                    size={18}
                    color={color}
                  />
                </View>
                <View style={styles.examInfo}>
                  <Text style={styles.examTitle}>{exam.title}</Text>
                  <Text style={styles.examDate}>{dateStr}</Text>
                </View>
                <Text style={[styles.examDays, { color }]}>
                  {exam.days_left === 0 ? 'Today'
                    : exam.days_left === 1 ? 'Tomorrow'
                    : `${exam.days_left} days`}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      )}
    </View>
  )
}

// ─────────────────────────────────────────
// SECTION ROW
// ─────────────────────────────────────────
function SectionRow({
  section,
  globalStartIndex,
  onAddLesson,
  onRefetch,
}: {
  section:          SectionWithStatus
  globalStartIndex: number
  onAddLesson:      (sectionId: string) => void
  onRefetch:        () => void
}) {
  const [expanded, setExpanded] = useState(true)

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setExpanded(!expanded)
  }

  const allPassed   = section.lessons.length > 0 &&
    section.lessons.every(l => l.status === 'passed')
  const quizUnlocked = allPassed

  return (
    <View style={styles.sectionBlock}>
      {/* Section Header */}
      <TouchableOpacity
        style={styles.sectionRow}
        onPress={toggle}
        activeOpacity={0.8}
      >
        <Ionicons
          name={expanded ? 'chevron-down' : 'chevron-forward'}
          size={16}
          color={Colors.textMuted}
        />
        <Text style={styles.sectionTitle}>{section.title}</Text>
        <Text style={styles.sectionCount}>
          {section.done_lessons}/{section.total_lessons}
        </Text>
      </TouchableOpacity>

      {/* Expanded Content */}
      {expanded && (
        <View style={styles.sectionContent}>
          {/* Lesson Rows */}
          {section.lessons.map((lesson, idx) => (
            <LessonRow
              key={lesson.id}
              lesson={lesson}
              index={globalStartIndex + idx}
            />
          ))}

          {/* Add Lesson */}
          <TouchableOpacity
            style={styles.addLessonRow}
            onPress={() => onAddLesson(section.id)}
          >
            <Ionicons name="add" size={16} color={Colors.textMuted} />
            <Text style={styles.addLessonText}>Add Lesson</Text>
          </TouchableOpacity>

          {/* Generate Section Quiz */}
          {quizUnlocked ? (
            <TouchableOpacity
              style={styles.generateQuizCard}
              activeOpacity={0.8}
              onPress={() => router.push({
                pathname: '/study/[id]',
                params: {
                  id:    section.id,
                  mode:  'section',
                  title: section.title,
                },
              })}
            >
              <Ionicons name="school" size={16} color={Colors.primary} />
              <View style={styles.lockedQuizInfo}>
                <Text style={[styles.lockedQuizLabel, { color: Colors.primary }]}>
                  Generate All Lessons Quiz
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            <LockedQuizCard
              label="Generate All Lessons Quiz"
              subtitle="Complete every lesson in this section to unlock"
            />
          )}
        </View>
      )}
    </View>
  )
}

// ─────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────
export default function CourseDetailScreen() {
  const { id }   = useLocalSearchParams<{ id: string }>()
  const { user } = useSession()
  const {
    course, loading, error, refetch
  } = useCourseDetail(id ?? null, user?.id ?? null)

  const [showAddSection,  setShowAddSection]  = useState(false)
  const [showAddLesson,   setShowAddLesson]   = useState(false)
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)
  const [uploading,       setUploading]       = useState(false)
  const [showAddExam, setShowAddExam] = useState(false)

const { exams, refetch: refetchExams } = useExams(
  id ?? null,
  user?.id ?? null
)

  const hasNamedSections = course?.sections.some(s => !s.is_default) ?? false

  const allComplete = course?.sections
    .filter(s => !s.is_default)
    .every(s => s.lessons.every(l => l.status === 'passed')) ?? false

  const handleAddSection = async (name: string) => {
    if (!course) return
    await createSection({
      courseId:   course.id,
      title:      name,
      orderIndex: course.sections.length,
    })
    refetch()
  }

  const handleOpenAddLesson = (sectionId: string) => {
    setActiveSectionId(sectionId)
    setShowAddLesson(true)
  }

  const handleCloseAddLesson = () => {
    setShowAddLesson(false)
    setActiveSectionId(null)
  }

  const handleCreateLesson = async (lesson: {
    name: string; files: any[]
  }) => {
    if (!activeSectionId || !user) return
    try {
      setUploading(true)
      const section = course?.sections.find(s => s.id === activeSectionId)
      const lessonId = await createLesson({
        sectionId:  activeSectionId,
        title:      lesson.name,
        orderIndex: section?.lessons.length ?? 0,
      })
      if (lesson.files?.length > 0) {
        for (const asset of lesson.files) {
          await uploadLessonNoteFromAsset({
            userId:   user.id,
            lessonId: lessonId,
            asset,
          })
        }
      }
      refetch()
      handleCloseAddLesson()
    } catch (err: any) {
      Alert.alert('Error', err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleCreateExam = async (params: {
    title:     string
    examType:  string
    examDate:  string
    location?: string
    notes?:    string
  }) => {
    if (!user || !id) return
    await createExam({
      userId:   user.id,
      courseId: id,
      ...params,
    })
    refetchExams()
  }
  const handleDeleteExam = (examId: string) => {
    Alert.alert('Delete Test', 'Remove this test?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text:  'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteExam(examId)
          refetchExams()
        },
      },
    ])
  }
  // Build global lesson index for numbered indicators
  const buildGlobalIndex = () => {
    const map: Record<string, number> = {}
    let idx = 0
    course?.sections
      .filter(s => !s.is_default)
      .forEach(s => {
        s.lessons.forEach(l => {
          map[l.id] = idx++
        })
      })
    return map
  }

  if (loading) return (
    <View style={[styles.root, styles.center]}>
      <ActivityIndicator color={Colors.primary} size="large" />
    </View>
  )

  if (error || !course) return (
    <View style={[styles.root, styles.center]}>
      <Text style={styles.errorText}>{error ?? 'Course not found'}</Text>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.backLink}>← Go Back</Text>
      </TouchableOpacity>
    </View>
  )

  const namedSections   = course.sections.filter(s => !s.is_default)
  const globalIndexMap  = buildGlobalIndex()

  // Track cumulative lesson index per section
  let runningIndex = 0

  return (
    <View style={styles.root}>
      {/* Back */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Ionicons name="chevron-back" size={16} color={Colors.textSecondary} />
        <Text style={styles.backText}>Courses</Text>
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Course Header */}
        <View style={styles.courseHeader}>
          <Text style={styles.courseEmoji}>{course.emoji}</Text>
          <View style={styles.courseHeaderInfo}>
            <Text style={styles.courseTitle}>{course.title}</Text>
            <Text style={styles.courseMeta}>
              {course.done_lessons}/{course.total_lessons} lessons
              {course.total_questions > 0 && ` · ${course.total_questions} questions`}
            </Text>
          </View>
        </View>

        {/* Progress Bar */}
        {course.progress_pct > 0 && (
          <View style={styles.progressTrack}>
            <View style={[
              styles.progressFill,
              { width: `${course.progress_pct}%` }
            ]} />
          </View>
        )}

        {/* Study Reminders */}
        <ReminderCard />

        {/* Upcoming Tests */}
        <UpcomingTestsSection
          exams={exams}
          onAddTest={() => setShowAddExam(true)}
          onDeleteExam={handleDeleteExam}
        />

        {/* No Sections Prompt */}
        {!hasNamedSections && (
          <View style={styles.noSectionPrompt}>
            <Ionicons name="folder-outline" size={32} color={Colors.textMuted} />
            <Text style={styles.noSectionTitle}>No sections yet</Text>
            <Text style={styles.noSectionSubtitle}>
              Create a section to start adding lessons.
            </Text>
            <TouchableOpacity
              style={styles.noSectionButton}
              onPress={() => setShowAddSection(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.noSectionButtonText}>
                Create First Section
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Named Sections */}
        {namedSections.map(section => {
          const startIdx = runningIndex
          runningIndex += section.lessons.length
          return (
            <SectionRow
              key={section.id}
              section={section}
              globalStartIndex={startIdx}
              onAddLesson={handleOpenAddLesson}
              onRefetch={refetch}
            />
          )
        })}

        {/* Add Section */}
        {hasNamedSections && (
          <TouchableOpacity
            style={styles.addSectionRow}
            onPress={() => setShowAddSection(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={18} color={Colors.textMuted} />
            <Text style={styles.addSectionText}>Add Section</Text>
          </TouchableOpacity>
        )}

        {/* Generate All Sections Quiz */}
        {hasNamedSections && (
          allComplete ? (
            <TouchableOpacity
              style={styles.generateQuizCard}
              activeOpacity={0.8}
              onPress={() => router.push({
                pathname: '/study/[id]',
                params: {
                  id:    course.id,
                  mode:  'course',
                  title: `${course.title} — Full Quiz`,
                },
              })}
            >
              <Ionicons name="school" size={16} color={Colors.primary} />
              <View style={styles.lockedQuizInfo}>
                <Text style={[styles.lockedQuizLabel, { color: Colors.primary }]}>
                  Generate All Sections Quiz
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            <LockedQuizCard
              label="Generate All Sections Quiz"
              subtitle="Complete every lesson across all sections to unlock"
            />
          )
        )}
      </ScrollView>

      {/* Uploading Overlay */}
      {uploading && (
        <View style={styles.uploadingOverlay}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.uploadingText}>Creating lesson...</Text>
        </View>
      )}

      <NewLessonModal
        visible={showAddLesson}
        onClose={handleCloseAddLesson}
        onCreate={handleCreateLesson}
      />
      <NewSectionModal
        visible={showAddSection}
        onClose={() => setShowAddSection(false)}
        onCreate={handleAddSection}
      />
      <NewExamModal
      visible={showAddExam}
      onClose={() => setShowAddExam(false)}
      onCreate={handleCreateExam}
    />
    </View>
  )
}

// ─────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: Colors.background,
  },
  center: {
    alignItems:     'center',
    justifyContent: 'center',
    gap:            Spacing.md,
  },
  errorText: {
    fontSize:  Typography.sm,
    color:     Colors.error,
    textAlign: 'center',
  },
  backLink: {
    fontSize: Typography.sm,
    color:    Colors.primary,
  },

  // Back button
  backButton: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               4,
    paddingHorizontal: Spacing.base,
    paddingTop:        Spacing.xl + 32,
    paddingBottom:     Spacing.md,
  },
  backText: {
    fontSize:   Typography.sm,
    color:      Colors.textSecondary,
    fontWeight: Typography.medium,
  },

  container: {
    paddingHorizontal: Spacing.base,
    paddingBottom:     Spacing.xxxl,
    gap:               Spacing.xl,
  },

  // Course Header
  courseHeader: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.md,
  },
  courseEmoji: { fontSize: 40 },
  courseHeaderInfo: { flex: 1 },
  courseTitle: {
    fontSize:   Typography.xxl,
    fontWeight: Typography.bold,
    color:      Colors.textPrimary,
  },
  courseMeta: {
    fontSize:  Typography.sm,
    color:     Colors.textSecondary,
    marginTop: 4,
  },

  // Progress
  progressTrack: {
    height:          4,
    backgroundColor: Colors.progressTrack,
    borderRadius:    Radius.full,
    overflow:        'hidden',
    marginTop:       -Spacing.sm,
  },
  progressFill: {
    height:          4,
    backgroundColor: Colors.primary,
    borderRadius:    Radius.full,
  },

  // Reminder Card
  reminderCard:         { ...CardBase, overflow: 'hidden' },
  reminderCardExpanded: { borderColor: Colors.primaryBorder },
  reminderHeader: {
    flexDirection: 'row',
    alignItems:    'center',
    padding:       Spacing.md,
    gap:           Spacing.md,
  },
  reminderIconWrapper: {
    width:           40,
    height:          40,
    borderRadius:    Radius.full,
    backgroundColor: Colors.primaryMuted,
    alignItems:      'center',
    justifyContent:  'center',
  },
  reminderInfo: { flex: 1 },
  reminderTitle: {
    fontSize:   Typography.base,
    fontWeight: Typography.semibold,
    color:      Colors.textPrimary,
  },
  reminderSubtitle: {
    fontSize:  Typography.xs,
    color:     Colors.textSecondary,
    marginTop: 2,
  },
  reminderExpanded: {
    paddingHorizontal: Spacing.md,
    paddingBottom:     Spacing.md,
    gap:               Spacing.md,
  },
  expandDivider: { height: 1, backgroundColor: Colors.border },
  expandLabel: {
    fontSize:   Typography.sm,
    fontWeight: Typography.medium,
    color:      Colors.textPrimary,
  },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  timeChip: {
    paddingVertical:   Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius:      Radius.md,
    backgroundColor:   Colors.cardElevated,
    borderWidth:       1,
    borderColor:       Colors.border,
  },
  timeChipActive:     { backgroundColor: Colors.primary, borderColor: Colors.primary },
  timeChipText:       { fontSize: Typography.xs, color: Colors.textSecondary },
  timeChipTextActive: { color: '#fff', fontWeight: Typography.semibold },
  dayRow:             { flexDirection: 'row', gap: Spacing.sm },
  dayCircle: {
    width:           36,
    height:          36,
    borderRadius:    Radius.full,
    backgroundColor: Colors.cardElevated,
    borderWidth:     1,
    borderColor:     Colors.border,
    alignItems:      'center',
    justifyContent:  'center',
  },
  dayCircleActive:  { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dayText:          { fontSize: Typography.xs, fontWeight: Typography.semibold, color: Colors.textSecondary },
  dayTextActive:    { color: '#fff' },
  presetRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  presetChip: {
    paddingVertical:   6,
    paddingHorizontal: Spacing.md,
    borderRadius:      Radius.full,
    backgroundColor:   Colors.cardElevated,
    borderWidth:       1,
    borderColor:       Colors.border,
  },
  presetChipActive: { backgroundColor: Colors.primaryMuted, borderColor: Colors.primary },
  presetText:       { fontSize: Typography.xs, color: Colors.textSecondary },
  presetTextActive: { color: Colors.primary, fontWeight: Typography.medium },

  // Upcoming Tests
  testsSection:      { gap: Spacing.sm },
  testsSectionHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    fontSize:      Typography.xs,
    fontWeight:    Typography.bold,
    color:         Colors.textSecondary,
    letterSpacing: 1,
  },
  addTestText: {
    fontSize:   Typography.sm,
    fontWeight: Typography.medium,
    color:      Colors.primary,
  },
  examList: {
    ...CardBase,
    overflow: 'hidden',
    padding:  0,
  },
  examRow: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingVertical:   Spacing.md,
    paddingHorizontal: Spacing.base,
    gap:               Spacing.md,
  },
  examRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  examIcon: {
    width:          40,
    height:          40,
    borderRadius:   Radius.md,
    alignItems:     'center',
    justifyContent: 'center',
  },
  examInfo:  { flex: 1 },
  examTitle: {
    fontSize:   Typography.base,
    fontWeight: Typography.semibold,
    color:      Colors.textPrimary,
  },
  examDate: {
    fontSize:  Typography.xs,
    color:     Colors.textSecondary,
    marginTop: 2,
  },
  examDays: {
    fontSize:   Typography.sm,
    fontWeight: Typography.semibold,
  },
  addTestEmpty: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             Spacing.sm,
    borderWidth:     1,
    borderColor:     Colors.border,
    borderStyle:     'dashed',
    borderRadius:    Radius.lg,
    paddingVertical: Spacing.md,
  },
  addTestEmptyText: {
    fontSize: Typography.sm,
    color:    Colors.textMuted,
  },

  // Section Block
  sectionBlock: { gap: Spacing.sm },
  sectionRow: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  sectionTitle: {
    flex:          1,
    fontSize:      Typography.xs,
    fontWeight:    Typography.bold,
    color:         Colors.textSecondary,
    letterSpacing: 1,
  },
  sectionCount: {
    fontSize:   Typography.xs,
    fontWeight: Typography.medium,
    color:      Colors.textMuted,
  },
  sectionContent: { gap: Spacing.xs },

  // Lesson Row
  lessonRow: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingVertical:   Spacing.md,
    gap:               Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + '44',
  },
  lessonRowLocked: { opacity: 0.5 },
  indicator: {
    width:          32,
    height:         32,
    borderRadius:   Radius.full,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },
  indicatorPassed: {
    backgroundColor: Colors.successMuted,
    borderWidth:     1,
    borderColor:     Colors.success,
  },
  indicatorActive: {
    backgroundColor: Colors.primaryMuted,
    borderWidth:     1,
    borderColor:     Colors.primary,
  },
  indicatorLocked: {
    backgroundColor: Colors.cardElevated,
    borderWidth:     1,
    borderColor:     Colors.border,
  },
  indicatorNum: {
    fontSize:   Typography.xs,
    fontWeight: Typography.bold,
    color:      Colors.primary,
  },
  lessonInfo:  { flex: 1 },
  lessonTitle: {
    fontSize:   Typography.base,
    fontWeight: Typography.medium,
    color:      Colors.textPrimary,
  },
  lessonMeta: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           4,
    marginTop:     2,
  },
  metaText: {
    fontSize: Typography.xs,
    color:    Colors.textMuted,
  },
  metaDot: {
    fontSize: Typography.xs,
    color:    Colors.textMuted,
  },
  lessonPct: {
    fontSize:   Typography.sm,
    fontWeight: Typography.semibold,
    color:      Colors.primary,
  },
  lockedText: { color: Colors.lockedText },

  // Add Lesson Row
  addLessonRow: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             Spacing.xs,
    paddingVertical: Spacing.md,
  },
  addLessonText: {
    fontSize: Typography.sm,
    color:    Colors.textMuted,
  },

  // Generate Quiz Cards
  lockedQuizCard: {
    ...CardBase,
    flexDirection: 'row',
    alignItems:    'center',
    padding:       Spacing.md,
    gap:           Spacing.md,
    opacity:       0.6,
  },
  lockedQuizIcon: {
    width:          40,
    height:         40,
    borderRadius:   Radius.md,
    backgroundColor: Colors.cardElevated,
    alignItems:     'center',
    justifyContent: 'center',
  },
  lockedQuizInfo: { flex: 1 },
  lockedQuizLabel: {
    fontSize:   Typography.sm,
    fontWeight: Typography.medium,
    color:      Colors.textSecondary,
  },
  lockedQuizSub: {
    fontSize:  Typography.xs,
    color:     Colors.textMuted,
    marginTop: 2,
  },
  generateQuizCard: {
    ...CardBase,
    flexDirection: 'row',
    alignItems:    'center',
    padding:       Spacing.md,
    gap:           Spacing.md,
    borderColor:   Colors.primaryBorder,
  },

  // Add Section
  addSectionRow: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             Spacing.sm,
    borderWidth:     1,
    borderColor:     Colors.border,
    borderStyle:     'dashed',
    borderRadius:    Radius.lg,
    paddingVertical: Spacing.md,
  },
  addSectionText: {
    fontSize:   Typography.sm,
    fontWeight: Typography.medium,
    color:      Colors.textMuted,
  },

  // No Section Prompt
  noSectionPrompt: {
    ...CardBase,
    alignItems:        'center',
    paddingVertical:   Spacing.xl,
    paddingHorizontal: Spacing.xl,
    gap:               Spacing.md,
    borderStyle:       'dashed',
  },
  noSectionTitle: {
    fontSize:   Typography.base,
    fontWeight: Typography.semibold,
    color:      Colors.textSecondary,
  },
  noSectionSubtitle: {
    fontSize:   Typography.sm,
    color:      Colors.textMuted,
    textAlign:  'center',
    lineHeight: Typography.sm * 1.6,
  },
  noSectionButton: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               Spacing.xs,
    backgroundColor:   Colors.primary,
    borderRadius:      Radius.full,
    paddingVertical:   Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginTop:         Spacing.xs,
  },
  noSectionButtonText: {
    fontSize:   Typography.sm,
    fontWeight: Typography.semibold,
    color:      '#fff',
  },

  // Uploading Overlay
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             Spacing.md,
  },
  uploadingText: {
    fontSize:  Typography.sm,
    color:     Colors.textPrimary,
    textAlign: 'center',
  },
})