

import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, ScrollView, Alert, ActivityIndicator
  } from 'react-native'
  import { useState, useEffect, useMemo } from 'react'
  import { router, useLocalSearchParams } from 'expo-router'
  import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons'
  import { Colors, Spacing, Radius, Typography } from '@/constants/theme'
  import { COURSE_ICONS, COURSE_COLORS } from '@/constants/courseAppearance'
  import { useSession } from '@/hooks/useSession'
  import { useCourses, updateCourse, deleteCourse } from '@/hooks/useCourses'
  
  export default function EditCourseScreen() {
    const { id } = useLocalSearchParams<{ id: string }>()
    const { user } = useSession()
    const { courses, loading, refetch } = useCourses(user?.id ?? null)
  
    const course = useMemo(() => courses.find(c => c.id === id), [courses, id])
  
    const existingGroups = useMemo(() => {
      const set = new Set<string>()
      courses.forEach(c => { if (c.course_group) set.add(c.course_group) })
      return Array.from(set)
    }, [courses])
  
    const [title,       setTitle]       = useState('')
    const [courseGroup, setCourseGroup] = useState('')
    const [customGroup, setCustomGroup] = useState('')
    const [icon,         setIcon]       = useState(COURSE_ICONS[0])
    const [color,        setColor]      = useState(COURSE_COLORS[0])
    const [saving,       setSaving]     = useState(false)
  
    useEffect(() => {
      if (course) {
        setTitle(course.title)
        setCourseGroup(course.course_group ?? '')
        setIcon(course.emoji)
        setColor(course.color ?? COURSE_COLORS[0])
      }
    }, [course])
  
    const effectiveGroup = customGroup.trim() || courseGroup
  
    const handleSave = async () => {
        if (!course) return
        if (!title.trim()) { Alert.alert('Required', 'Please enter a subject name.'); return }
      
        setSaving(true)
        try {
          await updateCourse({
            courseId:     course.id,
            title:        title.trim(),
            description:  course.description ?? '',
            emoji:        icon,
            color,
            course_group: effectiveGroup,
          })
          refetch()
          router.back()
        } catch (err: any) {
          Alert.alert('Error', err.message)
        } finally {
          setSaving(false)
        }
      }
    const handleDelete = () => {
      if (!course) return
      Alert.alert(
        'Delete Subject',
        `Delete "${course.title}"? This will permanently remove all lessons, notes, and questions.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete', style: 'destructive',
            onPress: async () => {
              try {
                await deleteCourse(course.id)
                router.back()
              } catch (err: any) {
                Alert.alert('Error', err.message)
              }
            },
          },
        ]
      )
    }
  
    if (loading || !course) return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    )
  
    return (
      <View style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit subject</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator color={Colors.primary} />
              : <Text style={styles.saveText}>Save</Text>}
          </TouchableOpacity>
        </View>
  
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.fieldLabel}>Subject name</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholderTextColor={Colors.textMuted}
          />
  
          <Text style={styles.fieldLabel}>Group by</Text>
          <View style={styles.chipRow}>
            {existingGroups.map(g => (
              <TouchableOpacity
                key={g}
                style={[styles.chip, courseGroup === g && !customGroup && styles.chipActive]}
                onPress={() => { setCourseGroup(g); setCustomGroup('') }}
              >
                <Text style={[styles.chipText, courseGroup === g && !customGroup && styles.chipTextActive]}>{g}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.chip, !courseGroup && !customGroup && styles.chipActive]}
              onPress={() => { setCourseGroup(''); setCustomGroup('') }}
            >
              <Text style={[styles.chipText, !courseGroup && !customGroup && styles.chipTextActive]}>Other Subjects</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.input}
            value={customGroup}
            onChangeText={setCustomGroup}
            placeholder="Or type a new group (e.g. Year 1, Semester 2)"
            placeholderTextColor={Colors.textMuted}
          />
  
          <Text style={styles.fieldLabel}>Icon</Text>
          <View style={styles.iconGrid}>
            {COURSE_ICONS.map(name => (
              <TouchableOpacity
                key={name}
                style={[styles.iconBtn, icon === name && styles.iconBtnActive]}
                onPress={() => setIcon(name)}
              >
                <MaterialCommunityIcons
                  name={name as any}
                  size={22}
                  color={icon === name ? Colors.primary : Colors.textSecondary}
                />
              </TouchableOpacity>
            ))}
          </View>
  
          <Text style={styles.fieldLabel}>Color</Text>
          <View style={styles.colorRow}>
            {COURSE_COLORS.map(c => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: c },
                  color === c && styles.colorSwatchActive,
                ]}
                onPress={() => setColor(c)}
              />
            ))}
          </View>
  
          <TouchableOpacity style={styles.deleteRow} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={16} color={Colors.error} />
            <Text style={styles.deleteText}>Delete subject</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    )
  }
  
  const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.background },
    center: { alignItems: 'center', justifyContent: 'center' },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: Spacing.base, paddingTop: Spacing.xl + 32, paddingBottom: Spacing.md,
    },
    headerTitle: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary },
    saveText: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.primary },
    container: { paddingHorizontal: Spacing.base, paddingBottom: Spacing.xxxl, gap: Spacing.xs },
    fieldLabel: { fontSize: Typography.sm, fontWeight: Typography.medium, color: Colors.textPrimary, marginTop: Spacing.lg, marginBottom: Spacing.xs },
    input: {
      backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.full,
      paddingVertical: Spacing.md, paddingHorizontal: Spacing.md, fontSize: Typography.base, color: Colors.textPrimary,
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm },
    chip: {
      paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: Radius.full,
      borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card,
    },
    chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryMuted },
    chipText: { fontSize: Typography.sm, color: Colors.textSecondary },
    chipTextActive: { color: Colors.primary, fontWeight: Typography.semibold },
    iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    iconBtn: {
      width: 48, height: 48, borderRadius: Radius.md, backgroundColor: Colors.card,
      borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center',
    },
    iconBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryMuted },
    colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
    colorSwatch: { width: 40, height: 40, borderRadius: Radius.full, borderWidth: 2, borderColor: 'transparent' },
    colorSwatchActive: { borderColor: Colors.textPrimary },
    deleteRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs,
      marginTop: Spacing.xl, paddingVertical: Spacing.md,
    },
    deleteText: { fontSize: Typography.sm, color: Colors.error, fontWeight: Typography.medium },
  })