
import {
  View, Text, TouchableOpacity, StyleSheet,
  Modal, FlatList, ActivityIndicator
} from 'react-native'
import { useState } from 'react'
import { router }   from 'expo-router'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { Colors, Spacing, Radius, Typography, CardBase } from '@/constants/theme'
import { useSession } from '@/hooks/useSession'
import { useCourses }  from '@/hooks/useCourses'

// ─────────────────────────────────────────
// CREATE OPTIONS
// ─────────────────────────────────────────
const OPTIONS = [
  {
    id:       'course',
    icon:     'book',
    iconBg:   Colors.primary,
    title:    'Create Subject',
    subtitle: 'Start a new subject from scratch',
    action:   'new_course' as const,
  },
  {
    id:       'lesson',
    icon:     'add-circle',
    iconBg:   Colors.textMuted,
    title:    'Add Note',
    subtitle: 'Add a Note to an existing subject',
    action:   'new_lesson' as const,
  },
  {
    id:       'test',
    icon:     'document-text',
    iconBg:   Colors.textMuted,
    title:    'Add Test',
    subtitle: 'Track an exam for an existing subject',
    action:   'new_test' as const,
  },
]

// ─────────────────────────────────────────
// COURSE PICKER SHEET
// ─────────────────────────────────────────
function CoursePickerSheet({
  visible, onClose, onSelect,
}: {
  visible:  boolean
  onClose:  () => void
  onSelect: (courseId: string) => void
}) {
  const { user } = useSession()
  const { courses, loading } = useCourses(user?.id ?? null)

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>Choose a subject</Text>

          {loading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing.xl }} />
          ) : courses.length === 0 ? (
            <Text style={styles.sheetEmpty}>No subjects yet — create one first.</Text>
          ) : (
            <FlatList
              data={courses}
              keyExtractor={c => c.id}
              style={{ maxHeight: 400 }}
              ItemSeparatorComponent={() => <View style={styles.sheetDivider} />}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.sheetRow} onPress={() => onSelect(item.id)} activeOpacity={0.7}>
                  <View style={[styles.sheetIconBadge, { backgroundColor: (item.color ?? Colors.primary) + '22' }]}>
                    <MaterialCommunityIcons name={item.emoji as any} size={18} color={item.color ?? Colors.primary} />
                  </View>
                  <Text style={styles.sheetRowText} numberOfLines={1}>{item.title}</Text>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  )
}

export default function CreateScreen() {
  const [pickerFor, setPickerFor] = useState<'new_lesson' | 'new_test' | null>(null)

  const handleOption = (action: typeof OPTIONS[number]['action']) => {
    if (action === 'new_course') {
      router.push('/course/create')
      return
    }
    setPickerFor(action)
  }

  const handleCourseSelected = (courseId: string) => {
    const target = pickerFor === 'new_lesson'
      ? `/course/${courseId}/material/new`
      : `/course/${courseId}/exam/new`
    setPickerFor(null)
    router.push(target as any)
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create</Text>
      </View>

      <View style={styles.list}>
        {OPTIONS.map((option, index) => (
          <TouchableOpacity
            key={option.id}
            style={[styles.optionRow, index < OPTIONS.length - 1 && styles.optionRowBorder]}
            activeOpacity={0.8}
            onPress={() => handleOption(option.action)}
          >
            <View style={[styles.optionIcon, { backgroundColor: option.iconBg + '33' }]}>
              <Ionicons
                name={option.icon as any}
                size={22}
                color={option.iconBg === Colors.primary ? Colors.primary : Colors.textSecondary}
              />
            </View>
            <View style={styles.optionInfo}>
              <Text style={styles.optionTitle}>{option.title}</Text>
              <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        ))}
      </View>

      <CoursePickerSheet
        visible={pickerFor !== null}
        onClose={() => setPickerFor(null)}
        onSelect={handleCourseSelected}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.base, paddingTop: Spacing.xl + 32, paddingBottom: Spacing.lg,
  },
  backButton: {
    width: 36, height: 36, borderRadius: Radius.full, backgroundColor: Colors.card,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  headerTitle: { fontSize: Typography.xxl, fontWeight: Typography.bold, color: Colors.textPrimary },
  list: { marginHorizontal: Spacing.base, ...CardBase, overflow: 'hidden', padding: 0 },
  optionRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: Spacing.lg, paddingHorizontal: Spacing.base, gap: Spacing.md,
  },
  optionRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  optionIcon: { width: 52, height: 52, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  optionInfo: { flex: 1 },
  optionTitle: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  optionSubtitle: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 2 },

  // Course picker sheet
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: Colors.card, borderTopLeftRadius: Radius.xxl, borderTopRightRadius: Radius.xxl,
    paddingHorizontal: Spacing.base, paddingTop: Spacing.md, paddingBottom: Spacing.xxxl, maxHeight: '70%',
  },
  handle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: Radius.full, alignSelf: 'center', marginBottom: Spacing.md },
  sheetTitle: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary, marginBottom: Spacing.md },
  sheetEmpty: { fontSize: Typography.sm, color: Colors.textMuted, textAlign: 'center', paddingVertical: Spacing.xl },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md },
  sheetIconBadge: { width: 36, height: 36, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  sheetRowText: { flex: 1, fontSize: Typography.base, color: Colors.textPrimary },
  sheetDivider: { height: 1, backgroundColor: Colors.border },
})