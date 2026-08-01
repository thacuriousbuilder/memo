

  import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, ScrollView, ActivityIndicator, ActivityIndicator as RNActivityIndicator, Alert
  } from 'react-native'
  import { useState, useMemo } from 'react'
  import { router, useLocalSearchParams } from 'expo-router'
  import { Ionicons } from '@expo/vector-icons'
  import { Colors, Spacing, Radius, Typography } from '@/constants/theme'
  import { useSession } from '@/hooks/useSession'
  import { useCourseOverview, TopicItem } from '@/hooks/useCourseOverview'
  import StructurePreview, { NewMaterialType } from '@/components/structurePreview'
  import * as DocumentPicker from 'expo-document-picker'
  import UploadSourceSheet from '@/components/modals/uploadSourceSheet'
  import DriveFilePicker   from '@/components/modals/driveFilePicker'
  import { supabase } from '@/lib/supabase'
  import { uploadLessonNoteFromAsset } from '@/hooks/useLessons'
  import { uploadSubLessonNoteFromAsset } from '@/hooks/useSubLesson'

  interface PickedFile {
    uri:      string
    name:     string
    mimeType: string
  }

  export default function NewMaterialScreen() {
    const { id: courseId } = useLocalSearchParams<{ id: string }>()
    const { user } = useSession()
    const { course, loading } = useCourseOverview(courseId ?? null, user?.id ?? null)
  
    const [title,          setTitle]          = useState('')
    const [type,            setType]           = useState<NewMaterialType>('topic')
    const [folderId,        setFolderId]       = useState<string | null>(null)  // null = "No folder"
    const [newFolderName,   setNewFolderName]  = useState('')
    const [topicId,         setTopicId]        = useState<string | null>(null)
    const [pickedFiles,      setPickedFiles]      = useState<PickedFile[]>([])
    const [showUploadSource, setShowUploadSource] = useState(false)
    const [showDrivePicker,  setShowDrivePicker]  = useState(false)
    const [saving, setSaving] = useState(false)
  
    const allTopics: TopicItem[] = useMemo(() => {
      if (!course) return []
      return [...course.unorganizedTopics, ...course.folders.flatMap(f => f.topics)]
    }, [course])
  
    const selectFolder = (id: string | null) => {
      setFolderId(id)
      setNewFolderName('')
    }

    const addFiles = (files: PickedFile[]) => {
        setPickedFiles(prev => {
          const existingNames = new Set(prev.map(f => f.name))
          return [...prev, ...files.filter(f => !existingNames.has(f.name))]
        })
      }
      
      const handlePhonePick = async () => {
        const result = await DocumentPicker.getDocumentAsync({
          type: ['application/pdf','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
          multiple: true,
        })
        if (result.canceled || !result.assets) return
        addFiles(result.assets.map(a => ({ uri: a.uri, name: a.name, mimeType: a.mimeType ?? 'application/octet-stream' })))
      }
      
      const handleDriveFilesSelected = (files: PickedFile[]) => addFiles(files)
      
      const removeFile = (name: string) => setPickedFiles(prev => prev.filter(f => f.name !== name))
      const handleSave = async () => {
        if (!user || !course) return
        if (!title.trim()) { Alert.alert('Required', 'Please enter a title.'); return }
        if (type === 'subtopic' && !topicId) { Alert.alert('Required', 'Please pick a connected topic.'); return }
      
        setSaving(true)
        try {
          if (type === 'topic') {
            // Resolve which section this topic belongs to
            let sectionId: string
            if (newFolderName.trim()) {
              const { data: newSection, error: secErr } = await supabase
                .from('sections')
                .insert({
                  course_id:   course.id,
                  title:       newFolderName.trim(),
                  order_index: course.folders.length,
                  is_default:  false,
                })
                .select('id').single()
              if (secErr) throw secErr
              sectionId = newSection.id
            } else if (folderId) {
              sectionId = folderId
            } else {
              sectionId = course.defaultSectionId!
            }
      
            const siblingCount = newFolderName.trim()
              ? 0
              : folderId
                ? (course.folders.find(f => f.id === folderId)?.topics.length ?? 0)
                : course.unorganizedTopics.length
      
            const { data: lesson, error: lesErr } = await supabase
              .from('lessons')
              .insert({ section_id: sectionId, title: title.trim(), order_index: siblingCount })
              .select('id').single()
            if (lesErr) throw lesErr
      
            for (const file of pickedFiles) {
              await uploadLessonNoteFromAsset({ userId: user.id, lessonId: lesson.id, asset: file })
            }
          } else {
            const parentTopic = [...course.unorganizedTopics, ...course.folders.flatMap(f => f.topics)]
              .find(t => t.id === topicId)!
      
            const { data: sub, error: subErr } = await supabase
              .from('sub_lessons')
              .insert({ lesson_id: topicId, title: title.trim(), order_index: parentTopic.subtopics.length })
              .select('id').single()
            if (subErr) throw subErr
      
            for (const file of pickedFiles) {
              await uploadSubLessonNoteFromAsset({ userId: user.id, subLessonId: sub.id, asset: file })
            }
          }
      
          router.back()
        } catch (err: any) {
          Alert.alert('Error', err.message)
        } finally {
          setSaving(false)
        }
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
          <Text style={styles.headerTitle}>New material</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving ? <RNActivityIndicator color={Colors.primary} /> : <Text style={styles.saveText}>Save</Text>}
            </TouchableOpacity>
        </View>
  
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.fieldLabel}>Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Cell Structure"
            placeholderTextColor={Colors.textMuted}
          />
  
          <Text style={styles.fieldLabel}>Type</Text>
          <View style={styles.typeRow}>
            <TouchableOpacity
              style={[styles.typeChip, type === 'topic' && styles.typeChipActive]}
              onPress={() => setType('topic')}
            >
              <Text style={[styles.typeChipText, type === 'topic' && styles.typeChipTextActive]}>Topic</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeChip, type === 'subtopic' && styles.typeChipActive]}
              onPress={() => setType('subtopic')}
            >
              <Text style={[styles.typeChipText, type === 'subtopic' && styles.typeChipTextActive]}>Subtopic</Text>
            </TouchableOpacity>
          </View>
  
          {type === 'topic' ? (
            <>
              <Text style={styles.fieldLabel}>Folder <Text style={styles.optional}>(optional)</Text></Text>
              <View style={styles.chipWrap}>
                <TouchableOpacity
                  style={[styles.chip, folderId === null && !newFolderName && styles.chipActive]}
                  onPress={() => selectFolder(null)}
                >
                  <Text style={[styles.chipText, folderId === null && !newFolderName && styles.chipTextActive]}>No folder</Text>
                </TouchableOpacity>
                {course.folders.map(f => (
                  <TouchableOpacity
                    key={f.id}
                    style={[styles.chip, folderId === f.id && styles.chipActive]}
                    onPress={() => selectFolder(f.id)}
                  >
                    <Text style={[styles.chipText, folderId === f.id && styles.chipTextActive]}>{f.title}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.input}
                value={newFolderName}
                onChangeText={(v) => { setNewFolderName(v); if (v) setFolderId(null) }}
                placeholder="Or type a new folder name"
                placeholderTextColor={Colors.textMuted}
              />
            </>
          ) : (
            <>
              <Text style={styles.fieldLabel}>Connected topic</Text>
              <View style={styles.chipWrap}>
                {allTopics.map(t => (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.chip, topicId === t.id && styles.chipActive]}
                    onPress={() => setTopicId(t.id)}
                  >
                    <Text style={[styles.chipText, topicId === t.id && styles.chipTextActive]}>{t.title}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
  
          <Text style={styles.fieldLabel}>Structure preview</Text>
          <StructurePreview
            course={course}
            newType={type}
            newTitle={title}
            targetFolderId={folderId}
            newFolderName={newFolderName}
            targetTopicId={topicId}
          />
  
      <Text style={styles.fieldLabel}>Source files <Text style={styles.optional}>(optional)</Text></Text>
        <TouchableOpacity
        style={styles.dropzone}
        onPress={() => setShowUploadSource(true)}
        activeOpacity={0.8}
        >
        <View style={styles.dropzoneIconWrapper}>
            <Ionicons name="cloud-upload-outline" size={24} color={Colors.primary} />
        </View>
        <Text style={styles.dropzoneTitle}>Tap to upload files</Text>
        <Text style={styles.dropzoneSub}>PDF, DOCX, TXT</Text>
        </TouchableOpacity>

        {pickedFiles.length > 0 && (
        <View style={styles.fileList}>
            {pickedFiles.map((file, idx) => (
            <View key={file.name}>
                <View style={styles.fileRow}>
                <Ionicons name="document-text-outline" size={18} color={Colors.textSecondary} />
                <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
                <TouchableOpacity onPress={() => removeFile(file.name)} hitSlop={{top:8,bottom:8,left:8,right:8}}>
                    <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
                </View>
                {idx < pickedFiles.length - 1 && <View style={styles.fileDivider} />}
            </View>
            ))}
        </View>
        )}

        <UploadSourceSheet
        visible={showUploadSource}
        onClose={() => setShowUploadSource(false)}
        onPhoneFiles={handlePhonePick}
        onGoogleDrive={() => setShowDrivePicker(true)}
        />
        <DriveFilePicker
        visible={showDrivePicker}
        onClose={() => setShowDrivePicker(false)}
        multiple
        onSelectMultiple={handleDriveFilesSelected}
        />
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
    optional: { color: Colors.textMuted, fontWeight: Typography.regular },
    input: {
      backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.full,
      paddingVertical: Spacing.md, paddingHorizontal: Spacing.md, fontSize: Typography.base, color: Colors.textPrimary,
      marginTop: Spacing.sm,
    },
    typeRow: { flexDirection: 'row', gap: Spacing.sm },
    typeChip: {
      flex: 1, paddingVertical: Spacing.md, borderRadius: Radius.full, alignItems: 'center',
      borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card,
    },
    typeChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryMuted },
    typeChipText: { fontSize: Typography.base, fontWeight: Typography.medium, color: Colors.textSecondary },
    typeChipTextActive: { color: Colors.primary, fontWeight: Typography.bold },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    chip: {
      paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: Radius.full,
      borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card,
    },
    chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryMuted },
    chipText: { fontSize: Typography.sm, color: Colors.textSecondary },
    chipTextActive: { color: Colors.primary, fontWeight: Typography.semibold },
    dropzone: {
        borderWidth: 1, borderColor: Colors.border, borderStyle: 'solid', borderRadius: Radius.lg,
        paddingVertical: Spacing.xl, alignItems: 'center', gap: Spacing.xs,
        backgroundColor: Colors.card,
      },
      dropzoneIconWrapper: {
        width: 44, height: 44, borderRadius: Radius.full, backgroundColor: Colors.primaryMuted,
        alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs,
      },
      dropzoneTitle: { fontSize: Typography.base, fontWeight: Typography.medium, color: Colors.textSecondary },
      dropzoneSub: { fontSize: Typography.xs, color: Colors.textMuted },
      fileList: { backgroundColor: Colors.card, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', marginTop: Spacing.sm },
      fileRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.md, paddingHorizontal: Spacing.base },
      fileName: { flex: 1, fontSize: Typography.sm, color: Colors.textPrimary },
      fileDivider: { height: 1, backgroundColor: Colors.border },
  })