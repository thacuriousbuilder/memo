

import {
    View, Text, ScrollView, TouchableOpacity,
    StyleSheet, LayoutAnimation, Platform, UIManager
  } from 'react-native'
  import { useState } from 'react'
  import { router } from 'expo-router'
  import Svg, { Circle } from 'react-native-svg'
  import { Ionicons } from '@expo/vector-icons'
  import { Colors, Spacing, Radius, Typography, CardBase } from '@/constants/theme'
  import NewLessonModal from '@/components/modals/newLessonModal'
  
  if (Platform.OS === 'android') {
    UIManager.setLayoutAnimationEnabledExperimental?.(true)
  }
  
  // ─────────────────────────────────────────
  // TYPES
  // ─────────────────────────────────────────
  type LessonStatus = 'completed' | 'in_progress' | 'not_started' | 'locked'
  
  interface MockLesson {
    id:         string
    title:      string
    subLessons: number
    questions:  number
    minutes:    number
    status:     LessonStatus
    progress:   number
    orderIndex: number
  }
  
  interface MockSection {
    id:             string
    title:          string
    totalLessons:   number
    completedCount: number
    progressPct:    number
    lessons:        MockLesson[]
  }
  
  // ─────────────────────────────────────────
  // MOCK DATA
  // ─────────────────────────────────────────
  const MOCK_COURSE = {
    emoji:        '🧬',
    title:        'Biology 101',
    totalLessons: 12,
    completePct:  65,
    questions:    79,
    totalTime:    '67m',
    completed:    '2/5',
  }
  
  const MOCK_SECTIONS: MockSection[] = [
    {
      id:             '1',
      title:          'Fundamentals',
      totalLessons:   3,
      completedCount: 2,
      progressPct:    67,
      lessons: [
        { id: '1', title: 'Cell Structure', subLessons: 4, questions: 15, minutes: 12, status: 'completed',   progress: 100, orderIndex: 1 },
        { id: '2', title: 'Cell Division',  subLessons: 3, questions: 12, minutes: 10, status: 'completed',   progress: 100, orderIndex: 2 },
        { id: '3', title: 'Photosynthesis', subLessons: 5, questions: 18, minutes: 15, status: 'in_progress', progress: 60,  orderIndex: 3 },
      ],
    },
    {
      id:             '2',
      title:          'Advanced Topics',
      totalLessons:   2,
      completedCount: 0,
      progressPct:    0,
      lessons: [
        { id: '4', title: 'Cellular Respiration', subLessons: 4, questions: 14, minutes: 12, status: 'not_started', progress: 0, orderIndex: 4 },
        { id: '5', title: 'DNA & RNA',             subLessons: 6, questions: 20, minutes: 18, status: 'locked',      progress: 0, orderIndex: 5 },
      ],
    },
  ]
  
  // ─────────────────────────────────────────
  // SMALL PROGRESS RING
  // ─────────────────────────────────────────
  function SectionRing({ percent }: { percent: number }) {
    const size        = 52
    const strokeWidth = 4
    const radius      = (size - strokeWidth) / 2
    const circumference = 2 * Math.PI * radius
    const offset      = circumference - (percent / 100) * circumference
  
    return (
      <View style={styles.ringWrapper}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2} cy={size / 2} r={radius}
            stroke={Colors.progressTrack}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {percent > 0 && (
            <Circle
              cx={size / 2} cy={size / 2} r={radius}
              stroke={Colors.primary}
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              rotation="-90"
              origin={`${size / 2}, ${size / 2}`}
            />
          )}
        </Svg>
        <View style={styles.ringLabel}>
          <Text style={styles.ringText}>{percent}%</Text>
        </View>
      </View>
    )
  }
  
  // ─────────────────────────────────────────
  // LESSON STATUS INDICATOR
  // ─────────────────────────────────────────
  function LessonIndicator({ status, index }: { status: LessonStatus; index: number }) {
    if (status === 'completed') {
      return (
        <View style={[styles.indicator, styles.indicatorComplete]}>
          <Ionicons name="checkmark" size={18} color={Colors.success} />
        </View>
      )
    }
    if (status === 'locked') {
      return (
        <View style={[styles.indicator, styles.indicatorLocked]}>
          <Ionicons name="lock-closed" size={16} color={Colors.lockedText} />
        </View>
      )
    }
    return (
      <View style={[styles.indicator, styles.indicatorActive]}>
        <Text style={styles.indicatorNumber}>{index}</Text>
      </View>
    )
  }
  
  // ─────────────────────────────────────────
  // LESSON CARD
  // ─────────────────────────────────────────
  function LessonCard({ lesson }: { lesson: MockLesson }) {
    const isLocked     = lesson.status === 'locked'
    const isActive     = lesson.status === 'in_progress'
    const showProgress = ['in_progress', 'not_started'].includes(lesson.status)
  
    return (
      <TouchableOpacity
        style={[
          styles.lessonCard,
          isActive && styles.lessonCardActive,
          isLocked && styles.lessonCardLocked,
        ]}
        activeOpacity={isLocked ? 1 : 0.8}
        disabled={isLocked}
        onPress={() => router.push(`/lesson/${lesson.id}`)}
      >
        <LessonIndicator status={lesson.status} index={lesson.orderIndex} />
  
        <Text style={[styles.lessonTitle, isLocked && styles.lessonTitleLocked]}>
          {lesson.title}
        </Text>
  
        <View style={styles.lessonMeta}>
          <Text style={[styles.metaText, isLocked && styles.metaTextLocked]}>
            {lesson.subLessons} sub-lessons
          </Text>
          <Ionicons name="help-circle-outline" size={13}
            color={isLocked ? Colors.lockedText : Colors.textMuted} />
          <Text style={[styles.metaText, isLocked && styles.metaTextLocked]}>
            {lesson.questions}
          </Text>
          <Ionicons name="time-outline" size={13}
            color={isLocked ? Colors.lockedText : Colors.textMuted} />
          <Text style={[styles.metaText, isLocked && styles.metaTextLocked]}>
            {lesson.minutes}m
          </Text>
        </View>
  
        {showProgress && (
          <Text style={styles.progressPct}>{lesson.progress}%</Text>
        )}
  
        <Ionicons name="chevron-forward" size={18}
          color={isLocked ? Colors.lockedText : Colors.textMuted} />
      </TouchableOpacity>
    )
  }
  
  // ─────────────────────────────────────────
  // COLLAPSIBLE SECTION
  // ─────────────────────────────────────────
  function SectionRow({ section }: { section: MockSection }) {
    const [expanded, setExpanded] = useState(false)
    const [showNewLesson, setShowNewLesson] = useState(false)
  
    const toggle = () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
      setExpanded(!expanded)
    }
  
    return (
      <View>
        {/* Section Header Row */}
        <TouchableOpacity
          style={styles.sectionRow}
          onPress={toggle}
          activeOpacity={0.8}
        >
          <Ionicons
            name={expanded ? 'chevron-down' : 'chevron-forward'}
            size={18}
            color={Colors.textSecondary}
          />
          <View style={styles.sectionInfo}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionSubtitle}>
              {section.totalLessons} lessons • {section.completedCount}/
              {section.totalLessons} completed
            </Text>
          </View>
          <SectionRing percent={section.progressPct} />
        </TouchableOpacity>
  
        {/* Expanded Lessons */}
        {expanded && (
          <View style={styles.expandedContent}>
            {section.lessons.map((lesson) => (
              <LessonCard key={lesson.id} lesson={lesson} />
            ))}
  
            {/* Add Lesson inside section */}
            <TouchableOpacity
              style={styles.addButton}
              activeOpacity={0.8}
              onPress={() => setShowNewLesson(true)}
            >
              <Ionicons name="add" size={16} color={Colors.textMuted} />
              <Text style={styles.addButtonText}>Add Lesson</Text>
            </TouchableOpacity>
          </View>
        )}
        <NewLessonModal
        visible={showNewLesson}
        onClose={() => setShowNewLesson(false)}
        onCreate={(lesson) => console.log('New lesson:', lesson)}
        />
      </View>
    )
  }
  
  // ─────────────────────────────────────────
  // MAIN SCREEN
  // ─────────────────────────────────────────
  export default function CourseDetailScreen() {
    return (
      <View style={styles.root}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={18} color={Colors.textSecondary} />
          <Text style={styles.backText}>Back to Courses</Text>
        </TouchableOpacity>
  
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* Course Header */}
          <View style={styles.courseHeader}>
            <Text style={styles.courseEmoji}>{MOCK_COURSE.emoji}</Text>
            <View>
              <Text style={styles.courseTitle}>{MOCK_COURSE.title}</Text>
              <Text style={styles.courseMeta}>
                {MOCK_COURSE.totalLessons} lessons • {MOCK_COURSE.completePct}% complete
              </Text>
            </View>
          </View>
  
          {/* Stats Row */}
          <View style={styles.statsRow}>
            {[
              { value: MOCK_COURSE.questions, label: 'Questions'  },
              { value: MOCK_COURSE.totalTime, label: 'Total Time' },
              { value: MOCK_COURSE.completed, label: 'Completed'  },
            ].map((stat) => (
              <View key={stat.label} style={styles.statCard}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
  
          {/* Collapsible Sections */}
          <View style={styles.sectionsList}>
            {MOCK_SECTIONS.map((section) => (
              <SectionRow key={section.id} section={section} />
            ))}
          </View>
  
          {/* Add Section Button */}
          <TouchableOpacity
            style={styles.addSectionButton}
            activeOpacity={0.8}
            onPress={() => router.push('/modals/new-section')}
          >
            <Ionicons name="add" size={18} color={Colors.textMuted} />
            <Text style={styles.addSectionText}>Add Section</Text>
          </TouchableOpacity>
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
    backButton: {
      flexDirection:     'row',
      alignItems:        'center',
      gap:               4,
      paddingHorizontal: Spacing.base,
      paddingTop:        Spacing.xl + 32,
      paddingBottom:     Spacing.md,
    },
    backText: {
      fontSize: Typography.sm,
      color:    Colors.textSecondary,
    },
    container: {
      paddingHorizontal: Spacing.base,
      paddingBottom:     Spacing.xxxl,
      gap:               Spacing.lg,
    },
  
    // Course Header
    courseHeader: {
      flexDirection: 'row',
      alignItems:    'center',
      gap:           Spacing.md,
    },
    courseEmoji: { fontSize: 36 },
    courseTitle: {
      fontSize:   Typography.xl,
      fontWeight: Typography.bold,
      color:      Colors.textPrimary,
    },
    courseMeta: {
      fontSize:  Typography.sm,
      color:     Colors.textSecondary,
      marginTop: 2,
    },
  
    // Stats
    statsRow: {
      flexDirection: 'row',
      gap:           Spacing.sm,
    },
    statCard: {
      flex:        1,
      ...CardBase,
      padding:     Spacing.md,
      alignItems:  'center',
      gap:         Spacing.xs,
    },
    statValue: {
      fontSize:   Typography.lg,
      fontWeight: Typography.bold,
      color:      Colors.textPrimary,
    },
    statLabel: {
      fontSize: Typography.xs,
      color:    Colors.textSecondary,
    },
  
    // Sections
    sectionsList: { gap: Spacing.sm },
    sectionRow: {
      flexDirection: 'row',
      alignItems:    'center',
      gap:           Spacing.md,
      paddingVertical: Spacing.md,
    },
    sectionInfo: { flex: 1 },
    sectionTitle: {
      fontSize:   Typography.md,
      fontWeight: Typography.semibold,
      color:      Colors.textPrimary,
    },
    sectionSubtitle: {
      fontSize:  Typography.xs,
      color:     Colors.textSecondary,
      marginTop: 2,
    },
  
    // Section Ring
    ringWrapper: {
      alignItems:     'center',
      justifyContent: 'center',
    },
    ringLabel: {
      position:       'absolute',
      alignItems:     'center',
      justifyContent: 'center',
    },
    ringText: {
      fontSize:   Typography.xs,
      fontWeight: Typography.bold,
      color:      Colors.textPrimary,
    },
  
    // Expanded Content
    expandedContent: {
      gap:          Spacing.sm,
      paddingLeft:  Spacing.lg,
      marginBottom: Spacing.sm,
    },
  
    // Lesson Cards
    lessonCard: {
      ...CardBase,
      alignItems: 'center',
      padding:    Spacing.lg,
      gap:        Spacing.sm,
    },
    lessonCardActive: {
      borderColor: Colors.primary,
      borderWidth: 1.5,
    },
    lessonCardLocked: { opacity: 0.6 },
    indicator: {
      width:           44,
      height:          44,
      borderRadius:    Radius.full,
      alignItems:      'center',
      justifyContent:  'center',
      marginBottom:    Spacing.xs,
    },
    indicatorComplete: {
      backgroundColor: Colors.successMuted,
      borderWidth:     1,
      borderColor:     Colors.success,
    },
    indicatorActive: {
      backgroundColor: Colors.primaryMuted,
      borderWidth:     1,
      borderColor:     Colors.primary,
    },
    indicatorLocked: {
      backgroundColor: Colors.card,
      borderWidth:     1,
      borderColor:     Colors.border,
    },
    indicatorNumber: {
      fontSize:   Typography.base,
      fontWeight: Typography.bold,
      color:      Colors.primary,
    },
    lessonTitle: {
      fontSize:   Typography.lg,
      fontWeight: Typography.semibold,
      color:      Colors.textPrimary,
    },
    lessonTitleLocked: { color: Colors.lockedText },
    lessonMeta: {
      flexDirection: 'row',
      alignItems:    'center',
      gap:           4,
    },
    metaText: {
      fontSize:    Typography.xs,
      color:       Colors.textMuted,
      marginRight: 4,
    },
    metaTextLocked: { color: Colors.lockedText },
    progressPct: {
      fontSize:   Typography.base,
      fontWeight: Typography.semibold,
      color:      Colors.primary,
    },
  
    // Add Buttons
    addButton: {
      flexDirection:   'row',
      alignItems:      'center',
      justifyContent:  'center',
      gap:             Spacing.xs,
      paddingVertical: Spacing.md,
    },
    addButtonText: {
      fontSize: Typography.sm,
      color:    Colors.textMuted,
    },
    addSectionButton: {
      flexDirection:   'row',
      alignItems:      'center',
      justifyContent:  'center',
      gap:             Spacing.sm,
      borderWidth:     1,
      borderColor:     Colors.border,
      borderStyle:     'dashed',
      borderRadius:    Radius.lg,
      paddingVertical: Spacing.md,
    },
    addSectionText: {
      fontSize:   Typography.base,
      fontWeight: Typography.medium,
      color:      Colors.textMuted,
    },
  })