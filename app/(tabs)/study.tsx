

import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert
} from 'react-native'
import { router } from 'expo-router'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { Colors, Spacing, Radius, Typography, CardBase } from '@/constants/theme'
import { useSession } from '@/hooks/useSession'
import { useStudyOverview, Recommendation, RecentAttempt } from '@/hooks/useStudyOverview'

// ─────────────────────────────────────────
// RECOMMENDATION ROW
// ─────────────────────────────────────────
function RecommendationRow({ rec, onPress }: { rec: Recommendation; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.iconBadge, { backgroundColor: (rec.courseColor ?? Colors.primary) + '22' }]}>
        <MaterialCommunityIcons name={rec.courseIcon as any} size={20} color={rec.courseColor ?? Colors.primary} />
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowTitle} numberOfLines={1}>{rec.title}</Text>
        <Text style={styles.rowSub} numberOfLines={1}>{rec.courseTitle}</Text>
      </View>
      <Text style={[styles.reasonText, rec.urgent && { color: Colors.error }]}>{rec.reason}</Text>
      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
    </TouchableOpacity>
  )
}

// ─────────────────────────────────────────
// PRACTICE ROW
// ─────────────────────────────────────────
function PracticeRow({
  icon, title, subtitle, onPress, disabled,
}: {
  icon: string; title: string; subtitle: string; onPress: () => void; disabled?: boolean
}) {
  return (
    <TouchableOpacity style={[styles.row, disabled && { opacity: 0.5 }]} onPress={onPress} activeOpacity={0.7} disabled={disabled}>
      <View style={styles.practiceIconBadge}>
        <Ionicons name={icon as any} size={20} color={Colors.primary} />
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.rowSub} numberOfLines={1}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
    </TouchableOpacity>
  )
}

// ─────────────────────────────────────────
// RECENT ROW
// ─────────────────────────────────────────
function RecentRow({ attempt, onPress }: { attempt: any; onPress: () => void }) {
  const color = attempt.scorePct >= 80 ? Colors.success : attempt.scorePct >= 60 ? Colors.warning : Colors.error
  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={onPress}>
      <View style={[styles.iconBadge, { backgroundColor: (attempt.courseColor ?? Colors.primary) + '22' }]}>
        <MaterialCommunityIcons name={attempt.courseIcon as any} size={20} color={attempt.courseColor ?? Colors.primary} />
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowTitle} numberOfLines={1}>{attempt.courseTitle}</Text>
        <Text style={styles.rowSub} numberOfLines={1}>{attempt.scopeLabel}</Text>
        <Text style={styles.rowMeta}>{attempt.questionCount} questions · {attempt.date}</Text>
      </View>
      <Text style={[styles.scoreText, { color }]}>{attempt.scorePct}%</Text>
      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
    </TouchableOpacity>
  )
}

// ─────────────────────────────────────────
// QUICK QUIZ COUNT SHEET
// ─────────────────────────────────────────
function QuickQuizCountRow({ count, onPress }: { count: number; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.countChip} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.countChipText}>{count}</Text>
    </TouchableOpacity>
  )
}

export default function StudyScreen() {
  const { user } = useSession()
  const { recommendations, recentAttempts, loading } = useStudyOverview(user?.id ?? null)

  const handleRecommendationTap = (rec: Recommendation) => {
    if (!rec.noteIds.length) {
      Alert.alert('No materials', 'This topic\'s materials couldn\'t be found.')
      return
    }
    router.push({
      pathname: '/study/[id]',
      params: {
        id: rec.courseId,
        mode: 'custom',
        title: rec.title,
        noteIds: JSON.stringify(rec.noteIds),
      },
    })
  }

  const startQuickQuiz = (count: number) => {
    router.push({
      pathname: '/study/[id]',
      params: { id: 'all', mode: 'quick', title: 'Quick Quiz', presetCount: String(count) },
    })
  }
    
  const handleRetake = (attempt: RecentAttempt) => {
    router.push({
      pathname: '/study/[id]',
      params: {
        id: attempt.targetId,
        mode: attempt.mode,
        title: attempt.scopeLabel,
      },
    })
  }

  if (loading) return (
    <View style={[styles.root, styles.center]}>
      <ActivityIndicator color={Colors.primary} size="large" />
    </View>
  )

  return (
    <View style={styles.root}>
      <View style={styles.fixedHeader}>
        <Text style={styles.headerTitle}>Study</Text>
        <Text style={styles.headerSubtitle}>Practice and review your progress</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>RECOMMENDATIONS</Text>
          {recommendations.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="sparkles-outline" size={28} color={Colors.textMuted} />
              <Text style={styles.emptyText}>Nothing to recommend yet</Text>
              <Text style={styles.emptySubtext}>Take a few quizzes and Memo will start suggesting what to review.</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {recommendations.map((rec, idx) => (
                <View key={rec.id}>
                  <RecommendationRow rec={rec} onPress={() => handleRecommendationTap(rec)} />
                  {idx < recommendations.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PRACTICE</Text>
          <View style={styles.list}>
            <View style={[styles.row, { alignItems: 'flex-start' }]}>
              <View style={styles.practiceIconBadge}>
                <Ionicons name="sparkles-outline" size={20} color={Colors.primary} />
              </View>
              <View style={styles.rowInfo}>
                <Text style={styles.rowTitle}>Quick Quiz</Text>
                <Text style={styles.rowSub}>Random questions from your courses</Text>
                <View style={styles.countRow}>
                  <QuickQuizCountRow count={5} onPress={() => startQuickQuiz(5)} />
                  <QuickQuizCountRow count={10} onPress={() => startQuickQuiz(10)} />
                  <QuickQuizCountRow count={25} onPress={() => startQuickQuiz(25)} />
                </View>
              </View>
            </View>
            <View style={styles.divider} />
            <PracticeRow
              icon="refresh"
              title="Quick Blurt"
              subtitle="Coming soon — free-recall a topic from memory"
              disabled
              onPress={() => {}}
            />
            <PracticeRow
          icon="refresh-circle-outline"
          title="Review Mistakes"
          subtitle="Retry the questions you've gotten wrong"
          onPress={() => router.push({ pathname: '/study/[id]', params: { id: 'all', mode: 'review', title: 'Review Mistakes' } })}
        />
        <View style={styles.divider} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>RECENTLY</Text>
          {recentAttempts.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="time-outline" size={28} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No quiz history yet</Text>
              <Text style={styles.emptySubtext}>Take a quiz to see your recent activity here.</Text>
            </View>
          ) : (
            <View style={styles.list}>
             {recentAttempts.map((a, idx) => (
            <View key={a.id}>
              <RecentRow attempt={a} onPress={() => handleRetake(a)} />
              {idx < recentAttempts.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fixedHeader: { paddingHorizontal: Spacing.base, paddingTop: Spacing.xl + 32, paddingBottom: Spacing.base, backgroundColor: Colors.background },
  headerTitle: { fontSize: Typography.xxl, fontWeight: Typography.bold, color: Colors.textPrimary },
  headerSubtitle: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 2 },
  container: { paddingHorizontal: Spacing.base, paddingBottom: Spacing.xxxl, gap: Spacing.xl },
  section: { gap: Spacing.sm },
  sectionLabel: { fontSize: Typography.xs, fontWeight: Typography.bold, color: Colors.textMuted, letterSpacing: 1 },
  list: { ...CardBase, overflow: 'hidden', padding: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md },
  divider: { height: 1, backgroundColor: Colors.border },
  iconBadge: { width: 40, height: 40, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  practiceIconBadge: { width: 40, height: 40, borderRadius: Radius.full, backgroundColor: Colors.primaryMuted, alignItems: 'center', justifyContent: 'center' },
  rowInfo: { flex: 1 },
  rowTitle: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  rowSub: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 1 },
  rowMeta: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 1 },
  reasonText: { fontSize: Typography.xs, fontWeight: Typography.semibold, color: Colors.textMuted, marginRight: 4 },
  scoreText: { fontSize: Typography.base, fontWeight: Typography.bold, marginRight: 4 },
  emptyBox: { ...CardBase, alignItems: 'center', gap: Spacing.xs, paddingVertical: Spacing.xl },
  emptyText: { fontSize: Typography.base, fontWeight: Typography.medium, color: Colors.textSecondary },
  emptySubtext: { fontSize: Typography.xs, color: Colors.textMuted, textAlign: 'center' },
  countRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  countChip: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.full,
    paddingVertical: Spacing.xs, paddingHorizontal: Spacing.md, backgroundColor: Colors.cardElevated,
  },
  countChipText: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.primary },
})