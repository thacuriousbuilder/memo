

import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert,
  ActivityIndicator
} from 'react-native'
import { useState, useMemo, useRef } from 'react'
import { router } from 'expo-router'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { Colors, Spacing, Radius, Typography } from '@/constants/theme'
import { COURSE_ICONS, COURSE_COLORS } from '@/constants/courseAppearance'
import { useSession } from '@/hooks/useSession'
import { useCourses } from '@/hooks/useCourses'
import * as DocumentPicker from 'expo-document-picker'
import UploadSourceSheet from '@/components/modals/uploadSourceSheet'
import DriveFilePicker   from '@/components/modals/driveFilePicker'
import { useEffect } from 'react'
import { FilesAPI } from '@/lib/api'
import { buildS3Key, getFileType, getContentType, uploadFileToS3 } from '@/lib/aws'
import { supabase } from '@/lib/supabase'
import OrganizeList from '@/components/organizeList'
import { useSession as useSessionHook } from '@/hooks/useSession'  

const STEPS = ['Details', 'Upload', 'Organize']

export interface CourseDetails {
  name:        string
  courseGroup: string
  icon:        string
  color:       string
}

export interface PickedFile {
  uri:      string
  name:     string
  mimeType: string
  size?:    number
}

export interface OrganizeItem {
  localId:    string
  title:      string
  depth:      0 | 1 | 2
  kind:       'folder' | 'topic' | 'subtopic'
  fileIndex?: number   // present for topics — which uploaded file backs it
}

interface TempNote {
  file_index:  number
  s3_key:      string
  file_name:   string
  file_type:   string
  parsed_text: string
}


// ─────────────────────────────────────────
// PROGRESS HEADER
// ─────────────────────────────────────────
function StepProgressHeader({ currentStep }: { currentStep: number }) {
  return (
    <View>
      <View style={styles.progressRow}>
        {STEPS.map((_, idx) => (
          <View
            key={idx}
            style={[
              styles.progressSegment,
              idx <= currentStep && styles.progressSegmentActive,
            ]}
          />
        ))}
      </View>
      <View style={styles.progressLabelRow}>
        {STEPS.map((label, idx) => (
          <Text
            key={label}
            style={[
              styles.progressLabel,
              idx === currentStep && styles.progressLabelActive,
            ]}
          >
            {label}
          </Text>
        ))}
      </View>
    </View>
  )
}

// ─────────────────────────────────────────
// STEP 1 — DETAILS
// ─────────────────────────────────────────
function StepDetails({
  initial, onNext,
}: {
  initial: CourseDetails
  onNext:  (details: CourseDetails) => void
}) {
  const { user } = useSession()
  const { courses } = useCourses(user?.id ?? null)

  const [name,        setName]        = useState(initial.name)
  const [courseGroup, setCourseGroup]  = useState(initial.courseGroup)
  const [customGroup, setCustomGroup] = useState('')
  const [icon,        setIcon]        = useState(initial.icon)
  const [color,       setColor]       = useState(initial.color)

  const existingGroups = useMemo(() => {
    const set = new Set<string>()
    courses.forEach(c => { if (c.course_group) set.add(c.course_group) })
    return Array.from(set)
  }, [courses])

  const effectiveGroup = customGroup.trim() || courseGroup

  const handleNext = () => {
    if (!name.trim()) { Alert.alert('Required', 'Please enter a course name.'); return }
    onNext({ name: name.trim(), courseGroup: effectiveGroup, icon, color })
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.stepContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.fieldLabel}>Course name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Biology 101"
          placeholderTextColor={Colors.textMuted}
        />

        <Text style={styles.fieldLabel}>Group by</Text>
        <View style={styles.chipRow}>
          {existingGroups.map(g => (
            <TouchableOpacity
              key={g}
              style={[styles.chip, courseGroup === g && !customGroup && styles.chipActive]}
              onPress={() => { setCourseGroup(g); setCustomGroup('') }}
            >
              <Text style={[styles.chipText, courseGroup === g && !customGroup && styles.chipTextActive]}>{g}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.chip, !courseGroup && !customGroup && styles.chipActive]}
            onPress={() => { setCourseGroup(''); setCustomGroup('') }}
          >
            <Text style={[styles.chipText, !courseGroup && !customGroup && styles.chipTextActive]}>Other Courses</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={styles.input}
          value={customGroup}
          onChangeText={setCustomGroup}
          placeholder="Or type a new group (e.g. Year 1, Semester 2)"
          placeholderTextColor={Colors.textMuted}
        />

        <Text style={styles.fieldLabel}>Icon</Text>
        <View style={styles.iconGrid}>
          {COURSE_ICONS.map(name => (
            <TouchableOpacity
              key={name}
              style={[styles.iconBtn, icon === name && styles.iconBtnActive]}
              onPress={() => setIcon(name)}
            >
              <MaterialCommunityIcons
                name={name as any}
                size={22}
                color={icon === name ? Colors.primary : Colors.textSecondary}
              />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Color</Text>
        <View style={styles.colorRow}>
          {COURSE_COLORS.map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.colorSwatch, { backgroundColor: c }, color === c && styles.colorSwatchActive]}
              onPress={() => setColor(c)}
            />
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.8}>
          <Text style={styles.nextBtnText}>Next</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

// ─────────────────────────────────────────
// FILE ROW
// ─────────────────────────────────────────
function FileRow({ file, onRemove }: { file: PickedFile; onRemove: () => void }) {
  return (
    <View style={styles.fileRow}>
      <View style={styles.fileIcon}>
        <Ionicons name="document-text-outline" size={20} color={Colors.primary} />
      </View>
      <View style={styles.fileInfo}>
        <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
        {file.size !== undefined && (
          <Text style={styles.fileMeta}>{Math.round(file.size / 1024)} KB</Text>
        )}
      </View>
      <TouchableOpacity onPress={onRemove} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Ionicons name="close" size={20} color={Colors.textMuted} />
      </TouchableOpacity>
    </View>
  )
}

// ─────────────────────────────────────────
// STEP 2 — UPLOAD
// ─────────────────────────────────────────
function StepUpload({
  initial, onBack, onNext,
}: {
  initial: PickedFile[]
  onBack:  () => void
  onNext:  (files: PickedFile[]) => void
}) {
  const [files, setFiles] = useState(initial)
  const [showUploadSource, setShowUploadSource] = useState(false)
  const [showDrivePicker,  setShowDrivePicker]  = useState(false)

  const addFiles = (newFiles: PickedFile[]) => {
    setFiles(prev => {
      const existingNames = new Set(prev.map(f => f.name))
      return [...prev, ...newFiles.filter(f => !existingNames.has(f.name))].slice(0, 10)
    })
  }

  const handlePhonePick = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      multiple: true,
    })
    if (result.canceled || !result.assets) return
    addFiles(result.assets.map(a => ({ uri: a.uri, name: a.name, mimeType: a.mimeType ?? 'application/octet-stream', size: a.size })))
  }

  const handleDriveFilesSelected = (driveFiles: PickedFile[]) => addFiles(driveFiles)

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.stepContainer} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={onBack} style={styles.backLink}>
          <Ionicons name="arrow-back" size={16} color={Colors.textSecondary} />
          <Text style={styles.backLinkText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.uploadHeaderRow}>
          <Text style={styles.uploadTitle}>Upload notes</Text>
          <Text style={styles.uploadCount}>{files.length}/10</Text>
        </View>

        <TouchableOpacity style={styles.dropzone} onPress={() => setShowUploadSource(true)} activeOpacity={0.8}>
          <View style={styles.dropzoneIconWrapper}>
            <Ionicons name="cloud-upload-outline" size={24} color={Colors.primary} />
          </View>
          <Text style={styles.dropzoneTitle}>Tap to upload files</Text>
          <Text style={styles.dropzoneSub}>PDF, slides, images, or notes · up to 10 files</Text>
        </TouchableOpacity>

        {files.map((file, idx) => (
          <View key={file.name}>
            <FileRow file={file} onRemove={() => setFiles(prev => prev.filter(f => f.name !== file.name))} />
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.nextBtn, files.length === 0 && styles.nextBtnDisabled]}
          onPress={() => onNext(files)}
          activeOpacity={0.8}
        >
          <Text style={[styles.nextBtnText, files.length === 0 && styles.nextBtnTextDisabled]}>
            {files.length === 0 ? 'Skip for now' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>

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
    </View>
  )
}

// ─────────────────────────────────────────
// BUILD FLAT ITEMS FROM AI STRUCTURE RESPONSE
// ─────────────────────────────────────────
function buildFlatItems(structure: any): OrganizeItem[] {
  const items: OrganizeItem[] = []
  structure.sections.forEach((sec: any, si: number) => {
    items.push({ localId: `folder_${si}`, title: sec.title, depth: 0, kind: 'folder' })
    sec.lessons.forEach((les: any, li: number) => {
      items.push({ localId: `topic_${si}_${li}`, title: les.title, depth: 1, kind: 'topic', fileIndex: les.file_index })
      ;(les.sub_lessons ?? []).forEach((sub: any, xi: number) => {
        items.push({ localId: `sub_${si}_${li}_${xi}`, title: sub.title, depth: 2, kind: 'subtopic' })
      })
    })
  })
  return items
}

// ─────────────────────────────────────────
// STEP 3 — ORGANIZE (analysis phase for now)
// ─────────────────────────────────────────
function StepOrganize({
  courseDetails, files, onBack, onNext,
}: {
  courseDetails: CourseDetails
  files:         PickedFile[]
  onBack:        () => void
  onNext:        (items: OrganizeItem[], tempNotes: TempNote[]) => void
}) {
  const { user } = useSession()
  const [analyzing, setAnalyzing] = useState(true)
  const [error,     setError]     = useState<string | null>(null)
  const [items,     setItems]     = useState<OrganizeItem[]>([])
  const [tempNotes, setTempNotes] = useState<TempNote[]>([])

  useEffect(() => {
    if (!user) return
    runAnalysis()
  }, [user])

  const runAnalysis = async () => {
    if (!user) return
    try {
      setAnalyzing(true)
      setError(null)

      if (files.length === 0) {
        setItems([])
        setTempNotes([])
        setAnalyzing(false)
        return
      }

      const notes: TempNote[] = []
      for (let i = 0; i < files.length; i++) {
        const file        = files[i]
        const fileType     = getFileType(file.uri)
        const contentType  = getContentType(fileType)
        const s3Key        = buildS3Key(user.id, `temp_${Date.now()}_${i}`, file.name)
        const { upload_url } = await FilesAPI.presign({ s3_key: s3Key, content_type: contentType, user_id: user.id })
        await uploadFileToS3(file.uri, upload_url, contentType)
        const { parsed_text } = await FilesAPI.parseTemp({ s3_key: s3Key, file_type: fileType, user_id: user.id })
        notes.push({ file_index: i, s3_key: s3Key, file_name: file.name, file_type: fileType, parsed_text })
      }
      setTempNotes(notes)

      if (files.length === 1) {
        const lessonName = files[0].name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ').trim()
        setItems([{ localId: 'topic_0', title: lessonName, depth: 1, kind: 'topic', fileIndex: 0 }])
      } else {
        const { structure } = await FilesAPI.analyzeStructure({
          course_name: courseDetails.name,
          files: notes.map(n => ({ file_name: n.file_name, parsed_text: n.parsed_text, note_id: '' })),
        })
        setItems(buildFlatItems(structure))
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setAnalyzing(false)
    }
  }

  if (analyzing) return (
    <View style={[styles.stepContainer, styles.centerFlex]}>
      <ActivityIndicator color={Colors.primary} size="large" />
      <Text style={styles.analyzingTitle}>Analyzing your notes...</Text>
      <Text style={styles.analyzingSubtitle}>Uploading, parsing, and organizing with AI</Text>
    </View>
  )

  if (error) return (
    <View style={[styles.stepContainer, styles.centerFlex]}>
      <Ionicons name="warning-outline" size={40} color={Colors.error} />
      <Text style={styles.analyzingTitle}>Analysis failed</Text>
      <Text style={styles.analyzingSubtitle}>{error}</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={runAnalysis}>
        <Text style={styles.retryBtnText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: Spacing.xl }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.stepContainer}>
          <TouchableOpacity onPress={onBack} style={styles.backLink}>
            <Ionicons name="arrow-back" size={16} color={Colors.textSecondary} />
            <Text style={styles.backLinkText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.uploadTitle}>Organize materials</Text>
          <Text style={styles.organizeSubtitle}>Drag to arrange your notes into folders, topics, and subtopics.</Text>
        </View>
        <View style={styles.stepContainer}>
          <OrganizeList items={items} onChange={setItems} />
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity style={styles.nextBtn} onPress={() => onNext(items, tempNotes)} activeOpacity={0.8}>
          <Text style={styles.nextBtnText}>Create</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

// ─────────────────────────────────────────
// STEP 4 — BUILDING
// ─────────────────────────────────────────


function StepBuilding({
  courseDetails, organizeItems, tempNotes,
}: {
  courseDetails: CourseDetails
  organizeItems: OrganizeItem[]
  tempNotes:     TempNote[]
}) {
  const { user } = useSession()
  const [status,   setStatus]   = useState('Creating course...')
  const [error,    setError]    = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [builtCourseId, setBuiltCourseId] = useState<string | null>(null)
  const hasStarted = useRef(false)

  useEffect(() => {
    if (!user || hasStarted.current) return
    hasStarted.current = true
    build()
  }, [user])

  const update = async (msg: string, pct: number) => {
    setStatus(msg); setProgress(pct)
    await new Promise(r => setTimeout(r, 300))
  }

  const build = async () => {
    if (!user) return
    try {
      await update('Creating course...', 5)

      const { data: course, error: courseErr } = await supabase
        .from('courses')
        .insert({
          user_id: user.id, title: courseDetails.name, emoji: courseDetails.icon,
          color: courseDetails.color, course_group: courseDetails.courseGroup || null,
          description: null,
        })
        .select('id').single()
      if (courseErr) throw courseErr
      const courseId = course.id

      const { data: defaultSection, error: defaultSecErr } = await supabase
        .from('sections')
        .insert({ course_id: courseId, title: 'General', order_index: 0, is_default: true })
        .select('id').single()
      if (defaultSecErr) throw defaultSecErr

      const total = organizeItems.length
      let done = 0
      let currentSectionId = defaultSection.id
      let sectionOrderIndex = 1
      let lessonOrderIndex = 0
      let currentLessonId: string | null = null
      let subOrderIndex = 0

      for (const item of organizeItems) {
        await update(`Creating "${item.title || 'item'}"...`, 10 + Math.round((done / total) * 75))

        if (item.kind === 'folder') {
          const { data: section, error: secErr } = await supabase
            .from('sections')
            .insert({ course_id: courseId, title: item.title || 'Untitled folder', order_index: sectionOrderIndex++, is_default: false })
            .select('id').single()
          if (secErr) throw secErr
          currentSectionId = section.id
          lessonOrderIndex = 0
          currentLessonId = null
        } else if (item.kind === 'topic') {
          const { data: lesson, error: lesErr } = await supabase
            .from('lessons')
            .insert({ section_id: currentSectionId, title: item.title || 'Untitled topic', order_index: lessonOrderIndex++ })
            .select('id').single()
          if (lesErr) throw lesErr
          currentLessonId = lesson.id
          subOrderIndex = 0

          if (item.fileIndex !== undefined) {
            const note = tempNotes.find(n => n.file_index === item.fileIndex)
            if (note) {
              const { error: noteErr } = await supabase.from('notes').insert({
                lesson_id: lesson.id, sub_lesson_id: null,
                file_name: note.file_name, file_type: note.file_type,
                s3_key: note.s3_key, parsed_text: note.parsed_text,
              })
              if (noteErr) throw noteErr
            }
          }
        } else if (item.kind === 'subtopic' && currentLessonId) {
          const { data: sub, error: subErr } = await supabase
            .from('sub_lessons')
            .insert({ lesson_id: currentLessonId, title: item.title || 'Untitled subtopic', order_index: subOrderIndex++ })
            .select('id').single()
          if (subErr) throw subErr

          if (item.fileIndex !== undefined) {
            const note = tempNotes.find(n => n.file_index === item.fileIndex)
            if (note) {
              const { error: noteErr } = await supabase.from('notes').insert({
                lesson_id: null, sub_lesson_id: sub.id,
                file_name: note.file_name, file_type: note.file_type,
                s3_key: note.s3_key, parsed_text: note.parsed_text,
              })
              if (noteErr) throw noteErr
            }
          }
        }
        done++
      }

      await update('Finishing up...', 95)
      setProgress(100); setStatus('Done! 🎉')
      await new Promise(r => setTimeout(r, 400))
      setBuiltCourseId(courseId)
    } catch (err: any) {
      setError(err.message)
    }
  }

  if (error) return (
    <View style={[styles.stepContainer, styles.centerFlex]}>
      <Ionicons name="warning-outline" size={40} color={Colors.error} />
      <Text style={styles.analyzingTitle}>Something went wrong</Text>
      <Text style={styles.analyzingSubtitle}>{error}</Text>
    </View>
  )

  if (builtCourseId) return (
    <View style={[styles.stepContainer, styles.centerFlex]}>
      <View style={[styles.reminderPromptIcon, { backgroundColor: courseDetails.color + '22' }]}>
        <MaterialCommunityIcons name={courseDetails.icon as any} size={32} color={courseDetails.color} />
      </View>
      <Text style={styles.analyzingTitle}>Your course is ready! 🎉</Text>
      <Text style={styles.analyzingSubtitle}>Now let Memo help you remember it with quick study sessions that fit your schedule.</Text>

      <TouchableOpacity
        style={[styles.nextBtn, { marginTop: Spacing.lg, width: '100%' }]}
        onPress={() => router.replace(`/course/${builtCourseId}/reminder/new`)}
        activeOpacity={0.8}
      >
        <Text style={styles.nextBtnText}>Choose my study time</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={{ paddingVertical: Spacing.md }}
        onPress={() => router.replace(`/course/${builtCourseId}`)}
      >
        <Text style={styles.skipText}>Maybe later</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <View style={[styles.stepContainer, styles.centerFlex]}>
      <Text style={{ fontSize: 48 }}>🏗️</Text>
      <Text style={styles.analyzingTitle}>Building your course</Text>
      <Text style={styles.analyzingSubtitle}>{status}</Text>
      <View style={styles.buildProgressTrack}>
        <View style={[styles.buildProgressFill, { width: `${progress}%` }]} />
      </View>
      <Text style={styles.analyzingSubtitle}>{progress}%</Text>
      <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.md }} />
    </View>
  )
}

// ─────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────
export default function CreateCourseScreen() {
  const [step, setStep] = useState(0)
  const [details, setDetails] = useState<CourseDetails>({
    name: '', courseGroup: '', icon: COURSE_ICONS[0], color: COURSE_COLORS[0],
  })
  const [pickedFiles, setPickedFiles] = useState<PickedFile[]>([])
  const [organizeItems, setOrganizeItems] = useState<OrganizeItem[]>([])
  const [tempNotes,     setTempNotes]     = useState<TempNote[]>([])

  const handleBack = () => {
    if (step === 0) router.back()
    else setStep(s => s - 1)
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <Ionicons name="close" size={24} color={Colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New course</Text>
        <View style={{ width: 24 }} />
      </View>

      <StepProgressHeader currentStep={step} />

      {step === 0 && (
        <StepDetails initial={details} onNext={(d) => { setDetails(d); setStep(1) }} />
      )}
      {step === 1 && (
        <StepUpload
          initial={pickedFiles}
          onBack={() => setStep(0)}
          onNext={(files) => { setPickedFiles(files); setStep(2) }}
        />
      )}
     {step === 2 && (
      <StepOrganize
        courseDetails={details}
        files={pickedFiles}
        onBack={() => setStep(1)}
        onNext={(items, notes) => {
          setOrganizeItems(items)
          setTempNotes(notes)
          setStep(3)
        }}
      />
    )}
    {step === 3 && (
      <StepBuilding
        courseDetails={details}
        organizeItems={organizeItems}
        tempNotes={tempNotes}
      />
    )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingTop: Spacing.xl + 32, paddingBottom: Spacing.md,
  },
  headerTitle: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary },

  progressRow: { flexDirection: 'row', gap: 4, paddingHorizontal: Spacing.base },
  progressSegment: { flex: 1, height: 3, backgroundColor: Colors.progressTrack, borderRadius: Radius.full },
  progressSegmentActive: { backgroundColor: Colors.primary },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.base, marginTop: Spacing.xs, marginBottom: Spacing.lg },
  progressLabel: { fontSize: Typography.xs, color: Colors.textMuted, fontWeight: Typography.medium },
  progressLabelActive: { color: Colors.primary, fontWeight: Typography.semibold },

  stepContainer: { paddingHorizontal: Spacing.base, paddingBottom: Spacing.xxxl },
  fieldLabel: { fontSize: Typography.sm, fontWeight: Typography.medium, color: Colors.textPrimary, marginTop: Spacing.lg, marginBottom: Spacing.xs },
  input: {
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.full,
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.md, fontSize: Typography.base, color: Colors.textPrimary,
    marginTop: Spacing.sm,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card,
  },
  chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryMuted },
  chipText: { fontSize: Typography.sm, color: Colors.textSecondary },
  chipTextActive: { color: Colors.primary, fontWeight: Typography.semibold },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  iconBtn: {
    width: 48, height: 48, borderRadius: Radius.md, backgroundColor: Colors.card,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center',
  },
  iconBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryMuted },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  colorSwatch: { width: 40, height: 40, borderRadius: Radius.full, borderWidth: 2, borderColor: 'transparent' },
  colorSwatchActive: { borderColor: Colors.textPrimary },

  footer: {
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.lg,
    borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.background,
  },
  nextBtn: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center' },
  nextBtnText: { fontSize: Typography.base, fontWeight: Typography.semibold, color: '#fff' },
backLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: Spacing.md },
backLinkText: { fontSize: Typography.sm, color: Colors.textSecondary, fontWeight: Typography.medium },
uploadHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
uploadTitle: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textPrimary, marginBottom: Spacing.md },
uploadCount: { fontSize: Typography.sm, color: Colors.textMuted },
dropzone: {
  borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, backgroundColor: Colors.card,
  paddingVertical: Spacing.xl, alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.md,
},
dropzoneIconWrapper: {
  width: 44, height: 44, borderRadius: Radius.full, backgroundColor: Colors.primaryMuted,
  alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs,
},
dropzoneTitle: { fontSize: Typography.base, fontWeight: Typography.medium, color: Colors.textPrimary },
dropzoneSub: { fontSize: Typography.xs, color: Colors.textMuted },
fileRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.card, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, marginBottom: Spacing.sm },
fileIcon: { width: 36, height: 36, borderRadius: Radius.md, backgroundColor: Colors.primaryMuted, alignItems: 'center', justifyContent: 'center' },
fileInfo: { flex: 1 },
fileName: { fontSize: Typography.sm, fontWeight: Typography.medium, color: Colors.textPrimary },
fileMeta: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 2 },
nextBtnDisabled: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
nextBtnTextDisabled: { color: Colors.textMuted },
centerFlex: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
analyzingTitle: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary, textAlign: 'center' },
analyzingSubtitle: { fontSize: Typography.sm, color: Colors.textSecondary, textAlign: 'center' },
retryBtn: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.xl, backgroundColor: Colors.primary, borderRadius: Radius.full },
retryBtnText: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: '#fff' },
organizeSubtitle: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: -Spacing.sm, marginBottom: Spacing.md },
buildProgressTrack: { width: '100%', height: 6, backgroundColor: Colors.progressTrack, borderRadius: Radius.full, overflow: 'hidden', marginTop: Spacing.md },
buildProgressFill: { height: 6, borderRadius: Radius.full },
reminderPromptIcon: { width: 64, height: 64, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
skipText: { fontSize: Typography.sm, color: Colors.textSecondary, fontWeight: Typography.medium },
})