

import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Colors, Spacing, Radius, Typography, CardBase } from '@/constants/theme'

interface GradeResult {
  rating:          'strong' | 'partial' | 'weak'
  feedback:        string
  review_pointers: string[]
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
  const params = useLocalSearchParams<{ title: string; results: string }>()
  const results: GradeResult[] = JSON.parse(params.results ?? '[]')

  const overall = getOverallRating(results)
  const meta = RATING_META[overall]

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
        <TouchableOpacity style={styles.doneButton} onPress={() => router.replace('/(tabs)')} activeOpacity={0.8}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
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
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.lg,
    borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.background,
  },
  doneButton: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center' },
  doneButtonText: { fontSize: Typography.base, fontWeight: Typography.semibold, color: '#fff' },
})