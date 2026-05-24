

import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet
  } from 'react-native'
  import { useLocalSearchParams, router } from 'expo-router'
  import Svg, { Circle } from 'react-native-svg'
  import { Colors, Spacing, Radius, Typography } from '@/constants/theme'
  
  // ─────────────────────────────────────────
  // MOCK BREAKDOWN — replaced with real data later
  // ─────────────────────────────────────────
  const MOCK_BREAKDOWN = [
    { id: '1', question: 'What is the primary pigment responsible for capturing light energy in photosynthesis?', correct: 'Chlorophyll',       wasCorrect: false },
    { id: '2', question: 'Where do the light reactions of photosynthesis take place?',                           correct: 'Thylakoid membrane', wasCorrect: true  },
    { id: '3', question: 'What is the final product of the Calvin Cycle?',                                       correct: 'G3P (Glucose)',      wasCorrect: true  },
  ]
  
  // ─────────────────────────────────────────
  // SPLIT CIRCLE (correct=cyan, wrong=red)
  // ─────────────────────────────────────────
  function ResultCircle({ correct, total, passed }: {
    correct: number
    total:   number
    passed:  boolean
  }) {
    const size         = 140
    const strokeWidth  = 10
    const radius       = (size - strokeWidth) / 2
    const circumference = 2 * Math.PI * radius
    const percent      = total > 0 ? correct / total : 0
    const correctDash  = circumference * percent
    const wrongDash    = circumference * (1 - percent)
  
    const ringColor = passed ? Colors.success : Colors.primary
  
    return (
      <View style={styles.circleWrapper}>
        <Svg width={size} height={size}>
          {/* Track */}
          <Circle
            cx={size / 2} cy={size / 2} r={radius}
            stroke={Colors.progressTrack}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Wrong portion (red) — drawn first, full circle */}
          {!passed && correct < total && (
            <Circle
              cx={size / 2} cy={size / 2} r={radius}
              stroke={Colors.error}
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={0}
              rotation="-90"
              origin={`${size / 2}, ${size / 2}`}
            />
          )}
          {/* Correct portion (cyan or green) — drawn on top */}
          {correct > 0 && (
            <Circle
              cx={size / 2} cy={size / 2} r={radius}
              stroke={ringColor}
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={`${correctDash} ${circumference - correctDash}`}
              strokeDashoffset={0}
              rotation="-90"
              origin={`${size / 2}, ${size / 2}`}
              strokeLinecap="round"
            />
          )}
        </Svg>
        <View style={styles.circleCenter}>
          <Text style={styles.circleScore}>{correct}/{total}</Text>
          <Text style={styles.circlePercent}>
            {Math.round(percent * 100)}%
          </Text>
        </View>
      </View>
    )
  }
  
  // ─────────────────────────────────────────
  // BREAKDOWN CARD
  // ─────────────────────────────────────────
  function BreakdownCard({ item }: { item: typeof MOCK_BREAKDOWN[0] }) {
    return (
      <View style={[
        styles.breakdownCard,
        item.wasCorrect ? styles.breakdownCorrect : styles.breakdownWrong
      ]}>
        <Text style={styles.breakdownQuestion}>{item.question}</Text>
        {!item.wasCorrect && (
          <Text style={styles.breakdownAnswer}>Correct: {item.correct}</Text>
        )}
      </View>
    )
  }
  
  // ─────────────────────────────────────────
  // MAIN SCREEN
  // ─────────────────────────────────────────
  export default function ResultsScreen() {
    const params  = useLocalSearchParams()
    const correct = Number(params.correct ?? 2)
    const total   = Number(params.total   ?? 3)
    const needed  = Number(params.needed  ?? 3)
    const passed  = correct >= needed
    const xp      = correct * 10 + (passed ? 20 : 0)
  
    return (
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Result Header */}
        <View style={styles.header}>
          <Text style={styles.emoji}>{passed ? '🎉' : '💪'}</Text>
          <Text style={styles.title}>
            {passed ? 'Lesson Passed!' : 'Keep Practicing'}
          </Text>
        </View>
  
        {/* Score Circle */}
        <View style={styles.circleSection}>
          <ResultCircle correct={correct} total={total} passed={passed} />
        </View>
  
        {/* XP Badge — only on pass */}
        {passed && (
          <View style={styles.xpCard}>
            <Text style={styles.xpText}>+{xp} XP Earned!</Text>
          </View>
        )}
  
        {/* Breakdown */}
        <View style={styles.breakdownSection}>
          <Text style={styles.breakdownLabel}>BREAKDOWN</Text>
          <View style={styles.breakdownList}>
            {MOCK_BREAKDOWN.map((item) => (
              <BreakdownCard key={item.id} item={item} />
            ))}
          </View>
        </View>
  
        {/* Action Button */}
        {passed ? (
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.replace('/(tabs)')}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Next Lesson</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Retry Quiz</Text>
          </TouchableOpacity>
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
    container: {
      paddingHorizontal: Spacing.base,
      paddingTop:        Spacing.xl + 32,
      paddingBottom:     Spacing.xxxl,
      gap:               Spacing.xl,
    },
  
    // Header
    header: {
      alignItems: 'center',
      gap:        Spacing.sm,
    },
    emoji: {
      fontSize: 56,
    },
    title: {
      fontSize:   Typography.xxl,
      fontWeight: Typography.bold,
      color:      Colors.textPrimary,
      textAlign:  'center',
    },
  
    // Circle
    circleSection: {
      alignItems: 'center',
    },
    circleWrapper: {
      alignItems:     'center',
      justifyContent: 'center',
    },
    circleCenter: {
      position:       'absolute',
      alignItems:     'center',
      justifyContent: 'center',
    },
    circleScore: {
      fontSize:   Typography.xxl,
      fontWeight: Typography.bold,
      color:      Colors.textPrimary,
    },
    circlePercent: {
      fontSize:  Typography.sm,
      color:     Colors.textSecondary,
      marginTop: 2,
    },
  
    // XP
    xpCard: {
      backgroundColor: Colors.primaryMuted,
      borderWidth:     1,
      borderColor:     Colors.primaryBorder,
      borderRadius:    Radius.lg,
      paddingVertical: Spacing.md,
      alignItems:      'center',
    },
    xpText: {
      fontSize:   Typography.md,
      fontWeight: Typography.bold,
      color:      Colors.primary,
    },
  
    // Breakdown
    breakdownSection: { gap: Spacing.sm },
    breakdownLabel: {
      fontSize:      Typography.xs,
      fontWeight:    Typography.bold,
      color:         Colors.textMuted,
      letterSpacing: 1,
    },
    breakdownList: { gap: Spacing.sm },
    breakdownCard: {
      borderRadius: Radius.lg,
      borderWidth:  1,
      padding:      Spacing.md,
      gap:          Spacing.sm,
    },
    breakdownCorrect: {
      backgroundColor: Colors.successMuted,
      borderColor:     Colors.answerBorderCorrect,
    },
    breakdownWrong: {
      backgroundColor: Colors.errorMuted,
      borderColor:     Colors.answerBorderWrong,
    },
    breakdownQuestion: {
      fontSize:   Typography.sm,
      color:      Colors.textPrimary,
      lineHeight: Typography.sm * 1.6,
    },
    breakdownAnswer: {
      fontSize:   Typography.sm,
      color:      Colors.success,
      fontWeight: Typography.medium,
    },
  
    // Button
    button: {
      backgroundColor: Colors.primary,
      borderRadius:    Radius.md,
      paddingVertical: Spacing.md,
      alignItems:      'center',
    },
    buttonText: {
      fontSize:   Typography.base,
      fontWeight: Typography.semibold,
      color:      Colors.textInverse,
    },
  })