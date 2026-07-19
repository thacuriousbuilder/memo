

import {
    View, Text, TouchableOpacity, StyleSheet,
    Modal, ScrollView
  } from 'react-native'
  import { useState } from 'react'
  import { router } from 'expo-router'
  import { Ionicons } from '@expo/vector-icons'
  import { Colors, Spacing, Radius, Typography, CardBase } from '@/constants/theme'
  
  // ─────────────────────────────────────────
  // MOCK COURSES — replaced with Supabase later
  // ─────────────────────────────────────────
  const MOCK_COURSES = [
    { id: '1', emoji: '🧬', title: 'Biology 101',  color: '#10B981' },
    { id: '2', emoji: '🌍', title: 'World History', color: '#8B5CF6' },
    { id: '3', emoji: '📐', title: 'Calculus I',    color: '#F59E0B' },
    { id: '4', emoji: '🧪', title: 'Chemistry',     color: '#EF4444' },
  ]
  
  interface Props {
    visible: boolean
    onClose: () => void
  }
  
  export default function QuickQuizModal({ visible, onClose }: Props) {
    const [selected, setSelected] = useState<string | null>(null)
  
    const handleStart = () => {
      const courseId = selected === 'all' ? 'all' : selected
      const title    = selected === 'all'
        ? 'Quick Quiz — All Courses'
        : MOCK_COURSES.find(c => c.id === selected)?.title ?? 'Quick Quiz'
  
      onClose()
      router.push({
        pathname: '/study/quick',
        params:   { id: courseId ?? 'all', mode: 'quick', title },
      })
    }
  
    return (
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <TouchableOpacity
            style={styles.backdrop}
            onPress={onClose}
            activeOpacity={1}
          />
          <View style={styles.sheet}>
            <View style={styles.handle} />
  
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Quick Quiz</Text>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <Ionicons name="close" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
  
            <Text style={styles.subtitle}>
              Which courses do you want questions from?
            </Text>
  
            <ScrollView
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
            >
              {/* All Courses Option */}
              <TouchableOpacity
                style={[
                  styles.courseRow,
                  selected === 'all' && styles.courseRowActive,
                ]}
                onPress={() => setSelected('all')}
                activeOpacity={0.8}
              >
                <View style={styles.allIcon}>
                  <Ionicons name="globe-outline" size={22} color={Colors.primary} />
                </View>
                <View style={styles.courseInfo}>
                  <Text style={[
                    styles.courseTitle,
                    selected === 'all' && styles.courseTitleActive,
                  ]}>
                    All Courses
                  </Text>
                  <Text style={styles.courseDesc}>
                    Random mix from everything
                  </Text>
                </View>
                <View style={[
                  styles.radio,
                  selected === 'all' && styles.radioActive,
                ]}>
                  {selected === 'all' && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
  
              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or pick a course</Text>
                <View style={styles.dividerLine} />
              </View>
  
              {/* Individual Courses */}
              {MOCK_COURSES.map(course => (
                <TouchableOpacity
                  key={course.id}
                  style={[
                    styles.courseRow,
                    selected === course.id && styles.courseRowActive,
                  ]}
                  onPress={() => setSelected(course.id)}
                  activeOpacity={0.8}
                >
                  <View style={[
                    styles.courseEmoji,
                    {
                      backgroundColor: course.color + '33',
                      borderColor:     course.color + '66',
                    }
                  ]}>
                    <Text style={{ fontSize: 22 }}>{course.emoji}</Text>
                  </View>
                  <View style={styles.courseInfo}>
                    <Text style={[
                      styles.courseTitle,
                      selected === course.id && styles.courseTitleActive,
                    ]}>
                      {course.title}
                    </Text>
                  </View>
                  <View style={[
                    styles.radio,
                    selected === course.id && styles.radioActive,
                  ]}>
                    {selected === course.id && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
  
            {/* Start Button */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={[
                  styles.startButton,
                  !selected && styles.startButtonDisabled,
                ]}
                onPress={handleStart}
                disabled={!selected}
                activeOpacity={0.8}
              >
                <Text style={styles.startText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    )
  }
  
  const styles = StyleSheet.create({
    overlay: {
      flex:           1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.6)',
    },
    sheet: {
      backgroundColor:      Colors.card,
      borderTopLeftRadius:  Radius.xxl,
      borderTopRightRadius: Radius.xxl,
      paddingBottom:        Spacing.lg,
      maxHeight:            '80%',
    },
    handle: {
      width:           40,
      height:          4,
      backgroundColor: Colors.border,
      borderRadius:    Radius.full,
      alignSelf:       'center',
      marginTop:       Spacing.sm,
      marginBottom:    Spacing.md,
    },
    header: {
      flexDirection:     'row',
      justifyContent:    'space-between',
      alignItems:        'center',
      paddingHorizontal: Spacing.lg,
      marginBottom:      Spacing.xs,
    },
    headerTitle: {
      fontSize:   Typography.lg,
      fontWeight: Typography.bold,
      color:      Colors.textPrimary,
    },
    closeBtn: {
      width:           32,
      height:          32,
      borderRadius:    Radius.full,
      backgroundColor: Colors.cardElevated,
      alignItems:      'center',
      justifyContent:  'center',
    },
    subtitle: {
      fontSize:          Typography.sm,
      color:             Colors.textSecondary,
      paddingHorizontal: Spacing.lg,
      marginBottom:      Spacing.md,
    },
    content: {
      paddingHorizontal: Spacing.lg,
      gap:               Spacing.sm,
      paddingBottom:     Spacing.md,
    },
    courseRow: {
      ...CardBase,
      flexDirection: 'row',
      alignItems:    'center',
      padding:       Spacing.md,
      gap:           Spacing.md,
    },
    courseRowActive: {
      borderColor:     Colors.primary,
      borderWidth:     1.5,
      backgroundColor: Colors.primaryMuted,
    },
    allIcon: {
      width:           48,
      height:          48,
      borderRadius:    Radius.full,
      backgroundColor: Colors.primaryMuted,
      borderWidth:     1,
      borderColor:     Colors.primaryBorder,
      alignItems:      'center',
      justifyContent:  'center',
    },
    courseEmoji: {
      width:          48,
      height:         48,
      borderRadius:   Radius.full,
      borderWidth:    1,
      alignItems:     'center',
      justifyContent: 'center',
    },
    courseInfo:  { flex: 1 },
    courseTitle: {
      fontSize:   Typography.base,
      fontWeight: Typography.semibold,
      color:      Colors.textPrimary,
    },
    courseTitleActive: { color: Colors.primary },
    courseDesc: {
      fontSize:  Typography.xs,
      color:     Colors.textSecondary,
      marginTop: 2,
    },
    radio: {
      width:          22,
      height:         22,
      borderRadius:   Radius.full,
      borderWidth:    2,
      borderColor:    Colors.border,
      alignItems:     'center',
      justifyContent: 'center',
    },
    radioActive:  { borderColor: Colors.primary },
    radioInner: {
      width:           12,
      height:          12,
      borderRadius:    Radius.full,
      backgroundColor: Colors.primary,
    },
    divider: {
      flexDirection:  'row',
      alignItems:     'center',
      gap:            Spacing.sm,
      marginVertical: Spacing.xs,
    },
    dividerLine: {
      flex:            1,
      height:          1,
      backgroundColor: Colors.border,
    },
    dividerText: {
      fontSize: Typography.xs,
      color:    Colors.textMuted,
    },
    footer: {
      paddingHorizontal: Spacing.lg,
      paddingTop:        Spacing.md,
      borderTopWidth:    1,
      borderTopColor:    Colors.border,
    },
    startButton: {
      backgroundColor: Colors.primary,
      borderRadius:    Radius.md,
      paddingVertical: Spacing.md,
      alignItems:      'center',
    },
    startButtonDisabled: { opacity: 0.4 },
    startText: {
      fontSize:   Typography.base,
      fontWeight: Typography.semibold,
      color:      Colors.textInverse,
    },
  })