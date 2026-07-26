// app/course/[id]/exam/new.tsx

import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, ScrollView, Alert, ActivityIndicator, Platform
  } from 'react-native'
  import { useState } from 'react'
  import { router, useLocalSearchParams } from 'expo-router'
  import { Ionicons } from '@expo/vector-icons'
  import DateTimePicker from '@react-native-community/datetimepicker'
  import { Colors, Spacing, Radius, Typography } from '@/constants/theme'
  import { useSession } from '@/hooks/useSession'
  import { useCourseOverview } from '@/hooks/useCourseOverview'
  import { createExam } from '@/hooks/useExams'
  import StudyMaterialsList from '@/components/studyMaterialsList'
  import { useEffect } from 'react'
  import { getExam, updateExam, deleteExam } from '@/hooks/useExams'
  
  const EXAM_TYPES = [
    { value: 'quiz',    label: 'Quiz'    },
    { value: 'test',    label: 'Test'    },
    { value: 'midterm', label: 'Midterm' },
    { value: 'final',   label: 'Final'   },
    { value: 'exam',    label: 'Exam'    },
  ]
  
  function formatDateDisplay(date: Date): string {
    const mm = (date.getMonth() + 1).toString().padStart(2, '0')
    const dd = date.getDate().toString().padStart(2, '0')
    return `${mm}/${dd}/${date.getFullYear()}`
  }
  
  function toDateString(date: Date): string {
    const mm = (date.getMonth() + 1).toString().padStart(2, '0')
    const dd = date.getDate().toString().padStart(2, '0')
    return `${date.getFullYear()}-${mm}-${dd}`
  }
  
  export default function NewExamScreen() {
    const { id: courseId, examId } = useLocalSearchParams<{ id: string; examId?: string }>()
    const { user } = useSession()
    const { course, loading } = useCourseOverview(courseId ?? null, user?.id ?? null)
  
    const [examType,    setExamType]    = useState('quiz')
    const [title,       setTitle]       = useState('')
    const [date,        setDate]        = useState(new Date())
    const [showPicker,  setShowPicker]  = useState(false)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [saving,      setSaving]      = useState(false)
    const isEditing = !!examId
    const [prefilling, setPrefilling] = useState(isEditing)

    useEffect(() => {
        if (!examId) return
        getExam(examId).then(exam => {
          if (!exam) return
          setExamType(exam.exam_type)
          setTitle(exam.title)
          const datePart = exam.exam_date.split('T')[0]
          setDate(new Date(datePart + 'T00:00:00'))
          setSelectedIds(new Set(exam.material_note_ids ?? []))
          setPrefilling(false)
        }).catch(() => setPrefilling(false))
      }, [examId])
  
    const handleToggle = (ids: string[]) => {
      setSelectedIds(prev => {
        const next = new Set(prev)
        const allSelected = ids.every(id => next.has(id))
        ids.forEach(id => allSelected ? next.delete(id) : next.add(id))
        return next
      })
    }
  
    const handleSave = async () => {
        if (!user || !courseId) return
      
        setSaving(true)
        try {
          const typeLabel = EXAM_TYPES.find(t => t.value === examType)?.label ?? 'Test'
          const payload = {
            title:           title.trim() || typeLabel,
            examType,
            examDate:        toDateString(date),
            materialNoteIds: Array.from(selectedIds),
          }
      
          if (isEditing && examId) {
            await updateExam({ examId, ...payload })
          } else {
            await createExam({ userId: user.id, courseId, ...payload })
          }
          router.back()
        } catch (err: any) {
          Alert.alert('Error', err.message)
        } finally {
          setSaving(false)
        }
      }

      const handleDelete = () => {
        if (!examId) return
        Alert.alert('Delete Test', `Delete "${title || 'this test'}"?`, [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete', style: 'destructive',
            onPress: async () => {
              try {
                await deleteExam(examId)
                router.back()
              } catch (err: any) {
                Alert.alert('Error', err.message)
              }
            },
          },
        ])
      }
  
      if (loading || !course || prefilling) return (
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
          <Text style={styles.headerTitle}>{isEditing ? 'Edit test' : 'New test'}</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color={Colors.primary} /> : <Text style={styles.saveText}>Save</Text>}
          </TouchableOpacity>
        </View>
  
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.fieldLabel}>Type</Text>
          <View style={styles.chipRow}>
            {EXAM_TYPES.map(t => (
              <TouchableOpacity
                key={t.value}
                style={[styles.chip, examType === t.value && styles.chipActive]}
                onPress={() => setExamType(t.value)}
              >
                <Text style={[styles.chipText, examType === t.value && styles.chipTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
  
          <Text style={styles.fieldLabel}>Title <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Midterm Exam"
            placeholderTextColor={Colors.textMuted}
          />
  
          <Text style={styles.fieldLabel}>Date</Text>
          <TouchableOpacity style={styles.input} onPress={() => setShowPicker(true)} activeOpacity={0.7}>
            <Text style={styles.dateText}>{formatDateDisplay(date)}</Text>
          </TouchableOpacity>
          {showPicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              themeVariant="light"
              onChange={(_, selected) => {
                setShowPicker(Platform.OS === 'ios')
                if (selected) setDate(selected)
              }}
            />
          )}
  
          <View style={styles.materialsHeader}>
            <Text style={styles.fieldLabel}>Materials covered</Text>
            <Text style={styles.selectedCount}>{selectedIds.size} selected</Text>
          </View>
          <StudyMaterialsList course={course} selectedIds={selectedIds} onToggle={handleToggle} />
        </ScrollView>
        {isEditing && (
        <TouchableOpacity style={styles.deleteRow} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={16} color={Colors.error} />
            <Text style={styles.deleteRowText}>Delete test</Text>
        </TouchableOpacity>
        )}
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
    container: { paddingHorizontal: Spacing.base, paddingBottom: Spacing.xxxl },
    fieldLabel: { fontSize: Typography.sm, fontWeight: Typography.medium, color: Colors.textPrimary, marginTop: Spacing.lg, marginBottom: Spacing.xs },
    optional: { color: Colors.textMuted, fontWeight: Typography.regular },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    chip: {
      paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: Radius.full,
      borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card,
    },
    chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryMuted },
    chipText: { fontSize: Typography.sm, color: Colors.textSecondary },
    chipTextActive: { color: Colors.primary, fontWeight: Typography.semibold },
    input: {
      backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.full,
      paddingVertical: Spacing.md, paddingHorizontal: Spacing.md, justifyContent: 'center',
    },
    dateText: { fontSize: Typography.base, color: Colors.textPrimary },
    deleteRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs,
        marginTop: Spacing.xl, paddingVertical: Spacing.md,
      },
      deleteRowText: { fontSize: Typography.sm, color: Colors.error, fontWeight: Typography.medium },
    materialsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    selectedCount: { fontSize: Typography.sm, color: Colors.textMuted, marginTop: Spacing.lg },
  })