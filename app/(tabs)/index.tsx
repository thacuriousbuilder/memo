import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, LayoutAnimation, Platform, UIManager,
  Dimensions, ActivityIndicator, Alert
} from 'react-native'
import { useState }    from 'react'
import { router }      from 'expo-router'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { Colors, Spacing, Radius, Typography, CardBase } from '@/constants/theme'
import { useSession }  from '@/hooks/useSession'
import { useDashboard, PlanItem, UpcomingExam, WeekPlanItem, EndedAutoPlan, NeedsMaterialsPlan } from '@/hooks/useDashboard'
import { renewAutoPlan } from '@/hooks/useReminders'
import { buildSessionRoute } from '@/lib/sessionRouting'

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
  '12AM', '1AM', '2AM', '3AM', '4AM', '5AM',
  '6AM', '7AM', '8AM', '9AM', '10AM', '11AM',
  '12PM', '1PM', '2PM', '3PM', '4PM', '5PM',
  '6PM', '7PM', '8PM', '9PM', '10PM', '11PM'
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
// SHARED: start a plan item
// Routing itself lives in lib/sessionRouting.ts (buildSessionRoute), shared
// with the notification-tap cold-start path so the two can't drift.
// ─────────────────────────────────────────
async function startPlanItem(item: PlanItem) {
  await buildSessionRoute(item)
}
// ─────────────────────────────────────────
// SMART BADGE — marks a card/row as an Auto ("Smart") plan
// ─────────────────────────────────────────
function SmartBadge() {
  return (
    <View style={styles.smartBadge}>
      <Ionicons name="sparkles" size={10} color={Colors.primary} />
      <Text style={styles.smartBadgeText}>Smart</Text>
    </View>
  )
}

// ─────────────────────────────────────────
// NEXT UP TODAY
// ─────────────────────────────────────────

function NextUpCard({ item, laterItems }: { item: PlanItem | null; laterItems: PlanItem[] }) {
  if (!item) return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <View style={styles.dot} />
          <Text style={styles.sectionTitle}>NEXT UP TODAY</Text>
        </View>
      </View>
      <View style={styles.emptyNextCard}>
        <Ionicons name="checkmark-circle-outline" size={28} color={Colors.textMuted} />
        <Text style={styles.emptyNextTitle}>Nothing scheduled today</Text>
        <Text style={styles.emptyNextSub}>Check your Weekly Schedule below, or set a new reminder.</Text>
      </View>
    </View>
  )

  const total = laterItems.length + 1
  const done  = laterItems.filter(i => i.done).length // nextUp is by construction never done

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
          <View style={[styles.nextIconBadge, { backgroundColor: (item.courseColor ?? Colors.primary) + '22' }]}>
            <MaterialCommunityIcons name={item.courseEmoji as any} size={28} color={item.courseColor ?? Colors.primary} />
          </View>
          <View style={styles.nextInfo}>
            <View style={styles.titleRow}>
              <Text style={styles.nextTitle}>{item.label}</Text>
              {item.reminderMode === 'auto' && <SmartBadge />}
            </View>
            <Text style={styles.nextDesc}>
              {item.resolvedTitle ? `${item.courseTitle} · ${item.resolvedTitle}` : item.courseTitle}
            </Text>
          </View>
        </View>

        <Text style={styles.nextMeta}>
          {item.sessionType === 'blurt'
            ? 'Free-recall session'
            : item.questionCount ? `${item.questionCount} questions` : 'Quiz'}
          {' · '}{item.time}
        </Text>

        <TouchableOpacity style={styles.startButton} activeOpacity={0.8} onPress={() => startPlanItem(item)}>
          <Text style={styles.startButtonText}>Start</Text>
        </TouchableOpacity>

        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${(done / total) * 100}%` }]} />
          </View>
          <Text style={styles.progressLabel}>{done} of {total} done</Text>
        </View>
      </View>
    </View>
  )
}

// ─────────────────────────────────────────
// LATER TODAY
// ─────────────────────────────────────────
function LaterTodaySection({ items }: { items: PlanItem[] }) {
  const [expanded, setExpanded] = useState(true)
  if (items.length === 0) return null

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setExpanded(prev => !prev)
  }

  return (
    <View style={styles.section}>
      <TouchableOpacity style={styles.sectionHeader} onPress={toggle} activeOpacity={0.8}>
        <Text style={styles.sectionTitle}>LATER TODAY</Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textMuted} />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.list}>
          {items.map((item, index) => (
            <TouchableOpacity
            key={item.reminderId}
              style={[styles.row, index < items.length - 1 && styles.rowBorder]}
              activeOpacity={item.done ? 1 : 0.8}
              disabled={item.done}
              onPress={() => startPlanItem(item)}
            >
              <View style={[styles.rowIconBadge, { backgroundColor: (item.courseColor ?? Colors.primary) + '22' }, item.done && { opacity: 0.4 }]}>
                <MaterialCommunityIcons name={item.courseEmoji as any} size={20} color={item.courseColor ?? Colors.primary} />
              </View>
              <View style={styles.rowInfo}>
                <View style={styles.titleRow}>
                  <Text style={[styles.rowTitle, item.done && styles.doneText]}>{item.label}</Text>
                  {item.reminderMode === 'auto' && <SmartBadge />}
                </View>
                {!item.done && (
                  <Text style={styles.rowMeta}>
                    {item.resolvedTitle ? `${item.resolvedTitle} · ` : ''}
                    {item.time}{item.questionCount ? ` · ${item.questionCount} questions` : ''}
                  </Text>
                )}
                {item.done && item.doneVia === 'scope' && (
                  <Text style={styles.rowMeta}>Already covered today</Text>
                )}
              </View>
              {item.done
                ? <Ionicons name="checkmark" size={20} color={Colors.success} />
                : <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />}
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
  const [expanded, setExpanded] = useState(true)
  if (exams.length === 0) return null

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setExpanded(prev => !prev)
  }
  const urgentCount = exams.filter(e => e.days_left <= 3).length

  return (
    <View style={styles.section}>
      <TouchableOpacity style={styles.sectionHeader} onPress={toggle} activeOpacity={0.8}>
        <Text style={styles.sectionTitle}>UPCOMING TESTS</Text>
        <View style={styles.sectionHeaderRight}>
          {urgentCount > 0 && <View style={styles.urgentDot} />}
          <Text style={styles.sectionCount}>{exams.length} total</Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textMuted} />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.cardList}>
          {exams.map((exam) => (
            <View key={exam.id} style={styles.cardRow}>
              <View style={styles.rowIconBadge}>
                <MaterialCommunityIcons name={exam.emoji as any} size={20} color={Colors.primary} />
              </View>
              <View style={styles.rowInfo}>
                <Text style={styles.rowTitle}>{exam.title}</Text>
                <Text style={styles.rowMeta}>{exam.course}</Text>
              </View>
              <Text style={[styles.testDays, { color: getDaysColor(exam.days_left) }]}>
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

const DAY_FULL_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function todayMonFirstIndex(): number {
  return (new Date().getDay() + 6) % 7
}

function WeeklyScheduleSection({ items }: { items: WeekPlanItem[] }) {
  const [expanded, setExpanded]   = useState(true)
  const [selectedDay, setSelectedDay] = useState(todayMonFirstIndex())

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setExpanded(prev => !prev)
  }

  const countsByDay = DAY_LABELS.map((_, i) => items.filter(it => it.dayIndex === i).length)
  const dayItems = items.filter(it => it.dayIndex === selectedDay)
  const today = todayMonFirstIndex()

  return (
    <View style={styles.section}>
      <TouchableOpacity style={styles.sectionHeader} onPress={toggle} activeOpacity={0.8}>
        <View style={styles.sectionHeaderLeft}>
          <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
          <Text style={[styles.sectionTitle, { marginLeft: Spacing.xs }]}>WEEKLY SCHEDULE</Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textMuted} />
      </TouchableOpacity>

      {expanded && (
        <>
          <View style={styles.dayChipRow}>
            {DAY_LABELS.map((label, i) => {
              const isSelected = i === selectedDay
              const isToday = i === today
              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.dayChip,
                    isSelected && styles.dayChipSelected,
                    !isSelected && isToday && styles.dayChipToday,
                  ]}
                  onPress={() => setSelectedDay(i)}
                >
                  <Text style={[styles.dayChipLabel, isSelected && styles.dayChipLabelSelected]}>{label}</Text>
                  <View style={[styles.dayChipCount, isSelected && styles.dayChipCountSelected]}>
                    <Text style={[styles.dayChipCountText, isSelected && styles.dayChipCountTextSelected]}>
                      {countsByDay[i]}
                    </Text>
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>

          <Text style={styles.dayHeading}>{DAY_FULL_NAMES[selectedDay]}</Text>

          {dayItems.length === 0 ? (
            <View style={styles.emptyDayBox}>
              <Text style={styles.emptyDayText}>Nothing scheduled this day.</Text>
            </View>
          ) : (
            <View style={styles.cardList}>
            {dayItems.map((item) => (
              <View key={item.reminderId + item.dayIndex} style={styles.cardRow}>
                <View style={[styles.rowIconBadge, { backgroundColor: (item.courseColor ?? Colors.primary) + '22' }]}>
                  <MaterialCommunityIcons name={item.courseEmoji as any} size={20} color={item.courseColor ?? Colors.primary} />
                </View>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{item.label}</Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {item.courseTitle}
                    {item.sessionType === 'blurt' ? ' · Free-recall' : ` · ${item.questionCount ?? '—'} questions`}
                  </Text>
                </View>
                <Text style={styles.dayItemTime}>{item.time}</Text>
              </View>
            ))}
          </View>
          )}
        </>
      )}
    </View>
  )
}

// ─────────────────────────────────────────
// ENDED AUTO PLANS — renew nudge
// ─────────────────────────────────────────
function EndedAutoPlansSection({ plans, onRenewed }: { plans: EndedAutoPlan[]; onRenewed: () => void }) {
  if (plans.length === 0) return null

  const renew = async (plan: EndedAutoPlan) => {
    try {
      await renewAutoPlan(plan.reminderId, plan.planDurationDays ?? 7)
      onRenewed()
    } catch (err: any) {
      Alert.alert('Error', err.message)
    }
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>PLAN ENDED</Text>
      </View>
      <View style={styles.cardList}>
        {plans.map(plan => (
          <View key={plan.reminderId} style={styles.cardRow}>
            <View style={[styles.rowIconBadge, { backgroundColor: (plan.courseColor ?? Colors.primary) + '22' }]}>
              <MaterialCommunityIcons name={plan.courseEmoji as any} size={20} color={plan.courseColor ?? Colors.primary} />
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>{plan.label}</Text>
              <Text style={styles.rowMeta}>Your plan for {plan.courseTitle} ended</Text>
            </View>
            <TouchableOpacity style={styles.renewBtn} onPress={() => renew(plan)}>
              <Text style={styles.renewBtnText}>Renew</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  )
}

// ─────────────────────────────────────────
// NEEDS MATERIALS — non-actionable, not counted toward done/total
// ─────────────────────────────────────────
function NeedsMaterialsSection({ plans }: { plans: NeedsMaterialsPlan[] }) {
  if (plans.length === 0) return null

  return (
    <View style={styles.section}>
      <View style={styles.cardList}>
        {plans.map(plan => (
          <TouchableOpacity
            key={plan.reminderId}
            style={styles.cardRow}
            onPress={() => router.push(`/course/${plan.courseId}`)}
          >
            <View style={[styles.rowIconBadge, { backgroundColor: (plan.courseColor ?? Colors.primary) + '22' }]}>
              <MaterialCommunityIcons name={plan.courseEmoji as any} size={20} color={plan.courseColor ?? Colors.primary} />
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>{plan.label}</Text>
              <Text style={styles.rowMeta}>Add materials to {plan.courseTitle} to start this plan</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        ))}
      </View>
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
      <Text style={styles.emptySub}>Set a study reminder to see your plan here.</Text>
      <TouchableOpacity style={styles.emptyButton} onPress={() => router.push('/(tabs)/courses')} activeOpacity={0.8}>
        <Text style={styles.emptyButtonText}>Go to Subjects</Text>
      </TouchableOpacity>
    </View>
  )
}

// ─────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────
export default function HomeScreen() {
  const { user } = useSession()
  const { data, loading, refetch } = useDashboard(user?.id ?? null)

  if (loading) return (
    <View style={[styles.root, styles.center]}>
      <ActivityIndicator color={Colors.primary} size="large" />
    </View>
  )

  const hasContent = data && (
    data.next_up ||
    data.later_today.length > 0 ||
    data.upcoming_exams.length > 0 ||
    data.week_plan.length > 0 ||
    data.ended_auto_plans.length > 0 ||
    data.needs_materials.length > 0
  )
  return (
    <View style={styles.root}>
     <View style={styles.fixedHeader}>
        <View style={styles.logoRow}>
          <View style={styles.logoBadge}>
            <MaterialCommunityIcons name="brain" size={20} color={Colors.primary} />
          </View>
          <Text style={styles.logoText}>MEMO</Text>
        </View>
        <View style={styles.streakBadge}>
          <Text style={styles.streakFire}>🔥</Text>
          <Text style={styles.streakCount}>{data?.streak ?? 0}</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {!hasContent ? (
          <EmptyHome />
        ) : (
          <>
          <NextUpCard item={data?.next_up ?? null} laterItems={data?.later_today ?? []} />
          <LaterTodaySection items={data?.later_today ?? []} />
            <EndedAutoPlansSection plans={data?.ended_auto_plans ?? []} onRenewed={refetch} />
            <NeedsMaterialsSection plans={data?.needs_materials ?? []} />
            <UpcomingTestsSection exams={data?.upcoming_exams ?? []} />
            <WeeklyScheduleSection items={data?.week_plan ?? []} />
          </>
        )}
      </ScrollView>
    </View>
  )
}

// ─────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fixedHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.base, paddingTop: Spacing.xl + 32, paddingBottom: Spacing.base,
    backgroundColor: Colors.background,
  },
  container: {
    paddingHorizontal: Spacing.base, paddingBottom: Spacing.xxxl, gap: Spacing.xl,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: Typography.xxl, fontWeight: Typography.bold, color: Colors.textPrimary },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.card, borderRadius: Radius.full, paddingVertical: 6, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  streakFire: { fontSize: 16 },
  streakCount: { fontSize: Typography.sm, fontWeight: Typography.bold, color: Colors.textPrimary },
  section: { gap: Spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  sectionHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  sectionTitle: { fontSize: Typography.xs, fontWeight: Typography.bold, color: Colors.textSecondary, letterSpacing: 1 },
  sectionCount: { fontSize: Typography.xs, color: Colors.textMuted },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary },
  urgentDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.error },
  nextCard: { ...CardBase, padding: Spacing.base, gap: Spacing.md },
  nextCardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  nextIconBadge: { width: 52, height: 52, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  nextInfo: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, flexWrap: 'wrap' },
  smartBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.primaryMuted, borderRadius: Radius.full,
    paddingVertical: 2, paddingHorizontal: 7,
  },
  smartBadgeText: { fontSize: 10, fontWeight: Typography.bold, color: Colors.primary },
  nextTitle: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textPrimary },
  nextDesc: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 2 },
  nextMeta: { fontSize: Typography.sm, color: Colors.textMuted },
  startButton: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center' },
  startButtonText: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textInverse },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  progressTrack: { flex: 1, height: 4, backgroundColor: Colors.progressTrack, borderRadius: Radius.full, overflow: 'hidden' },
  progressFill: { height: 4, backgroundColor: Colors.primary, borderRadius: Radius.full },
  progressLabel: { fontSize: Typography.xs, color: Colors.textMuted, flexShrink: 0 },
  list: { borderTopWidth: 1, borderTopColor: Colors.border + '66' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, gap: Spacing.md },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border + '66' },
  rowIconBadge: { width: 36, height: 36, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  rowInfo: { flex: 1 },
  rowTitle: { fontSize: Typography.base, fontWeight: Typography.medium, color: Colors.textPrimary },
  rowMeta: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 2 },
  doneText: { textDecorationLine: 'line-through', color: Colors.textMuted },
  testDays: { fontSize: Typography.sm, fontWeight: Typography.semibold },
  calendarCard: { ...CardBase, padding: Spacing.sm, overflow: 'hidden' },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', paddingBottom: Spacing.sm },
  calendarDayCol: { alignItems: 'center' },
  calendarDayText: { fontSize: Typography.xs, fontWeight: Typography.semibold, color: Colors.textSecondary },
  calendarDivider: { height: 1, backgroundColor: Colors.border, marginBottom: Spacing.xs },
  calendarScroll: { maxHeight: ROW_H * 8 },
  calendarRow: { flexDirection: 'row', alignItems: 'center', height: ROW_H },
  timeLabel: { width: TIME_COL_W, alignItems: 'flex-start', paddingLeft: 2 },
  timeLabelText: { fontSize: 10, color: Colors.textMuted },
  calendarCell: { height: ROW_H, alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderTopColor: Colors.border + '44' },
  calendarCellBorder: { borderLeftWidth: 1, borderLeftColor: Colors.border + '44' },
  emptyState: { alignItems: 'center', paddingTop: Spacing.xxxl, gap: Spacing.md },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary },
  emptySub: { fontSize: Typography.sm, color: Colors.textSecondary, textAlign: 'center' },
  emptyButton: { backgroundColor: Colors.primary, borderRadius: Radius.full, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.xl, marginTop: Spacing.sm },
  emptyButtonText: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textInverse },
  scheduleBadge: {
    width: 28, height: 28, borderRadius: Radius.full,
    alignItems: 'center', justifyContent: 'center',
  },
dayChipRow: { flexDirection: 'row', justifyContent: 'space-between' },
dayChip: {
  alignItems: 'center', gap: 6, paddingVertical: Spacing.sm, paddingHorizontal: 4,
  borderRadius: Radius.lg, minWidth: 40,
},
dayChipSelected: { backgroundColor: Colors.primary },
dayChipToday: { backgroundColor: Colors.primaryMuted },
dayChipLabel: { fontSize: 10, fontWeight: Typography.bold, color: Colors.textSecondary, letterSpacing: 0.3 },
dayChipLabelSelected: { color: '#fff' },
dayChipCount: {
  width: 24, height: 24, borderRadius: Radius.full, backgroundColor: Colors.cardElevated,
  alignItems: 'center', justifyContent: 'center',
},
dayChipCountSelected: { backgroundColor: 'rgba(255,255,255,0.25)' },
dayChipCountText: { fontSize: Typography.xs, fontWeight: Typography.bold, color: Colors.textSecondary },
dayChipCountTextSelected: { color: '#fff' },
dayHeading: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary, marginTop: Spacing.sm },
dayItemTime: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textSecondary },
emptyDayBox: { ...CardBase, alignItems: 'center', paddingVertical: Spacing.lg },
emptyDayText: { fontSize: Typography.sm, color: Colors.textMuted },
cardList: { gap: Spacing.sm },
cardRow: {
  ...CardBase,
  flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
  padding: Spacing.md,
},
renewBtn: {
  backgroundColor: Colors.primary, borderRadius: Radius.full,
  paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
},
renewBtnText: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: '#fff' },
logoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
logoBadge: {
  width: 32, height: 32, borderRadius: Radius.md, backgroundColor: Colors.primaryMuted,
  alignItems: 'center', justifyContent: 'center',
},
logoText: {
  fontSize: Typography.xl, fontWeight: Typography.extrabold, color: Colors.textPrimary,
  letterSpacing: 1,
},
emptyNextCard: {
  ...CardBase, alignItems: 'center', gap: Spacing.xs,
  paddingVertical: Spacing.xl,
},
emptyNextTitle: { fontSize: Typography.base, fontWeight: Typography.medium, color: Colors.textSecondary },
emptyNextSub: { fontSize: Typography.xs, color: Colors.textMuted, textAlign: 'center' },
})