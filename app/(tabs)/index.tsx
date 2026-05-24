

import {
    View, Text, ScrollView, TouchableOpacity,
    StyleSheet, Dimensions
  } from 'react-native'
  import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
  import { Colors, Spacing, Radius, Typography, CardBase } from '@/constants/theme'
  
  const { width } = Dimensions.get('window')
  const COURSE_CARD_WIDTH = width * 0.42
  
  // ─────────────────────────────────────────
  // MOCK DATA — replaced with Supabase later
  // ─────────────────────────────────────────
  const MOCK_STUDIED = [
    { id: '1', emoji: '🧬', title: 'Biology 101', questions: 12, minutes: 45, progress: 1 }
  ]
  const MOCK_UP_NEXT = [
    { id: '2', emoji: '🌍', title: 'World History', questions: 18, minutes: 30, isNext: true },
    { id: '3', emoji: '🧪', title: 'Chemistry',    questions: 10, minutes: 35, isNext: false },
  ]
  const MOCK_COURSES = [
    { id: '1', emoji: '🧬', title: 'Biology 101',  lessons: 12, questions: 120, minutes: 45,  progress: 0.6 },
    { id: '2', emoji: '🌍', title: 'World History', lessons: 18, questions: 180, minutes: 30,  progress: 0.2 },
    { id: '3', emoji: '📐', title: 'Calculus',      lessons: 15, questions: 150, minutes: null, progress: 0 },
  ]
  
  // ─────────────────────────────────────────
  // SUB COMPONENTS
  // ─────────────────────────────────────────
  function ProgressRing({ progress, size = 48 }: { progress: number; size?: number }) {
    const filled = progress >= 1
    return (
      <View style={{
        width:           size,
        height:          size,
        borderRadius:    size / 2,
        borderWidth:     3,
        borderColor:     filled ? Colors.success : Colors.primary,
        backgroundColor: 'transparent',
        alignItems:      'center',
        justifyContent:  'center',
      }}>
        {filled && (
          <Ionicons name="checkmark" size={size * 0.4} color={Colors.success} />
        )}
      </View>
    )
  }
  
  function SectionHeader({ dot, title, action }: {
    dot?: boolean; title: string; action?: string
  }) {
    return (
      <View style={styles.sectionHeader}>
        <View style={styles.sectionLeft}>
          {dot && <View style={styles.dot} />}
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        {action && <Text style={styles.sectionAction}>{action}</Text>}
      </View>
    )
  }
  
  // ─────────────────────────────────────────
  // MAIN SCREEN
  // ─────────────────────────────────────────
  export default function HomeScreen() {
    const today = new Date().toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric'
    })
  
    return (
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>Welcome back</Text>
            <Text style={styles.userName}>Alhouseny</Text>
          </View>
          <View style={styles.streakBadge}>
            <Text style={styles.streakFire}>🔥</Text>
            <Text style={styles.streakCount}>7</Text>
          </View>
        </View>
  
        {/* Today's Plan Card */}
        <View style={styles.planCard}>
          <View style={styles.planCardHeader}>
            <View style={styles.planCardTitle}>
              <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
              <Text style={styles.planCardTitleText}>Today's Plan</Text>
            </View>
            <Text style={styles.planCardDate}>{today}</Text>
          </View>
  
          <View style={styles.planStats}>
            {[
              { value: '3',    label: 'Courses'   },
              { value: '40',   label: 'Questions' },
              { value: '110m', label: 'Est. Time' },
            ].map((stat) => (
              <View key={stat.label} style={styles.planStat}>
                <Text style={styles.planStatValue}>{stat.value}</Text>
                <Text style={styles.planStatLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
  
          <View style={styles.progressSection}>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressLabel}>Daily Progress</Text>
              <Text style={styles.progressCount}>7/40 questions</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: '17.5%' }]} />
            </View>
          </View>
        </View>
  
        {/* Studied Today */}
        <SectionHeader dot title="STUDIED TODAY" />
        {MOCK_STUDIED.map((item) => (
          <View key={item.id} style={styles.studiedCard}>
            <Text style={styles.courseEmoji}>{item.emoji}</Text>
            <View style={styles.courseInfo}>
              <View style={styles.courseNameRow}>
                <Text style={styles.courseName}>{item.title}</Text>
                <View style={styles.completedBadge}>
                  <Text style={styles.completedText}>Completed</Text>
                </View>
              </View>
              <View style={styles.courseMeta}>
                <Ionicons name="help-circle-outline" size={13} color={Colors.textMuted} />
                <Text style={styles.metaText}>{item.questions} questions</Text>
                <Ionicons name="time-outline" size={13} color={Colors.textMuted} />
                <Text style={styles.metaText}>{item.minutes}m</Text>
              </View>
            </View>
            <ProgressRing progress={item.progress} />
          </View>
        ))}
  
        {/* Up Next */}
        <SectionHeader dot title="UP NEXT" />
        {MOCK_UP_NEXT.map((item) => (
          <TouchableOpacity key={item.id} style={styles.upNextCard} activeOpacity={0.8}>
            <Text style={styles.courseEmoji}>{item.emoji}</Text>
            <View style={styles.courseInfo}>
              <View style={styles.courseNameRow}>
                <Text style={styles.courseName}>{item.title}</Text>
                {item.isNext && (
                  <View style={styles.startNowBadge}>
                    <Text style={styles.startNowText}>Start Now</Text>
                  </View>
                )}
              </View>
              <View style={styles.courseMeta}>
                <Ionicons name="help-circle-outline" size={13} color={Colors.textMuted} />
                <Text style={styles.metaText}>{item.questions} questions</Text>
                <Ionicons name="time-outline" size={13} color={Colors.textMuted} />
                <Text style={styles.metaText}>{item.minutes}m</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        ))}
  
        {/* Continue Where You Left Off */}
        <View style={styles.continueCard}>
          <View style={styles.continueHeader}>
            <View>
              <Text style={styles.continueLabel}>CONTINUE WHERE YOU LEFT OFF</Text>
              <Text style={styles.continueTitle}>Photosynthesis</Text>
              <Text style={styles.continueCourse}>Biology 101</Text>
            </View>
            <Text style={styles.continueEmoji}>🧬</Text>
          </View>
  
          <View style={styles.continueMeta}>
            <Ionicons name="help-circle-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.metaText}>8 questions left</Text>
            <Ionicons name="time-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.metaText}>~10 min</Text>
          </View>
  
          <View style={styles.progressLabelRow}>
            <Text style={styles.progressLabel}>Lesson Progress</Text>
            <Text style={styles.progressCount}>60%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: '60%' }]} />
          </View>
  
          <TouchableOpacity style={styles.resumeButton} activeOpacity={0.8}>
            <Text style={styles.resumeButtonText}>Resume</Text>
          </TouchableOpacity>
        </View>
  
        {/* All Courses */}
        <SectionHeader title="ALL COURSES" action="See All" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.coursesScroll}
        >
          {MOCK_COURSES.map((course) => (
            <TouchableOpacity
              key={course.id}
              style={styles.courseCard}
              activeOpacity={0.8}
            >
              <View style={styles.courseCardTop}>
                <Text style={styles.courseCardEmoji}>{course.emoji}</Text>
                <ProgressRing progress={course.progress} size={40} />
              </View>
              <Text style={styles.courseCardTitle}>{course.title}</Text>
              <Text style={styles.courseCardLessons}>{course.lessons} lessons</Text>
              <View style={styles.courseCardMeta}>
                <Text style={styles.courseCardMetaText}>{course.questions} Q</Text>
                {course.minutes && (
                  <Text style={styles.courseCardMetaText}>{course.minutes}m</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
      gap:               Spacing.md,
    },
  
    // Header
    header: {
      flexDirection:  'row',
      justifyContent: 'space-between',
      alignItems:     'center',
      marginBottom:   Spacing.sm,
    },
    welcomeText: {
      fontSize: Typography.sm,
      color:    Colors.textSecondary,
    },
    userName: {
      fontSize:   Typography.xl,
      fontWeight: Typography.bold,
      color:      Colors.textPrimary,
    },
    streakBadge: {
      flexDirection:   'row',
      alignItems:      'center',
      gap:             4,
      backgroundColor: Colors.card,
      borderWidth:     1,
      borderColor:     Colors.border,
      borderRadius:    Radius.full,
      paddingVertical:   6,
      paddingHorizontal: Spacing.md,
    },
    streakFire:  { fontSize: 14 },
    streakCount: { fontSize: Typography.sm, fontWeight: Typography.bold, color: Colors.textPrimary },
  
    // Plan Card
    planCard: {
      ...CardBase,
      padding: Spacing.base,
      gap:     Spacing.md,
    },
    planCardHeader: {
      flexDirection:  'row',
      justifyContent: 'space-between',
      alignItems:     'center',
    },
    planCardTitle: {
      flexDirection: 'row',
      alignItems:    'center',
      gap:           Spacing.xs,
    },
    planCardTitleText: {
      fontSize:   Typography.sm,
      fontWeight: Typography.semibold,
      color:      Colors.textPrimary,
    },
    planCardDate: {
      fontSize: Typography.xs,
      color:    Colors.textMuted,
    },
    planStats: {
      flexDirection:  'row',
      justifyContent: 'space-around',
    },
    planStat: {
      alignItems: 'center',
      gap:        4,
    },
    planStatValue: {
      fontSize:   Typography.xxl,
      fontWeight: Typography.bold,
      color:      Colors.textPrimary,
    },
    planStatLabel: {
      fontSize: Typography.xs,
      color:    Colors.textSecondary,
    },
  
    // Progress
    progressSection: { gap: Spacing.xs },
    progressLabelRow: {
      flexDirection:  'row',
      justifyContent: 'space-between',
    },
    progressLabel: {
      fontSize: Typography.xs,
      color:    Colors.textSecondary,
    },
    progressCount: {
      fontSize:   Typography.xs,
      fontWeight: Typography.medium,
      color:      Colors.textPrimary,
    },
    progressTrack: {
      height:          6,
      backgroundColor: Colors.progressTrack,
      borderRadius:    Radius.full,
      overflow:        'hidden',
    },
    progressFill: {
      height:          6,
      backgroundColor: Colors.progressFill,
      borderRadius:    Radius.full,
    },
  
    // Section Header
    sectionHeader: {
      flexDirection:  'row',
      justifyContent: 'space-between',
      alignItems:     'center',
      marginTop:      Spacing.sm,
    },
    sectionLeft: {
      flexDirection: 'row',
      alignItems:    'center',
      gap:           Spacing.xs,
    },
    dot: {
      width:           8,
      height:          8,
      borderRadius:    Radius.full,
      backgroundColor: Colors.success,
    },
    sectionTitle: {
      fontSize:      Typography.xs,
      fontWeight:    Typography.bold,
      color:         Colors.textSecondary,
      letterSpacing: 1,
    },
    sectionAction: {
      fontSize:   Typography.xs,
      fontWeight: Typography.medium,
      color:      Colors.primary,
    },
  
    // Studied / Up Next Cards
    studiedCard: {
      ...CardBase,
      flexDirection: 'row',
      alignItems:    'center',
      padding:       Spacing.md,
      gap:           Spacing.md,
    },
    upNextCard: {
      ...CardBase,
      flexDirection: 'row',
      alignItems:    'center',
      padding:       Spacing.md,
      gap:           Spacing.md,
    },
    courseEmoji: { fontSize: 28 },
    courseInfo:  { flex: 1, gap: 4 },
    courseNameRow: {
      flexDirection: 'row',
      alignItems:    'center',
      gap:           Spacing.sm,
      flexWrap:      'wrap',
    },
    courseName: {
      fontSize:   Typography.base,
      fontWeight: Typography.semibold,
      color:      Colors.textPrimary,
    },
    courseMeta: {
      flexDirection: 'row',
      alignItems:    'center',
      gap:           4,
    },
    metaText: {
      fontSize:    Typography.xs,
      color:       Colors.textMuted,
      marginRight: Spacing.sm,
    },
  
    // Badges
    completedBadge: {
      backgroundColor: Colors.successMuted,
      borderRadius:    Radius.full,
      paddingVertical:   2,
      paddingHorizontal: Spacing.sm,
    },
    completedText: {
      fontSize:   Typography.xs,
      fontWeight: Typography.medium,
      color:      Colors.success,
    },
    startNowBadge: {
      backgroundColor: Colors.primaryMuted,
      borderRadius:    Radius.full,
      paddingVertical:   2,
      paddingHorizontal: Spacing.sm,
    },
    startNowText: {
      fontSize:   Typography.xs,
      fontWeight: Typography.medium,
      color:      Colors.primary,
    },
  
    // Continue Card
    continueCard: {
      ...CardBase,
      padding: Spacing.base,
      gap:     Spacing.md,
    },
    continueHeader: {
      flexDirection:  'row',
      justifyContent: 'space-between',
      alignItems:     'flex-start',
    },
    continueLabel: {
      fontSize:      Typography.xs,
      fontWeight:    Typography.bold,
      color:         Colors.textMuted,
      letterSpacing: 1,
      marginBottom:  4,
    },
    continueTitle: {
      fontSize:   Typography.lg,
      fontWeight: Typography.bold,
      color:      Colors.textPrimary,
    },
    continueCourse: {
      fontSize:  Typography.sm,
      color:     Colors.textSecondary,
      marginTop: 2,
    },
    continueEmoji: { fontSize: 32 },
    continueMeta: {
      flexDirection: 'row',
      alignItems:    'center',
      gap:           4,
    },
    resumeButton: {
      backgroundColor: Colors.primary,
      borderRadius:    Radius.md,
      paddingVertical: Spacing.md,
      alignItems:      'center',
      marginTop:       Spacing.xs,
    },
    resumeButtonText: {
      fontSize:   Typography.base,
      fontWeight: Typography.semibold,
      color:      Colors.textInverse,
    },
  
    // All Courses
    coursesScroll: {
      gap:           Spacing.md,
      paddingBottom: Spacing.sm,
    },
    courseCard: {
      width:           COURSE_CARD_WIDTH,
      backgroundColor: Colors.card,
      borderRadius:    Radius.lg,
      borderWidth:     1,
      borderColor:     Colors.border,
      padding:         Spacing.md,
      gap:             Spacing.xs,
    },
    courseCardTop: {
      flexDirection:  'row',
      justifyContent: 'space-between',
      alignItems:     'flex-start',
      marginBottom:   Spacing.sm,
    },
    courseCardEmoji:    { fontSize: 28 },
    courseCardTitle: {
      fontSize:   Typography.sm,
      fontWeight: Typography.bold,
      color:      Colors.textPrimary,
    },
    courseCardLessons: {
      fontSize: Typography.xs,
      color:    Colors.textSecondary,
    },
    courseCardMeta: {
      flexDirection:  'row',
      justifyContent: 'space-between',
      marginTop:      Spacing.sm,
    },
    courseCardMetaText: {
      fontSize: Typography.xs,
      color:    Colors.textMuted,
    },
  })