// app/course/folder.tsx

import {
    View, Text, ScrollView, TouchableOpacity,
    StyleSheet, Alert, ActivityIndicator
  } from 'react-native'
  import { useState, useEffect }    from 'react'
  import { router, useLocalSearchParams, useFocusEffect } from 'expo-router'
  import { Ionicons }               from '@expo/vector-icons'
  import { Colors, Spacing, Radius, Typography, CardBase } from '@/constants/theme'
  import { useSession }             from '@/hooks/useSession'
  import { useFolderCourse, FolderNote } from '@/hooks/useFolderCourse'
  import { FilesAPI, QuizAPI }      from '@/lib/api'
  import { buildS3Key, getFileType, getContentType, uploadFileToS3 } from '@/lib/aws'
  import { supabase }               from '@/lib/supabase'
  import * as DocumentPicker        from 'expo-document-picker'
  import UploadProgress             from '@/components/uploadProgress'
  import { UploadStage }            from '@/hooks/useLessons'
  import { useExams, createExam, deleteExam } from '@/hooks/useExams'
  import NewExamModal               from '@/components/modals/newExamModal'
  import React                      from 'react'
  import UploadSourceSheet from '@/components/modals/uploadSourceSheet'
  import DriveFilePicker   from '@/components/modals/driveFilePicker'
  
  // ─────────────────────────────────────────
  // NOTE ROW
  // ─────────────────────────────────────────
  function NoteRow({
    note, onToggle, onDelete,
  }: {
    note:     FolderNote
    onToggle: () => void
    onDelete: () => void
  }) {
    const date = new Date(note.created_at).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    })
  
    return (
      <View style={styles.noteRow}>
        <TouchableOpacity
          style={[styles.checkbox, note.selected && styles.checkboxSelected]}
          onPress={onToggle}
          activeOpacity={0.8}
        >
          {note.selected && <Ionicons name="checkmark" size={14} color="#fff" />}
        </TouchableOpacity>
        <View style={styles.noteInfo}>
          <Text style={styles.noteFileName} numberOfLines={1}>{note.file_name}</Text>
          <Text style={styles.noteMeta}>
            {note.file_type.toUpperCase()} · {date}
            <Text style={styles.noteReady}> · ✓ Parsed</Text>
            </Text>
        </View>
        <TouchableOpacity onPress={onDelete} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="trash-outline" size={16} color={Colors.error} />
        </TouchableOpacity>
      </View>
    )
  }
  
  // ─────────────────────────────────────────
  // MAIN SCREEN
  // ─────────────────────────────────────────
  export default function FolderCourseScreen() {
    
    const { id, readyNoteIds: readyNoteIdsParam } = useLocalSearchParams<{
      id:            string
      readyNoteIds?: string
    }>()
    const { user } = useSession()
  
    // Parse readyNoteIds from course creation
    const readyNoteIds: string[] = (() => {
      try { return JSON.parse(readyNoteIdsParam ?? '[]') }
      catch { return [] }
    })()
  
    const { course, loading, error, refetch } = useFolderCourse(id ?? null, user?.id ?? null)
    const { exams, refetch: refetchExams }    = useExams(id ?? null, user?.id ?? null)
  
    const [notes,       setNotes]       = useState<FolderNote[]>([])
    const [uploadStage, setUploadStage] = useState<UploadStage>('idle')
    const [showAddExam, setShowAddExam] = useState(false)
    const [showUploadSource, setShowUploadSource] = useState(false)
    const [showDrivePicker,  setShowDrivePicker]   = useState(false)
  
    const isUploading = uploadStage !== 'idle' && uploadStage !== 'done'

    
    // Initialize notes once — apply readyNoteIds override on first load
    useEffect(() => {
        if (!course) return
        setNotes(prev => {
          const selectedMap = new Map(prev.map(n => [n.id, n.selected]))
          return course.notes.map(n => ({
            ...n,
            has_questions: readyNoteIds.includes(n.id) ? true : n.has_questions,
            selected: selectedMap.has(n.id) ? selectedMap.get(n.id)! : true,
          }))
        })
      }, [course])
  
    const toggleNote = (noteId: string) => {
      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, selected: !n.selected } : n))
    }
    const uploadAsset = async (asset: { uri: string; name: string; mimeType?: string }) => {
        if (!user || !id) return
        setUploadStage('uploading')
        const fileType    = getFileType(asset.uri)
        const contentType = getContentType(fileType)
        const s3Key       = buildS3Key(user.id, id, asset.name)
      
        const { upload_url } = await FilesAPI.presign({ s3_key: s3Key, content_type: contentType, user_id: user.id })
        await uploadFileToS3(asset.uri, upload_url, contentType)
      
        const { data: note, error: noteErr } = await supabase
          .from('notes')
          .insert({ course_id: id, lesson_id: null, sub_lesson_id: null, file_name: asset.name, file_type: fileType, s3_key: s3Key })
          .select('id').single()
        if (noteErr) throw noteErr
      
        setUploadStage('parsing')
        await FilesAPI.parse({ s3_key: s3Key, user_id: user.id, note_id: note.id, file_type: fileType })
      
        const newNote: FolderNote = {
          id: note.id, file_name: asset.name, file_type: fileType, s3_key: s3Key,
          created_at: new Date().toISOString(), has_questions: true, selected: true,
        }
        setNotes(prev => [newNote, ...prev])
      }
      
    const handlePhoneUpload = async () => {
    if (!user || !id) return
    try {
        const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        multiple: true,
        })
        if (result.canceled || !result.assets) return
        for (const asset of result.assets) await uploadAsset(asset)
        setUploadStage('done')
    } catch (err: any) {
        Alert.alert('Upload Failed', err.message)
    } finally {
        setUploadStage('idle')
    }
    }

    const handleDriveFilesSelected = async (
        driveFiles: { uri: string; name: string; mimeType: string }[]
      ) => {
        setUploadStage('uploading')
        try {
          for (const file of driveFiles) {
            await uploadAsset(file)
          }
          setUploadStage('done')
        } catch (err: any) {
          Alert.alert('Upload Failed', err.message)
        } finally {
          setUploadStage('idle')
        }
      }
      

  
    const handleDeleteNote = (note: FolderNote) => {
      Alert.alert('Delete', `Remove "${note.file_name}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            await supabase.from('notes').delete().eq('id', note.id)
            await FilesAPI.delete({ s3_key: note.s3_key, user_id: user?.id ?? '' })
            setNotes(prev => prev.filter(n => n.id !== note.id))
          },
        },
      ])
    }
  
    const handleGenerateQuiz = () => {
      const selected = notes.filter(n => n.selected && n.has_questions)
      if (selected.length === 0) {
        Alert.alert('No files selected', 'Select at least one file with questions to generate a quiz.')
        return
      }
      router.push({
        pathname: '/study/[id]',
        params: { id: id ?? '', mode: 'folder', title: course?.title ?? 'Quiz', noteIds: JSON.stringify(selected.map(n => n.id)) },
      })
    }
  
    const handleCreateExam = async (params: { title: string; examType: string; examDate: string; location?: string; notes?: string }) => {
      if (!user || !id) return
      await createExam({ userId: user.id, courseId: id, ...params })
      refetchExams()
    }
  
    const handleDeleteExam = (examId: string) => {
      Alert.alert('Delete Test', 'Remove this test?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => { await deleteExam(examId); refetchExams() } },
      ])
    }
  
    const selectedCount = notes.filter(n => n.selected && n.has_questions).length
  
    if (loading) return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    )
  
    if (error || !course) return (
      <View style={[styles.root, styles.center]}>
        <Text style={styles.errorText}>{error ?? 'Course not found'}</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    )
  
    return (
      <View style={styles.root}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={16} color={Colors.textSecondary} />
          <Text style={styles.backText}>Courses</Text>
        </TouchableOpacity>
  
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.courseHeader}>
            <Text style={styles.courseEmoji}>{course.emoji}</Text>
            <View style={styles.courseHeaderInfo}>
              <Text style={styles.courseTitle}>{course.title}</Text>
              <View style={styles.modeBadge}>
                <Ionicons name="folder-open-outline" size={12} color={Colors.primary} />
                <Text style={styles.modeBadgeText}>Folder Mode</Text>
              </View>
            </View>
          </View>
  
          {/* Upcoming Tests */}
          <View style={styles.testsSection}>
            <View style={styles.testsSectionHeader}>
              <Text style={styles.sectionLabel}>UPCOMING TESTS</Text>
              <TouchableOpacity onPress={() => setShowAddExam(true)}>
                <Text style={styles.addTestText}>+ Add</Text>
              </TouchableOpacity>
            </View>
  
            {exams.length === 0 ? (
              <TouchableOpacity style={styles.addTestEmpty} onPress={() => setShowAddExam(true)}>
                <Ionicons name="add" size={18} color={Colors.textMuted} />
                <Text style={styles.addTestEmptyText}>Add Upcoming Test</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.examList}>
                {exams.map((exam, index) => {
                  const color = exam.days_left <= 3 ? Colors.error : exam.days_left <= 7 ? Colors.warning : Colors.textSecondary
                  return (
                    <TouchableOpacity
                      key={exam.id}
                      style={[styles.examRow, index < exams.length - 1 && styles.examRowBorder]}
                      onLongPress={() => handleDeleteExam(exam.id)}
                    >
                      <View style={[styles.examIcon, { backgroundColor: color + '22' }]}>
                        <Ionicons name="document-text" size={18} color={color} />
                      </View>
                      <View style={styles.examInfo}>
                        <Text style={styles.examTitle}>{exam.title}</Text>
                        <Text style={styles.examDate}>
                          {new Date(exam.exam_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                        </Text>
                      </View>
                      <Text style={[styles.examDays, { color }]}>
                        {exam.days_left === 0 ? 'Today' : exam.days_left === 1 ? 'Tomorrow' : `${exam.days_left} days`}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            )}
          </View>
  
          {/* Study Materials */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>STUDY MATERIALS</Text>
  
            <TouchableOpacity
              style={[styles.dropzone, isUploading && styles.dropzoneActive]}
              onPress={() => setShowUploadSource(true)}
              disabled={isUploading}
              activeOpacity={0.8}
            >
              {isUploading ? (
                <UploadProgress stage={uploadStage} />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={28} color={Colors.textMuted} />
                  <Text style={styles.dropzoneTitle}>Upload Notes</Text>
                  <Text style={styles.dropzoneSub}>PDF, DOCX, TXT · Select multiple files</Text>
                </>
              )}
            </TouchableOpacity>
  
            {notes.length > 0 && (
              <View style={styles.selectRow}>
                <Text style={styles.selectLabel}>
                  {selectedCount} file{selectedCount !== 1 ? 's' : ''} selected for quiz
                </Text>
                <TouchableOpacity onPress={() => {
                  const allSelected = notes.every(n => n.selected)
                  setNotes(prev => prev.map(n => ({ ...n, selected: !allSelected })))
                }}>
                  <Text style={styles.selectToggle}>
                    {notes.every(n => n.selected) ? 'Deselect All' : 'Select All'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
  
            {notes.length > 0 ? (
              <View style={styles.noteList}>
                {notes.map((note, idx) => (
                  <View key={note.id}>
                    <NoteRow note={note} onToggle={() => toggleNote(note.id)} onDelete={() => handleDeleteNote(note)} />
                    {idx < notes.length - 1 && <View style={styles.noteDivider} />}
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyNotes}>
                <Text style={styles.emptyNotesText}>No files yet. Upload your notes to get started.</Text>
              </View>
            )}
          </View>
  
          {/* Generate Quiz */}
          <TouchableOpacity
            style={[styles.generateBtn, selectedCount === 0 && styles.generateBtnDisabled]}
            onPress={handleGenerateQuiz}
            disabled={selectedCount === 0}
            activeOpacity={0.8}
          >
            <Ionicons name="flash-outline" size={20} color={selectedCount > 0 ? '#fff' : Colors.textMuted} />
            <Text style={[styles.generateBtnText, selectedCount === 0 && styles.generateBtnTextDisabled]}>
              {selectedCount > 0
                ? `Generate Quiz from ${selectedCount} file${selectedCount !== 1 ? 's' : ''}`
                : 'Select files to generate quiz'
              }
            </Text>
          </TouchableOpacity>
        </ScrollView>
  
        <NewExamModal
          visible={showAddExam}
          onClose={() => setShowAddExam(false)}
          onCreate={handleCreateExam}
        />
        <UploadSourceSheet
        visible={showUploadSource}
        onClose={() => setShowUploadSource(false)}
        onPhoneFiles={handlePhoneUpload}
        onGoogleDrive={() => setShowDrivePicker(true)}
        />
       <DriveFilePicker
        visible={showDrivePicker}
        onClose={() => setShowDrivePicker(false)}
        multiple
        onSelectMultiple={handleDriveFilesSelected}
        />
      </View>
    )
  }
  
  const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
    errorText: { fontSize: Typography.sm, color: Colors.error, textAlign: 'center' },
    backLink: { fontSize: Typography.sm, color: Colors.primary },
    backButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.base, paddingTop: Spacing.xl + 32, paddingBottom: Spacing.md },
    backText: { fontSize: Typography.sm, color: Colors.textSecondary, fontWeight: Typography.medium },
    container: { paddingHorizontal: Spacing.base, paddingBottom: Spacing.xxxl, gap: Spacing.xl },
    courseHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    courseEmoji: { fontSize: 40 },
    courseHeaderInfo: { flex: 1 },
    courseTitle: { fontSize: Typography.xxl, fontWeight: Typography.bold, color: Colors.textPrimary },
    modeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primaryMuted, borderRadius: Radius.full, paddingVertical: 3, paddingHorizontal: Spacing.sm, alignSelf: 'flex-start', marginTop: 4, borderWidth: 1, borderColor: Colors.primaryBorder },
    modeBadgeText: { fontSize: Typography.xs, color: Colors.primary, fontWeight: Typography.medium },
    testsSection: { gap: Spacing.sm },
    testsSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    sectionLabel: { fontSize: Typography.xs, fontWeight: Typography.bold, color: Colors.textSecondary, letterSpacing: 1 },
    addTestText: { fontSize: Typography.sm, fontWeight: Typography.medium, color: Colors.primary },
    examList: { ...CardBase, overflow: 'hidden', padding: 0 },
    examRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, paddingHorizontal: Spacing.base, gap: Spacing.md },
    examRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
    examIcon: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
    examInfo: { flex: 1 },
    examTitle: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
    examDate: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 2 },
    examDays: { fontSize: Typography.sm, fontWeight: Typography.semibold },
    addTestEmpty: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed', borderRadius: Radius.lg, paddingVertical: Spacing.md },
    addTestEmptyText: { fontSize: Typography.sm, color: Colors.textMuted },
    section: { gap: Spacing.md },
    dropzone: { borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed', borderRadius: Radius.lg, paddingVertical: Spacing.xl, alignItems: 'center', gap: Spacing.sm },
    dropzoneActive: { borderColor: Colors.primaryBorder, borderStyle: 'solid' },
    dropzoneTitle: { fontSize: Typography.base, fontWeight: Typography.medium, color: Colors.textSecondary },
    dropzoneSub: { fontSize: Typography.xs, color: Colors.textMuted },
    selectRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    selectLabel: { fontSize: Typography.xs, color: Colors.textMuted },
    selectToggle: { fontSize: Typography.xs, color: Colors.primary, fontWeight: Typography.medium },
    noteList: { ...CardBase, overflow: 'hidden', padding: 0 },
    noteRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, paddingHorizontal: Spacing.base, gap: Spacing.md },
    checkbox: { width: 22, height: 22, borderRadius: Radius.sm, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    checkboxSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    noteInfo: { flex: 1 },
    noteFileName: { fontSize: Typography.sm, fontWeight: Typography.medium, color: Colors.textPrimary },
    noteMeta: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 2 },
    noteReady: { color: Colors.success },
    noteParsing: { color: Colors.warning },
    noteDivider: { height: 1, backgroundColor: Colors.border + '66', marginHorizontal: Spacing.base },
    emptyNotes: { paddingVertical: Spacing.xl, alignItems: 'center' },
    emptyNotesText: { fontSize: Typography.sm, color: Colors.textMuted, textAlign: 'center' },
    generateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: Spacing.md },
    generateBtnDisabled: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
    generateBtnText: { fontSize: Typography.base, fontWeight: Typography.semibold, color: '#fff' },
    generateBtnTextDisabled: { color: Colors.textMuted },
  })