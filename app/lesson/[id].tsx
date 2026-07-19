

import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
  LayoutAnimation, Platform, UIManager
} from 'react-native'
import { useState } from 'react'
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { Colors, Spacing, Radius, Typography } from '@/constants/theme'
import NewSubLessonModal from '@/components/modals/newSubLessonModal'
import UploadProgress   from '@/components/uploadProgress'
import { useSession }   from '@/hooks/useSession'
import {
  useLesson,
  uploadLessonNote,
  deleteLessonNote,
  addSubLesson,
  SubLessonItem,
  NoteItem,
  UploadStage,
} from '@/hooks/useLessons'
import React from 'react'

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true)
}

// ─────────────────────────────────────────
// STAGE LABEL
// ─────────────────────────────────────────
function getStageLabel(stage: UploadStage): string {
  switch (stage) {
    case 'uploading':  return 'Uploading notes...'
    case 'parsing':    return 'Reading content...'
    case 'generating': return 'Generating questions...'
    case 'done':       return '✓ Questions ready!'
    default:           return 'Upload Notes'
  }
}

// ─────────────────────────────────────────
// NOTE ROW
// ─────────────────────────────────────────
function NoteRow({
  note, onDelete
}: { note: NoteItem; onDelete: () => void }) {
  const date = new Date(note.created_at).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric'
  })

  return (
    <View style={styles.noteRow}>
      <Ionicons name="document-text" size={22} color={Colors.textSecondary} />
      <View style={styles.noteInfo}>
        <Text style={styles.noteFileName} numberOfLines={1}>
          {note.file_name}
        </Text>
        <Text style={styles.noteMeta}>
          {note.file_type.toUpperCase()} · Uploaded {date}
        </Text>
      </View>
      <TouchableOpacity
        onPress={onDelete}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="trash-outline" size={18} color={Colors.error} />
      </TouchableOpacity>
    </View>
  )
}

// ─────────────────────────────────────────
// SUB-LESSON ROW
// ─────────────────────────────────────────
function SubLessonRow({
  sub, index
}: { sub: SubLessonItem; index: number }) {
  const isLocked = sub.status === 'locked'

  return (
    <TouchableOpacity
      style={[styles.subRow, isLocked && styles.subRowLocked]}
      activeOpacity={isLocked ? 1 : 0.8}
      disabled={isLocked}
      onPress={() => router.push(`/sublesson/${sub.id}`)}
    >
      <View style={[
        styles.subIndicator,
        sub.status === 'passed'      && styles.subIndicatorPassed,
        sub.status === 'in_progress' && styles.subIndicatorActive,
        isLocked                     && styles.subIndicatorLocked,
      ]}>
        {sub.status === 'passed' ? (
          <Ionicons name="checkmark" size={12} color={Colors.success} />
        ) : isLocked ? (
          <Ionicons name="lock-closed" size={10} color={Colors.lockedText} />
        ) : (
          <Text style={styles.subIndicatorNum}>{index + 1}</Text>
        )}
      </View>

      <View style={styles.subInfo}>
        <Text style={[styles.subTitle, isLocked && styles.lockedText]}>
          {sub.title}
        </Text>
        {sub.question_count > 0 && (
          <Text style={styles.subMeta}>
            {sub.question_count} questions
          </Text>
        )}
      </View>

      {sub.status === 'in_progress' && sub.progress > 0 && (
        <Text style={styles.subPct}>{sub.progress}%</Text>
      )}

      {!isLocked && (
        <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
      )}
    </TouchableOpacity>
  )
}

// ─────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────
export default function LessonScreen() {
  const { id }   = useLocalSearchParams<{ id: string }>()
  const { user } = useSession()

  const { lesson, loading, error, refetch } = useLesson(
    id   ?? null,
    user?.id ?? null
  )

  const [uploadStage,      setUploadStage]      = useState<UploadStage>('idle')
  const [showAddSubLesson, setShowAddSubLesson]  = useState(false)
  const [subLessonsOpen,   setSubLessonsOpen]    = useState(true)

  const isUploading = uploadStage !== 'idle' && uploadStage !== 'done'

  useFocusEffect(
    React.useCallback(() => { refetch() }, [refetch])
  )

  const handleUpload = async () => {
    if (!user || !id) return
    try {
      const result = await uploadLessonNote({
        userId:     user.id,
        lessonId:   id,
        onProgress: setUploadStage,
      })
      if (result) await refetch()
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message)
    } finally {
      setUploadStage('idle')
    }
  }

  const handleDeleteNote = (note: NoteItem) => {
    Alert.alert('Delete Note', `Remove "${note.file_name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text:  'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteLessonNote({
              noteId: note.id,
              s3Key:  note.s3_key,
              userId: user?.id ?? '',
            })
            await refetch()
          } catch (err: any) {
            Alert.alert('Error', err.message)
          }
        },
      },
    ])
  }

  const handleAddSubLesson = async (name: string) => {
    if (!id) return
    await addSubLesson({
      lessonId:   id,
      title:      name,
      orderIndex: lesson?.sub_lessons.length ?? 0,
    })
    await refetch()
  }

  if (loading) return (
    <View style={[styles.root, styles.center]}>
      <ActivityIndicator color={Colors.primary} size="large" />
    </View>
  )

  if (error || !lesson) return (
    <View style={[styles.root, styles.center]}>
      <Text style={styles.errorText}>{error ?? 'Lesson not found'}</Text>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.backLink}>← Go Back</Text>
      </TouchableOpacity>
    </View>
  )

  const hasNotes   = lesson.notes.length > 0
  const hasSubQ    = lesson.sub_lessons.some(s => s.question_count > 0)
  const hasAnyQ    = lesson.question_count > 0 || hasSubQ
  const passedCount = lesson.sub_lessons.filter(
    s => s.status === 'passed'
  ).length

  return (
    <View style={styles.root}>
      {/* Breadcrumb */}
      <TouchableOpacity
        style={styles.breadcrumb}
        onPress={() => router.back()}
        activeOpacity={0.8}
      >
        <Ionicons name="chevron-back" size={16} color={Colors.primary} />
        <Text style={styles.breadcrumbCourse}>Back</Text>
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── TITLE ─── */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>{lesson.title}</Text>
          <Text style={styles.titleMeta}>
            {lesson.total_questions > 0
              ? `${lesson.total_questions} questions · `
              : ''
            }
            {lesson.avg_progress > 0
              ? `${lesson.avg_progress}% complete`
              : 'Not started'
            }
          </Text>

          {lesson.avg_progress > 0 && (
            <View style={styles.progressTrack}>
              <View style={[
                styles.progressFill,
                { width: `${lesson.avg_progress}%` }
              ]} />
            </View>
          )}
        </View>

        {/* ─── BREAK INTO SUB-LESSONS ─── */}
        {!lesson.has_sub_lessons && (
          <TouchableOpacity
            style={styles.breakChip}
            onPress={() => setShowAddSubLesson(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="git-branch-outline" size={14} color={Colors.primary} />
            <Text style={styles.breakChipText}>
              Break into sub-lessons
            </Text>
          </TouchableOpacity>
        )}

        {/* ─── STUDY MATERIALS ─── */}
        <View style={styles.materialsSection}>
          <Text style={styles.sectionLabel}>STUDY MATERIALS</Text>

          {/* Upload Dropzone */}
          <TouchableOpacity
            style={[
              styles.dropzone,
              isUploading && styles.dropzoneActive,
            ]}
            onPress={handleUpload}
            activeOpacity={0.8}
            disabled={isUploading}
          >
            {isUploading ? (
              <UploadProgress stage={uploadStage} />
            ) : (
              <>
                <Ionicons
                  name="share-outline"
                  size={26}
                  color={Colors.textSecondary}
                />
                <Text style={styles.dropzoneTitle}>Upload Notes</Text>
                <Text style={styles.dropzoneSub}>
                  PDF, TXT, DOCX accepted
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Note Rows */}
          {lesson.notes.map((note, index) => (
            <View key={note.id}>
              {index > 0 && <View style={styles.noteDivider} />}
              <NoteRow
                note={note}
                onDelete={() => handleDeleteNote(note)}
              />
            </View>
          ))}
        </View>

        {/* ─── SUB-LESSONS ─── */}
        {lesson.has_sub_lessons && (
          <View style={styles.subLessonsSection}>
            <TouchableOpacity
              style={styles.subLessonsHeader}
              onPress={() => {
                LayoutAnimation.configureNext(
                  LayoutAnimation.Presets.easeInEaseOut
                )
                setSubLessonsOpen(prev => !prev)
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.sectionLabel}>SUB-LESSONS</Text>
              <View style={styles.subLessonsHeaderRight}>
                <Text style={styles.subLessonsCount}>
                  {passedCount}/{lesson.sub_lessons.length}
                </Text>
                <Ionicons
                  name={subLessonsOpen ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={Colors.textMuted}
                />
              </View>
            </TouchableOpacity>

            {subLessonsOpen && (
              <View style={styles.subLessonsList}>
                {lesson.sub_lessons.map((sub, idx) => (
                  <View key={sub.id}>
                    {idx > 0 && <View style={styles.noteDivider} />}
                    <SubLessonRow sub={sub} index={idx} />
                  </View>
                ))}

                <View style={styles.noteDivider} />
                <TouchableOpacity
                  style={styles.addSubRow}
                  onPress={() => setShowAddSubLesson(true)}
                >
                  <Ionicons name="add" size={16} color={Colors.primary} />
                  <Text style={styles.addSubText}>Add Sub-lesson</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* ─── GENERATE QUIZ ─── */}
        <TouchableOpacity
          style={[
            styles.generateButton,
            !hasAnyQ && styles.generateButtonDisabled,
          ]}
          activeOpacity={hasAnyQ ? 0.8 : 1}
          disabled={!hasAnyQ}
          onPress={() => router.push({
            pathname: '/study/[id]',
            params: {
              id:    lesson.id,
              mode:  lesson.has_sub_lessons ? 'lesson_all' : 'lesson',
              title: lesson.title,
            },
          })}
        >
          <MaterialCommunityIcons
            name="brain"
            size={20}
            color={hasAnyQ ? '#fff' : Colors.textMuted}
          />
          <Text style={[
            styles.generateButtonText,
            !hasAnyQ && styles.generateButtonTextDisabled,
          ]}>
            {hasAnyQ ? 'Generate Quiz' : 'Upload notes to generate quiz'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <NewSubLessonModal
        visible={showAddSubLesson}
        onClose={() => setShowAddSubLesson(false)}
        onCreate={handleAddSubLesson}
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
  center: {
    alignItems:     'center',
    justifyContent: 'center',
    gap:            Spacing.md,
  },
  errorText: {
    fontSize:  Typography.sm,
    color:     Colors.error,
    textAlign: 'center',
  },
  backLink: {
    fontSize: Typography.sm,
    color:    Colors.primary,
  },

  // Breadcrumb
  breadcrumb: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               4,
    paddingHorizontal: Spacing.base,
    paddingTop:        Spacing.xl + 32,
    paddingBottom:     Spacing.md,
  },
  breadcrumbCourse: {
    fontSize:   Typography.sm,
    color:      Colors.primary,
    fontWeight: Typography.medium,
  },

  container: {
    paddingHorizontal: Spacing.base,
    paddingBottom:     Spacing.xxxl,
    gap:               Spacing.xl,
  },

  // Title
  titleSection: { gap: Spacing.sm },
  title: {
    fontSize:   Typography.xxl,
    fontWeight: Typography.bold,
    color:      Colors.textPrimary,
  },
  titleMeta: {
    fontSize: Typography.sm,
    color:    Colors.textSecondary,
  },
  progressTrack: {
    height:          4,
    backgroundColor: Colors.progressTrack,
    borderRadius:    Radius.full,
    overflow:        'hidden',
    marginTop:       2,
  },
  progressFill: {
    height:          4,
    backgroundColor: Colors.primary,
    borderRadius:    Radius.full,
  },

  // Break chip
  breakChip: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               Spacing.xs,
    alignSelf:         'flex-start',
    backgroundColor:   Colors.primaryMuted,
    borderWidth:       1,
    borderColor:       Colors.primaryBorder,
    borderRadius:      Radius.full,
    paddingVertical:   6,
    paddingHorizontal: Spacing.md,
    marginTop:         -Spacing.sm,
  },
  breakChipText: {
    fontSize:   Typography.xs,
    fontWeight: Typography.semibold,
    color:      Colors.primary,
  },

  // Materials
  materialsSection: { gap: Spacing.md },
  sectionLabel: {
    fontSize:      Typography.xs,
    fontWeight:    Typography.bold,
    color:         Colors.textSecondary,
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
  dropzoneActive: {
    borderColor: Colors.primaryBorder,
    borderStyle: 'solid',
  },
  dropzoneTitle: {
    fontSize:   Typography.base,
    fontWeight: Typography.medium,
    color:      Colors.textSecondary,
  },
  dropzoneSub: {
    fontSize: Typography.xs,
    color:    Colors.textMuted,
  },

  // Notes
  noteRow: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             Spacing.md,
    paddingVertical: Spacing.md,
  },
  noteInfo:  { flex: 1 },
  noteFileName: {
    fontSize:   Typography.base,
    fontWeight: Typography.medium,
    color:      Colors.textPrimary,
  },
  noteMeta: {
    fontSize:  Typography.xs,
    color:     Colors.textSecondary,
    marginTop: 2,
  },
  noteDivider: {
    height:          1,
    backgroundColor: Colors.border + '66',
  },

  // Sub-lessons
  subLessonsSection: { gap: Spacing.sm },
  subLessonsHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  subLessonsHeaderRight: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.sm,
  },
  subLessonsCount: {
    fontSize: Typography.xs,
    color:    Colors.textMuted,
  },
  subLessonsList: { gap: 0 },
  subRow: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             Spacing.md,
    paddingVertical: Spacing.md,
  },
  subRowLocked: { opacity: 0.5 },
  subIndicator: {
    width:           28,
    height:          28,
    borderRadius:    Radius.full,
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: Colors.cardElevated,
    borderWidth:     1,
    borderColor:     Colors.border,
    flexShrink:      0,
  },
  subIndicatorPassed: {
    backgroundColor: Colors.successMuted,
    borderColor:     Colors.success,
  },
  subIndicatorActive: {
    backgroundColor: Colors.primaryMuted,
    borderColor:     Colors.primary,
  },
  subIndicatorLocked: {
    backgroundColor: Colors.card,
    borderColor:     Colors.border,
  },
  subIndicatorNum: {
    fontSize:   9,
    fontWeight: Typography.bold,
    color:      Colors.primary,
  },
  subInfo:  { flex: 1 },
  subTitle: {
    fontSize:   Typography.base,
    fontWeight: Typography.medium,
    color:      Colors.textPrimary,
  },
  subMeta: {
    fontSize:  Typography.xs,
    color:     Colors.textMuted,
    marginTop: 2,
  },
  subPct: {
    fontSize:   Typography.sm,
    fontWeight: Typography.semibold,
    color:      Colors.primary,
  },
  lockedText: { color: Colors.lockedText },

  // Add sub-lesson
  addSubRow: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             Spacing.xs,
    paddingVertical: Spacing.md,
  },
  addSubText: {
    fontSize:   Typography.sm,
    color:      Colors.primary,
    fontWeight: Typography.medium,
  },

  // Generate button
  generateButton: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius:    Radius.md,
    paddingVertical: Spacing.md,
  },
  generateButtonDisabled: {
    backgroundColor: Colors.card,
    borderWidth:     1,
    borderColor:     Colors.border,
  },
  generateButtonText: {
    fontSize:   Typography.base,
    fontWeight: Typography.semibold,
    color:      '#fff',
  },
  generateButtonTextDisabled: {
    color: Colors.textMuted,
  },
})