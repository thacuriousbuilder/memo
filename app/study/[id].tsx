

import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator
} from 'react-native'
import { useEffect, useState } from 'react'
import { useLocalSearchParams, router } from 'expo-router'
import Svg, { Circle } from 'react-native-svg'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { Colors, Spacing, Radius, Typography, CardBase } from '@/constants/theme'
import { useSession } from '@/hooks/useSession'
import {
  fetchQuestions,
  saveQuizAttempt,
  QuizQuestion,
  QuizMode,
  AttemptAnswer,
} from '@/hooks/useQuiz'

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────
type QuizStep    = 'setup' | 'loading' | 'quiz' | 'empty'
type QuizCount   = number
type AnswerState = 'default' | 'correct' | 'wrong'

const LABELS = ['A', 'B', 'C', 'D']

// ─────────────────────────────────────────
// DIFFICULTY BADGE
// ─────────────────────────────────────────
function DifficultyBadge({ level }: { level: string | null }) {
  if (!level) return null
  const colors: Record<string, { bg: string; text: string }> = {
    easy:   { bg: Colors.successMuted, text: Colors.success },
    medium: { bg: Colors.warningMuted, text: Colors.warning },
    hard:   { bg: Colors.errorMuted,   text: Colors.error   },
  }
  const c = colors[level] ?? colors.medium
  return (
    <View style={[styles.diffBadge, { backgroundColor: c.bg }]}>
      <Text style={[styles.diffText, { color: c.text }]}>
        {level.charAt(0).toUpperCase() + level.slice(1)}
      </Text>
    </View>
  )
}

// ─────────────────────────────────────────
// CIRCULAR PROGRESS
// ─────────────────────────────────────────
function CircularProgress({ percent }: { percent: number }) {
  const size        = 120
  const strokeWidth = 10
  const radius      = (size - strokeWidth) / 2
  const circ        = 2 * Math.PI * radius
  const offset      = circ - (percent / 100) * circ

  return (
    <View style={styles.ringWrapper}>
      <Svg width={size} height={size}>
        <Circle
          cx={size/2} cy={size/2} r={radius}
          stroke={Colors.progressTrack}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <Circle
          cx={size/2} cy={size/2} r={radius}
          stroke={Colors.primary}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size/2}, ${size/2}`}
        />
        {/* 80% threshold marker */}
        <Circle
          cx={size/2} cy={size/2} r={radius}
          stroke="#8B5CF6"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={`4 ${circ - 4}`}
          strokeDashoffset={circ * 0.2}
          rotation="-90"
          origin={`${size/2}, ${size/2}`}
        />
      </Svg>
      <View style={styles.ringCenter}>
        <Text style={styles.ringPct}>{percent}%</Text>
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
  label:   string
  text:    string
  state:   AnswerState
  onPress: () => void
}) {
  const bg     = { default: Colors.card, correct: Colors.answerCorrect, wrong: Colors.answerWrong }[state]
  const border = { default: Colors.border, correct: Colors.answerBorderCorrect, wrong: Colors.answerBorderWrong }[state]
  const labelBg = { default: Colors.cardElevated, correct: Colors.answerBorderCorrect, wrong: Colors.answerBorderWrong }[state]

  return (
    <TouchableOpacity
      style={[styles.option, { backgroundColor: bg, borderColor: border }]}
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
// SETUP SCREEN
// ─────────────────────────────────────────
function SetupScreen({
  title, mode, onStart
}: {
  title:   string
  mode:    QuizMode
  onStart: (count: QuizCount) => void
}) {
  const [selected, setSelected] = useState<QuizCount | null>(null)

  const counts: { value: QuizCount; label: string; desc: string }[] = [
    { value: 5,  label: '5 Questions',  desc: 'Quick review  ~5 min'  },
    { value: 10, label: '10 Questions', desc: 'Standard ~10 min'     },
    { value: 15, label: '15 Questions', desc: 'Deep study ~15 min'   },
  ]

  const modeLabel: Record<QuizMode, string> = {
    lesson:     'Lesson Quiz',
    sublesson:  'Sub-lesson Quiz',
    lesson_all: 'Full Lesson Quiz',
    section:    'Section Quiz',
    course:     'Subject Quiz',
    quick:      'Quick Quiz',
    review:     'Review Mistakes',
    practice:   'Practice Quiz',
    custom:      'Selected Quiz'
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.setupContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Close */}
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => router.back()}
      >
        <Ionicons name="close" size={20} color={Colors.textSecondary} />
      </TouchableOpacity>

      {/* Header */}
      <View style={styles.setupHeader}>
        <View style={styles.setupIconWrapper}>
          <MaterialCommunityIcons name="brain" size={36} color={Colors.primary} />
        </View>
        <Text style={styles.setupMode}>{modeLabel[mode]}</Text>
        <Text style={styles.setupTitle}>{title}</Text>
        <Text style={styles.setupSubtitle}>
          How many questions do you want?
        </Text>
      </View>

      {/* Count Selector */}
      <View style={styles.countList}>
        {counts.map(({ value, label, desc }) => (
          <TouchableOpacity
            key={value}
            style={[
              styles.countCard,
              selected === value && styles.countCardActive,
            ]}
            onPress={() => setSelected(value)}
            activeOpacity={0.8}
          >
            <View style={styles.countLeft}>
              <Text style={[
                styles.countLabel,
                selected === value && styles.countLabelActive,
              ]}>
                {label}
              </Text>
              <Text style={styles.countDesc}>{desc}</Text>
            </View>
            <View style={[
              styles.countRadio,
              selected === value && styles.countRadioActive,
            ]}>
              {selected === value && (
                <View style={styles.countRadioInner} />
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Threshold note */}
      <View style={styles.thresholdNote}>
        <Ionicons
          name="information-circle-outline"
          size={16}
          color={Colors.textMuted}
        />
        <Text style={styles.thresholdText}>
          You need 80% correct to pass this lesson
        </Text>
      </View>

      {/* Start */}
      <TouchableOpacity
        style={[
          styles.startButton,
          !selected && styles.startButtonDisabled,
        ]}
        onPress={() => selected && onStart(selected)}
        disabled={!selected}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons
          name="brain"
          size={20}
          color={Colors.textInverse}
        />
        <Text style={styles.startButtonText}>Start Quiz</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

// ─────────────────────────────────────────
// QUIZ SCREEN
// ─────────────────────────────────────────
function QuizScreen({
  title,
  questions,
  onFinish,
}: {
  title:     string
  questions: QuizQuestion[]
  onFinish:  (
    correct:  number,
    total:    number,
    answers:  AttemptAnswer[]
  ) => void
}) {
  const [currentIdx,     setCurrentIdx]     = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [correctCount,   setCorrectCount]   = useState(0)
  const [showNext,       setShowNext]       = useState(false)
  const [answers,        setAnswers]        = useState<AttemptAnswer[]>([])

  const total   = questions.length
  const current = questions[currentIdx]
  const percent = Math.round((currentIdx / total) * 100)
  const needed  = Math.ceil(total * 0.8)

  const handleSelect = (index: number) => {
    if (selectedOption !== null) return

    const isCorrect = index === current.correct_option_index
    const newAnswer: AttemptAnswer = {
      questionId: current.id,
      selectedIndex: index,
      isCorrect,
      correctIndex: current.correct_option_index,
      questionText: current.question_text,
      correctText: current.answer_options.find(
        o => o.option_index === current.correct_option_index
      )?.option_text ?? '',
      explanation: null
    }

    if (isCorrect) setCorrectCount(prev => prev + 1)
    setSelectedOption(index)
    setShowNext(true)
    setAnswers(prev => [...prev, newAnswer])
  }

  const handleNext = () => {
    if (currentIdx + 1 >= total) {
      onFinish(correctCount, total, answers)
      return
    }
    setCurrentIdx(prev => prev + 1)
    setSelectedOption(null)
    setShowNext(false)
  }

  const getOptionState = (index: number): AnswerState => {
    if (selectedOption === null)                return 'default'
    if (index === current.correct_option_index) return 'correct'
    if (index === selectedOption)               return 'wrong'
    return 'default'
  }

  return (
    <View style={styles.root}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.topBarTitle}>{title}</Text>
          <Text style={styles.topBarCount}>
            Question {currentIdx + 1} of {total}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => Alert.alert(
            'Quit Quiz',
            'Your progress will be lost.',
            [
              { text: 'Keep Going', style: 'cancel' },
              { text: 'Quit', style: 'destructive',
                onPress: () => router.back() },
            ]
          )}
        >
          <Ionicons name="close" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.quizContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Ring */}
        <View style={styles.progressWrapper}>
          <CircularProgress percent={percent} />
        </View>

        {/* Meta */}
        <View style={styles.questionMeta}>
          <DifficultyBadge level={current.difficulty} />
          {current.topic && (
            <Text style={styles.questionTopic}>{current.topic}</Text>
          )}
        </View>

        {/* Question */}
        <View style={styles.questionCard}>
          <Text style={styles.questionText}>{current.question_text}</Text>
        </View>

        {/* Options */}
        <View style={styles.optionsList}>
          {current.answer_options.map(opt => (
            <OptionButton
              key={opt.option_index}
              label={LABELS[opt.option_index]}
              text={opt.option_text}
              state={getOptionState(opt.option_index)}
              onPress={() => handleSelect(opt.option_index)}
            />
          ))}
        </View>

        {/* Explanation */}
        {showNext && current.explanation && (
          <View style={[
            styles.explanationCard,
            {
              backgroundColor:
                selectedOption === current.correct_option_index
                  ? Colors.successMuted : Colors.errorMuted,
              borderColor:
                selectedOption === current.correct_option_index
                  ? Colors.answerBorderCorrect : Colors.answerBorderWrong,
            }
          ]}>
            <Ionicons
              name={selectedOption === current.correct_option_index
                ? 'checkmark-circle' : 'information-circle'}
              size={18}
              color={selectedOption === current.correct_option_index
                ? Colors.success : Colors.error}
            />
            <Text style={styles.explanationText}>
              {current.explanation}
            </Text>
          </View>
        )}

        {/* Hint + Score */}
        <Text style={styles.hintText}>
          {needed} correct needed to pass
        </Text>
        <View style={styles.scoreTracker}>
          <Text style={styles.scoreTrackerText}>
            ✓ {correctCount} correct
          </Text>
          {currentIdx > 0 && (
            <Text style={styles.scoreTrackerPct}>
              {Math.round(
                (correctCount / (currentIdx + (showNext ? 1 : 0))) * 100
              )}%
            </Text>
          )}
        </View>

        {/* Next */}
        {showNext && (
          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <Text style={styles.nextButtonText}>
              {currentIdx + 1 >= total ? 'See Results' : 'Next Question'}
            </Text>
            <Ionicons name="arrow-forward" size={18} color={Colors.textInverse} />
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  )
}

// ─────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────
function EmptyScreen({ title }: { title: string }) {
  return (
    <View style={[styles.root, styles.center]}>
      <MaterialCommunityIcons
        name="brain"
        size={48}
        color={Colors.textMuted}
      />
      <Text style={styles.emptyTitle}>No Questions Yet</Text>
      <Text style={styles.emptySubtitle}>
        Upload notes to "{title}" and generate questions first.
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => router.back()}
      >
        <Text style={styles.emptyButtonText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  )
}

// ─────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────
export default function StudySessionScreen() {
  const params = useLocalSearchParams<{
    id:       string
    mode:     string
    title:    string
    noteIds?: string
    presetCount?: string
  }>()

  const { user }  = useSession()
  const mode      = (params.mode ?? 'lesson') as QuizMode
  const title     = params.title ?? 'Quiz'
  const id        = params.id ?? ''

  const [step, setStep] = useState<QuizStep>(params.presetCount ? 'loading' : 'setup')
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [saving,    setSaving]    = useState(false)
  
  useEffect(() => {
    if (params.presetCount && user) {
      handleStart(Number(params.presetCount) as QuizCount)
    }
  }, [user])
  
  const handleStart = async (count: QuizCount) => {
    if (!user) return
    try {
      setStep('loading')
      const parsedNoteIds = params.noteIds ? JSON.parse(params.noteIds) : undefined
  
      const qs = await fetchQuestions({
        mode:    mode,
        id,
        count,
        userId:  user.id,
        noteIds: parsedNoteIds,
      })
  
      if (!qs.length) {
        setStep('empty')
        return
      }
  
      setQuestions(qs)
      setStep('quiz')
    } catch (err: any) {
      Alert.alert('Error', err.message)
      setStep('setup')
    }
  }

  const handleFinish = async (
    correct: number,
    total:   number,
    answers: AttemptAnswer[]
  ) => {
    if (!user) return
    try {
      setSaving(true)
      const { passed } = await saveQuizAttempt({
        userId:        user.id,
        mode,
        id,
        questionCount: total,
        score:         correct,
        answers,
      })

      router.replace({
        pathname: '/results',
        params: {
          correct,
          total,
          needed:    Math.ceil(total * 0.8),
          title,
          passed:    passed ? '1' : '0',
          mode,
          scopeId:   id,
          answers:   JSON.stringify(answers),
        },
      })
    } catch (err: any) {
      Alert.alert('Error saving results', err.message)
    } finally {
      setSaving(false)
    }
  }

  if (step === 'loading' || saving) return (
    <View style={[styles.root, styles.center]}>
      <ActivityIndicator color={Colors.primary} size="large" />
      <Text style={styles.loadingText}>
        {saving ? 'Saving results...' : 'Preparing your quiz...'}
      </Text>
    </View>
  )

  if (step === 'empty') return <EmptyScreen title={title} />

  if (step === 'setup') return (
    <SetupScreen
      title={title}
      mode={mode}
      onStart={handleStart}
    />
  )

  return (
    <QuizScreen
      title={title}
      questions={questions}
      onFinish={handleFinish}
    />
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
    alignItems:     'center',
    justifyContent: 'center',
    gap:            Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  loadingText: {
    fontSize:  Typography.sm,
    color:     Colors.textSecondary,
    marginTop: Spacing.sm,
  },

  // Setup
  setupContainer: {
    paddingHorizontal: Spacing.base,
    paddingTop:        Spacing.xl + 32,
    paddingBottom:     Spacing.xxxl,
    gap:               Spacing.xl,
  },
  setupHeader: {
    alignItems: 'center',
    gap:        Spacing.sm,
  },
  setupIconWrapper: {
    width:           80,
    height:          80,
    borderRadius:    Radius.full,
    backgroundColor: Colors.primaryMuted,
    borderWidth:     1,
    borderColor:     Colors.primaryBorder,
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    Spacing.sm,
  },
  setupMode: {
    fontSize:      Typography.xs,
    fontWeight:    Typography.bold,
    color:         Colors.primary,
    letterSpacing: 1,
  },
  setupTitle: {
    fontSize:   Typography.xxl,
    fontWeight: Typography.bold,
    color:      Colors.textPrimary,
    textAlign:  'center',
  },
  setupSubtitle: {
    fontSize:  Typography.sm,
    color:     Colors.textSecondary,
    textAlign: 'center',
  },
  countList: { gap: Spacing.md },
  countCard: {
    ...CardBase,
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    padding:        Spacing.base,
  },
  countCardActive: {
    borderColor:     Colors.primary,
    borderWidth:     1.5,
    backgroundColor: Colors.primaryMuted,
  },
  countLeft:  { gap: 4 },
  countLabel: {
    fontSize:   Typography.base,
    fontWeight: Typography.semibold,
    color:      Colors.textPrimary,
  },
  countLabelActive: { color: Colors.primary },
  countDesc: {
    fontSize: Typography.xs,
    color:    Colors.textSecondary,
  },
  countRadio: {
    width:          22,
    height:         22,
    borderRadius:   Radius.full,
    borderWidth:    2,
    borderColor:    Colors.border,
    alignItems:     'center',
    justifyContent: 'center',
  },
  countRadioActive:  { borderColor: Colors.primary },
  countRadioInner: {
    width:           12,
    height:          12,
    borderRadius:    Radius.full,
    backgroundColor: Colors.primary,
  },
  thresholdNote: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             Spacing.sm,
    backgroundColor: Colors.card,
    borderRadius:    Radius.md,
    padding:         Spacing.md,
    borderWidth:     1,
    borderColor:     Colors.border,
  },
  thresholdText: {
    flex:     1,
    fontSize: Typography.xs,
    color:    Colors.textMuted,
  },
  startButton: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius:    Radius.md,
    paddingVertical: Spacing.md,
  },
  startButtonDisabled: { opacity: 0.4 },
  startButtonText: {
    fontSize:   Typography.base,
    fontWeight: Typography.semibold,
    color:      Colors.textInverse,
  },

  // Close button
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

  // Quiz Top Bar
  topBar: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'flex-start',
    paddingHorizontal: Spacing.base,
    paddingTop:        Spacing.xl + 32,
    paddingBottom:     Spacing.md,
  },
  topBarTitle: {
    fontSize:   Typography.sm,
    fontWeight: Typography.semibold,
    color:      Colors.textPrimary,
  },
  topBarCount: {
    fontSize:  Typography.xs,
    color:     Colors.textMuted,
    marginTop: 2,
  },
  quizContainer: {
    paddingHorizontal: Spacing.base,
    paddingBottom:     Spacing.xxxl,
    gap:               Spacing.lg,
  },
  progressWrapper: {
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
  ringPct: {
    fontSize:   Typography.xl,
    fontWeight: Typography.bold,
    color:      Colors.textPrimary,
  },
  questionMeta: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.sm,
  },
  diffBadge: {
    borderRadius:      Radius.full,
    paddingVertical:   3,
    paddingHorizontal: Spacing.sm,
  },
  diffText: {
    fontSize:   Typography.xs,
    fontWeight: Typography.semibold,
  },
  questionTopic: {
    fontSize: Typography.xs,
    color:    Colors.textMuted,
  },
  questionCard: {
    ...CardBase,
    padding: Spacing.lg,
  },
  questionText: {
    fontSize:   Typography.md,
    fontWeight: Typography.medium,
    color:      Colors.textPrimary,
    lineHeight: Typography.md * 1.6,
  },
  optionsList: { gap: Spacing.sm },
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
    width:          36,
    height:         36,
    borderRadius:   Radius.full,
    alignItems:     'center',
    justifyContent: 'center',
  },
  optionLabelText: {
    fontSize:   Typography.sm,
    fontWeight: Typography.bold,
    color:      Colors.textPrimary,
  },
  optionText: {
    flex:     1,
    fontSize: Typography.base,
    color:    Colors.textPrimary,
  },
  explanationCard: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           Spacing.sm,
    borderRadius:  Radius.lg,
    borderWidth:   1,
    padding:       Spacing.md,
  },
  explanationText: {
    flex:       1,
    fontSize:   Typography.sm,
    color:      Colors.textPrimary,
    lineHeight: Typography.sm * 1.5,
  },
  hintText: {
    textAlign: 'center',
    fontSize:  Typography.xs,
    color:     Colors.textMuted,
  },
  scoreTracker: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
  scoreTrackerText: {
    fontSize:   Typography.sm,
    color:      Colors.success,
    fontWeight: Typography.medium,
  },
  scoreTrackerPct: {
    fontSize:   Typography.sm,
    color:      Colors.textSecondary,
    fontWeight: Typography.medium,
  },
  nextButton: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius:    Radius.md,
    paddingVertical: Spacing.md,
  },
  nextButtonText: {
    fontSize:   Typography.base,
    fontWeight: Typography.semibold,
    color:      Colors.textInverse,
  },

  // Empty
  emptyTitle: {
    fontSize:   Typography.xl,
    fontWeight: Typography.bold,
    color:      Colors.textPrimary,
    textAlign:  'center',
  },
  emptySubtitle: {
    fontSize:  Typography.sm,
    color:     Colors.textSecondary,
    textAlign: 'center',
  },
  emptyButton: {
    backgroundColor:   Colors.card,
    borderRadius:      Radius.md,
    paddingVertical:   Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderWidth:       1,
    borderColor:       Colors.border,
    marginTop:         Spacing.sm,
  },
  emptyButtonText: {
    fontSize:   Typography.base,
    fontWeight: Typography.medium,
    color:      Colors.textPrimary,
  },
})