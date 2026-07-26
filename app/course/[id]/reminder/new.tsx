

import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, ScrollView, Alert, ActivityIndicator, Platform
  } from 'react-native'
  import { useState } from 'react'
  import { router, useLocalSearchParams } from 'expo-router'
  import { Ionicons } from '@expo/vector-icons'
  import DateTimePicker from '@react-native-community/datetimepicker'
  import { Colors, Spacing, Radius, Typography, CardBase } from '@/constants/theme'
  import { useSession } from '@/hooks/useSession'
  import { useCourseOverview, TopicItem, FolderItem } from '@/hooks/useCourseOverview'
  import { ScopeType, SessionType, createReminder } from '@/hooks/useReminders'
  import { useEffect } from 'react'
  import { getReminder, updateReminder, deleteReminder } from '@/hooks/useReminders'
  
  const DAYS = [
    { value: 0, label: 'S' }, { value: 1, label: 'M' }, { value: 2, label: 'T' },
    { value: 3, label: 'W' }, { value: 4, label: 'T' }, { value: 5, label: 'F' },
    { value: 6, label: 'S' },
  ]
  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  
  interface LocalTimeSlot {
    localId:       string
    time:          Date
    sessionType:   SessionType
    questionCount: number
  }
  
  function formatTime12h(date: Date): string {
    let h = date.getHours()
    const m = date.getMinutes()
    const period = h >= 12 ? 'PM' : 'AM'
    h = h % 12 === 0 ? 12 : h % 12
    return `${h}:${m.toString().padStart(2, '0')} ${period}`
  }
  
  function toTimeString(date: Date): string {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:00`
  }
  
  // ─────────────────────────────────────────
  // RADIO ROW
  // ─────────────────────────────────────────
  function ScopeRow({
    icon, label, tag, indent, selected, onPress,
  }: {
    icon: React.ReactNode; label: string; tag?: string; indent?: number
    selected: boolean; onPress: () => void
  }) {
    return (
      <TouchableOpacity
        style={[styles.scopeRow, { paddingLeft: Spacing.md + (indent ?? 0) }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {icon}
        <Text style={styles.scopeLabel} numberOfLines={1}>{label}</Text>
        {tag && <Text style={styles.scopeTag}>{tag}</Text>}
        <View style={[styles.radio, selected && styles.radioActive]}>
          {selected && <View style={styles.radioDot} />}
        </View>
      </TouchableOpacity>
    )
  }
  
  // ─────────────────────────────────────────
  // TIME SLOT CARD
  // ─────────────────────────────────────────
  function TimeSlotCard({
    slot, onChange, onRemove,
  }: {
    slot:     LocalTimeSlot
    onChange: (updated: LocalTimeSlot) => void
    onRemove: () => void
  }) {
    const [showPicker, setShowPicker] = useState(false)
  
    return (
      <View style={styles.slotCard}>
        <TouchableOpacity style={styles.slotTimeRow} onPress={() => setShowPicker(true)} activeOpacity={0.7}>
          <Ionicons name="time-outline" size={18} color={Colors.textSecondary} />
          <Text style={styles.slotTimeText}>{formatTime12h(slot.time)}</Text>
          <TouchableOpacity onPress={onRemove} hitSlop={{top:8,bottom:8,left:8,right:8}}>
            <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        </TouchableOpacity>
  
        {showPicker && (
        <DateTimePicker
            value={slot.time}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            themeVariant="light"
            onChange={(_, date) => {
            setShowPicker(Platform.OS === 'ios')
            if (date) onChange({ ...slot, time: date })
            }}
        />
        )}
  
        <View style={styles.typeToggle}>
          <TouchableOpacity
            style={[styles.typeBtn, slot.sessionType === 'quiz' && styles.typeBtnActive]}
            onPress={() => onChange({ ...slot, sessionType: 'quiz' })}
          >
            <Ionicons name="checkbox-outline" size={14} color={slot.sessionType === 'quiz' ? '#fff' : Colors.textSecondary} />
            <Text style={[styles.typeBtnText, slot.sessionType === 'quiz' && styles.typeBtnTextActive]}>Quiz</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeBtn, slot.sessionType === 'blurt' && styles.typeBtnActive]}
            onPress={() => onChange({ ...slot, sessionType: 'blurt' })}
          >
            <Ionicons name="pencil-outline" size={14} color={slot.sessionType === 'blurt' ? '#fff' : Colors.textSecondary} />
            <Text style={[styles.typeBtnText, slot.sessionType === 'blurt' && styles.typeBtnTextActive]}>Blurt</Text>
          </TouchableOpacity>
        </View>
  
        {slot.sessionType === 'quiz' && (
          <View style={styles.stepperRow}>
            <Text style={styles.stepperLabel}>Questions</Text>
            <View style={styles.stepper}>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => onChange({ ...slot, questionCount: Math.max(1, slot.questionCount - 1) })}
              >
                <Ionicons name="remove" size={16} color={Colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.stepperValue}>{slot.questionCount}</Text>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => onChange({ ...slot, questionCount: Math.min(30, slot.questionCount + 1) })}
              >
                <Ionicons name="add" size={16} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    )
  }
  
  export default function NewReminderScreen() {
    const { id: courseId, reminderId } = useLocalSearchParams<{ id: string; reminderId?: string }>()
    const { user } = useSession()
    const { course, loading } = useCourseOverview(courseId ?? null, user?.id ?? null)
    const isEditing = !!reminderId
    const [prefilling, setPrefilling] = useState(isEditing)
  
    const [label,       setLabel]       = useState('')
    const [scopeType,   setScopeType]   = useState<ScopeType>('all')
    const [scopeId,     setScopeId]     = useState<string | null>(null)
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
    const [days,        setDays]        = useState<Set<number>>(new Set([1, 2, 3, 4, 5]))
    const [slots,       setSlots]       = useState<LocalTimeSlot[]>([
      { localId: '1', time: new Date(new Date().setHours(8, 0, 0, 0)), sessionType: 'quiz', questionCount: 5 },
    ])
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!reminderId) return
        getReminder(reminderId).then(reminder => {
          if (!reminder) return
          setLabel(reminder.label)
          setScopeType(reminder.scope_type)
          setScopeId(reminder.scope_id)
          setDays(new Set(reminder.days_of_week))
          setSlots(reminder.time_slots.map(s => {
            const [h, m] = s.time_of_day.split(':').map(Number)
            const d = new Date()
            d.setHours(h, m, 0, 0)
            return {
              localId:       s.id,
              time:          d,
              sessionType:   s.session_type,
              questionCount: s.question_count ?? 5,
            }
          }))
          setPrefilling(false)
        }).catch(() => setPrefilling(false))
      }, [reminderId])
  
    const selectScope = (type: ScopeType, id: string | null) => { setScopeType(type); setScopeId(id) }
    const toggleExpanded = (id: string) => {
      setExpandedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
    }
    const toggleDay = (d: number) => {
      setDays(prev => { const next = new Set(prev); next.has(d) ? next.delete(d) : next.add(d); return next })
    }
    const addSlot = () => {
      setSlots(prev => [...prev, {
        localId: Date.now().toString(),
        time: new Date(new Date().setHours(12, 0, 0, 0)),
        sessionType: 'quiz', questionCount: 5,
      }])
    }
    const updateSlot = (updated: LocalTimeSlot) => setSlots(prev => prev.map(s => s.localId === updated.localId ? updated : s))
    const removeSlot = (localId: string) => setSlots(prev => prev.filter(s => s.localId !== localId))
  
    const renderTopic = (topic: TopicItem) => {
      const expanded = expandedIds.has(topic.id)
      return (
        <View key={topic.id}>
          <TouchableOpacity
            style={[styles.scopeRow, { paddingLeft: Spacing.md }]}
            onPress={() => selectScope('topic', topic.id)}
            activeOpacity={0.7}
          >
            {topic.subtopics.length > 0 ? (
              <TouchableOpacity onPress={() => toggleExpanded(topic.id)} hitSlop={{top:8,bottom:8,left:8,right:8}}>
                <Ionicons name={expanded ? 'chevron-down' : 'chevron-forward'} size={14} color={Colors.textMuted} />
              </TouchableOpacity>
            ) : <View style={{ width: 14 }} />}
            <Text style={styles.scopeLabel} numberOfLines={1}>{topic.title}</Text>
            <View style={[styles.radio, scopeType === 'topic' && scopeId === topic.id && styles.radioActive]}>
              {scopeType === 'topic' && scopeId === topic.id && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>
          {expanded && topic.subtopics.map(sub => (
            <ScopeRow
              key={sub.id}
              icon={<Ionicons name="return-down-forward" size={13} color={Colors.textMuted} />}
              label={sub.title}
              indent={24}
              selected={scopeType === 'subtopic' && scopeId === sub.id}
              onPress={() => selectScope('subtopic', sub.id)}
            />
          ))}
        </View>
      )
    }
  
    const renderFolder = (folder: FolderItem) => (
      <View key={folder.id}>
        <ScopeRow
          icon={<Ionicons name="folder-outline" size={16} color={Colors.primary} />}
          label={folder.title} tag="Folder"
          selected={scopeType === 'folder' && scopeId === folder.id}
          onPress={() => selectScope('folder', folder.id)}
        />
        {folder.topics.map(renderTopic)}
      </View>
    )
  
    const handleSave = async () => {
        if (!user || !courseId) return
        if (!label.trim()) { Alert.alert('Required', 'Please enter a label.'); return }
        if (days.size === 0) { Alert.alert('Required', 'Select at least one day.'); return }
        if (slots.length === 0) { Alert.alert('Required', 'Add at least one time.'); return }
      
        setSaving(true)
        try {
          const timeSlots = slots.map(s => ({
            time:          toTimeString(s.time),
            sessionType:   s.sessionType,
            questionCount: s.questionCount,
          }))
      
          if (isEditing && reminderId) {
            await updateReminder({
              reminderId, label: label.trim(), scopeType, scopeId,
              daysOfWeek: Array.from(days), timeSlots,
            })
          } else {
            await createReminder({
              userId: user.id, courseId, label: label.trim(), scopeType, scopeId,
              daysOfWeek: Array.from(days), timeSlots,
            })
          }
          router.back()
        } catch (err: any) {
          Alert.alert('Error', err.message)
        } finally {
          setSaving(false)
        }
      }

      const handleDelete = () => {
        if (!reminderId) return
        Alert.alert('Delete Reminder', `Delete "${label}"?`, [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete', style: 'destructive',
            onPress: async () => {
              try {
                await deleteReminder(reminderId)
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
          <Text style={styles.headerTitle}>{isEditing ? 'Edit reminder' : 'New reminder'}</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color={Colors.primary} /> : <Text style={styles.saveText}>Save</Text>}
          </TouchableOpacity>
        </View>
  
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.fieldLabel}>Label</Text>
          <TextInput
            style={styles.input}
            value={label}
            onChangeText={setLabel}
            placeholder="e.g. Morning revision"
            placeholderTextColor={Colors.textMuted}
          />
  
          <Text style={styles.fieldLabel}>Study from</Text>
          <View style={styles.scopeList}>
            <ScopeRow
              icon={<Ionicons name="layers-outline" size={16} color={Colors.primary} />}
              label="All materials"
              selected={scopeType === 'all'}
              onPress={() => selectScope('all', null)}
            />
            {course.folders.map(renderFolder)}
            {course.unorganizedTopics.map(renderTopic)}
          </View>
  
          <Text style={styles.fieldLabel}>Repeat on</Text>
          <View style={styles.dayRow}>
            {DAYS.map(d => (
              <TouchableOpacity
                key={d.value}
                style={[styles.dayCircle, days.has(d.value) && styles.dayCircleActive]}
                onPress={() => toggleDay(d.value)}
              >
                <Text style={[styles.dayText, days.has(d.value) && styles.dayTextActive]}>{d.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.dayNames}>
            {[...days].sort((a,b)=>a-b).map(d => DAY_NAMES[d]).join(', ') || 'No days selected'}
          </Text>
  
          <View style={styles.slotsHeader}>
            <Text style={styles.fieldLabel}>Times of day</Text>
            <TouchableOpacity onPress={addSlot}>
              <Text style={styles.addTimeText}>+ Add time</Text>
            </TouchableOpacity>
          </View>
          {slots.map(slot => (
            <TimeSlotCard
              key={slot.localId}
              slot={slot}
              onChange={updateSlot}
              onRemove={() => removeSlot(slot.localId)}
            />
          ))}
          {isEditing && (
            <TouchableOpacity style={styles.deleteRow} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={16} color={Colors.error} />
                <Text style={styles.deleteRowText}>Delete reminder</Text>
            </TouchableOpacity>
            )}
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
    container: { paddingHorizontal: Spacing.base, paddingBottom: Spacing.xxxl },
    fieldLabel: { fontSize: Typography.sm, fontWeight: Typography.medium, color: Colors.textPrimary, marginTop: Spacing.lg, marginBottom: Spacing.xs },
    input: {
      backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.full,
      paddingVertical: Spacing.md, paddingHorizontal: Spacing.md, fontSize: Typography.base, color: Colors.textPrimary,
    },
    scopeList: { ...CardBase, overflow: 'hidden', padding: 0 },
    scopeRow: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
      paddingVertical: Spacing.md, paddingRight: Spacing.md,
      borderBottomWidth: 1, borderBottomColor: Colors.border,
    },
    scopeLabel: { flex: 1, fontSize: Typography.sm, color: Colors.textPrimary },
    scopeTag: { fontSize: Typography.xs, color: Colors.textMuted },
    radio: {
      width: 20, height: 20, borderRadius: Radius.full, borderWidth: 2,
      borderColor: Colors.border, alignItems: 'center', justifyContent: 'center',
    },
    radioActive: { borderColor: Colors.primary },
    radioDot: { width: 10, height: 10, borderRadius: Radius.full, backgroundColor: Colors.primary },
    dayRow: { flexDirection: 'row', justifyContent: 'space-between' },
    dayCircle: {
      width: 40, height: 40, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border,
      alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.card,
    },
    dayCircleActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    dayText: { fontSize: Typography.sm, color: Colors.textSecondary },
    dayTextActive: { color: '#fff', fontWeight: Typography.semibold },
    dayNames: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: Spacing.sm },
    slotsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    addTimeText: { fontSize: Typography.sm, fontWeight: Typography.medium, color: Colors.primary, marginTop: Spacing.lg },
    slotCard: { ...CardBase, padding: Spacing.md, marginTop: Spacing.sm, gap: Spacing.md },
    slotTimeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    slotTimeText: { flex: 1, fontSize: Typography.md, fontWeight: Typography.bold, color: Colors.textPrimary },
    typeToggle: { flexDirection: 'row', gap: Spacing.sm },
    typeBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs,
      paddingVertical: Spacing.sm, borderRadius: Radius.full, backgroundColor: Colors.cardElevated,
      borderWidth: 1, borderColor: Colors.border,
    },
    typeBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    typeBtnText: { fontSize: Typography.sm, color: Colors.textSecondary, fontWeight: Typography.medium },
    typeBtnTextActive: { color: '#fff' },
    stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    stepperLabel: { fontSize: Typography.sm, color: Colors.textSecondary },
    stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    stepperBtn: {
      width: 28, height: 28, borderRadius: Radius.full, backgroundColor: Colors.cardElevated,
      borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center',
    },
    stepperValue: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary, minWidth: 24, textAlign: 'center' },
    deleteRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs,
        marginTop: Spacing.xl, paddingVertical: Spacing.md,
      },
      deleteRowText: { fontSize: Typography.sm, color: Colors.error, fontWeight: Typography.medium },
  })