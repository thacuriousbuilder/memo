

import {
    View, Text, ScrollView, TouchableOpacity,
    StyleSheet, Dimensions, Animated
  } from 'react-native'
  import { useState, useRef } from 'react'
  import { router } from 'expo-router'
  import Svg, { Circle } from 'react-native-svg'
  import { Ionicons } from '@expo/vector-icons'
  import { Colors, Spacing, Radius, Typography } from '@/constants/theme'
  
  const { width } = Dimensions.get('window')
  
  // ─────────────────────────────────────────
  // MOCK DATA — replaced with real questions later
  // ─────────────────────────────────────────
  const MOCK_QUIZ = {
    courseTitle:    'Biology 101',
    lessonTitle:    'Photosynthesis',
    correctNeeded:  3,
    questions: [
      {
        id:      '1',
        text:    'What is the primary pigment responsible for capturing light energy in photosynthesis?',
        options: ['Carotene', 'Chlorophyll', 'Xanthophyll', 'Phycocyanin'],
        correct: 1,
      },
      {
        id:      '2',
        text:    'Where does the light-dependent reaction of photosynthesis take place?',
        options: ['Stroma', 'Cytoplasm', 'Thylakoid membrane', 'Mitochondria'],
        correct: 2,
      },
      {
        id:      '3',
        text:    'What is the main product of the Calvin cycle?',
        options: ['ATP', 'Glucose', 'Oxygen', 'NADPH'],
        correct: 1,
      },
    ],
  }
  
  // ─────────────────────────────────────────
  // CIRCULAR PROGRESS RING (SVG)
  // ─────────────────────────────────────────
  function CircularProgress({ percent }: { percent: number }) {
    const size        = 120
    const strokeWidth = 10
    const radius      = (size - strokeWidth) / 2
    const circumference = 2 * Math.PI * radius
    const strokeDash  = circumference - (percent / 100) * circumference
  
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
          {/* Progress — cyan */}
          <Circle
            cx={size / 2} cy={size / 2} r={radius}
            stroke={Colors.primary}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDash}
            strokeLinecap="round"
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
          {/* Threshold marker — purple */}
          <Circle
            cx={size / 2} cy={size / 2} r={radius}
            stroke="#8B5CF6"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={`4 ${circumference - 4}`}
            strokeDashoffset={circumference * 0.2}
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>
        <View style={styles.ringCenter}>
          <Text style={styles.ringPercent}>{percent}%</Text>
        </View>
      </View>
    )
  }
  
  // ─────────────────────────────────────────
  // OPTION BUTTON
  // ─────────────────────────────────────────
  function OptionButton({
    label, text, state, onPress
  }: {
    label:    string
    text:     string
    state:    'default' | 'correct' | 'wrong'
    onPress:  () => void
  }) {
    const bgColor = {
      default: Colors.card,
      correct: Colors.answerCorrect,
      wrong:   Colors.answerWrong,
    }[state]
  
    const borderColor = {
      default: Colors.border,
      correct: Colors.answerBorderCorrect,
      wrong:   Colors.answerBorderWrong,
    }[state]
  
    const labelBg = {
      default: Colors.cardElevated,
      correct: Colors.answerBorderCorrect,
      wrong:   Colors.answerBorderWrong,
    }[state]
  
    return (
      <TouchableOpacity
        style={[styles.option, { backgroundColor: bgColor, borderColor }]}
        onPress={onPress}
        activeOpacity={0.8}
        disabled={state !== 'default'}
      >
        <View style={[styles.optionLabel, { backgroundColor: labelBg }]}>
          <Text style={styles.optionLabelText}>{label}</Text>
        </View>
        <Text style={styles.optionText}>{text}</Text>
        {state === 'correct' && (
          <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
        )}
        {state === 'wrong' && (
          <Ionicons name="close-circle" size={20} color={Colors.error} />
        )}
      </TouchableOpacity>
    )
  }
  
  // ─────────────────────────────────────────
  // MAIN SCREEN
  // ─────────────────────────────────────────
  export default function StudyScreen() {
    const [currentIndex,    setCurrentIndex]    = useState(0)
    const [selectedOption,  setSelectedOption]  = useState<number | null>(null)
    const [correctCount,    setCorrectCount]    = useState(0)
    const [showNext,        setShowNext]        = useState(false)
  
    const total    = MOCK_QUIZ.questions.length
    const current  = MOCK_QUIZ.questions[currentIndex]
    const percent  = Math.round(((currentIndex) / total) * 100)
    const LABELS   = ['A', 'B', 'C', 'D']
  
    const handleSelect = (index: number) => {
      if (selectedOption !== null) return
      setSelectedOption(index)
      if (index === current.correct) {
        setCorrectCount(prev => prev + 1)
      }
      setShowNext(true)
    }
  
    const handleNext = () => {
      if (currentIndex + 1 >= total) {
        // Navigate to results
        router.push({
          pathname: '/results',
          params: {
            correct: correctCount + (selectedOption === current.correct ? 1 : 0),
            total,
            needed: MOCK_QUIZ.correctNeeded,
          }
        })
        return
      }
      setCurrentIndex(prev => prev + 1)
      setSelectedOption(null)
      setShowNext(false)
    }
  
    const getOptionState = (index: number): 'default' | 'correct' | 'wrong' => {
      if (selectedOption === null)        return 'default'
      if (index === current.correct)      return 'correct'
      if (index === selectedOption)       return 'wrong'
      return 'default'
    }
  
    return (
      <View style={styles.root}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.courseTitle}>{MOCK_QUIZ.courseTitle}</Text>
            <Text style={styles.questionCount}>
              Question {currentIndex + 1} of {total}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
  
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* Circular Progress */}
          <View style={styles.progressWrapper}>
            <CircularProgress percent={percent} />
          </View>
  
          {/* Question Card */}
          <View style={styles.questionCard}>
            <Text style={styles.questionText}>{current.text}</Text>
          </View>
  
          {/* Options */}
          <View style={styles.optionsList}>
            {current.options.map((option, index) => (
              <OptionButton
                key={index}
                label={LABELS[index]}
                text={option}
                state={getOptionState(index)}
                onPress={() => handleSelect(index)}
              />
            ))}
          </View>
  
          {/* Correct needed hint */}
          <Text style={styles.hintText}>
            {MOCK_QUIZ.correctNeeded} correct needed to advance
          </Text>
  
          {/* Next Button */}
          {showNext && (
            <TouchableOpacity
              style={styles.nextButton}
              onPress={handleNext}
              activeOpacity={0.8}
            >
              <Text style={styles.nextButtonText}>
                {currentIndex + 1 >= total ? 'See Results' : 'Next Question'}
              </Text>
              <Ionicons name="arrow-forward" size={18} color={Colors.textInverse} />
            </TouchableOpacity>
          )}
        </ScrollView>
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
    topBar: {
      flexDirection:     'row',
      justifyContent:    'space-between',
      alignItems:        'flex-start',
      paddingHorizontal: Spacing.base,
      paddingTop:        Spacing.xl + 32,
      paddingBottom:     Spacing.md,
    },
    courseTitle: {
      fontSize:   Typography.sm,
      fontWeight: Typography.semibold,
      color:      Colors.textPrimary,
    },
    questionCount: {
      fontSize:  Typography.xs,
      color:     Colors.textMuted,
      marginTop: 2,
    },
    closeButton: {
      width:           36,
      height:          36,
      borderRadius:    Radius.full,
      backgroundColor: Colors.card,
      alignItems:      'center',
      justifyContent:  'center',
    },
    container: {
      paddingHorizontal: Spacing.base,
      paddingBottom:     Spacing.xxxl,
      gap:               Spacing.lg,
    },
  
    // Ring
    ringWrapper: {
      alignSelf:      'center',
      alignItems:     'center',
      justifyContent: 'center',
    },
    ringCenter: {
      position:       'absolute',
      alignItems:     'center',
      justifyContent: 'center',
    },
    ringPercent: {
      fontSize:   Typography.xl,
      fontWeight: Typography.bold,
      color:      Colors.textPrimary,
    },
    progressWrapper: {
      alignItems: 'center',
      marginVertical: Spacing.sm,
    },
  
    // Question
    questionCard: {
      backgroundColor: Colors.card,
      borderRadius:    Radius.lg,
      borderWidth:     1,
      borderColor:     Colors.border,
      padding:         Spacing.lg,
    },
    questionText: {
      fontSize:   Typography.md,
      fontWeight: Typography.medium,
      color:      Colors.textPrimary,
      lineHeight: Typography.md * 1.6,
    },
  
    // Options
    optionsList: {
      gap: Spacing.sm,
    },
    option: {
      flexDirection:     'row',
      alignItems:        'center',
      gap:               Spacing.md,
      borderRadius:      Radius.lg,
      borderWidth:       1,
      paddingVertical:   Spacing.md,
      paddingHorizontal: Spacing.md,
    },
    optionLabel: {
      width:           36,
      height:          36,
      borderRadius:    Radius.full,
      alignItems:      'center',
      justifyContent:  'center',
    },
    optionLabelText: {
      fontSize:   Typography.sm,
      fontWeight: Typography.bold,
      color:      Colors.textPrimary,
    },
    optionText: {
      flex:       1,
      fontSize:   Typography.base,
      color:      Colors.textPrimary,
    },
  
    // Hint
    hintText: {
      textAlign:  'center',
      fontSize:   Typography.xs,
      color:      Colors.textMuted,
      marginTop:  Spacing.sm,
    },
  
    // Next Button
    nextButton: {
      flexDirection:     'row',
      alignItems:        'center',
      justifyContent:    'center',
      gap:               Spacing.sm,
      backgroundColor:   Colors.primary,
      borderRadius:      Radius.md,
      paddingVertical:   Spacing.md,
      marginTop:         Spacing.sm,
    },
    nextButtonText: {
      fontSize:   Typography.base,
      fontWeight: Typography.semibold,
      color:      Colors.textInverse,
    },
  })