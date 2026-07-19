// app/(tabs)/study.tsx

import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator
} from 'react-native'
import { useState }    from 'react'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { router }      from 'expo-router'
import { Colors, Spacing, Radius, Typography, CardBase } from '@/constants/theme'
import { useSession }  from '@/hooks/useSession'
import { useDashboard } from '@/hooks/useDashboard'
import QuickQuizModal  from '@/components/modals/quickQuizModal'

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
function getScoreColor(score: number): string {
  if (score >= 85) return Colors.success
  if (score >= 70) return Colors.warning
  return Colors.error
}

function getDaysColor(days: number): string {
  if (days <= 3) return Colors.error
  return Colors.warning
}

function getDaysLabel(days: number): string {
  if (days === 1) return 'Tomorrow'
  return `${days} days`
}

// ─────────────────────────────────────────
// SECTION LABEL
// ─────────────────────────────────────────
function SectionLabel({ title }: { title: string }) {
  return <Text style={styles.sectionLabel}>{title}</Text>
}

// ─────────────────────────────────────────
// TODAY'S QUIZ
// ─────────────────────────────────────────
function TodaysQuiz({
  data
}: { data: ReturnType<typeof useDashboard>['data'] }) {
  if (!data || data.today_courses.length === 0) return null

  const total     = data.today_courses.reduce((s, c) => s + c.questions, 0)
  const completed = data.today_courses
    .filter(c => c.done)
    .reduce((s, c) => s + c.questions, 0)
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <View style={styles.section}>
      <View style={styles.todayHeader}>
        <SectionLabel title="TODAY'S QUIZ" />
        <Text style={styles.todayCount}>
          {completed}/{total} questions
        </Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct}%` }]} />
      </View>

      {/* Course rows */}
      <View style={styles.list}>
        {data.today_courses.map((course, index) => (
          <TouchableOpacity
            key={course.lesson_id}
            style={[
              styles.row,
              index < data.today_courses.length - 1 && styles.rowBorder,
            ]}
            activeOpacity={course.done ? 1 : 0.8}
            disabled={course.done}
            onPress={() => router.push({
              pathname: '/study/[id]',
              params: {
                id:    course.lesson_id,
                mode:  'lesson',
                title: course.title,
              },
            })}
          >
            <Text style={styles.rowEmoji}>{course.emoji}</Text>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>{course.title}</Text>
              <Text style={styles.rowMeta}>{course.questions} questions</Text>
            </View>
            {course.done ? (
              <View style={styles.doneRight}>
                <Ionicons name="checkmark" size={14} color={Colors.success} />
                <Text style={styles.doneScore}>{course.score}%</Text>
              </View>
            ) : (
              <Ionicons
                name="chevron-forward"
                size={16}
                color={Colors.textMuted}
              />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

// ─────────────────────────────────────────
// PRACTICE
// ─────────────────────────────────────────
function PracticeSection({
  mistakesCount,
  onQuickQuiz,
}: {
  mistakesCount: number
  onQuickQuiz:   () => void
}) {
  return (
    <View style={styles.section}>
      <SectionLabel title="PRACTICE" />
      <View style={styles.list}>
        <TouchableOpacity
          style={[styles.row, styles.rowBorder]}
          onPress={onQuickQuiz}
          activeOpacity={0.8}
        >
          <View style={styles.practiceIcon}>
            <MaterialCommunityIcons
              name="creation"
              size={20}
              color={Colors.textSecondary}
            />
          </View>
          <View style={styles.rowInfo}>
            <Text style={styles.rowTitle}>Quick Quiz</Text>
            <Text style={styles.rowMeta}>Random questions</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.row}
          onPress={() => router.push({
            pathname: '/study/[id]',
            params: {
              id:    'review',
              mode:  'review',
              title: 'Review Mistakes',
            },
          })}
          activeOpacity={0.8}
        >
          <View style={styles.practiceIcon}>
            <Ionicons name="refresh" size={20} color={Colors.textSecondary} />
          </View>
          <View style={styles.rowInfo}>
            <Text style={styles.rowTitle}>Review Mistakes</Text>
            <Text style={styles.rowMeta}>
              {mistakesCount > 0
                ? `${mistakesCount} to review`
                : 'No mistakes yet'
              }
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ─────────────────────────────────────────
// PREP FOR TESTS
// ─────────────────────────────────────────
function PrepForTests({
  data
}: { data: ReturnType<typeof useDashboard>['data'] }) {
  if (!data || data.upcoming_exams.length === 0) return null

  return (
    <View style={styles.section}>
      <SectionLabel title="PREP FOR TESTS" />
      <View style={styles.list}>
        {data.upcoming_exams.slice(0, 3).map((exam, index) => (
          <TouchableOpacity
            key={exam.id}
            style={[
              styles.row,
              index < Math.min(data.upcoming_exams.length, 3) - 1
                && styles.rowBorder,
            ]}
            activeOpacity={0.8}
            onPress={() => router.push({
              pathname: '/study/[id]',
              params: {
                id:    exam.id,
                mode:  'practice',
                title: exam.title,
              },
            })}
          >
            <Text style={styles.rowEmoji}>{exam.emoji}</Text>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>{exam.title}</Text>
              <Text style={styles.rowMeta}>{exam.course}</Text>
            </View>
            <Text style={[
              styles.testDays,
              { color: getDaysColor(exam.days_left) }
            ]}>
              {getDaysLabel(exam.days_left)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

// ─────────────────────────────────────────
// RECENT SESSIONS
// ─────────────────────────────────────────
function RecentSessions({
  data
}: { data: ReturnType<typeof useDashboard>['data'] }) {
  if (!data || data.recent_sessions.length === 0) return null

  return (
    <View style={styles.section}>
      <SectionLabel title="RECENT SESSIONS" />
      <View style={styles.list}>
        {data.recent_sessions.slice(0, 5).map((session, index) => (
          <View
            key={session.id}
            style={[
              styles.sessionRow,
              index < Math.min(data.recent_sessions.length, 5) - 1
                && styles.rowBorder,
            ]}
          >
            <View style={styles.sessionLeft}>
              <Text style={styles.rowTitle}>{session.title}</Text>
              <Text style={styles.rowMeta}>
                {session.course} · {session.when}
              </Text>
            </View>
            <View style={styles.sessionRight}>
              <Text style={styles.sessionQ}>{session.questions} Q</Text>
              <Text style={[
                styles.sessionScore,
                { color: getScoreColor(session.score) }
              ]}>
                {session.score}%
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}

// ─────────────────────────────────────────
// THIS WEEK
// ─────────────────────────────────────────
function ThisWeek({
  data
}: { data: ReturnType<typeof useDashboard>['data'] }) {
  if (!data) return null

  const { questions, accuracy, study_time } = data.week_stats

  if (questions === 0) return null

  return (
    <View style={styles.section}>
      <SectionLabel title="THIS WEEK" />
      <View style={styles.weekRow}>
        <View style={styles.weekStat}>
          <Text style={styles.weekValue}>{questions}</Text>
          <Text style={styles.weekLabel}>Questions</Text>
        </View>
        <View style={styles.weekStat}>
          <Text style={styles.weekValue}>{accuracy}%</Text>
          <Text style={styles.weekLabel}>Accuracy</Text>
        </View>
        <View style={styles.weekStat}>
          <Text style={styles.weekValue}>{study_time}</Text>
          <Text style={styles.weekLabel}>Study Time</Text>
        </View>
      </View>
    </View>
  )
}

// ─────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────
function EmptyStudy() {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyEmoji}>🧠</Text>
      <Text style={styles.emptyTitle}>Nothing to study yet</Text>
      <Text style={styles.emptySub}>
        Create a course and upload notes to generate your first quiz.
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => router.push('/(tabs)/courses')}
        activeOpacity={0.8}
      >
        <Text style={styles.emptyButtonText}>Go to Courses</Text>
      </TouchableOpacity>
    </View>
  )
}

// ─────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────
export default function StudyScreen() {
  const { user }                     = useSession()
  const { data, loading }            = useDashboard(user?.id ?? null)
  const [showQuickQuiz, setShowQuickQuiz] = useState(false)

  // Count mistakes from recent sessions where score < 80%
  const mistakesCount = data?.recent_sessions.filter(
    s => s.score < 80
  ).length ?? 0

  if (loading) return (
    <View style={[styles.root, styles.center]}>
      <ActivityIndicator color={Colors.primary} size="large" />
    </View>
  )

  const hasContent = data && (
    data.today_courses.length > 0 ||
    data.recent_sessions.length > 0
  )

  return (
    <>
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Study</Text>
          <Text style={styles.headerSub}>
            Practice and prepare for your tests
          </Text>
        </View>

        {!hasContent ? (
          <EmptyStudy />
        ) : (
          <>
            <TodaysQuiz data={data} />
            <PracticeSection
              mistakesCount={mistakesCount}
              onQuickQuiz={() => setShowQuickQuiz(true)}
            />
            <PrepForTests data={data} />
            <RecentSessions data={data} />
            <ThisWeek data={data} />
          </>
        )}
      </ScrollView>

      <QuickQuizModal
        visible={showQuickQuiz}
        onClose={() => setShowQuickQuiz(false)}
      />
    </>
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
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
  },
  container: {
    paddingHorizontal: Spacing.base,
    paddingTop:        Spacing.xl + 32,
    paddingBottom:     Spacing.xxxl,
    gap:               Spacing.xl,
  },

  // Header
  header:    { gap: 4 },
  headerTitle: {
    fontSize:   Typography.xxl,
    fontWeight: Typography.bold,
    color:      Colors.textPrimary,
  },
  headerSub: {
    fontSize: Typography.sm,
    color:    Colors.textSecondary,
  },

  // Section
  section:      { gap: Spacing.md },
  sectionLabel: {
    fontSize:      Typography.xs,
    fontWeight:    Typography.bold,
    color:         Colors.textSecondary,
    letterSpacing: 1,
  },

  // Today Header
  todayHeader: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
  todayCount: {
    fontSize: Typography.xs,
    color:    Colors.textMuted,
  },

  // Progress
  progressTrack: {
    height:          3,
    backgroundColor: Colors.progressTrack,
    borderRadius:    Radius.full,
    overflow:        'hidden',
    marginTop:       -Spacing.xs,
  },
  progressFill: {
    height:          3,
    backgroundColor: Colors.primary,
    borderRadius:    Radius.full,
  },

  // List
  list: {
    borderTopWidth: 1,
    borderTopColor: Colors.border + '66',
  },

  // Row
  row: {
    flexDirection:   'row',
    alignItems:      'center',
    paddingVertical: Spacing.md,
    gap:             Spacing.md,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + '66',
  },
  rowEmoji: { fontSize: 24 },
  rowInfo:  { flex: 1 },
  rowTitle: {
    fontSize:   Typography.base,
    fontWeight: Typography.medium,
    color:      Colors.textPrimary,
  },
  rowMeta: {
    fontSize:  Typography.xs,
    color:     Colors.textMuted,
    marginTop: 2,
  },

  // Done
  doneRight: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           4,
  },
  doneScore: {
    fontSize:   Typography.sm,
    fontWeight: Typography.semibold,
    color:      Colors.success,
  },

  // Practice
  practiceIcon: {
    width:           36,
    height:          36,
    borderRadius:    Radius.md,
    backgroundColor: Colors.cardElevated,
    alignItems:      'center',
    justifyContent:  'center',
  },

  // Test days
  testDays: {
    fontSize:   Typography.sm,
    fontWeight: Typography.semibold,
  },

  // Sessions
  sessionRow: {
    flexDirection:   'row',
    alignItems:      'center',
    paddingVertical: Spacing.md,
  },
  sessionLeft:  { flex: 1 },
  sessionRight: {
    alignItems: 'flex-end',
    gap:        2,
  },
  sessionQ: {
    fontSize: Typography.xs,
    color:    Colors.textMuted,
  },
  sessionScore: {
    fontSize:   Typography.sm,
    fontWeight: Typography.bold,
  },

  // This Week
  weekRow: {
    flexDirection: 'row',
    gap:           Spacing.xl,
  },
  weekStat:  { gap: 4 },
  weekValue: {
    fontSize:   Typography.xxl,
    fontWeight: Typography.bold,
    color:      Colors.textPrimary,
  },
  weekLabel: {
    fontSize: Typography.xs,
    color:    Colors.textSecondary,
  },

  // Empty
  emptyState: {
    alignItems: 'center',
    paddingTop: Spacing.xxxl,
    gap:        Spacing.md,
  },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: {
    fontSize:   Typography.lg,
    fontWeight: Typography.bold,
    color:      Colors.textPrimary,
  },
  emptySub: {
    fontSize:  Typography.sm,
    color:     Colors.textSecondary,
    textAlign: 'center',
  },
  emptyButton: {
    backgroundColor:   Colors.primary,
    borderRadius:      Radius.full,
    paddingVertical:   Spacing.sm,
    paddingHorizontal: Spacing.xl,
    marginTop:         Spacing.sm,
  },
  emptyButtonText: {
    fontSize:   Typography.sm,
    fontWeight: Typography.semibold,
    color:      Colors.textInverse,
  },
})