

import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
  LayoutAnimation, Platform, UIManager
} from 'react-native'
import { useState } from 'react'
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { Colors, Spacing, Radius, Typography, CardBase } from '@/constants/theme'
import { useSession }    from '@/hooks/useSession'
import UploadProgress    from '@/components/uploadProgress'
import {
  useSubLesson,
  uploadSubLessonNote,
  deleteSubLessonNote,
  SubLessonNote,
  UploadStage,
} from '@/hooks/useSubLesson'
import React from 'react'

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true)
}

// ─────────────────────────────────────────
// NOTE CARD
// ─────────────────────────────────────────
function NoteCard({
  note, onDelete
}: { note: SubLessonNote; onDelete: () => void }) {
  const date = new Date(note.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  })

  return (
    <View style={styles.noteCard}>
      <Ionicons name="document-text" size={26} color={Colors.primary} />
      <View style={styles.noteInfo}>
        <Text style={styles.noteFileName} numberOfLines={1}>
          {note.file_name}
        </Text>
        <Text style={styles.noteMeta}>
          {note.file_type.toUpperCase()} • {date}
          {note.has_questions
            ? <Text style={styles.noteReady}> • ✓ Ready</Text>
            : <Text style={styles.noteParsing}> • Processing...</Text>
          }
        </Text>
      </View>
      <TouchableOpacity
        onPress={onDelete}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="trash-outline" size={18} color={Colors.error} />
      </TouchableOpacity>
    </View>
  )
}

// ─────────────────────────────────────────
// QUIZ BUTTON
// ─────────────────────────────────────────
function QuizButton({
  label, active, subLessonId, title
}: {
  label:       string
  active:      boolean
  subLessonId: string
  title:       string
}) {
  return (
    <TouchableOpacity
      style={[styles.quizButton, !active && styles.quizButtonDisabled]}
      activeOpacity={active ? 0.8 : 1}
      disabled={!active}
      onPress={() => router.push({
        pathname: '/study/[id]',
        params: {
          id:    subLessonId,
          mode:  'sublesson',
          title,
        },
      })}
    >
      <MaterialCommunityIcons
        name="brain"
        size={18}
        color={active ? Colors.textInverse : Colors.textMuted}
      />
      <Text style={[
        styles.quizButtonText,
        !active && styles.quizButtonTextDisabled,
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  )
}

// ─────────────────────────────────────────
// STATUS BANNER
// ─────────────────────────────────────────
function StatusBanner({ status }: { status: string }) {
  if (status === 'passed') {
    return (
      <View style={[styles.banner, styles.bannerPassed]}>
        <View style={styles.bannerIcon}>
          <Ionicons name="checkmark" size={20} color={Colors.success} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>Sub-lesson completed!</Text>
          <Text style={styles.bannerSubtitle}>
            Retake the quiz to reinforce learning.
          </Text>
        </View>
      </View>
    )
  }
  return (
    <View style={[styles.banner, styles.bannerReady]}>
      <View style={styles.bannerIcon}>
        <Ionicons name="book-outline" size={20} color={Colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.bannerTitle}>Ready to study</Text>
        <Text style={styles.bannerSubtitle}>
          Upload notes and generate a quiz to get started.
        </Text>
      </View>
    </View>
  )
}

// ─────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────
export default function SubLessonScreen() {
  const { id }   = useLocalSearchParams<{ id: string }>()
  const { user } = useSession()

  const { subLesson, loading, error, refetch } = useSubLesson(
    id   ?? null,
    user?.id ?? null
  )

  const [uploadStage,   setUploadStage]   = useState<UploadStage>('idle')
  const [materialsOpen, setMaterialsOpen] = useState(false)

  const isUploading = uploadStage !== 'idle' && uploadStage !== 'done'

  useFocusEffect(
    React.useCallback(() => { refetch() }, [refetch])
  )

  const toggleMaterials = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setMaterialsOpen(prev => !prev)
  }

  const handleUpload = async () => {
    if (!user || !id) return
    try {
      const result = await uploadSubLessonNote({
        userId:      user.id,
        subLessonId: id,
        onProgress:  setUploadStage,
      })
      if (result) await refetch()
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message)
    } finally {
      setUploadStage('idle')
    }
  }

  const handleDeleteNote = (note: SubLessonNote) => {
    Alert.alert('Delete Note', `Remove "${note.file_name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text:    'Delete',
        style:   'destructive',
        onPress: async () => {
          try {
            await deleteSubLessonNote({
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

  if (loading) return (
    <View style={[styles.root, styles.center]}>
      <ActivityIndicator color={Colors.primary} size="large" />
    </View>
  )

  if (error || !subLesson) return (
    <View style={[styles.root, styles.center]}>
      <Text style={styles.errorText}>
        {error ?? 'Sub-lesson not found'}
      </Text>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.backLink}>← Go Back</Text>
      </TouchableOpacity>
    </View>
  )

  const hasQuestions = subLesson.question_count > 0
  const quizLabel    = subLesson.status === 'passed'
    ? 'Retake Quiz'
    : 'Generate & Take Quiz'

  return (
    <View style={styles.root}>
      {/* Breadcrumb */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Ionicons name="chevron-back" size={16} color={Colors.primary} />
        <Text style={styles.breadcrumb} numberOfLines={1}>
          {subLesson.course_title} / {subLesson.lesson_title}
        </Text>
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── HEADER ─── */}
        <View style={styles.header}>
          <Text style={styles.title}>{subLesson.title}</Text>

          <View style={styles.metaRow}>
            {subLesson.question_count > 0 && (
              <>
                <Ionicons
                  name="help-circle-outline"
                  size={14}
                  color={Colors.textMuted}
                />
                <Text style={styles.metaText}>
                  {subLesson.question_count} Q
                </Text>
              </>
            )}
            {subLesson.progress > 0 && (
              <Text style={styles.progressBadge}>
                {subLesson.progress}%
              </Text>
            )}
          </View>

          {subLesson.progress > 0 && (
            <View style={styles.progressTrack}>
              <View style={[
                styles.progressFill,
                { width: `${subLesson.progress}%` }
              ]} />
            </View>
          )}
        </View>

        {/* ─── STATUS BANNER ─── */}
        <StatusBanner status={subLesson.status} />

        {/* ─── QUIZ BUTTON ─── */}
        <QuizButton
          label={quizLabel}
          active={hasQuestions}
          subLessonId={subLesson.id}
          title={subLesson.title}
        />
        {!hasQuestions && (
          <Text style={styles.quizHint}>
            Upload notes to generate quiz questions
          </Text>
        )}

        {/* ─── UPLOAD NOTES ─── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>UPLOAD NOTES</Text>
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
                <View style={styles.uploadIconWrapper}>
                  <Ionicons
                    name="share-outline"
                    size={24}
                    color={Colors.primary}
                  />
                </View>
                <Text style={styles.dropzoneTitle}>Upload Notes</Text>
                <Text style={styles.dropzoneSubtitle}>
                  PDF, TXT, DOCX accepted
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* ─── STUDY MATERIALS (collapsible) ─── */}
        {subLesson.notes.length > 0 && (
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.collapsibleHeader}
              onPress={toggleMaterials}
              activeOpacity={0.8}
            >
              <View style={styles.collapsibleLeft}>
                <Ionicons
                  name="folder-outline"
                  size={16}
                  color={Colors.textSecondary}
                />
                <Text style={styles.collapsibleTitle}>
                  STUDY MATERIALS
                </Text>
              </View>
              <View style={styles.collapsibleRight}>
                <Text style={styles.collapsibleMeta}>
                  {subLesson.notes.length} file
                  {subLesson.notes.length !== 1 ? 's' : ''}
                </Text>
                <Ionicons
                  name={materialsOpen ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={Colors.textMuted}
                />
              </View>
            </TouchableOpacity>

            {materialsOpen && (
              <View style={styles.collapsibleContent}>
                <View style={styles.divider} />
                {subLesson.notes.map(note => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onDelete={() => handleDeleteNote(note)}
                  />
                ))}
              </View>
            )}
          </View>
        )}
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
  backButton: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               4,
    paddingHorizontal: Spacing.base,
    paddingTop:        Spacing.xl + 32,
    paddingBottom:     Spacing.md,
  },
  breadcrumb: {
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
  header: { gap: Spacing.sm },
  title: {
    fontSize:   Typography.xxl,
    fontWeight: Typography.bold,
    color:      Colors.textPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.sm,
  },
  metaText: {
    fontSize: Typography.sm,
    color:    Colors.textMuted,
  },
  progressBadge: {
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

  // Banner
  banner: {
    ...CardBase,
    flexDirection: 'row',
    alignItems:    'center',
    padding:       Spacing.md,
    gap:           Spacing.md,
  },
  bannerPassed: {
    backgroundColor: Colors.successMuted,
    borderColor:     Colors.answerBorderCorrect,
  },
  bannerReady: {
    backgroundColor: Colors.primaryMuted,
    borderColor:     Colors.primaryBorder,
  },
  bannerIcon: {
    width:           44,
    height:          44,
    borderRadius:    Radius.full,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems:      'center',
    justifyContent:  'center',
  },
  bannerTitle: {
    fontSize:   Typography.base,
    fontWeight: Typography.semibold,
    color:      Colors.textPrimary,
  },
  bannerSubtitle: {
    fontSize:  Typography.xs,
    color:     Colors.textSecondary,
    marginTop: 2,
  },

  // Quiz
  quizButton: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius:    Radius.md,
    paddingVertical: Spacing.md,
  },
  quizButtonDisabled: {
    backgroundColor: Colors.card,
    borderWidth:     1,
    borderColor:     Colors.border,
  },
  quizButtonText: {
    fontSize:   Typography.base,
    fontWeight: Typography.semibold,
    color:      Colors.textInverse,
  },
  quizButtonTextDisabled: { color: Colors.textMuted },
  quizHint: {
    textAlign: 'center',
    fontSize:  Typography.xs,
    color:     Colors.textMuted,
    marginTop: -Spacing.sm,
  },

  // Section
  section:      { gap: Spacing.sm },
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
  uploadIconWrapper: {
    width:           52,
    height:          52,
    borderRadius:    Radius.full,
    backgroundColor: Colors.primaryMuted,
    borderWidth:     1,
    borderColor:     Colors.primaryBorder,
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    Spacing.xs,
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

  // Card + Collapsible
  card: {
    ...CardBase,
    overflow: 'hidden',
    padding:  0,
  },
  collapsibleHeader: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical:   Spacing.md,
  },
  collapsibleLeft: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.sm,
  },
  collapsibleTitle: {
    fontSize:      Typography.xs,
    fontWeight:    Typography.bold,
    color:         Colors.textSecondary,
    letterSpacing: 1,
  },
  collapsibleRight: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.sm,
  },
  collapsibleMeta: {
    fontSize: Typography.xs,
    color:    Colors.textMuted,
  },
  collapsibleContent: {
    paddingHorizontal: Spacing.base,
    paddingBottom:     Spacing.md,
    gap:               Spacing.sm,
  },
  divider: {
    height:          1,
    backgroundColor: Colors.border,
    marginBottom:    Spacing.sm,
  },

  // Note Card
  noteCard: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             Spacing.md,
    paddingVertical: Spacing.sm,
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
  noteReady:   { color: Colors.success },
  noteParsing: { color: Colors.warning },
})