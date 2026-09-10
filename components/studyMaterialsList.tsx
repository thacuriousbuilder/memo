
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { Colors, Spacing, Radius, Typography, CardBase } from '@/constants/theme'
import {
  CourseOverview, TopicItem, SubtopicItem, FolderItem, NoteRef, MasteryStats,
  deleteFolder, deleteTopic, deleteSubtopic,
} from '@/hooks/useCourseOverview'

function topicNoteIds(topic: TopicItem): string[] {
  return [...topic.notes.map(n => n.id), ...topic.subtopics.flatMap(s => s.notes.map(n => n.id))]
}
function folderNoteIds(folder: FolderItem): string[] {
  return folder.topics.flatMap(topicNoteIds)
}

function MasteryStatus({ noteCount, item }: { noteCount: number; item: MasteryStats }) {
  if (noteCount === 0) return null
  if (item.questionCount === 0) return <Text style={styles.rowStatus}>Parsed</Text>
  if (item.isMastered) return <Text style={styles.rowStatus}>✓ Mastered</Text>
  if (item.quizMastered) return <Text style={styles.rowStatusPartial}>{item.masteredCount}/{item.questionCount} mastered · weak recall</Text>
  if (item.masteredCount > 0) return <Text style={styles.rowStatusPartial}>{item.masteredCount}/{item.questionCount} mastered</Text>
  return <Text style={styles.rowStatus}>Parsed</Text>
}

function Checkbox({ checked, onPress }: { checked: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.checkbox, checked && styles.checkboxChecked]}
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      {checked && <Ionicons name="checkmark" size={13} color="#fff" />}
    </TouchableOpacity>
  )
}

function DeleteIcon({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <Ionicons name="remove-circle" size={22} color={Colors.error} />
    </TouchableOpacity>
  )
}

function SubtopicRow({
  subtopic, selectedIds, onToggle, managing, onRefetch,
}: {
  subtopic: SubtopicItem; selectedIds: Set<string>; onToggle: (ids: string[]) => void
  managing: boolean; onRefetch: () => void
}) {
  const ids     = subtopic.notes.map(n => n.id)
  const checked = ids.length > 0 && ids.every(id => selectedIds.has(id))

  const handleDelete = () => {
    Alert.alert('Delete Subtopic', `Delete "${subtopic.title}"? This removes its notes too.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteSubtopic(subtopic.id); onRefetch() } },
    ])
  }

  return (
    <View style={styles.subtopicRow}>
      <Ionicons name="return-down-forward" size={14} color={Colors.textMuted} style={{ marginRight: 4 }} />
      {managing ? <DeleteIcon onPress={handleDelete} /> : <Checkbox checked={checked} onPress={() => onToggle(ids)} />}
      <Ionicons name="document-text-outline" size={16} color={Colors.textSecondary} />
      <View style={styles.rowInfo}>
        <Text style={styles.rowTitle} numberOfLines={1}>{subtopic.title}</Text>
        <MasteryStatus noteCount={ids.length} item={subtopic} />
      </View>
    </View>
  )
}

function TopicRow({
  topic, selectedIds, onToggle, managing, onRefetch,
}: {
  topic: TopicItem; selectedIds: Set<string>; onToggle: (ids: string[]) => void
  managing: boolean; onRefetch: () => void
}) {
  const ids     = topicNoteIds(topic)
  const checked = ids.length > 0 && ids.every(id => selectedIds.has(id))

  const handleDelete = () => {
    Alert.alert('Delete Topic', `Delete "${topic.title}"? This removes its subtopics and notes too.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteTopic(topic.id); onRefetch() } },
    ])
  }

  return (
    <View>
      <View style={styles.row}>
        {managing ? <DeleteIcon onPress={handleDelete} /> : <Checkbox checked={checked} onPress={() => onToggle(ids)} />}
        <Ionicons name="document-text-outline" size={18} color={Colors.textSecondary} />
        <View style={styles.rowInfo}>
          <Text style={styles.rowTitle} numberOfLines={1}>{topic.title}</Text>
          <MasteryStatus noteCount={ids.length} item={topic} />
        </View>
      </View>
      {topic.subtopics.map(sub => (
        <SubtopicRow key={sub.id} subtopic={sub} selectedIds={selectedIds} onToggle={onToggle} managing={managing} onRefetch={onRefetch} />
      ))}
    </View>
  )
}

function FolderSection({
  folder, selectedIds, onToggle, managing, onRefetch,
}: {
  folder: FolderItem; selectedIds: Set<string>; onToggle: (ids: string[]) => void
  managing: boolean; onRefetch: () => void
}) {
  const [open, setOpen] = useState(true)
  const ids     = folderNoteIds(folder)
  const checked = ids.length > 0 && ids.every(id => selectedIds.has(id))

  const handleDelete = () => {
    Alert.alert('Delete Folder', `Delete "${folder.title}"? This removes everything inside it too.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteFolder(folder.id); onRefetch() } },
    ])
  }

  return (
    <View>
      <View style={styles.row}>
        {managing ? <DeleteIcon onPress={handleDelete} /> : <Checkbox checked={checked} onPress={() => onToggle(ids)} />}
        <Ionicons name="folder-outline" size={18} color={Colors.primary} />
        <View style={styles.rowInfo}>
          <Text style={[styles.rowTitle, { fontWeight: Typography.bold }]} numberOfLines={1}>{folder.title}</Text>
        </View>
        {!managing && <Text style={styles.folderCount}>{folder.topics.length}</Text>}
        <TouchableOpacity onPress={() => setOpen(o => !o)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>
      {open && folder.topics.map(topic => (
        <TopicRow key={topic.id} topic={topic} selectedIds={selectedIds} onToggle={onToggle} managing={managing} onRefetch={onRefetch} />
      ))}
    </View>
  )
}

function FlatNoteRow({
  note, selectedIds, onToggle,
}: {
  note: NoteRef; selectedIds: Set<string>; onToggle: (ids: string[]) => void
}) {
  const checked = selectedIds.has(note.id)
  return (
    <View style={styles.row}>
      <Checkbox checked={checked} onPress={() => onToggle([note.id])} />
      <Ionicons name="document-text-outline" size={18} color={Colors.textSecondary} />
      <View style={styles.rowInfo}>
        <Text style={styles.rowTitle} numberOfLines={1}>{note.file_name}</Text>
        <Text style={styles.rowStatus}>Parsed</Text>
      </View>
    </View>
  )
}

interface Props {
  course:      CourseOverview
  selectedIds: Set<string>
  onToggle:    (ids: string[]) => void
  managing?:   boolean
  onRefetch?:  () => void
}

export default function StudyMaterialsList({ course, selectedIds, onToggle, managing = false, onRefetch = () => {} }: Props) {
  const isEmpty = course.flatNotes.length === 0 && course.unorganizedTopics.length === 0 && course.folders.length === 0

  if (isEmpty) {
    return (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyText}>No materials yet. Upload notes to get started.</Text>
      </View>
    )
  }

  const hasUnorganized = course.flatNotes.length > 0 || course.unorganizedTopics.length > 0

  return (
    <View style={styles.sectionsWrapper}>
      {hasUnorganized && (
        <View style={styles.list}>
          {course.flatNotes.map(note => (
            <FlatNoteRow key={note.id} note={note} selectedIds={selectedIds} onToggle={onToggle} />
          ))}
          {course.unorganizedTopics.map(topic => (
            <TopicRow key={topic.id} topic={topic} selectedIds={selectedIds} onToggle={onToggle} managing={managing} onRefetch={onRefetch} />
          ))}
        </View>
      )}

      {course.folders.map(folder => (
        <View key={folder.id} style={styles.list}>
          <FolderSection folder={folder} selectedIds={selectedIds} onToggle={onToggle} managing={managing} onRefetch={onRefetch} />
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  sectionsWrapper: { gap: Spacing.md },
  list:   { ...CardBase, overflow: 'hidden', padding: Spacing.sm, gap: 2 },
  row:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.xs },
  subtopicRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, paddingLeft: Spacing.lg },
  rowInfo:   { flex: 1 },
  rowTitle:  { fontSize: Typography.sm, color: Colors.textPrimary },
  rowStatus: { fontSize: Typography.xs, color: Colors.success, marginTop: 1 },
  rowStatusPartial: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 1 },
  checkbox: {
    width: 20, height: 20, borderRadius: Radius.sm, borderWidth: 2,
    borderColor: Colors.border, alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  folderCount: { fontSize: Typography.xs, color: Colors.textMuted, marginRight: 4 },
  emptyBox: {
    borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed', borderRadius: Radius.lg,
    padding: Spacing.xl, alignItems: 'center',
  },
  emptyText: { fontSize: Typography.sm, color: Colors.textMuted, textAlign: 'center' },
})