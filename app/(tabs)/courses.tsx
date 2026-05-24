
import {
    View, Text, ScrollView, TouchableOpacity,
    StyleSheet, StatusBar
  } from 'react-native'
  import { router } from 'expo-router'
  import { Ionicons } from '@expo/vector-icons'
  import { Colors, Spacing, Radius, Typography, CardBase } from '@/constants/theme'
  import NewCourseModal from '@/components/modals/newCourseModal'
import { useState } from 'react'
  // ─────────────────────────────────────────
  // MOCK DATA — replaced with Supabase later
  // ─────────────────────────────────────────
  const ACCENT_COLORS = ['#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4']
  
  const MOCK_SECTIONS = [
    {
      id:    '1',
      title: 'FALL 2024',
      icon:  'school-outline',
      courses: [
        {
          id: '1', emoji: '🧬', title: 'Biology 101',
          description: 'Introduction to cellular biology',
          lessons: 12, questions: 120, minutes: 45, accent: ACCENT_COLORS[0]
        },
        {
          id: '2', emoji: '🌍', title: 'World History',
          description: 'Ancient civilizations to modern era',
          lessons: 18, questions: 180, minutes: 30, accent: ACCENT_COLORS[1]
        },
      ]
    },
    {
      id:    '2',
      title: 'SPRING 2024',
      icon:  'school-outline',
      courses: [
        {
          id: '3', emoji: '📐', title: 'Calculus I',
          description: 'Limits, derivatives, and integrals',
          lessons: 15, questions: 150, minutes: 25, accent: ACCENT_COLORS[2]
        },
      ]
    },
    {
      id:    '3',
      title: 'OTHER COURSES',
      icon:  null,
      courses: [
        {
          id: '4', emoji: '🧪', title: 'Chemistry',
          description: 'Organic and inorganic chemistry',
          lessons: 10, questions: 100, minutes: 35, accent: ACCENT_COLORS[3]
        },
      ]
    },
  ]
  
  // ─────────────────────────────────────────
  // COURSE CARD
  // ─────────────────────────────────────────
  function CourseCard({ course }: { course: typeof MOCK_SECTIONS[0]['courses'][0] }) {
    return (
      <TouchableOpacity
        style={styles.courseCard}
        activeOpacity={0.8}
        onPress={() => router.push(`/course/${course.id}`)}
      >
        {/* Left accent bar */}
        <View style={[styles.accentBar, { backgroundColor: course.accent }]} />
  
        <Text style={styles.courseEmoji}>{course.emoji}</Text>
  
        <View style={styles.courseInfo}>
          <Text style={styles.courseTitle}>{course.title}</Text>
          <Text style={styles.courseDescription} numberOfLines={1}>
            {course.description}
          </Text>
          <View style={styles.courseMeta}>
            <Text style={styles.metaText}>{course.lessons} lessons</Text>
            <Ionicons name="help-circle-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.metaText}>{course.questions}</Text>
            <Ionicons name="time-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.metaText}>{course.minutes}m</Text>
          </View>
        </View>
  
        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
      </TouchableOpacity>
    )
  }
  
  // ─────────────────────────────────────────
  // MAIN SCREEN
  // ─────────────────────────────────────────
  export default function CoursesScreen() {
    const [showNewCourse, setShowNewCourse] = useState(false)
        
    const handleCreate = async (course: {
        name: string; description: string
        semester: string; emoji: string; color: string
      }) => {
        // TODO: insert into Supabase
        console.log('Creating course:', course)
      }
    
    return (
      <View style={styles.root}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Courses</Text>
          <TouchableOpacity
          style={styles.newCourseButton}
          activeOpacity={0.8}
          onPress={() => setShowNewCourse(true)}  // ← updated
        >
          <Ionicons name="add" size={18} color={Colors.textInverse} />
          <Text style={styles.newCourseText}>New Course</Text>
        </TouchableOpacity>
        </View>
  
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.container}
        >
          {MOCK_SECTIONS.map((section) => (
            <View key={section.id} style={styles.section}>
  
              {/* Section Header */}
              <View style={styles.sectionHeader}>
                {section.icon && (
                  <Ionicons
                    name={section.icon as any}
                    size={14}
                    color={Colors.textMuted}
                  />
                )}
                <Text style={styles.sectionTitle}>{section.title}</Text>
              </View>
  
              {/* Courses */}
              <View style={styles.courseList}>
                {section.courses.map((course) => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </View>
  
            </View>
          ))}
        </ScrollView>
        
        <NewCourseModal
        visible={showNewCourse}
        onClose={() => setShowNewCourse(false)}
        onCreate={handleCreate}
      />
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
    header: {
      flexDirection:     'row',
      justifyContent:    'space-between',
      alignItems:        'center',
      paddingHorizontal: Spacing.base,
      paddingTop:        Spacing.xl + 32,
      paddingBottom:     Spacing.base,
      backgroundColor:   Colors.background,
    },
    headerTitle: {
      fontSize:   Typography.xxl,
      fontWeight: Typography.bold,
      color:      Colors.textPrimary,
    },
    newCourseButton: {
      flexDirection:     'row',
      alignItems:        'center',
      gap:               Spacing.xs,
      backgroundColor:   Colors.primary,
      borderRadius:      Radius.full,
      paddingVertical:   Spacing.sm,
      paddingHorizontal: Spacing.md,
    },
    newCourseText: {
      fontSize:   Typography.sm,
      fontWeight: Typography.semibold,
      color:      Colors.textInverse,
    },
    container: {
      paddingHorizontal: Spacing.base,
      paddingBottom:     Spacing.xxxl,
      gap:               Spacing.lg,
    },
    section: {
      gap: Spacing.sm,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems:    'center',
      gap:           Spacing.xs,
      marginBottom:  Spacing.xs,
    },
    sectionTitle: {
      fontSize:      Typography.xs,
      fontWeight:    Typography.bold,
      color:         Colors.textMuted,
      letterSpacing: 1,
    },
    courseList: {
      gap: Spacing.sm,
    },
    courseCard: {
      ...CardBase,
      flexDirection: 'row',
      alignItems:    'center',
      padding:       Spacing.md,
      gap:           Spacing.md,
      overflow:      'hidden',
    },
    accentBar: {
      position:     'absolute',
      left:         0,
      top:          0,
      bottom:       0,
      width:        4,
      borderRadius: Radius.sm,
    },
    courseEmoji: {
      fontSize:   28,
      marginLeft: Spacing.sm,
    },
    courseInfo: {
      flex: 1,
      gap:  4,
    },
    courseTitle: {
      fontSize:   Typography.md,
      fontWeight: Typography.semibold,
      color:      Colors.textPrimary,
    },
    courseDescription: {
      fontSize: Typography.xs,
      color:    Colors.textSecondary,
    },
    courseMeta: {
      flexDirection: 'row',
      alignItems:    'center',
      gap:           4,
      marginTop:     2,
    },
    metaText: {
      fontSize:    Typography.xs,
      color:       Colors.textMuted,
      marginRight: 4,
    },
  })