

import {
    View, Text, ScrollView, TouchableOpacity,
    StyleSheet, Alert
  } from 'react-native'
  import { useState } from 'react'
  import { router, useLocalSearchParams } from 'expo-router'
  import * as DocumentPicker from 'expo-document-picker'
  import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
  import { Colors, Spacing, Radius, Typography, CardBase } from '@/constants/theme'
  import NewSubLessonModal from '@/components/modals/newSubLessonModal'
  
  // ─────────────────────────────────────────
  // TYPES
  // ─────────────────────────────────────────
  type LessonStatus = 'completed' | 'in_progress' | 'not_started' | 'locked'
  type LessonMode   = 'has_sublessons' | 'no_sublessons'
  
  interface MockNote {
    id:         string
    fileName:   string
    fileType:   string
    uploadedAt: string
  }
  
  interface MockSubLesson {
    id:         string
    title:      string
    questions:  number
    minutes:    number
    status:     LessonStatus
    progress:   number
    orderIndex: number
  }
  
  // ─────────────────────────────────────────
  // MOCK DATA — two modes driven by lessonId
  // ─────────────────────────────────────────
  const MOCK_WITH_SUBLESSONS = {
    id:          '3',
    title:       'Photosynthesis',
    breadcrumb:  'Biology 101 / Photosynthesis',
    questions:   18,
    minutes:     15,
    progress:    60,
    status:      'in_progress' as LessonStatus,
    mode:        'has_sublessons' as LessonMode,
    subLessons: [
      { id: 'sl1', title: 'Light Reactions',      questions: 5, minutes: 8,  status: 'completed'   as LessonStatus, progress: 100, orderIndex: 1 },
      { id: 'sl2', title: 'Calvin Cycle',          questions: 6, minutes: 10, status: 'completed'   as LessonStatus, progress: 100, orderIndex: 2 },
      { id: 'sl3', title: 'Chloroplast Structure', questions: 4, minutes: 6,  status: 'in_progress' as LessonStatus, progress: 40,  orderIndex: 3 },
      { id: 'sl4', title: 'Factors Affecting Rate',questions: 5, minutes: 7,  status: 'not_started' as LessonStatus, progress: 0,   orderIndex: 4 },
      { id: 'sl5', title: 'C3 vs C4 Plants',       questions: 4, minutes: 5,  status: 'locked'      as LessonStatus, progress: 0,   orderIndex: 5 },
    ] as MockSubLesson[],
    notes: [] as MockNote[],
  }
  
  const MOCK_NO_SUBLESSONS = {
    id:         '4',
    title:      'Cellular Respiration',
    breadcrumb: '',
    questions:  14,
    minutes:    12,
    progress:   30,
    status:     'in_progress' as LessonStatus,
    mode:       'no_sublessons' as LessonMode,
    subLessons: [] as MockSubLesson[],
    notes: [
      { id: 'n1', fileName: 'Chapter 5 Notes.pdf',      fileType: 'PDF',  uploadedAt: 'May 15, 2024' },
      { id: 'n2', fileName: 'Lecture Transcript.docx',  fileType: 'DOCX', uploadedAt: 'May 14, 2024' },
    ] as MockNote[],
  }
  
  // Toggle between modes for testing
  const MOCK_LESSON = MOCK_NO_SUBLESSONS
  
  // ─────────────────────────────────────────
  // SUB COMPONENTS
  // ─────────────────────────────────────────
  function StatusBadge({ status, progress }: { status: LessonStatus; progress: number }) {
    if (status === 'completed') {
      return (
        <View style={styles.statusBadge}>
          <Ionicons name="checkmark" size={13} color={Colors.success} />
          <Text style={[styles.statusText, { color: Colors.success }]}>Completed</Text>
        </View>
      )
    }
    if (progress > 0) {
      return <Text style={styles.statusCyan}>{progress}% complete</Text>
    }
    return null
  }
  
  function LessonIndicator({ status, index }: { status: LessonStatus; index: number }) {
    if (status === 'completed') {
      return (
        <View style={[styles.indicator, styles.indicatorComplete]}>
          <Ionicons name="checkmark" size={16} color={Colors.success} />
        </View>
      )
    }
    if (status === 'locked') {
      return (
        <View style={[styles.indicator, styles.indicatorLocked]}>
          <Ionicons name="lock-closed" size={14} color={Colors.lockedText} />
        </View>
      )
    }
    return (
      <View style={[styles.indicator, styles.indicatorActive]}>
        <Text style={styles.indicatorNumber}>{index}</Text>
      </View>
    )
  }
  
  function SubLessonCard({ item }: { item: MockSubLesson }) {
    const isLocked    = item.status === 'locked'
    const isActive    = item.status === 'in_progress'
    const showProgress = item.status === 'in_progress'
  
    return (
      <TouchableOpacity
        style={[
          styles.subLessonCard,
          isActive  && styles.subLessonCardActive,
          isLocked  && styles.subLessonCardLocked,
        ]}
        activeOpacity={isLocked ? 1 : 0.8}
        disabled={isLocked}
        onPress={() => router.push(`/sublesson/${item.id}`)}
      >
        <LessonIndicator status={item.status} index={item.orderIndex} />
        <Text style={[styles.subLessonTitle, isLocked && styles.lockedText]}>
          {item.title}
        </Text>
        <View style={styles.metaRow}>
          <Ionicons name="help-circle-outline" size={13}
            color={isLocked ? Colors.lockedText : Colors.textMuted} />
          <Text style={[styles.metaText, isLocked && styles.lockedText]}>
            {item.questions}
          </Text>
          <Ionicons name="time-outline" size={13}
            color={isLocked ? Colors.lockedText : Colors.textMuted} />
          <Text style={[styles.metaText, isLocked && styles.lockedText]}>
            {item.minutes}m
          </Text>
          {showProgress && (
            <Text style={styles.progressPct}>{item.progress}%</Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={18}
          color={isLocked ? Colors.lockedText : Colors.textMuted} />
      </TouchableOpacity>
    )
  }
  
  function NoteCard({ note, onDelete }: { note: MockNote; onDelete: () => void }) {
    return (
      <View style={styles.noteCard}>
        <Ionicons name="document-text" size={28} color={Colors.primary} />
        <Text style={styles.noteFileName}>{note.fileName}</Text>
        <Text style={styles.noteMeta}>
          {note.fileType} • Uploaded {note.uploadedAt}
        </Text>
        <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
          <Ionicons name="trash-outline" size={20} color={Colors.error} />
        </TouchableOpacity>
      </View>
    )
  }
  
  function UploadDropzone({ onUpload }: { onUpload: () => void }) {
    return (
      <TouchableOpacity
        style={styles.dropzone}
        onPress={onUpload}
        activeOpacity={0.8}
      >
        <Ionicons name="share-outline" size={28} color={Colors.textSecondary} />
        <Text style={styles.dropzoneTitle}>Upload Notes</Text>
        <Text style={styles.dropzoneSubtitle}>PDF, TXT, DOCX accepted</Text>
      </TouchableOpacity>
    )
  }
  
  // ─────────────────────────────────────────
  // MAIN SCREEN
  // ─────────────────────────────────────────
  export default function LessonDetailScreen() {
    const { id } = useLocalSearchParams()
    const lesson = id === '3' ? MOCK_WITH_SUBLESSONS : MOCK_NO_SUBLESSONS
    const [notes, setNotes] = useState<MockNote[]>(lesson.notes)
    const [showNewLesson,    setShowNewLesson]    = useState(false)
    const [showNewSubLesson, setShowNewSubLesson] = useState(false)
    const isCompleted = lesson.status === 'completed'
    const hasNotes    = notes.length > 0
  
    const handleUpload = async () => {
      try {
        const result = await DocumentPicker.getDocumentAsync({
          type: [
            'application/pdf',
            'text/plain',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          ],
          multiple: true,
        })
        if (!result.canceled && result.assets.length > 0) {
          const newNotes: MockNote[] = result.assets.map((asset, i) => ({
            id:         `new_${Date.now()}_${i}`,
            fileName:   asset.name,
            fileType:   asset.name.split('.').pop()?.toUpperCase() ?? 'FILE',
            uploadedAt: new Date().toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric'
            }),
          }))
          setNotes(prev => [...prev, ...newNotes])
        }
      } catch (err) {
        Alert.alert('Upload Failed', 'Could not pick file.')
      }
    }
  
    const handleDeleteNote = (id: string) => {
      Alert.alert('Delete Note', 'Remove this file?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive',
          onPress: () => setNotes(prev => prev.filter(n => n.id !== id)) },
      ])
    }
  
    const handleGenerateQuiz = () => {
        Alert.alert(
          'Generate Quiz',
          'This will generate questions from all sub-lesson notes. Continue?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text:    'Generate',
              onPress: () => router.push('/(tabs)/study')
            }
          ]
        )
      }
  
    return (
      <View style={styles.root}>
        <TouchableOpacity 
            style={styles.breadcrumb} 
            onPress={() => router.back()}
            >
            <Ionicons name="chevron-back" size={16} color={Colors.primary} />
            <Text style={styles.breadcrumbText} numberOfLines={1}>
                {lesson.breadcrumb || 'Back'}
            </Text>
            </TouchableOpacity>
  
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.lessonTitle}>{lesson.title}</Text>
            <View style={styles.metaRow}>
              <Ionicons name="help-circle-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.metaText}>{lesson.questions} questions</Text>
              <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.metaText}>{lesson.minutes} min</Text>
              <StatusBadge status={lesson.status} progress={lesson.progress} />
            </View>
  
            {/* Progress Bar */}
            {lesson.status !== 'completed' && lesson.progress > 0 && (
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${lesson.progress}%` }]} />
              </View>
            )}
          </View>
  
          {/* ─── MODE: HAS SUB-LESSONS ─── */}
          {lesson.mode === 'has_sublessons' && (
            <>
                <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>SUB-LESSONS</Text>
                <Text style={styles.sectionMeta}>
                    {lesson.subLessons.filter(s => s.status === 'completed').length}/
                    {lesson.subLessons.length} completed
                </Text>
                </View>

                <View style={styles.subLessonsList}>
                {lesson.subLessons.map((sub) => (
                    <SubLessonCard key={sub.id} item={sub} />
                ))}
                </View>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Quiz all sub-lessons */}
                <View style={styles.quizAllCard}>
                <MaterialCommunityIcons
                    name="brain"
                    size={20}
                    color={Colors.primary}
                />
                <View style={{ flex: 1 }}>
                    <Text style={styles.quizAllTitle}>Quiz All Sub-lessons</Text>
                    <Text style={styles.quizAllSubtitle}>
                    Generate questions from all uploaded notes in this lesson
                    </Text>
                </View>
                </View>

                <TouchableOpacity
                style={styles.actionButton}
                activeOpacity={0.8}
                onPress={handleGenerateQuiz}
                >
                <MaterialCommunityIcons name="brain" size={20} color={Colors.textInverse} />
                <Text style={styles.actionButtonText}>Generate Quiz for All</Text>
                </TouchableOpacity>
            </>
            )}
  
          {/* ─── MODE: NO SUB-LESSONS ─── */}
          {lesson.mode === 'no_sublessons' && (
            <>
              {/* Status Card */}
              {isCompleted ? (
                <View style={styles.completedCard}>
                  <View style={styles.completedIcon}>
                    <Ionicons name="checkmark" size={22} color={Colors.success} />
                  </View>
                  <View style={styles.completedInfo}>
                    <Text style={styles.completedTitle}>Sub-lesson completed</Text>
                    <Text style={styles.completedSubtitle}>
                      Great job! You can retake the quiz to reinforce learning.
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.readyCard}>
                  <View style={styles.readyIcon}>
                    <Ionicons name="book-outline" size={22} color={Colors.primary} />
                  </View>
                  <View style={styles.readyInfo}>
                    <Text style={styles.readyTitle}>Ready to study</Text>
                    <Text style={styles.readySubtitle}>
                      {hasNotes
                        ? 'Generate a quiz from your uploaded notes'
                        : 'Upload your notes to generate a quiz'
                      }
                    </Text>
                  </View>
                </View>
              )}
  
              {/* Break into sub-lessons (only if no notes yet) */}
              {!isCompleted && !hasNotes && (
                <TouchableOpacity
                  style={styles.subLessonLink}
                  onPress={() => setShowNewSubLesson(true)}
                >
                  <Text style={styles.subLessonLinkText}>
                    + Break into sub-lessons (optional)
                  </Text>
                </TouchableOpacity>
              )}
  
              {/* Study Materials */}
              <Text style={styles.sectionTitle}>STUDY MATERIALS</Text>
  
              <UploadDropzone onUpload={handleUpload} />
  
              {notes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onDelete={() => handleDeleteNote(note.id)}
                />
              ))}
  
              {/* Action Button */}
              <TouchableOpacity
                style={[styles.actionButton, !hasNotes && styles.actionButtonDisabled]}
                onPress={handleGenerateQuiz}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="brain" size={20} color={Colors.textInverse} />
                <Text style={styles.actionButtonText}>
                  {isCompleted ? 'Retake Quiz' : 'Generate Quiz'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
        <NewSubLessonModal
        visible={showNewSubLesson}
        onClose={() => setShowNewSubLesson(false)}
        onCreate={(name) => console.log('New sub-lesson:', name)}
        />
      </View>
    )
  }
  
  // ─────────────────────────────────────────
  // STYLES
  // ─────────────────────────────────────────
  const styles = StyleSheet.create({
    root: {
      flex:            1,
      backgroundColor: Colors.background,
    },
    breadcrumb: {
        flexDirection:     'row',
        alignItems:        'center',
        paddingHorizontal: Spacing.base,
        paddingTop:        Spacing.xl + 32,
        paddingBottom:     Spacing.sm,
        gap:               4,
      },
    breadcrumbText: {
      fontSize:   Typography.sm,
      color:      Colors.primary,
      fontWeight: Typography.medium,
    },
    container: {
      paddingHorizontal: Spacing.base,
      paddingBottom:     Spacing.xxxl,
      gap:               Spacing.md,
    },
  
    // Header
    header: { gap: Spacing.sm },
    lessonTitle: {
      fontSize:   Typography.xxl,
      fontWeight: Typography.bold,
      color:      Colors.textPrimary,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems:    'center',
      gap:           6,
      flexWrap:      'wrap',
    },
    metaText: {
      fontSize:    Typography.sm,
      color:       Colors.textMuted,
      marginRight: 4,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems:    'center',
      gap:           3,
    },
    statusText: {
      fontSize:   Typography.sm,
      fontWeight: Typography.medium,
    },
    statusCyan: {
      fontSize:   Typography.sm,
      fontWeight: Typography.semibold,
      color:      Colors.primary,
    },
    progressTrack: {
      height:          6,
      backgroundColor: Colors.progressTrack,
      borderRadius:    Radius.full,
      overflow:        'hidden',
    },
    progressFill: {
      height:          6,
      backgroundColor: Colors.progressFill,
      borderRadius:    Radius.full,
    },
    progressPct: {
      fontSize:   Typography.xs,
      fontWeight: Typography.semibold,
      color:      Colors.primary,
      marginLeft: 4,
    },
  
    // Section Header
    sectionHeader: {
      flexDirection:  'row',
      justifyContent: 'space-between',
      alignItems:     'center',
    },
    sectionTitle: {
      fontSize:      Typography.xs,
      fontWeight:    Typography.bold,
      color:         Colors.textMuted,
      letterSpacing: 1,
    },
    sectionMeta: {
      fontSize: Typography.xs,
      color:    Colors.textSecondary,
    },
  
    // Sub Lessons
    subLessonsList: { gap: Spacing.md },
    subLessonCard: {
      ...CardBase,
      alignItems: 'center',
      padding:    Spacing.lg,
      gap:        Spacing.sm,
    },
    subLessonCardActive: {
      borderColor: Colors.primary,
      borderWidth: 1.5,
    },
    subLessonCardLocked: { opacity: 0.6 },
    subLessonTitle: {
      fontSize:   Typography.lg,
      fontWeight: Typography.semibold,
      color:      Colors.textPrimary,
    },
    lockedText: { color: Colors.lockedText },
  
    // Indicators
    indicator: {
      width:          40,
      height:         40,
      borderRadius:   Radius.full,
      alignItems:     'center',
      justifyContent: 'center',
      marginBottom:   Spacing.xs,
    },
    indicatorComplete: {
      backgroundColor: Colors.successMuted,
      borderWidth:     1,
      borderColor:     Colors.success,
    },
    indicatorActive: {
      backgroundColor: Colors.primaryMuted,
      borderWidth:     1,
      borderColor:     Colors.primary,
    },
    indicatorLocked: {
      backgroundColor: Colors.card,
      borderWidth:     1,
      borderColor:     Colors.border,
    },
    indicatorNumber: {
      fontSize:   Typography.base,
      fontWeight: Typography.bold,
      color:      Colors.primary,
    },
  
    // Status Cards
    readyCard: {
      ...CardBase,
      flexDirection: 'row',
      alignItems:    'center',
      padding:       Spacing.md,
      gap:           Spacing.md,
    },
    readyIcon: {
      width:           44,
      height:          44,
      borderRadius:    Radius.md,
      backgroundColor: Colors.primaryMuted,
      alignItems:      'center',
      justifyContent:  'center',
    },
    readyInfo:     { flex: 1 },
    readyTitle: {
      fontSize:   Typography.base,
      fontWeight: Typography.semibold,
      color:      Colors.textPrimary,
    },
    readySubtitle: {
      fontSize:  Typography.xs,
      color:     Colors.textSecondary,
      marginTop: 2,
    },
  
    completedCard: {
      ...CardBase,
      flexDirection:   'row',
      alignItems:      'center',
      padding:         Spacing.md,
      gap:             Spacing.md,
      backgroundColor: Colors.successMuted,
      borderColor:     Colors.answerBorderCorrect,
    },
    completedIcon: {
      width:           44,
      height:          44,
      borderRadius:    Radius.full,
      backgroundColor: Colors.success,
      alignItems:      'center',
      justifyContent:  'center',
    },
    completedInfo:    { flex: 1 },
    completedTitle: {
      fontSize:   Typography.base,
      fontWeight: Typography.semibold,
      color:      Colors.textPrimary,
    },
    completedSubtitle: {
      fontSize:  Typography.xs,
      color:     Colors.textSecondary,
      marginTop: 2,
    },
  
    // Sub-lesson link
    subLessonLink: {
      alignItems: 'center',
      paddingVertical: Spacing.sm,
    },
    subLessonLinkText: {
      fontSize:   Typography.sm,
      color:      Colors.textMuted,
    },
  
    // Upload
    dropzone: {
      borderWidth:     1,
      borderColor:     Colors.border,
      borderStyle:     'dashed',
      borderRadius:    Radius.lg,
      paddingVertical: Spacing.xl,
      alignItems:      'center',
      gap:             Spacing.sm,
    },
    dropzoneTitle: {
      fontSize:   Typography.base,
      fontWeight: Typography.medium,
      color:      Colors.textSecondary,
    },
    dropzoneSubtitle: {
      fontSize: Typography.xs,
      color:    Colors.textMuted,
    },
  
    // Note Cards
    noteCard: {
      ...CardBase,
      alignItems:      'center',
      paddingVertical: Spacing.lg,
      gap:             Spacing.xs,
    },
    noteFileName: {
      fontSize:   Typography.base,
      fontWeight: Typography.semibold,
      color:      Colors.textPrimary,
    },
    noteMeta: {
      fontSize: Typography.xs,
      color:    Colors.textSecondary,
    },
    deleteButton: {
      marginTop: Spacing.xs,
    },
  
    // Action Button
    actionButton: {
      flexDirection:   'row',
      alignItems:      'center',
      justifyContent:  'center',
      gap:             Spacing.sm,
      backgroundColor: Colors.primary,
      borderRadius:    Radius.md,
      paddingVertical: Spacing.md,
      marginTop:       Spacing.sm,
    },
    actionButtonDisabled: { opacity: 0.5 },
    actionButtonText: {
      fontSize:   Typography.base,
      fontWeight: Typography.semibold,
      color:      Colors.textInverse,
    },
    // app/lesson/[id].tsx — add to StyleSheet

divider: {
    height:          1,
    backgroundColor: Colors.border,
    marginVertical:  Spacing.sm,
  },
  quizAllCard: {
    ...CardBase,
    flexDirection: 'row',
    alignItems:    'center',
    padding:       Spacing.md,
    gap:           Spacing.md,
  },
  quizAllTitle: {
    fontSize:   Typography.base,
    fontWeight: Typography.semibold,
    color:      Colors.textPrimary,
  },
  quizAllSubtitle: {
    fontSize:  Typography.xs,
    color:     Colors.textSecondary,
    marginTop: 2,
  },
  })