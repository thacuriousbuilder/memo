 

import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Animated
} from 'react-native'
import { router } from 'expo-router'
import { useState } from 'react'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { Swipeable } from 'react-native-gesture-handler'
import { Colors, Spacing, Radius, Typography, CardBase } from '@/constants/theme'
import EmptyState     from '@/components/emptyState'
import DeleteCourseModal from '@/components/modals/deleteCourseModal'
import { useSession } from '@/hooks/useSession'
import {
  useCourses,
  deleteCourse,
  getExamBadge,
  CourseWithMeta,
} from '@/hooks/useCourses'

// ─────────────────────────────────────────
// COURSE CARD
// ─────────────────────────────────────────
function CourseCard({
  course,
  onDeleted,
}: {
  course:    CourseWithMeta
  onDeleted: () => void
}) {
  const examBadge = getExamBadge(course.upcoming_exams)
  const [confirmVisible, setConfirmVisible] = useState(false)

  const handleDelete = () => setConfirmVisible(true)

  const confirmDelete = async () => {
    try {
      await deleteCourse(course.id)
      setConfirmVisible(false)
      onDeleted()
    } catch (err: any) {
      setConfirmVisible(false)
      Alert.alert('Error', err.message)
    }
  }

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>
  ) => {
    const translateX = progress.interpolate({
      inputRange:  [0, 1],
      outputRange: [160, 0],
    })

    return (
      <Animated.View style={[
        styles.actionsContainer,
        { transform: [{ translateX }] },
      ]}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => router.push(`/course/edit/${course.id}`)}
          activeOpacity={0.8}
        >
          <Ionicons name="pencil-outline" size={20} color="#fff" />
          <Text style={styles.deleteText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          activeOpacity={0.8}
        >
          <Ionicons name="trash-outline" size={20} color="#fff" />
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </Animated.View>
    )
  }

  return (
    <>
    <Swipeable
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
    >
    <TouchableOpacity
  style={styles.courseCard}
  activeOpacity={0.8}
  onPress={() => router.push(`/course/${course.id}`)}
>
        <View style={[
          styles.iconBadge,
          { backgroundColor: (course.color ?? Colors.primary) + '22' }
        ]}>
          <MaterialCommunityIcons
            name={course.emoji as any}
            size={22}
            color={course.color ?? Colors.primary}
          />
        </View>

        <View style={styles.courseInfo}>
          {/* Title + exam badge */}
          <View style={styles.courseNameRow}>
            <Text style={styles.courseTitle} numberOfLines={1}>
              {course.title}
            </Text>
            {examBadge && (
              <View style={[
                styles.examBadge,
                {
                  backgroundColor: examBadge.urgent
                    ? Colors.errorMuted
                    : Colors.warningMuted,
                }
              ]}>
                <Text style={[
                  styles.examBadgeText,
                  {
                    color: examBadge.urgent
                      ? Colors.error
                      : Colors.warning,
                  }
                ]}>
                  {examBadge.label}
                </Text>
              </View>
            )}
          </View>

          {/* Description */}
          {course.description && (
            <Text style={styles.courseDescription} numberOfLines={1}>
              {course.description}
            </Text>
          )}

          {/* Meta */}
          <View style={styles.courseMeta}>
          <Text style={styles.metaText}>
            {course.notes_count ?? 0} {(course.notes_count ?? 0) === 1 ? 'note' : 'notes'}
          </Text>
          <View style={styles.metaDot} />
          <Text style={styles.metaText}>
            {course.progress_pct}% complete
          </Text>
        </View>
        </View>

        <Ionicons
          name="chevron-forward"
          size={18}
          color={Colors.textMuted}
        />
      </TouchableOpacity>
    </Swipeable>
    <DeleteCourseModal
      visible={confirmVisible}
      courseTitle={course.title}
      onCancel={() => setConfirmVisible(false)}
      onConfirm={confirmDelete}
    />
    </>
  )
}

// ─────────────────────────────────────────
// GROUP COURSES BY course_group
// ─────────────────────────────────────────
function groupBycourse_group(courses: CourseWithMeta[]) {
  const map = new Map<string, CourseWithMeta[]>()

  courses.forEach(course => {
    const label = course.course_group
      ? course.course_group.toUpperCase()
      : 'OTHER COURSES'

    if (!map.has(label)) map.set(label, [])
    map.get(label)!.push(course)
  })

  return Array.from(map.entries()).map(([label, courses]) => ({
    label,
    courses,
  }))
}

// ─────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────
export default function CoursesScreen() {
  const { user }                             = useSession()
  const { courses, loading, error, refetch } = useCourses(user?.id ?? null)

  const grouped = groupBycourse_group(courses)

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Subjects</Text>
        <TouchableOpacity
          style={styles.newCourseButton}
          activeOpacity={0.7}
          onPress={() => router.push('/course/create')}
        >
          <Ionicons name="add" size={18} color={Colors.primary} />
          <Text style={styles.newCourseText}>New</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={refetch}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : courses.length === 0 ? (
        <EmptyState
          icon="book-outline"
          title="No Subjects Yet"
          subtitle="Create your first subject to start organizing your study materials."
          actionLabel="New Subject"
          onAction={() => router.push('/course/create')}
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.container}
        >
          {grouped.map(group => (
            <View key={group.label} style={styles.section}>
              <Text style={styles.sectionLabel}>{group.label}</Text>
              <View style={styles.courseList}>
                {group.courses.map(course => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    onDeleted={refetch}
                  />
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
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
  center: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    gap:            Spacing.md,
  },

  // Header
  header: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'center',
    paddingHorizontal: Spacing.base,
    paddingTop:        Spacing.xl + 32,
    paddingBottom:     Spacing.base,
  },
  headerTitle: {
    fontSize:   Typography.xxl,
    fontWeight: Typography.bold,
    color:      Colors.textPrimary,
  },
  newCourseButton: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           2,
  },
  newCourseText: {
    fontSize:   Typography.base,
    fontWeight: Typography.semibold,
    color:      Colors.primary,
  },

  // Scroll
  container: {
    paddingHorizontal: Spacing.base,
    paddingBottom:     Spacing.xxxl,
    gap:               Spacing.xl,
  },

  // Error
  errorText: {
    fontSize:  Typography.sm,
    color:     Colors.error,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical:   Spacing.sm,
    backgroundColor:   Colors.card,
    borderRadius:      Radius.md,
    borderWidth:       1,
    borderColor:       Colors.border,
  },
  retryText: {
    fontSize: Typography.sm,
    color:    Colors.primary,
  },

  // Section
  section:      { gap: Spacing.sm },
  sectionLabel: {
    fontSize:      Typography.xs,
    fontWeight:    Typography.bold,
    color:         Colors.textMuted,
    letterSpacing: 1,
    marginBottom:  Spacing.xs,
  },
  courseList: { gap: Spacing.sm },

  // Course Card
  courseCard: {
    ...CardBase,
    flexDirection: 'row',
    alignItems:    'center',
    padding:       Spacing.md,
    gap:           Spacing.md,
    overflow:      'hidden',
  },
  iconBadge: {
    width:          44,
    height:         44,
    borderRadius:   Radius.full,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },
  courseInfo:  { flex: 1, gap: 4 },
  courseNameRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.sm,
    flexWrap:      'wrap',
  },
  courseTitle: {
    fontSize:   Typography.md,
    fontWeight: Typography.semibold,
    color:      Colors.textPrimary,
    flexShrink: 1,
  },
  examBadge: {
    borderRadius:      Radius.full,
    paddingVertical:   2,
    paddingHorizontal: Spacing.sm,
  },
  examBadgeText: {
    fontSize:   Typography.xs,
    fontWeight: Typography.semibold,
  },
  courseDescription: {
    fontSize: Typography.xs,
    color:    Colors.textSecondary,
  },
  courseMeta: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.xs,
    marginTop:     2,
  },
  metaText: {
    fontSize: Typography.xs,
    color:    Colors.textMuted,
  },
  metaDot: {
    width:           3,
    height:          3,
    borderRadius:    2,
    backgroundColor: Colors.textMuted,
  },

  // Swipe Actions
  actionsContainer: {
    flexDirection: 'row',
    width:         160,
    marginBottom:  Spacing.sm,
    borderRadius:  Radius.lg,
    overflow:      'hidden',
    gap:           2,
  },
  editButton: {
    flex:            1,
    backgroundColor: Colors.primary,
    justifyContent:  'center',
    alignItems:      'center',
    gap:             4,
  },
  deleteButton: {
    flex:            1,
    backgroundColor: Colors.error,
    justifyContent:  'center',
    alignItems:      'center',
    gap:             4,
  },
  deleteText: {
    fontSize:   Typography.xs,
    fontWeight: Typography.semibold,
    color:      '#fff',
  },
})