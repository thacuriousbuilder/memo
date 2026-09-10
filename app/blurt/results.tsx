

import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Colors, Spacing, Radius, Typography, CardBase } from '@/constants/theme'

interface GradeResult {
  rating:          'strong' | 'partial' | 'weak'
  feedback:        string
  review_pointers: string[]
  prompt?: { id: string; prompt_text: string; topic: string }
}

const RATING_META = {
  strong:  { label: 'Strong understanding',  color: Colors.success, icon: 'checkmark-circle' as const },
  partial: { label: 'Partial understanding', color: Colors.warning, icon: 'alert-circle' as const },
  weak:    { label: 'Needs more review',     color: Colors.error,   icon: 'close-circle' as const },
}

const RATING_RANK = { strong: 2, partial: 1, weak: 0 }

function getOverallRating(results: GradeResult[]): 'strong' | 'partial' | 'weak' {
  const avg = results.reduce((s, r) => s + RATING_RANK[r.rating], 0) / results.length
  if (avg >= 1.5) return 'strong'
  if (avg >= 0.75) return 'partial'
  return 'weak'
}

export default function BlurtResultsScreen() {
  const params = useLocalSearchParams<{
    title:      string
    results:    string
    scopeType?: 'topic' | 'subtopic'
    scopeId?:   string
    fromQuizScore?: string
    fromQuizTotal?: string
  }>()
  const results: GradeResult[] = JSON.parse(params.results ?? '[]')

  const handleDone = () => {
    router.dismissAll()
    router.replace('/(tabs)/study')
  }

  const handleRetake = () => {
    if (!params.scopeType || !params.scopeId) return
    router.replace({
      pathname: '/blurt/[id]',
      params: {
        id:        params.scopeId,
        scopeType: params.scopeType,
        scopeId:   params.scopeId,
        title:     params.title,
        fromQuizScore: params.fromQuizScore ?? '',
        fromQuizTotal: params.fromQuizTotal ?? '',
        retryPrompts: JSON.stringify(results.map(r => r.prompt).filter(Boolean)),
      },
    })
  }

  const handleQuizThisTopic = () => {
    if (!params.scopeType || !params.scopeId) return
    router.push({
      pathname: '/study/[id]',
      params: {
        id:    params.scopeId,
        mode:  params.scopeType === 'topic' ? 'lesson' : 'sublesson',
        title: params.title,
        fromBlurtOverall:  overall,
        fromBlurtPointers: JSON.stringify(allPointers.slice(0, 3)),
      },
    })
  }

  const overall = getOverallRating(results)
  const meta = RATING_META[overall]
  const hasScope = !!params.scopeType && !!params.scopeId
  const showQuizCta = overall !== 'strong' && hasScope

  // Connection card — this session was launched via "Confirm with Blurt"
  // from a passed quiz (app/results.tsx). Follows the "quiz confirms
  // recognition, blurt confirms recall" framing established for the CTA
  // loop: a 'strong' blurt here backs up the quiz pass, anything less
  // reveals a gap the quiz didn't catch.
  const fromQuizPct = params.fromQuizScore && params.fromQuizTotal && Number(params.fromQuizTotal) > 0
    ? Math.round((Number(params.fromQuizScore) / Number(params.fromQuizTotal)) * 100)
    : null
  const showQuizConnection = fromQuizPct !== null

  const strongCount  = results.filter(r => r.rating === 'strong').length
  const partialCount = results.filter(r => r.rating === 'partial').length
  const weakCount    = results.filter(r => r.rating === 'weak').length

  const allPointers = Array.from(new Set(results.flatMap(r => r.review_pointers)))

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={[styles.overallIconWrapper, { backgroundColor: meta.color + '22' }]}>
            <Ionicons name={meta.icon} size={40} color={meta.color} />
          </View>
          <Text style={[styles.overallLabel, { color: meta.color }]}>{meta.label}</Text>
          <Text style={styles.subtitle}>{params.title}</Text>
        </View>

        {showQuizConnection && (
          <View style={styles.connectionCard}>
            <Text style={styles.sectionLabel}>FOLLOWING UP ON QUIZ</Text>
            <Text style={styles.connectionLine}>
              You passed with {params.fromQuizScore}/{params.fromQuizTotal} ({fromQuizPct}%)
            </Text>
            <Text style={[styles.connectionLine, { color: meta.color, fontWeight: Typography.semibold }]}>
              This Blurt: {meta.label}
            </Text>
            <Text style={styles.connectionFraming}>
              {overall === 'strong'
                ? 'Confirmed — you can explain it, not just recognize it.'
                : 'Worth noting — explaining it aloud revealed some gaps the quiz didn\'t catch.'}
            </Text>
          </View>
        )}

        <View style={styles.breakdownRow}>
          <View style={styles.breakdownItem}>
            <Text style={[styles.breakdownCount, { color: Colors.success }]}>{strongCount}</Text>
            <Text style={styles.breakdownLabel}>Strong</Text>
          </View>
          <View style={styles.breakdownItem}>
            <Text style={[styles.breakdownCount, { color: Colors.warning }]}>{partialCount}</Text>
            <Text style={styles.breakdownLabel}>Partial</Text>
          </View>
          <View style={styles.breakdownItem}>
            <Text style={[styles.breakdownCount, { color: Colors.error }]}>{weakCount}</Text>
            <Text style={styles.breakdownLabel}>Weak</Text>
          </View>
        </View>

        {allPointers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>WORTH REVIEWING</Text>
            <View style={styles.pointersList}>
              {allPointers.map((p, i) => (
                <View key={i} style={styles.pointerRow}>
                  <Ionicons name="bookmark-outline" size={16} color={Colors.primary} />
                  <Text style={styles.pointerText}>{p}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>YOUR ANSWERS</Text>
          <View style={styles.answersList}>
            {results.map((r, i) => (
              <View key={i} style={[styles.answerRow, i < results.length - 1 && styles.answerRowBorder]}>
                <View style={[styles.answerDot, { backgroundColor: RATING_META[r.rating].color }]} />
                <Text style={styles.answerFeedback} numberOfLines={2}>{r.feedback}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {showQuizCta ? (
          <>
            <TouchableOpacity style={styles.doneButton} onPress={handleQuizThisTopic} activeOpacity={0.8}>
              <Text style={styles.doneButtonText}>Quiz this topic</Text>
            </TouchableOpacity>
            {hasScope && (
              <TouchableOpacity style={styles.retakeButton} onPress={handleRetake} activeOpacity={0.8}>
                <Text style={styles.retakeButtonText}>Retake</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.doneTextButton} onPress={handleDone} activeOpacity={0.8}>
              <Text style={styles.doneTextButtonText}>Done</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {hasScope && (
              <TouchableOpacity style={styles.retakeButton} onPress={handleRetake} activeOpacity={0.8}>
                <Text style={styles.retakeButtonText}>Retake</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.doneButton} onPress={handleDone} activeOpacity={0.8}>
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  container: { paddingHorizontal: Spacing.base, paddingTop: Spacing.xl + 32, paddingBottom: Spacing.xl, gap: Spacing.xl },
  header: { alignItems: 'center', gap: Spacing.xs },
  overallIconWrapper: {
    width: 88, height: 88, borderRadius: Radius.full,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm,
  },
  overallLabel: { fontSize: Typography.xl, fontWeight: Typography.bold },
  subtitle: { fontSize: Typography.sm, color: Colors.textSecondary },
  connectionCard: { ...CardBase, gap: 4 },
  connectionLine: { fontSize: Typography.sm, color: Colors.textPrimary },
  connectionFraming: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 2 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-around', ...CardBase, paddingVertical: Spacing.md },
  breakdownItem: { alignItems: 'center', gap: 2 },
  breakdownCount: { fontSize: Typography.xl, fontWeight: Typography.bold },
  breakdownLabel: { fontSize: Typography.xs, color: Colors.textMuted },
  section: { gap: Spacing.sm },
  sectionLabel: { fontSize: Typography.xs, fontWeight: Typography.bold, color: Colors.textMuted, letterSpacing: 1 },
  pointersList: { ...CardBase, overflow: 'hidden', padding: Spacing.sm, gap: Spacing.xs },
  pointerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xs, paddingHorizontal: Spacing.xs },
  pointerText: { fontSize: Typography.sm, color: Colors.textPrimary, flex: 1 },
  answersList: { ...CardBase, overflow: 'hidden', padding: 0 },
  answerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, padding: Spacing.md },
  answerRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  answerDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  answerFeedback: { flex: 1, fontSize: Typography.sm, color: Colors.textSecondary, lineHeight: Typography.sm * 1.4 },
  footer: {
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.lg, gap: Spacing.sm,
    borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.background,
  },
  doneButton: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center' },
  doneButtonText: { fontSize: Typography.base, fontWeight: Typography.semibold, color: '#fff' },
  retakeButton: {
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card,
    borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center',
  },
  retakeButtonText: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.primary },
  doneTextButton: { paddingVertical: Spacing.sm, alignItems: 'center' },
  doneTextButtonText: { fontSize: Typography.sm, fontWeight: Typography.medium, color: Colors.textSecondary },
})