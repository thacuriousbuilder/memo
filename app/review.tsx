

import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Dimensions,
} from 'react-native'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  useAnimatedStyle, useSharedValue, withSpring, withTiming, runOnJS,
} from 'react-native-reanimated'
import { Colors, Spacing, Radius, Typography, CardBase } from '@/constants/theme'
import { useSession } from '@/hooks/useSession'
import { getReviewCards, ReviewCard } from '@/hooks/useStudyOverview'

type Step = 'loading' | 'empty' | 'deck'

const SWIPE_THRESHOLD = 80
const SCREEN_WIDTH = Dimensions.get('window').width
const EXIT_DISTANCE = SCREEN_WIDTH * 1.2
const SWIPE_ANIM_MS = 200

// ─────────────────────────────────────────
// WEAK SPOTS — passive, cross-course card review. No quiz, no blurt, no
// grading: one card per still-missed quiz question, self-paced, swipe or
// tap to navigate.
// ─────────────────────────────────────────
export default function WeakSpotsScreen() {
  const { user } = useSession()
  const [step,    setStep]    = useState<Step>('loading')
  const [cards,   setCards]   = useState<ReviewCard[]>([])
  const [index,   setIndex]   = useState(0)
  const [flipped, setFlipped] = useState(false)

  useEffect(() => {
    if (!user) return
    getReviewCards(user.id)
      .then(c => { setCards(c); setStep(c.length ? 'deck' : 'empty') })
      .catch(() => setStep('empty'))
  }, [user?.id])

  const current = cards[index]

  const goNext = () => {
    if (index < cards.length - 1) {
      setFlipped(false)
      setIndex(i => i + 1)
    } else {
      router.back()
    }
  }

  const goPrev = () => {
    if (index === 0) return
    setFlipped(false)
    setIndex(i => i - 1)
  }

  const toggleFlip = () => setFlipped(f => !f)

  // ── Swipe + tap, same gesture pattern already used in
  // components/organizeList.tsx (Gesture.Pan + reanimated shared values) ──
  const translateX = useSharedValue(0)

  // Footer-button equivalents of the swipe animation below, so tapping the
  // icons feels the same as swiping instead of jumping instantly.
  const animateToNext = () => {
    if (index >= cards.length - 1) { goNext(); return }
    translateX.value = withTiming(-EXIT_DISTANCE, { duration: SWIPE_ANIM_MS }, (finished) => {
      if (finished) {
        runOnJS(goNext)()
        translateX.value = EXIT_DISTANCE
        translateX.value = withTiming(0, { duration: SWIPE_ANIM_MS })
      }
    })
  }

  const animateToPrev = () => {
    if (index === 0) return
    translateX.value = withTiming(EXIT_DISTANCE, { duration: SWIPE_ANIM_MS }, (finished) => {
      if (finished) {
        runOnJS(goPrev)()
        translateX.value = -EXIT_DISTANCE
        translateX.value = withTiming(0, { duration: SWIPE_ANIM_MS })
      }
    })
  }

  const panGesture = Gesture.Pan()
    .onUpdate((e) => { translateX.value = e.translationX })
    .onEnd((e) => {
      if (e.translationX < -SWIPE_THRESHOLD) {
        // Card flies out left, next card slides in from the right.
        translateX.value = withTiming(-EXIT_DISTANCE, { duration: SWIPE_ANIM_MS }, (finished) => {
          if (finished) {
            runOnJS(goNext)()
            translateX.value = EXIT_DISTANCE
            translateX.value = withTiming(0, { duration: SWIPE_ANIM_MS })
          }
        })
      } else if (e.translationX > SWIPE_THRESHOLD) {
        // Card flies out right, previous card slides in from the left.
        translateX.value = withTiming(EXIT_DISTANCE, { duration: SWIPE_ANIM_MS }, (finished) => {
          if (finished) {
            runOnJS(goPrev)()
            translateX.value = -EXIT_DISTANCE
            translateX.value = withTiming(0, { duration: SWIPE_ANIM_MS })
          }
        })
      } else {
        translateX.value = withSpring(0)
      }
    })

  const tapGesture = Gesture.Tap()
    .onEnd(() => { runOnJS(toggleFlip)() })

  const composedGesture = Gesture.Race(panGesture, tapGesture)

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }))

  if (step === 'loading') {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    )
  }

  if (step === 'empty') {
    return (
      <View style={[styles.root, styles.center, styles.emptyContainer]}>
        <TouchableOpacity style={styles.closeButtonAbsolute} onPress={() => router.back()}>
          <Ionicons name="close" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
        <Ionicons name="checkmark-circle-outline" size={56} color={Colors.success} />
        <Text style={styles.emptyTitle}>Nothing to review right now</Text>
        <Text style={styles.emptySub}>
          No missed quiz questions — you're caught up.
        </Text>
      </View>
    )
  }

  const progressPct = ((index + 1) / cards.length) * 100

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={Colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Weak Spots</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.progressRow}>
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${progressPct}%` }]} />
        </View>
        <Text style={styles.progressCount}>{index + 1} of {cards.length}</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <GestureDetector gesture={composedGesture}>
          <Animated.View style={[styles.card, cardAnimatedStyle]}>
            <View style={[styles.cornerBadge, { backgroundColor: (current.courseColor ?? Colors.primary) + '22' }]}>
              <MaterialCommunityIcons name={current.courseIcon as any} size={14} color={current.courseColor ?? Colors.primary} />
              <Text style={styles.cornerBadgeText} numberOfLines={1}>{current.topicTitle}</Text>
            </View>

            {!flipped ? (
              <View style={styles.cardFront}>
                <Text style={styles.cardQuestionText}>{current.questionText}</Text>
                <Text style={styles.cardHint}>Tap to flip · swipe to move on</Text>
              </View>
            ) : (
              <View style={styles.cardBack}>
                <Text style={styles.backBodyText}>
                  {current.explanation ?? 'No additional explanation available.'}
                </Text>
              </View>
            )}
          </Animated.View>
        </GestureDetector>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.iconNavButton, index === 0 && styles.iconNavButtonDisabled]}
          onPress={animateToPrev}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-undo-outline" size={26} color={Colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconNavButton}
          onPress={animateToNext}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="play" size={26} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.background },
  center: { alignItems: 'center', justifyContent: 'center' },

  emptyContainer: { paddingHorizontal: Spacing.xl, gap: Spacing.sm },
  closeButtonAbsolute: {
    position: 'absolute', top: 60, right: Spacing.base,
    width: 36, height: 36, borderRadius: Radius.full,
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary, textAlign: 'center', marginTop: Spacing.sm },
  emptySub:   { fontSize: Typography.sm, color: Colors.textSecondary, textAlign: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingTop: Spacing.xl + 32, paddingBottom: Spacing.md,
  },
  headerTitle: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary },

  progressRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.base, marginBottom: Spacing.md },
  progressBarTrack: { flex: 1, height: 4, borderRadius: Radius.full, backgroundColor: Colors.progressTrack, overflow: 'hidden' },
  progressBarFill:  { height: '100%', backgroundColor: Colors.progressFill, borderRadius: Radius.full },
  progressCount: { fontSize: Typography.xs, color: Colors.textMuted },

  container: { paddingHorizontal: Spacing.base, paddingBottom: Spacing.xl, gap: Spacing.md, flexGrow: 1 },

  card: { ...CardBase, flex: 1, padding: Spacing.lg },
  cornerBadge: {
    position: 'absolute', top: Spacing.md, right: Spacing.md, zIndex: 1,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    maxWidth: '55%', paddingVertical: 4, paddingHorizontal: Spacing.sm,
    borderRadius: Radius.full,
  },
  cornerBadgeText: { fontSize: Typography.xs, fontWeight: Typography.medium, color: Colors.textSecondary, flexShrink: 1 },

  cardFront: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg },
  cardQuestionText: { fontSize: Typography.lg, fontWeight: Typography.semibold, color: Colors.textPrimary, textAlign: 'center', lineHeight: Typography.lg * 1.4 },
  cardHint: { fontSize: Typography.xs, color: Colors.textMuted, position: 'absolute', bottom: 0 },

  cardBack: { flex: 1, justifyContent: 'center', gap: Spacing.lg },
  backBodyText: { fontSize: Typography.lg, color: Colors.textPrimary, textAlign: 'center', lineHeight: Typography.lg * 1.5 },

  footer: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg,
    backgroundColor: Colors.background,
  },
  iconNavButton: { alignItems: 'center', justifyContent: 'center' },
  iconNavButtonDisabled: { opacity: 0.35 },
})
