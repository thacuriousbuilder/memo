// components/organizeList.tsx

import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native'
import { useState, useRef, useEffect } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  useAnimatedStyle, useSharedValue, withSpring, runOnJS,
} from 'react-native-reanimated'
import { Colors, Spacing, Radius, Typography, CardBase } from '@/constants/theme'
import { OrganizeItem } from '@/app/course/create'

const ROW_HEIGHT     = 56
const NEST_THRESHOLD = 50

function Row({
  item, index, isEditing, onCommit, onStartEdit, onRename, onEndEdit,
}: {
  item:      OrganizeItem
  index:     number
  isEditing: boolean
  onCommit:  (index: number, deltaRows: number, deltaDepth: number) => void
  onStartEdit: (localId: string) => void
  onRename:    (localId: string, title: string) => void
  onEndEdit:   () => void
}) {
  const translateX = useSharedValue(0)
  const translateY = useSharedValue(0)
  const isDragging  = useSharedValue(false)
  const [draftTitle, setDraftTitle] = useState(item.title)
  const inputRef = useRef<TextInput>(null)

  useEffect(() => {
    if (isEditing) {
      setDraftTitle(item.title)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isEditing])

  const canNest = item.kind !== 'folder'

  const commit = (deltaRows: number, deltaDepth: number) => onCommit(index, deltaRows, deltaDepth)

  const pan = Gesture.Pan()
    .onStart(() => { isDragging.value = true })
    .onUpdate((e) => {
      translateY.value = e.translationY
      if (canNest) translateX.value = e.translationX
    })
    .onEnd((e) => {
      const deltaRows  = Math.round(e.translationY / ROW_HEIGHT)
      const deltaDepth = canNest
        ? (e.translationX > NEST_THRESHOLD ? 1 : e.translationX < -NEST_THRESHOLD ? -1 : 0)
        : 0
      translateX.value = withSpring(0)
      translateY.value = withSpring(0)
      isDragging.value = false
      runOnJS(commit)(deltaRows, deltaDepth)
    })

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
    zIndex:  isDragging.value ? 10 : 0,
    opacity: isDragging.value ? 0.9 : 1,
  }))

  const commitRename = () => {
    onRename(item.localId, draftTitle.trim() || item.title)
    onEndEdit()
  }

  if (item.kind === 'folder') {
    return (
      <Animated.View style={[styles.folderRow, animatedStyle]}>
        <GestureDetector gesture={pan}>
          <View style={styles.handle} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="reorder-three" size={20} color={Colors.textMuted} />
          </View>
        </GestureDetector>
        <Ionicons name="folder" size={20} color={Colors.primary} />
        {isEditing ? (
          <TextInput
            ref={inputRef}
            style={styles.folderInput}
            value={draftTitle}
            onChangeText={setDraftTitle}
            onBlur={commitRename}
            onSubmitEditing={commitRename}
            placeholder="Folder name"
            placeholderTextColor={Colors.textMuted}
          />
        ) : (
          <TouchableOpacity style={{ flex: 1 }} onPress={() => onStartEdit(item.localId)}>
            <Text style={styles.folderTitle} numberOfLines={1}>{item.title}</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    )
  }

  if (item.kind === 'topic') {
    return (
      <Animated.View style={[styles.topicRow, { marginLeft: Spacing.md }, animatedStyle]}>
        <GestureDetector gesture={pan}>
          <View style={styles.handle} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="reorder-three" size={18} color={Colors.textMuted} />
          </View>
        </GestureDetector>
        <Ionicons name="document-text-outline" size={17} color={Colors.textSecondary} />
        <Text style={styles.topicTitle} numberOfLines={1}>{item.title}</Text>
        <View style={styles.badge}><Text style={styles.badgeText}>TOPIC</Text></View>
      </Animated.View>
    )
  }

  // subtopic
  return (
    <Animated.View style={[styles.subtopicRow, { marginLeft: Spacing.xl }, animatedStyle]}>
      <GestureDetector gesture={pan}>
        <View style={styles.handle} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="reorder-three" size={15} color={Colors.textMuted} />
        </View>
      </GestureDetector>
      <Ionicons name="return-down-forward" size={14} color={Colors.textMuted} />
      <Text style={styles.subtopicTitle} numberOfLines={1}>{item.title}</Text>
      <View style={styles.subBadge}><Text style={styles.badgeText}>SUB</Text></View>
    </Animated.View>
  )
}

interface Props {
  items:    OrganizeItem[]
  onChange: (items: OrganizeItem[]) => void
}

export default function OrganizeList({ items, onChange }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)

  const handleCommit = (index: number, deltaRows: number, deltaDepth: number) => {
    const next = [...items]
    const item = { ...next[index] }

    if (deltaDepth !== 0 && item.kind !== 'folder') {
      const newDepth = Math.min(2, Math.max(1, item.depth + deltaDepth)) as 1 | 2
      item.depth = newDepth
      item.kind  = newDepth === 1 ? 'topic' : 'subtopic'
    }

    next[index] = item

    if (deltaRows !== 0) {
      const targetIndex = Math.min(next.length - 1, Math.max(0, index + deltaRows))
      next.splice(index, 1)
      next.splice(targetIndex, 0, item)
    }

    onChange(next)
  }

  const handleRename = (localId: string, title: string) => {
    onChange(items.map(i => i.localId === localId ? { ...i, title } : i))
  }

  const addFolder = () => {
    const localId = `folder_new_${Date.now()}`
    onChange([...items, { localId, title: '', depth: 0, kind: 'folder' }])
    setEditingId(localId)
  }

  return (
    <View>
      <View style={styles.list}>
        {items.map((item, index) => (
          <Row
            key={item.localId}
            item={item}
            index={index}
            isEditing={editingId === item.localId}
            onCommit={handleCommit}
            onStartEdit={setEditingId}
            onRename={handleRename}
            onEndEdit={() => setEditingId(null)}
          />
        ))}
      </View>
      <TouchableOpacity style={styles.addFolderBtn} onPress={addFolder}>
        <Ionicons name="add" size={16} color={Colors.textSecondary} />
        <Text style={styles.addFolderText}>New folder</Text>
      </TouchableOpacity>
      <Text style={styles.hint}>Drag the handle to reorder. Drag right to nest as a subtopic, left to promote.</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  list: { gap: 6, paddingHorizontal: 2 },

  // Folder — visible border, slightly inset, not edge-to-edge
  folderRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.cardElevated,
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.md, height: ROW_HEIGHT + 4,
    marginHorizontal: Spacing.xs,
  },
  folderTitle: { fontSize: Typography.md, fontWeight: Typography.bold, color: Colors.textPrimary },
  folderInput: {
    flex: 1, fontSize: Typography.md, fontWeight: Typography.bold, color: Colors.textPrimary,
    borderBottomWidth: 1, borderBottomColor: Colors.primary, paddingVertical: 2,
  },

  // Topic — medium, white card with border
  topicRow: {
    ...CardBase,
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, height: ROW_HEIGHT,
  },
  topicTitle: { flex: 1, fontSize: Typography.sm, fontWeight: Typography.medium, color: Colors.textPrimary },

  // Subtopic — white card too, just smaller/lighter than topic
  subtopicRow: {
    ...CardBase,
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.xs, paddingHorizontal: Spacing.sm, height: ROW_HEIGHT - 10,
  },
  subtopicTitle: { flex: 1, fontSize: Typography.xs, color: Colors.textSecondary },

  handle: { padding: 4 },
  badge: { backgroundColor: Colors.cardElevated, borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  subBadge: { backgroundColor: Colors.background, borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  badgeText: { fontSize: 9, fontWeight: Typography.bold, color: Colors.textMuted, letterSpacing: 0.3 },

  addFolderBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed', borderRadius: Radius.md,
    paddingVertical: Spacing.md, marginTop: Spacing.sm, marginHorizontal: Spacing.xs,
  },
  addFolderText: { fontSize: Typography.sm, color: Colors.textSecondary },
  hint: {
    fontSize: Typography.xs, color: Colors.textMuted, marginTop: Spacing.sm,
    textAlign: 'center', paddingHorizontal: Spacing.lg,
  },
})