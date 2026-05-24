

import {
    View, Text, ScrollView, TouchableOpacity,
    StyleSheet, Alert
  } from 'react-native'
  import { useState } from 'react'
  import { router, useLocalSearchParams } from 'expo-router'
  import * as DocumentPicker from 'expo-document-picker'
  import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
  import { Colors, Spacing, Radius, Typography, CardBase } from '@/constants/theme'
  
  // ─────────────────────────────────────────
  // TYPES
  // ─────────────────────────────────────────
  type SubLessonStatus = 'completed' | 'in_progress' | 'not_started'
  
  interface MockNote {
    id:         string
    fileName:   string
    fileType:   string
    uploadedAt: string
  }
  
  interface SubLessonData {
    id:         string
    title:      string
    courseName: string
    lessonName: string
    questions:  number
    minutes:    number
    progress:   number
    status:     SubLessonStatus
    notes:      MockNote[]
  }
  
  // ─────────────────────────────────────────
  // MOCK DATA — keyed by sub-lesson id
  // ─────────────────────────────────────────
  const MOCK_SUBLESSONS: Record<string, SubLessonData> = {
    sl1: {
      id:         'sl1',
      title:      'Light Reactions',
      courseName: 'Biology 101',
      lessonName: 'Photosynthesis',
      questions:  5,
      minutes:    8,
      progress:   100,
      status:     'completed',
      notes: [
        { id: 'n1', fileName: 'Chapter 5 Notes.pdf',     fileType: 'PDF',  uploadedAt: 'May 15, 2024' },
        { id: 'n2', fileName: 'Lecture Transcript.docx', fileType: 'DOCX', uploadedAt: 'May 14, 2024' },
      ],
    },
    sl2: {
      id:         'sl2',
      title:      'Calvin Cycle',
      courseName: 'Biology 101',
      lessonName: 'Photosynthesis',
      questions:  6,
      minutes:    10,
      progress:   100,
      status:     'completed',
      notes: [
        { id: 'n3', fileName: 'Calvin Cycle Notes.pdf', fileType: 'PDF', uploadedAt: 'May 16, 2024' },
      ],
    },
    sl3: {
      id:         'sl3',
      title:      'Chloroplast Structure',
      courseName: 'Biology 101',
      lessonName: 'Photosynthesis',
      questions:  4,
      minutes:    6,
      progress:   40,
      status:     'in_progress',
      notes: [
        { id: 'n4', fileName: 'Chapter 5 Notes.pdf',     fileType: 'PDF',  uploadedAt: 'May 15, 2024' },
        { id: 'n5', fileName: 'Lecture Transcript.docx', fileType: 'DOCX', uploadedAt: 'May 14, 2024' },
      ],
    },
    sl4: {
      id:         'sl4',
      title:      'Factors Affecting Rate',
      courseName: 'Biology 101',
      lessonName: 'Photosynthesis',
      questions:  5,
      minutes:    7,
      progress:   0,
      status:     'not_started',
      notes:      [],
    },
  }
  
  // ─────────────────────────────────────────
  // SUB COMPONENTS
  // ─────────────────────────────────────────
  function NoteCard({ note, onDelete }: {
    note:     MockNote
    onDelete: () => void
  }) {
    return (
      <View style={styles.noteCard}>
        <Ionicons name="document-text" size={28} color={Colors.primary} />
        <Text style={styles.noteFileName}>{note.fileName}</Text>
        <Text style={styles.noteMeta}>
          {note.fileType} • Uploaded {note.uploadedAt}
        </Text>
        <TouchableOpacity onPress={onDelete}>
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
  export default function SubLessonScreen() {
    const { id }   = useLocalSearchParams()
    const data     = MOCK_SUBLESSONS[id as string] ?? MOCK_SUBLESSONS['sl4']
    const [notes, setNotes] = useState<MockNote[]>(data.notes)
  
    const isCompleted = data.status === 'completed'
    const hasNotes    = notes.length > 0
  
    const handleUpload = async () => {
      try {
        const result = await DocumentPicker.getDocumentAsync({
          type: [
            'application/pdf',
            'text/plain',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          ],
          multiple: true,
        })
        if (!result.canceled) {
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
      } catch {
        Alert.alert('Upload Failed', 'Could not pick file.')
      }
    }
  
    const handleDelete = (noteId: string) => {
      Alert.alert('Delete Note', 'Remove this file?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive',
          onPress: () => setNotes(prev => prev.filter(n => n.id !== noteId)) },
      ])
    }
  
    const handleGenerateQuiz = () => {
      if (!hasNotes) {
        Alert.alert('No Notes', 'Upload at least one file first.')
        return
      }
      // Will connect to FastAPI — navigate to study screen for now
      router.push('/(tabs)/study')
    }
  
    return (
      <View style={styles.root}>
        {/* Breadcrumb */}
        <TouchableOpacity
          style={styles.breadcrumb}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={16} color={Colors.primary} />
          <Text style={styles.breadcrumbText} numberOfLines={1}>
            {data.courseName} / {data.lessonName} / {data.title}
          </Text>
        </TouchableOpacity>
  
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{data.title}</Text>
            <View style={styles.metaRow}>
              <Ionicons name="help-circle-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.metaText}>{data.questions} questions</Text>
              <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.metaText}>{data.minutes} min</Text>
              {isCompleted ? (
                <View style={styles.completedBadge}>
                  <Ionicons name="checkmark" size={13} color={Colors.success} />
                  <Text style={styles.completedBadgeText}>Completed</Text>
                </View>
              ) : data.progress > 0 ? (
                <Text style={styles.progressText}>{data.progress}% complete</Text>
              ) : null}
            </View>
  
            {/* Progress Bar */}
            {!isCompleted && data.progress > 0 && (
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${data.progress}%` }]} />
              </View>
            )}
          </View>
  
          {/* Status Card */}
          {isCompleted ? (
            <View style={styles.completedCard}>
              <View style={styles.completedIcon}>
                <Ionicons name="checkmark" size={22} color={Colors.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Sub-lesson completed</Text>
                <Text style={styles.cardSubtitle}>
                  Great job! You can retake the quiz to reinforce learning.
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.readyCard}>
              <View style={styles.readyIcon}>
                <Ionicons name="book-outline" size={22} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Ready to study</Text>
                <Text style={styles.cardSubtitle}>
                  {hasNotes
                    ? 'Generate a quiz from your uploaded notes'
                    : 'Upload your notes to generate a quiz'
                  }
                </Text>
              </View>
            </View>
          )}
  
          {/* Study Materials */}
          <Text style={styles.sectionTitle}>STUDY MATERIALS</Text>
  
          <UploadDropzone onUpload={handleUpload} />
  
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onDelete={() => handleDelete(note.id)}
            />
          ))}
  
          {/* Action Button */}
          <TouchableOpacity
            style={[
              styles.actionButton,
              !hasNotes && !isCompleted && styles.actionButtonDisabled
            ]}
            onPress={handleGenerateQuiz}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name="brain"
              size={20}
              color={Colors.textInverse}
            />
            <Text style={styles.actionButtonText}>
              {isCompleted ? 'Retake Quiz' : 'Generate Quiz'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
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
      fontSize:   Typography.xs,
      color:      Colors.primary,
      fontWeight: Typography.medium,
      flexShrink: 1,
    },
    container: {
      paddingHorizontal: Spacing.base,
      paddingBottom:     Spacing.xxxl,
      gap:               Spacing.md,
    },
  
    // Header
    header:    { gap: Spacing.sm },
    title: {
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
    progressText: {
      fontSize:   Typography.sm,
      fontWeight: Typography.semibold,
      color:      Colors.primary,
    },
    completedBadge: {
      flexDirection: 'row',
      alignItems:    'center',
      gap:           3,
    },
    completedBadgeText: {
      fontSize:   Typography.sm,
      fontWeight: Typography.medium,
      color:      Colors.success,
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
    cardTitle: {
      fontSize:   Typography.base,
      fontWeight: Typography.semibold,
      color:      Colors.textPrimary,
    },
    cardSubtitle: {
      fontSize:  Typography.xs,
      color:     Colors.textSecondary,
      marginTop: 2,
    },
  
    // Section
    sectionTitle: {
      fontSize:      Typography.xs,
      fontWeight:    Typography.bold,
      color:         Colors.textMuted,
      letterSpacing: 1,
    },
  
    // Dropzone
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
  })