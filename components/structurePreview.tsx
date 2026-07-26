
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors, Spacing, Radius, Typography, CardBase } from '@/constants/theme'
import { CourseOverview, TopicItem } from '@/hooks/useCourseOverview'

export type NewMaterialType = 'topic' | 'subtopic'

interface Props {
  course:         CourseOverview
  newType:        NewMaterialType
  newTitle:       string
  targetFolderId: string | null
  newFolderName:  string
  targetTopicId:  string | null
}

function NewRow({ label, indent = false }: { label: string; indent?: boolean }) {
  return (
    <View style={[indent ? styles.subRow : styles.row, styles.newRow]}>
      <Ionicons
        name={indent ? 'return-down-forward' : 'chevron-forward'}
        size={13}
        color={Colors.primary}
      />
      <Text style={[styles.rowText, styles.newRowText]} numberOfLines={1}>{label}</Text>
      <View style={styles.newBadge}><Text style={styles.newBadgeText}>NEW</Text></View>
    </View>
  )
}

function TopicBlock({
  topic, showNewSubtopicHere, newTitle,
}: {
  topic: TopicItem
  showNewSubtopicHere: boolean
  newTitle: string
}) {
  return (
    <View>
      <View style={styles.row}>
        <Ionicons name="chevron-forward" size={13} color={Colors.textMuted} />
        <Text style={styles.rowText} numberOfLines={1}>{topic.title}</Text>
      </View>
      {topic.subtopics.map(sub => (
        <View key={sub.id} style={styles.subRow}>
          <Ionicons name="return-down-forward" size={13} color={Colors.textMuted} />
          <Text style={styles.rowText} numberOfLines={1}>{sub.title}</Text>
        </View>
      ))}
      {showNewSubtopicHere && <NewRow label={newTitle} indent />}
    </View>
  )
}

export default function StructurePreview({
  course, newType, newTitle, targetFolderId, newFolderName, targetTopicId,
}: Props) {
  const displayTitle = newTitle.trim() || (newType === 'topic' ? 'New topic' : 'New subtopic')
  const isBrandNewFolder = newType === 'topic' && newFolderName.trim().length > 0

  const renderTopic = (topic: TopicItem) => (
    <TopicBlock
      key={topic.id}
      topic={topic}
      showNewSubtopicHere={newType === 'subtopic' && targetTopicId === topic.id}
      newTitle={displayTitle}
    />
  )

  const targetIsUnorganized = newType === 'topic' && !isBrandNewFolder && !targetFolderId

  return (
    <View style={styles.list}>
      {course.folders.map(folder => {
        const isTarget = newType === 'topic' && !isBrandNewFolder && targetFolderId === folder.id
        return (
          <View key={folder.id}>
            <View style={styles.row}>
              <Ionicons name="folder-outline" size={16} color={Colors.primary} />
              <Text style={[styles.rowText, styles.folderText]} numberOfLines={1}>{folder.title}</Text>
            </View>
            {folder.topics.map(renderTopic)}
            {isTarget && <NewRow label={displayTitle} />}
          </View>
        )
      })}

      {(course.unorganizedTopics.length > 0 || targetIsUnorganized) && (
        <View>
          {course.unorganizedTopics.map(renderTopic)}
          {targetIsUnorganized && <NewRow label={displayTitle} />}
        </View>
      )}

      {isBrandNewFolder && (
        <View>
          <View style={styles.row}>
            <Ionicons name="folder-outline" size={16} color={Colors.primary} />
            <Text style={[styles.rowText, styles.folderText]} numberOfLines={1}>{newFolderName.trim()}</Text>
          </View>
          <NewRow label={displayTitle} />
        </View>
      )}

      {newType === 'subtopic' && !targetTopicId && (
        <View style={[styles.subRow, styles.newRow]}>
          <Ionicons name="return-down-forward" size={13} color={Colors.textMuted} />
          <Text style={[styles.rowText, styles.newRowText]} numberOfLines={1}>{displayTitle}</Text>
          <View style={styles.pickBadge}><Text style={styles.newBadgeText}>PICK A TOPIC ABOVE</Text></View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  list:   { ...CardBase, overflow: 'hidden', padding: Spacing.sm, gap: 2 },
  row:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.xs },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, paddingLeft: Spacing.lg },
  rowText:    { fontSize: Typography.sm, color: Colors.textSecondary, flex: 1 },
  folderText: { fontWeight: Typography.semibold, color: Colors.textPrimary },
  newRow:     { backgroundColor: Colors.primaryMuted, borderRadius: Radius.sm },
  newRowText: { color: Colors.primary, fontWeight: Typography.semibold },
  newBadge: {
    backgroundColor: Colors.primary, borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 2,
  },
  pickBadge: {
    backgroundColor: Colors.textMuted, borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 2,
  },
  newBadgeText: { fontSize: 9, fontWeight: Typography.bold, color: '#fff', letterSpacing: 0.3 },
})