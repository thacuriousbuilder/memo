// app/course/create.tsx — new file, Details step only for now

import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert
} from 'react-native'
import { useState, useMemo } from 'react'
import { router } from 'expo-router'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { Colors, Spacing, Radius, Typography } from '@/constants/theme'
import { COURSE_ICONS, COURSE_COLORS } from '@/constants/courseAppearance'
import { useSession } from '@/hooks/useSession'
import { useCourses } from '@/hooks/useCourses'
import * as DocumentPicker from 'expo-document-picker'
import UploadSourceSheet from '@/components/modals/uploadSourceSheet'
import DriveFilePicker   from '@/components/modals/driveFilePicker'

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
// MAIN SCREEN
// ─────────────────────────────────────────
export default function CreateCourseScreen() {
  const [step, setStep] = useState(0)
  const [details, setDetails] = useState<CourseDetails>({
    name: '', courseGroup: '', icon: COURSE_ICONS[0], color: COURSE_COLORS[0],
  })
  const [pickedFiles, setPickedFiles] = useState<PickedFile[]>([])

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
      {/* Step 2 (Organize) built next */}
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
uploadTitle: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textPrimary },
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
})