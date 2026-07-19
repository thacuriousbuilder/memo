

import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, LayoutAnimation, Platform, UIManager,
  Dimensions, ActivityIndicator
} from 'react-native'
import { useState }    from 'react'
import { router }      from 'expo-router'
import { Ionicons }    from '@expo/vector-icons'
import { Colors, Spacing, Radius, Typography, CardBase } from '@/constants/theme'
import { useSession }  from '@/hooks/useSession'
import { useDashboard, TodayCourse, UpcomingExam, RecentSession } from '@/hooks/useDashboard'

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true)
}

// ─────────────────────────────────────────
// WEEKLY SCHEDULE CONSTANTS
// ─────────────────────────────────────────
const { width }    = Dimensions.get('window')
const SIDE_PADDING = Spacing.base * 2
const TIME_COL_W   = 44
const COL_W        = (width - SIDE_PADDING - TIME_COL_W) / 7
const ROW_H        = 48

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const TIME_SLOTS = [
  '6AM', '7AM', '8AM', '9AM', '10AM', '11AM',
  '12PM', '1PM', '2PM', '3PM', '4PM', '5PM',
  '6PM', '7PM', '8PM', '9PM',
]

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
function getDaysLabel(daysLeft: number): string {
  if (daysLeft === 0) return 'Today'
  if (daysLeft === 1) return 'Tomorrow'
  return `${daysLeft} days`
}

function getDaysColor(daysLeft: number): string {
  if (daysLeft <= 3) return Colors.error
  if (daysLeft <= 7) return Colors.warning
  return Colors.textMuted
}

// ─────────────────────────────────────────
// NEXT UP TODAY
// ─────────────────────────────────────────
function NextUpCard({ data }: { data: ReturnType<typeof useDashboard>['data'] }) {
  if (!data?.next_up) return null

  const item        = data.next_up
  const total       = data.today_courses.length
  const done        = data.today_courses.filter(c => c.done).length
  const pct         = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <View style={styles.dot} />
          <Text style={styles.sectionTitle}>NEXT UP TODAY</Text>
        </View>
      </View>

      <View style={styles.nextCard}>
        <View style={styles.nextCardHeader}>
          <Text style={styles.nextEmoji}>{item.course_emoji}</Text>
          <View style={styles.nextInfo}>
            <Text style={styles.nextTitle}>{item.title}</Text>
            <Text style={styles.nextDesc}>{item.course_title}</Text>
          </View>
        </View>

        <Text style={styles.nextMeta}>
          {item.questions > 0
            ? `${item.questions} questions`
            : 'No questions yet'
          }
        </Text>

        <TouchableOpacity
          style={styles.startButton}
          activeOpacity={0.8}
          onPress={() => router.push({
            pathname: '/study/[id]',
            params: {
              id:    item.id,
              mode:  item.mode,
              title: item.title,
            },
          })}
        >
          <Text style={styles.startButtonText}>Start</Text>
        </TouchableOpacity>

        {total > 0 && (
          <View style={styles.progressRow}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${pct}%` }]} />
            </View>
            <Text style={styles.progressLabel}>
              {done} of {total} done
            </Text>
          </View>
        )}
      </View>
    </View>
  )
}

// ─────────────────────────────────────────
// LATER TODAY
// ─────────────────────────────────────────
function LaterTodaySection({
  courses,
  nextUpId,
}: {
  courses:   TodayCourse[]
  nextUpId?: string
}) {
  const [expanded, setExpanded] = useState(true)

  // Exclude the next up lesson
  const later = courses.filter(c => c.lesson_id !== nextUpId)

  if (later.length === 0) return null

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setExpanded(prev => !prev)
  }

  return (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={toggle}
        activeOpacity={0.8}
      >
        <Text style={styles.sectionTitle}>LATER TODAY</Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={Colors.textMuted}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.list}>
          {later.map((item, index) => (
            <TouchableOpacity
              key={item.lesson_id}
              style={[
                styles.row,
                index < later.length - 1 && styles.rowBorder,
              ]}
              activeOpacity={item.done ? 1 : 0.8}
              disabled={item.done}
              onPress={() => router.push({
                pathname: '/study/[id]',
                params: {
                  id:    item.lesson_id,
                  mode:  'lesson',
                  title: item.title,
                },
              })}
            >
              <Text style={[
                styles.rowEmoji,
                item.done && { opacity: 0.4 },
              ]}>
                {item.emoji}
              </Text>
              <View style={styles.rowInfo}>
                <Text style={[
                  styles.rowTitle,
                  item.done && styles.doneText,
                ]}>
                  {item.title}
                </Text>
                {!item.done && item.questions > 0 && (
                  <Text style={styles.rowMeta}>
                    {item.questions} questions
                  </Text>
                )}
              </View>
              {item.done ? (
                <Ionicons name="checkmark" size={20} color={Colors.success} />
              ) : (
                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  )
}

// ─────────────────────────────────────────
// UPCOMING TESTS
// ─────────────────────────────────────────
function UpcomingTestsSection({ exams }: { exams: UpcomingExam[] }) {
  const [expanded, setExpanded] = useState(false)

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setExpanded(prev => !prev)
  }

  const urgentCount = exams.filter(e => e.days_left <= 3).length

  if (exams.length === 0) return null

  return (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={toggle}
        activeOpacity={0.8}
      >
        <Text style={styles.sectionTitle}>UPCOMING TESTS</Text>
        <View style={styles.sectionHeaderRight}>
          {urgentCount > 0 && <View style={styles.urgentDot} />}
          <Text style={styles.sectionCount}>{exams.length} total</Text>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={Colors.textMuted}
          />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.list}>
          {exams.map((exam, index) => (
            <View
              key={exam.id}
              style={[
                styles.row,
                index < exams.length - 1 && styles.rowBorder,
              ]}
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
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

// ─────────────────────────────────────────
// WEEKLY SCHEDULE
// ─────────────────────────────────────────
function WeeklyScheduleSection() {
  const [expanded, setExpanded] = useState(true)

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setExpanded(prev => !prev)
  }

  return (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={toggle}
        activeOpacity={0.8}
      >
        <View style={styles.sectionHeaderLeft}>
          <Ionicons
            name="calendar-outline"
            size={14}
            color={Colors.textSecondary}
          />
          <Text style={[styles.sectionTitle, { marginLeft: Spacing.xs }]}>
            WEEKLY SCHEDULE
          </Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={Colors.textMuted}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.calendarCard}>
          <View style={styles.calendarHeader}>
            <View style={{ width: TIME_COL_W }} />
            {DAY_LABELS.map((day, i) => (
              <View key={i} style={[styles.calendarDayCol, { width: COL_W }]}>
                <Text style={styles.calendarDayText}>{day}</Text>
              </View>
            ))}
          </View>
          <View style={styles.calendarDivider} />
          <ScrollView
            style={styles.calendarScroll}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            {TIME_SLOTS.map((time, timeIdx) => (
              <View key={time} style={styles.calendarRow}>
                <View style={styles.timeLabel}>
                  <Text style={styles.timeLabelText}>{time}</Text>
                </View>
                {DAY_LABELS.map((_, dayIdx) => (
                  <View
                    key={dayIdx}
                    style={[
                      styles.calendarCell,
                      { width: COL_W },
                      dayIdx > 0 && styles.calendarCellBorder,
                    ]}
                  />
                ))}
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  )
}

// ─────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────
function EmptyHome() {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyEmoji}>📚</Text>
      <Text style={styles.emptyTitle}>Nothing scheduled yet</Text>
      <Text style={styles.emptySub}>
        Create a course and upload notes to get started.
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
export default function HomeScreen() {
  const { user }              = useSession()
  const { data, loading, error } = useDashboard(user?.id ?? null)

  if (loading) return (
    <View style={[styles.root, styles.center]}>
      <ActivityIndicator color={Colors.primary} size="large" />
    </View>
  )

  const hasContent = data && (
    data.next_up ||
    data.today_courses.length > 0 ||
    data.upcoming_exams.length > 0
  )

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Today's Plan</Text>
        <View style={styles.streakBadge}>
          <Text style={styles.streakFire}>🔥</Text>
          <Text style={styles.streakCount}>{data?.streak ?? 0}</Text>
        </View>
      </View>

      {!hasContent ? (
        <EmptyHome />
      ) : (
        <>
          <NextUpCard data={data} />

          <LaterTodaySection
            courses={data?.today_courses ?? []}
            nextUpId={data?.next_up?.id}
          />

          <UpcomingTestsSection
            exams={data?.upcoming_exams ?? []}
          />

          <WeeklyScheduleSection />
        </>
      )}
    </ScrollView>
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
  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
  headerTitle: {
    fontSize:   Typography.xxl,
    fontWeight: Typography.bold,
    color:      Colors.textPrimary,
  },
  streakBadge: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               4,
    backgroundColor:   Colors.card,
    borderRadius:      Radius.full,
    paddingVertical:   6,
    paddingHorizontal: Spacing.md,
    borderWidth:       1,
    borderColor:       Colors.border,
  },
  streakFire:  { fontSize: 16 },
  streakCount: {
    fontSize:   Typography.sm,
    fontWeight: Typography.bold,
    color:      Colors.textPrimary,
  },

  // Section
  section: { gap: Spacing.md },
  sectionHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.xs,
  },
  sectionHeaderRight: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.sm,
  },
  sectionTitle: {
    fontSize:      Typography.xs,
    fontWeight:    Typography.bold,
    color:         Colors.textSecondary,
    letterSpacing: 1,
  },
  sectionCount: {
    fontSize: Typography.xs,
    color:    Colors.textMuted,
  },
  dot: {
    width:           6,
    height:          6,
    borderRadius:    3,
    backgroundColor: Colors.primary,
  },
  urgentDot: {
    width:           6,
    height:          6,
    borderRadius:    3,
    backgroundColor: Colors.error,
  },

  // Next Up
  nextCard: {
    ...CardBase,
    padding: Spacing.base,
    gap:     Spacing.md,
  },
  nextCardHeader: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.md,
  },
  nextEmoji: { fontSize: 36 },
  nextInfo:  { flex: 1 },
  nextTitle: {
    fontSize:   Typography.xl,
    fontWeight: Typography.bold,
    color:      Colors.textPrimary,
  },
  nextDesc: {
    fontSize:  Typography.sm,
    color:     Colors.textSecondary,
    marginTop: 2,
  },
  nextMeta: {
    fontSize: Typography.sm,
    color:    Colors.textMuted,
  },
  startButton: {
    backgroundColor: Colors.primary,
    borderRadius:    Radius.md,
    paddingVertical: Spacing.md,
    alignItems:      'center',
  },
  startButtonText: {
    fontSize:   Typography.base,
    fontWeight: Typography.semibold,
    color:      Colors.textInverse,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.md,
  },
  progressTrack: {
    flex:            1,
    height:          4,
    backgroundColor: Colors.progressTrack,
    borderRadius:    Radius.full,
    overflow:        'hidden',
  },
  progressFill: {
    height:          4,
    backgroundColor: Colors.primary,
    borderRadius:    Radius.full,
  },
  progressLabel: {
    fontSize:   Typography.xs,
    color:      Colors.textMuted,
    flexShrink: 0,
  },

  // List
  list: {
    borderTopWidth: 1,
    borderTopColor: Colors.border + '66',
  },
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
  doneText: {
    textDecorationLine: 'line-through',
    color:              Colors.textMuted,
  },
  testDays: {
    fontSize:   Typography.sm,
    fontWeight: Typography.semibold,
  },

  // Calendar
  calendarCard: {
    ...CardBase,
    padding:  Spacing.sm,
    overflow: 'hidden',
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems:    'center',
    paddingBottom: Spacing.sm,
  },
  calendarDayCol:  { alignItems: 'center' },
  calendarDayText: {
    fontSize:   Typography.xs,
    fontWeight: Typography.semibold,
    color:      Colors.textSecondary,
  },
  calendarDivider: {
    height:          1,
    backgroundColor: Colors.border,
    marginBottom:    Spacing.xs,
  },
  calendarScroll: { maxHeight: ROW_H * 8 },
  calendarRow: {
    flexDirection: 'row',
    alignItems:    'center',
    height:        ROW_H,
  },
  timeLabel: {
    width:      TIME_COL_W,
    alignItems: 'flex-start',
    paddingLeft: 2,
  },
  timeLabelText: {
    fontSize: 10,
    color:    Colors.textMuted,
  },
  calendarCell: {
    height:         ROW_H,
    alignItems:     'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border + '44',
  },
  calendarCellBorder: {
    borderLeftWidth: 1,
    borderLeftColor: Colors.border + '44',
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