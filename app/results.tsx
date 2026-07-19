

import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, LayoutAnimation, Platform, UIManager
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useState }  from 'react'
import Svg, { Circle } from 'react-native-svg'
import { Ionicons }  from '@expo/vector-icons'
import { Colors, Spacing, Radius, Typography, CardBase } from '@/constants/theme'

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true)
}

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────
interface AnswerItem {
  questionId:   string
  questionText: string
  correctText:  string
  selectedIndex: number
  correctIndex:  number
  isCorrect:     boolean
  explanation?:  string
}

// ─────────────────────────────────────────
// SCORE RING
// ─────────────────────────────────────────
function ScoreRing({
  correct,
  total,
  passed,
}: {
  correct: number
  total:   number
  passed:  boolean
}) {
  const size        = 160
  const strokeWidth = 12
  const radius      = (size - strokeWidth) / 2
  const circ        = 2 * Math.PI * radius
  const pct         = total > 0 ? correct / total : 0
  const offset      = circ - pct * circ
  const color       = passed ? Colors.success : Colors.error
  const pctLabel    = Math.round(pct * 100)

  return (
    <View style={styles.ringWrapper}>
      <Svg width={size} height={size}>
        {/* Track */}
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={Colors.progressTrack}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Fill */}
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      {/* Center label */}
      <View style={styles.ringCenter}>
        <Text style={[styles.ringFraction, { color: Colors.textPrimary }]}>
          {correct}/{total}
        </Text>
        <Text style={[styles.ringPct, { color }]}>
          {pctLabel}%
        </Text>
      </View>
    </View>
  )
}

// ─────────────────────────────────────────
// BREAKDOWN CARD
// ─────────────────────────────────────────
function BreakdownCard({ answer }: { answer: AnswerItem }) {
  const [expanded, setExpanded] = useState(false)

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setExpanded(prev => !prev)
  }

  const borderColor = answer.isCorrect
    ? Colors.answerBorderCorrect
    : Colors.answerBorderWrong
  const bgColor = answer.isCorrect
    ? Colors.answerCorrect
    : Colors.answerWrong

  return (
    <TouchableOpacity
      style={[
        styles.breakdownCard,
        { borderColor, backgroundColor: bgColor }
      ]}
      onPress={toggle}
      activeOpacity={0.8}
    >
      {/* Question */}
      <Text style={styles.questionText}>
        {answer.questionText}
      </Text>

      {/* Wrong answer shows correct */}
      {!answer.isCorrect && (
        <Text style={styles.correctText}>
          Correct: {answer.correctText}
        </Text>
      )}

      {/* Explanation (expandable) */}
      {answer.explanation && (
        <>
          <View style={styles.explanationDivider} />
          <TouchableOpacity
            style={styles.explanationToggle}
            onPress={toggle}
            activeOpacity={0.7}
          >
            <Text style={styles.explanationToggleText}>
              {expanded ? 'Hide explanation' : 'View explanation'}
            </Text>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={Colors.primary}
            />
          </TouchableOpacity>

          {expanded && (
            <Text style={styles.explanationText}>
              {answer.explanation}
            </Text>
          )}
        </>
      )}
    </TouchableOpacity>
  )
}

// ─────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────
export default function ResultsScreen() {
  const params = useLocalSearchParams<{
    correct:   string
    total:     string
    needed:    string
    title:     string
    passed:    string
    mode:      string
    attemptId: string
    answers:   string
  }>()

  const correct   = parseInt(params.correct  ?? '0')
  const total     = parseInt(params.total    ?? '0')
  const passed    = params.passed === '1'
  const title     = params.title  ?? 'Quiz'
  const mode      = params.mode   ?? 'lesson'

  // Parse answers from JSON
  const answers: AnswerItem[] = (() => {
    try {
      return JSON.parse(params.answers ?? '[]')
    } catch {
      return []
    }
  })()

  const emoji   = passed ? '🎉' : '💪'
  const heading = passed ? 'Great Work!' : 'Keep Practicing'
  const subtext = passed
    ? 'You passed! Keep up the momentum.'
    : `You need ${params.needed} correct to pass. Try again!`

  const handleRetry = () => {
    router.replace({
      pathname: '/study/[id]',
      params: {
        id:    params.attemptId ?? '',
        mode,
        title,
      },
    })
  }

  const handleDone = () => {
    router.dismissAll()
    router.replace('/(tabs)/study')
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Close */}
      <TouchableOpacity
        style={styles.closeButton}
        onPress={handleDone}
      >
        <Ionicons name="close" size={20} color={Colors.textSecondary} />
      </TouchableOpacity>

      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroEmoji}>{emoji}</Text>
        <Text style={styles.heroTitle}>{heading}</Text>
        <Text style={styles.heroSub}>{subtext}</Text>
      </View>

      {/* Score Ring */}
      <View style={styles.ringSection}>
        <ScoreRing
          correct={correct}
          total={total}
          passed={passed}
        />
      </View>

      {/* Breakdown */}
      {answers.length > 0 && (
        <View style={styles.breakdown}>
          <Text style={styles.breakdownLabel}>BREAKDOWN</Text>
          {answers.map((answer, index) => (
            <BreakdownCard key={index} answer={answer} />
          ))}
        </View>
      )}

      {/* Action Button */}
      <TouchableOpacity
        style={styles.actionButton}
        onPress={passed ? handleDone : handleRetry}
        activeOpacity={0.8}
      >
        <Text style={styles.actionButtonText}>
          {passed ? 'Done' : 'Retry Quiz'}
        </Text>
      </TouchableOpacity>
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
  container: {
    paddingHorizontal: Spacing.base,
    paddingTop:        Spacing.xl + 32,
    paddingBottom:     Spacing.xxxl,
    gap:               Spacing.xl,
  },

  // Close
  closeButton: {
    alignSelf:       'flex-end',
    width:           36,
    height:          36,
    borderRadius:    Radius.full,
    backgroundColor: Colors.card,
    borderWidth:     1,
    borderColor:     Colors.border,
    alignItems:      'center',
    justifyContent:  'center',
  },

  // Hero
  hero: {
    alignItems: 'center',
    gap:        Spacing.sm,
  },
  heroEmoji: {
    fontSize:     56,
    marginBottom: Spacing.sm,
  },
  heroTitle: {
    fontSize:   Typography.xxl,
    fontWeight: Typography.bold,
    color:      Colors.textPrimary,
    textAlign:  'center',
  },
  heroSub: {
    fontSize:  Typography.sm,
    color:     Colors.textSecondary,
    textAlign: 'center',
  },

  // Ring
  ringSection: {
    alignItems: 'center',
  },
  ringWrapper: {
    alignItems:     'center',
    justifyContent: 'center',
  },
  ringCenter: {
    position:       'absolute',
    alignItems:     'center',
    justifyContent: 'center',
  },
  ringFraction: {
    fontSize:   Typography.xxl,
    fontWeight: Typography.bold,
  },
  ringPct: {
    fontSize:   Typography.base,
    fontWeight: Typography.medium,
    marginTop:  2,
  },

  // Breakdown
  breakdown: { gap: Spacing.md },
  breakdownLabel: {
    fontSize:      Typography.xs,
    fontWeight:    Typography.bold,
    color:         Colors.textSecondary,
    letterSpacing: 1,
  },
  breakdownCard: {
    borderRadius: Radius.lg,
    borderWidth:  1,
    padding:      Spacing.base,
    gap:          Spacing.sm,
  },
  questionText: {
    fontSize:   Typography.base,
    fontWeight: Typography.medium,
    color:      Colors.textPrimary,
    lineHeight: Typography.base * 1.5,
  },
  correctText: {
    fontSize:   Typography.sm,
    color:      Colors.success,
    fontWeight: Typography.medium,
  },

  // Explanation
  explanationDivider: {
    height:          1,
    backgroundColor: Colors.border + '44',
    marginVertical:  Spacing.xs,
  },
  explanationToggle: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.xs,
  },
  explanationToggleText: {
    fontSize:   Typography.xs,
    fontWeight: Typography.medium,
    color:      Colors.primary,
  },
  explanationText: {
    fontSize:   Typography.sm,
    color:      Colors.textSecondary,
    lineHeight: Typography.sm * 1.6,
  },

  // Action Button
  actionButton: {
    backgroundColor: Colors.primary,
    borderRadius:    Radius.md,
    paddingVertical: Spacing.md,
    alignItems:      'center',
  },
  actionButtonText: {
    fontSize:   Typography.base,
    fontWeight: Typography.semibold,
    color:      Colors.textInverse,
  },
})