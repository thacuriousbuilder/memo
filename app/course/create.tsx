// app/course/create.tsx

import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, ScrollView, KeyboardAvoidingView,
    Platform, Alert, ActivityIndicator
  } from 'react-native'
  import { useState, useEffect } from 'react'
  import { router }              from 'expo-router'
  import { Ionicons }            from '@expo/vector-icons'
  import {
    Colors, Spacing, Radius, Typography, CardBase
  } from '@/constants/theme'
  import * as DocumentPicker from 'expo-document-picker'
  import { supabase }         from '@/lib/supabase'
  import { FilesAPI, QuizAPI } from '@/lib/api'
  import {
    buildS3Key,
    getFileType,
    getContentType,
    uploadFileToS3,
  } from '@/lib/aws'
  import UploadSourceSheet from '@/components/modals/uploadSourceSheet'
  import DriveFilePicker   from '@/components/modals/driveFilePicker'
  import { useSession } from '@/hooks/useSession'
  
  interface PickedFile {
    uri:      string
    name:     string
    mimeType: string
    size?:    number
  }
  
  interface TempNote {
    file_index:  number
    s3_key:      string
    file_name:   string
    file_type:   string
    parsed_text: string
  }
  
  interface StructureSubLesson {
    id:    string
    title: string
  }
  
  interface StructureLesson {
    id:          string
    title:       string
    file_index:  number
    sub_lessons: StructureSubLesson[]
  }
  
  interface StructureSection {
    id:      string
    title:   string
    lessons: StructureLesson[]
  }
  
  function ProgressBar({ step, total }: { step: number; total: number }) {
    const pct = Math.round((step / total) * 100)
    return (
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct}%` }]} />
      </View>
    )
  }
  
  function FileRow({ file, onRemove }: { file: PickedFile; onRemove: () => void }) {
    const ext = file.name.split('.').pop()?.toUpperCase() ?? 'FILE'
    return (
      <View style={styles.fileRow}>
        <View style={styles.fileIcon}>
          <Ionicons name="document-text-outline" size={20} color={Colors.primary} />
        </View>
        <View style={styles.fileInfo}>
          <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
          <Text style={styles.fileMeta}>{ext}</Text>
        </View>
        <TouchableOpacity
          onPress={onRemove}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>
    )
  }
  
  function StepCourseDetails({
    onNext,
  }: {
    onNext: (data: { name: string; description: string; courseGroup: string; emoji: string }) => void
  }) {
    const [name,        setName]        = useState('')
    const [description, setDescription] = useState('')
    const [courseGroup, setCourseGroup] = useState('')
    const [emoji,       setEmoji]       = useState('📚')
  
    const EMOJI_OPTIONS = [
      '📚','🧬','🧪','🌍','📐',
      '💻','🎨','🏛️','⚗️','🔬',
      '📊','🎯','🧠','✏️','🔭',
    ]
  
    const handleNext = () => {
      if (!name.trim()) { Alert.alert('Required', 'Please enter a course name.'); return }
      onNext({ name: name.trim(), description: description.trim(), courseGroup: courseGroup.trim(), emoji })
    }
  
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.stepContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.stepTitle}>Course Details</Text>
          <Text style={styles.stepSubtitle}>Tell us about your course</Text>
  
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Icon</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.emojiRow}>
              {EMOJI_OPTIONS.map(e => (
                <TouchableOpacity key={e} style={[styles.emojiBtn, emoji === e && styles.emojiBtnActive]} onPress={() => setEmoji(e)}>
                  <Text style={styles.emojiText}>{e}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
  
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Course Name</Text>
            <TextInput style={styles.input} placeholder="e.g., Biology 101" placeholderTextColor={Colors.textMuted} value={name} onChangeText={setName} />
          </View>
  
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Description <Text style={styles.optional}>(Optional)</Text></Text>
            <TextInput style={[styles.input, styles.textarea]} placeholder="What will you learn in this course?" placeholderTextColor={Colors.textMuted} value={description} onChangeText={setDescription} multiline numberOfLines={3} textAlignVertical="top" />
          </View>
  
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Group <Text style={styles.optional}>(Optional)</Text></Text>
            <TextInput style={styles.input} placeholder="e.g., Fall 2024, Q1, Biology" placeholderTextColor={Colors.textMuted} value={courseGroup} onChangeText={setCourseGroup} />
          </View>
        </ScrollView>
  
        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleNext} activeOpacity={0.8}>
            <Text style={styles.primaryText}>Next</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    )
  }
  
  function StepChooseMode({ onNext, onBack }: { onNext: (mode: 'folder' | 'structured') => void; onBack: () => void }) {
    const [selected, setSelected] = useState<'folder' | 'structured' | null>(null)
  
    const handleNext = () => {
      if (!selected) { Alert.alert('Required', 'Please choose how to organize your course.'); return }
      onNext(selected)
    }
  
    return (
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.stepContainer} showsVerticalScrollIndicator={false}>
          <Text style={styles.stepTitle}>Organization</Text>
          <Text style={styles.stepSubtitle}>How would you like to organize this course?</Text>
  
          {(['folder', 'structured'] as const).map(m => (
            <TouchableOpacity key={m} style={[styles.modeCard, selected === m && styles.modeCardActive]} onPress={() => setSelected(m)} activeOpacity={0.8}>
              <View style={[styles.modeIconWrapper, selected === m && styles.modeIconWrapperActive]}>
                <Ionicons
                  name={m === 'folder' ? 'folder-open-outline' : 'git-branch-outline'}
                  size={28}
                  color={selected === m ? Colors.primary : Colors.textSecondary}
                />
              </View>
              <View style={styles.modeInfo}>
                <Text style={[styles.modeTitle, selected === m && styles.modeTitleActive]}>
                  {m === 'folder' ? 'Simple Folder' : 'Structured'}
                </Text>
                <Text style={styles.modeDesc}>
                  {m === 'folder'
                    ? 'Upload files and select which ones to quiz from. Best for unstructured notes.'
                    : 'Organize into sections, lessons and sub-lessons. Upload files and we\'ll suggest a structure.'
                  }
                </Text>
              </View>
              <View style={[styles.modeRadio, selected === m && styles.modeRadioActive]}>
                {selected === m && <View style={styles.modeRadioDot} />}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
  
        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onBack}>
            <Text style={styles.cancelText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.primaryBtn, !selected && styles.primaryBtnDisabled]} onPress={handleNext} activeOpacity={0.8} disabled={!selected}>
            <Text style={[styles.primaryText, !selected && styles.primaryTextDisabled]}>Next</Text>
            <Ionicons name="arrow-forward" size={16} color={!selected ? Colors.textMuted : '#fff'} />
          </TouchableOpacity>
        </View>
      </View>
    )
  }
  
  function StepFolderUpload({ onNext, onBack }: { onNext: (files: PickedFile[]) => void; onBack: () => void }) {
    const [files, setFiles] = useState<PickedFile[]>([])
    const [showUploadSource, setShowUploadSource] = useState(false)
    const [showDrivePicker,  setShowDrivePicker]   = useState(false)
  
    const addFiles = (newFiles: PickedFile[]) => {
      setFiles(prev => {
        const existingNames = new Set(prev.map(f => f.name))
        return [...prev, ...newFiles.filter(f => !existingNames.has(f.name))].slice(0, 10)
      })
    }
  
    const handlePhonePick = async () => {
      try {
        const result = await DocumentPicker.getDocumentAsync({
          type: ['application/pdf','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
          multiple: true,
        })
        if (result.canceled || !result.assets) return
        addFiles(result.assets.map(a => ({ uri: a.uri, name: a.name, mimeType: a.mimeType ?? 'application/octet-stream', size: a.size })))
      } catch (err: any) { Alert.alert('Error', err.message) }
    }
  
    const handleDriveFilesSelected = (
      driveFiles: { uri: string; name: string; mimeType: string }[]
    ) => {
      addFiles(driveFiles)
    }
  
    return (
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.stepContainer} showsVerticalScrollIndicator={false}>
          <Text style={styles.stepTitle}>Upload Files</Text>
          <Text style={styles.stepSubtitle}>Upload your notes — up to 10 files. Select which ones to quiz from later.</Text>
  
          <TouchableOpacity style={styles.dropzone} onPress={() => setShowUploadSource(true)} activeOpacity={0.8}>
            <Ionicons name="cloud-upload-outline" size={32} color={Colors.textMuted} />
            <Text style={styles.dropzoneTitle}>Tap to add files</Text>
            <Text style={styles.dropzoneSub}>PDF, DOCX, TXT • Max 10 files</Text>
          </TouchableOpacity>
  
          {files.length > 0 && (
            <View style={styles.fileList}>
              {files.map((file, idx) => (
                <View key={file.name}>
                  <FileRow file={file} onRemove={() => setFiles(prev => prev.filter(f => f.name !== file.name))} />
                  {idx < files.length - 1 && <View style={styles.fileDivider} />}
                </View>
              ))}
            </View>
          )}
          {files.length > 0 && <Text style={styles.fileCount}>{files.length}/10 files selected</Text>}
        </ScrollView>
  
        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onBack}>
            <Text style={styles.cancelText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => onNext(files)} activeOpacity={0.8}>
            <Text style={styles.primaryText}>{files.length === 0 ? 'Skip & Create' : 'Create Course'}</Text>
            <Ionicons name="checkmark" size={16} color="#fff" />
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
  


function StepStructuredUpload({ onNext, onBack }: { onNext: (files: PickedFile[], analyze: boolean) => void; onBack: () => void }) {
  const [files, setFiles] = useState<PickedFile[]>([])
  const [showUploadSource, setShowUploadSource] = useState(false)
  const [showDrivePicker,  setShowDrivePicker]   = useState(false)

  const addFiles = (newFiles: PickedFile[]) => {
    setFiles(prev => {
      const existingNames = new Set(prev.map(f => f.name))
      return [...prev, ...newFiles.filter(f => !existingNames.has(f.name))].slice(0, 10)
    })
  }

  const handlePhonePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        multiple: true,
      })
      if (result.canceled || !result.assets) return
      addFiles(result.assets.map(a => ({ uri: a.uri, name: a.name, mimeType: a.mimeType ?? 'application/octet-stream', size: a.size })))
    } catch (err: any) { Alert.alert('Error', err.message) }
  }

  const handleDriveFilesSelected = (
    driveFiles: { uri: string; name: string; mimeType: string }[]
  ) => {
    addFiles(driveFiles)
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.stepContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.stepTitle}>Upload Notes</Text>
        <Text style={styles.stepSubtitle}>Upload your notes and we'll suggest how to organize them into lessons.</Text>

        <TouchableOpacity style={styles.dropzone} onPress={() => setShowUploadSource(true)} activeOpacity={0.8}>
          <Ionicons name="cloud-upload-outline" size={32} color={Colors.textMuted} />
          <Text style={styles.dropzoneTitle}>Tap to add files</Text>
          <Text style={styles.dropzoneSub}>PDF, DOCX, TXT • Max 10 files</Text>
        </TouchableOpacity>

        {files.length > 0 && (
          <View style={styles.fileList}>
            {files.map((file, idx) => (
              <View key={file.name}>
                <FileRow file={file} onRemove={() => setFiles(prev => prev.filter(f => f.name !== file.name))} />
                {idx < files.length - 1 && <View style={styles.fileDivider} />}
              </View>
            ))}
          </View>
        )}
        {files.length > 0 && <Text style={styles.fileCount}>{files.length}/10 files selected</Text>}

        {files.length > 1 && (
          <View style={styles.aiHint}>
            <Ionicons name="sparkles-outline" size={16} color={Colors.primary} />
            <Text style={styles.aiHintText}>We'll analyze your files and suggest a lesson structure. You can edit it before creating.</Text>
          </View>
        )}
        {files.length === 1 && (
          <View style={styles.aiHint}>
            <Ionicons name="document-text-outline" size={16} color={Colors.primary} />
            <Text style={styles.aiHintText}>One file selected — we'll create a single lesson for it.</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onBack}>
          <Text style={styles.cancelText}>Back</Text>
        </TouchableOpacity>
        {files.length === 0 && (
          <TouchableOpacity style={styles.primaryBtn} onPress={() => onNext([], false)} activeOpacity={0.8}>
            <Text style={styles.primaryText}>Skip & Create</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </TouchableOpacity>
        )}
        {files.length === 1 && (
          <TouchableOpacity style={styles.primaryBtn} onPress={() => onNext(files, false)} activeOpacity={0.8}>
            <Text style={styles.primaryText}>Create Course</Text>
            <Ionicons name="checkmark" size={16} color="#fff" />
          </TouchableOpacity>
        )}
        {files.length > 1 && (
          <TouchableOpacity style={styles.primaryBtn} onPress={() => onNext(files, true)} activeOpacity={0.8}>
            <Ionicons name="sparkles-outline" size={16} color="#fff" />
            <Text style={styles.primaryText}>Analyze & Preview</Text>
          </TouchableOpacity>
        )}
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
  
  function StepPreview({
    courseName, files, userId, onConfirm, onBack,
  }: {
    courseName: string; files: PickedFile[]; userId: string
    onConfirm: (structure: StructureSection[], tempNotes: TempNote[]) => void
    onBack: () => void
  }) {
    const [analyzing, setAnalyzing] = useState(true)
    const [error,     setError]     = useState<string | null>(null)
    const [structure, setStructure] = useState<StructureSection[]>([])
    const [tempNotes, setTempNotes] = useState<TempNote[]>([])
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editValue, setEditValue] = useState('')
  
    useEffect(() => { runAnalysis() }, [])
  
    const runAnalysis = async () => {
      try {
        setAnalyzing(true); setError(null)
        const notes: TempNote[] = []
  
        for (let i = 0; i < files.length; i++) {
          const file = files[i]
          const fileType = getFileType(file.uri)
          const contentType = getContentType(fileType)
          const s3Key = buildS3Key(userId, `temp_${Date.now()}_${i}`, file.name)
          const { upload_url } = await FilesAPI.presign({ s3_key: s3Key, content_type: contentType, user_id: userId })
          await uploadFileToS3(file.uri, upload_url, contentType)
          const { parsed_text } = await FilesAPI.parseTemp({ s3_key: s3Key, file_type: fileType, user_id: userId })
          notes.push({ file_index: i, s3_key: s3Key, file_name: file.name, file_type: fileType, parsed_text })
        }
  
        setTempNotes(notes)
        const { structure: suggested } = await FilesAPI.analyzeStructure({
          course_name: courseName,
          files: notes.map(n => ({ file_name: n.file_name, parsed_text: n.parsed_text, note_id: '' })),
        })
  
        setStructure(suggested.sections.map((sec: any, si: number) => ({
          id: `sec_${si}`, title: sec.title,
          lessons: sec.lessons.map((les: any, li: number) => ({
            id: `les_${si}_${li}`, title: les.title, file_index: les.file_index,
            sub_lessons: (les.sub_lessons ?? []).map((sub: any, xi: number) => ({ id: `sub_${si}_${li}_${xi}`, title: sub.title })),
          })),
        })))
      } catch (err: any) {
        setError(err.message)
      } finally {
        setAnalyzing(false)
      }
    }
  
    const commitEdit = () => {
      if (!editingId) return
      setStructure(prev => prev.map(sec => {
        if (sec.id === editingId) return { ...sec, title: editValue }
        return { ...sec, lessons: sec.lessons.map(les => {
          if (les.id === editingId) return { ...les, title: editValue }
          return { ...les, sub_lessons: les.sub_lessons.map(sub => sub.id === editingId ? { ...sub, title: editValue } : sub) }
        })}
      }))
      setEditingId(null); setEditValue('')
    }
  
    const moveLesson = (sectionId: string, lessonId: string, dir: 'up' | 'down') => {
      setStructure(prev => prev.map(sec => {
        if (sec.id !== sectionId) return sec
        const idx = sec.lessons.findIndex(l => l.id === lessonId)
        if (idx === -1) return sec
        const lessons = [...sec.lessons]
        const target = dir === 'up' ? idx - 1 : idx + 1
        if (target < 0 || target >= lessons.length) return sec
        ;[lessons[idx], lessons[target]] = [lessons[target], lessons[idx]]
        return { ...sec, lessons }
      }))
    }
  
    if (analyzing) return (
      <View style={styles.centerView}>
        <ActivityIndicator color={Colors.primary} size="large" />
        <Text style={styles.analyzingTitle}>Analyzing your notes...</Text>
        <Text style={styles.analyzingSubtitle}>Uploading, parsing, and organizing with AI</Text>
      </View>
    )
  
    if (error) return (
      <View style={styles.centerView}>
        <Ionicons name="warning-outline" size={40} color={Colors.error} />
        <Text style={styles.errorTitle}>Analysis failed</Text>
        <Text style={styles.errorSubtitle}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={runAnalysis}>
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    )
  
    return (
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.stepContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.stepTitle}>Preview Structure</Text>
          <Text style={styles.stepSubtitle}>Edit names or reorder lessons before creating.</Text>
  
          {structure.map(section => (
            <View key={section.id} style={styles.previewSection}>
              <View style={styles.previewSectionHeader}>
                <Ionicons name="folder-outline" size={16} color={Colors.primary} />
                {editingId === section.id ? (
                  <TextInput style={styles.previewEditInput} value={editValue} onChangeText={setEditValue} onBlur={commitEdit} onSubmitEditing={commitEdit} />
                ) : (
                  <Text style={styles.previewSectionTitle}>{section.title}</Text>
                )}
                <TouchableOpacity onPress={() => { setEditingId(section.id); setEditValue(section.title) }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="pencil-outline" size={14} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>
  
              {section.lessons.map((lesson, idx) => (
                <View key={lesson.id} style={styles.previewLesson}>
                  <View style={styles.previewLessonLeft}>
                    <Ionicons name="document-text-outline" size={14} color={Colors.textSecondary} />
                    {editingId === lesson.id ? (
                      <TextInput style={styles.previewEditInput} value={editValue} onChangeText={setEditValue} onBlur={commitEdit} onSubmitEditing={commitEdit} />
                    ) : (
                      <Text style={styles.previewLessonTitle}>{lesson.title}</Text>
                    )}
                    <TouchableOpacity onPress={() => { setEditingId(lesson.id); setEditValue(lesson.title) }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="pencil-outline" size={12} color={Colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.previewReorder}>
                    <TouchableOpacity onPress={() => moveLesson(section.id, lesson.id, 'up')} disabled={idx === 0}>
                      <Ionicons name="chevron-up" size={16} color={idx === 0 ? Colors.textMuted : Colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => moveLesson(section.id, lesson.id, 'down')} disabled={idx === section.lessons.length - 1}>
                      <Ionicons name="chevron-down" size={16} color={idx === section.lessons.length - 1 ? Colors.textMuted : Colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
  
        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onBack}>
            <Text style={styles.cancelText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => onConfirm(structure, tempNotes)} activeOpacity={0.8}>
            <Text style={styles.primaryText}>Create Course</Text>
            <Ionicons name="checkmark" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    )
  }
  
  function StepBuilding({
    courseDetails, mode, structure, tempNotes, userId,
  }: {
    courseDetails: { name: string; description: string; courseGroup: string; emoji: string }
    mode:      'folder' | 'structured'
    structure: StructureSection[]
    tempNotes: TempNote[]
    userId:    string
  }) {
    const [status,   setStatus]   = useState('Creating course...')
    const [error,    setError]    = useState<string | null>(null)
    const [progress, setProgress] = useState(0)
  
    useEffect(() => { build() }, [])
  
    const update = async (msg: string, pct: number) => {
      setStatus(msg); setProgress(pct)
      await new Promise(r => setTimeout(r, 400))
    }
  


const build = async () => {
  try {
    const readyNoteIds: string[] = []

    await update('Creating course...', 5)

    const { data: course, error: courseErr } = await supabase
      .from('courses')
      .insert({
        user_id:      userId,
        title:        courseDetails.name,
        emoji:        courseDetails.emoji,
        description:  courseDetails.description || null,
        course_group: courseDetails.courseGroup || null,
        mode,
        color:        null,
      })
      .select('id')
      .single()

    if (courseErr) throw courseErr
    const courseId = course.id

    if (mode === 'structured' && structure.length > 0) {
      const totalLessons = structure.reduce((s, sec) => s + sec.lessons.length, 0)
      let lessonsDone = 0

      for (let si = 0; si < structure.length; si++) {
        const section = structure[si]
        await update(`Creating section "${section.title}"...`, 10)

        const { data: sec, error: secErr } = await supabase
          .from('sections')
          .insert({ course_id: courseId, title: section.title, order_index: si, is_default: false })
          .select('id').single()
        if (secErr) throw secErr

        for (let li = 0; li < section.lessons.length; li++) {
          const lesson = section.lessons[li]
          await update(`Creating lesson "${lesson.title}"...`, 15 + Math.round((lessonsDone / totalLessons) * 60))

          const { data: les, error: lesErr } = await supabase
            .from('lessons')
            .insert({ section_id: sec.id, title: lesson.title, order_index: li })
            .select('id').single()
          if (lesErr) throw lesErr

          for (let xi = 0; xi < lesson.sub_lessons.length; xi++) {
            await supabase.from('sub_lessons').insert({ lesson_id: les.id, title: lesson.sub_lessons[xi].title, order_index: xi })
          }

          const tempNote = tempNotes.find(n => n.file_index === lesson.file_index)
          if (tempNote) {
            await update(`Saving notes for "${lesson.title}"...`, 15 + Math.round((lessonsDone / totalLessons) * 60) + 5)
            const { data: note, error: noteErr } = await supabase
              .from('notes')
              .insert({ lesson_id: les.id, sub_lesson_id: null, file_name: tempNote.file_name, file_type: tempNote.file_type, s3_key: tempNote.s3_key, parsed_text: tempNote.parsed_text })
              .select('id').single()
            if (noteErr) throw noteErr

            readyNoteIds.push(note.id)
          }
          lessonsDone++
        }
      }

    } else if (mode === 'structured' && tempNotes.length === 1) {
      const tempNote = tempNotes[0]
      const lessonName = tempNote.file_name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ').trim()

      await update(`Creating lesson "${lessonName}"...`, 20)
      const { data: sec, error: secErr } = await supabase
        .from('sections')
        .insert({ course_id: courseId, title: courseDetails.name, order_index: 0, is_default: false })
        .select('id').single()
      if (secErr) throw secErr

      const { data: les, error: lesErr } = await supabase
        .from('lessons')
        .insert({ section_id: sec.id, title: lessonName, order_index: 0 })
        .select('id').single()
      if (lesErr) throw lesErr

      await update('Saving notes...', 60)
      const { data: note, error: noteErr } = await supabase
        .from('notes')
        .insert({ lesson_id: les.id, sub_lesson_id: null, file_name: tempNote.file_name, file_type: tempNote.file_type, s3_key: tempNote.s3_key, parsed_text: tempNote.parsed_text })
        .select('id').single()
      if (noteErr) throw noteErr

      readyNoteIds.push(note.id)

    } else if (mode === 'folder' && tempNotes.length > 0) {
      for (let i = 0; i < tempNotes.length; i++) {
        const tempNote = tempNotes[i]
        await update(`Saving "${tempNote.file_name}"...`, 10 + Math.round((i / tempNotes.length) * 80))

        const { data: note, error: noteErr } = await supabase
          .from('notes')
          .insert({ course_id: courseId, lesson_id: null, sub_lesson_id: null, file_name: tempNote.file_name, file_type: tempNote.file_type, s3_key: tempNote.s3_key, parsed_text: tempNote.parsed_text })
          .select('id').single()
        if (noteErr) throw noteErr

        readyNoteIds.push(note.id)
      }
    }

    await update('Finishing up...', 95)
    await new Promise(r => setTimeout(r, 600))
    setProgress(100); setStatus('Done! 🎉')
    await new Promise(r => setTimeout(r, 800))

    if (mode === 'folder') {
      router.replace({
        pathname: '/course/folder',
        params: { id: courseId, readyNoteIds: JSON.stringify(readyNoteIds) },
      })
    } else {
      router.replace(`/course/${courseId}`)
    }

  } catch (err: any) {
    setError(err.message)
    console.error('Build failed:', err)
  }
}
  
    if (error) return (
      <View style={styles.centerView}>
        <Ionicons name="warning-outline" size={40} color={Colors.error} />
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorSubtitle}>{error}</Text>
      </View>
    )
  
    return (
      <View style={styles.centerView}>
        <Text style={styles.buildingEmoji}>{progress === 100 ? '✅' : '🏗️'}</Text>
        <Text style={styles.buildingTitle}>{progress === 100 ? 'Course Ready!' : 'Building your course'}</Text>
        <Text style={styles.buildingStatus}>{status}</Text>
        <View style={styles.buildingProgressTrack}>
          <View style={[styles.buildingProgressFill, { width: `${progress}%`, backgroundColor: progress === 100 ? Colors.success : Colors.primary }]} />
        </View>
        <Text style={styles.buildingPct}>{progress}%</Text>
        {progress < 100 && <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.md }} />}
      </View>
    )
  }
  
  export default function CreateCourseScreen() {
    const { user }    = useSession()
    const TOTAL_STEPS = 4
  
    const [step,           setStep]           = useState(1)
    const [mode,           setMode]           = useState<'folder' | 'structured' | null>(null)
    const [courseDetails,  setCourseDetails]  = useState<{ name: string; description: string; courseGroup: string; emoji: string } | null>(null)
    const [pickedFiles,    setPickedFiles]    = useState<PickedFile[]>([])
    const [tempNotes,      setTempNotes]      = useState<TempNote[]>([])
    const [structure,      setStructure]      = useState<StructureSection[]>([])
    const [showPreview,    setShowPreview]    = useState(false)
    const [showBuilding,   setShowBuilding]   = useState(false)
    const [preparingFiles, setPreparingFiles] = useState(false)
  
    const handleBack = () => { if (step === 1) router.back(); else setStep(s => s - 1) }
  
    const handleStep3FolderNext = async (files: PickedFile[]) => {
      setPickedFiles(files)
      if (files.length > 0 && user) {
        setPreparingFiles(true)
        try {
          const notes: TempNote[] = []
          for (let i = 0; i < files.length; i++) {
            const file = files[i]
            const fileType = getFileType(file.uri)
            const contentType = getContentType(fileType)
            const s3Key = buildS3Key(user.id, `temp_${Date.now()}_${i}`, file.name)
            const { upload_url } = await FilesAPI.presign({ s3_key: s3Key, content_type: contentType, user_id: user.id })
            await uploadFileToS3(file.uri, upload_url, contentType)
            const { parsed_text } = await FilesAPI.parseTemp({ s3_key: s3Key, file_type: fileType, user_id: user.id })
            notes.push({ file_index: i, s3_key: s3Key, file_name: file.name, file_type: fileType, parsed_text })
          }
          setTempNotes(notes)
        } catch (err: any) {
          Alert.alert('Upload Failed', err.message)
          setPreparingFiles(false); return
        }
        setPreparingFiles(false)
      }
      setShowPreview(false); setShowBuilding(true); setStep(4)
    }
  
    const handleStep3StructuredNext = async (files: PickedFile[], analyze: boolean) => {
      setPickedFiles(files)
      if (analyze && files.length > 1) {
        setShowPreview(true); setShowBuilding(false); setStep(4); return
      }
      if (files.length === 1 && user) {
        setPreparingFiles(true)
        try {
          const file = files[0]
          const fileType = getFileType(file.uri)
          const contentType = getContentType(fileType)
          const s3Key = buildS3Key(user.id, `temp_${Date.now()}_0`, file.name)
          const { upload_url } = await FilesAPI.presign({ s3_key: s3Key, content_type: contentType, user_id: user.id })
          await uploadFileToS3(file.uri, upload_url, contentType)
          const { parsed_text } = await FilesAPI.parseTemp({ s3_key: s3Key, file_type: fileType, user_id: user.id })
          setTempNotes([{ file_index: 0, s3_key: s3Key, file_name: file.name, file_type: fileType, parsed_text }])
        } catch (err: any) {
          Alert.alert('Upload Failed', err.message)
          setPreparingFiles(false); return
        }
        setPreparingFiles(false)
      }
      setShowPreview(false); setShowBuilding(true); setStep(4)
    }
  
    if (preparingFiles) return (
      <View style={[styles.root, styles.centerView]}>
        <ActivityIndicator color={Colors.primary} size="large" />
        <Text style={styles.buildingStatus}>Uploading file...</Text>
      </View>
    )
  
    return (
      <View style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
            <Ionicons name="chevron-back" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Course</Text>
          <View style={{ width: 36 }} />
        </View>
  
        <ProgressBar step={step} total={TOTAL_STEPS} />
  
        {step === 1 && <StepCourseDetails onNext={data => { setCourseDetails(data); setStep(2) }} />}
        {step === 2 && <StepChooseMode onNext={m => { setMode(m); setStep(3) }} onBack={() => setStep(1)} />}
        {step === 3 && mode === 'folder'     && <StepFolderUpload onNext={handleStep3FolderNext} onBack={() => setStep(2)} />}
        {step === 3 && mode === 'structured' && <StepStructuredUpload onNext={handleStep3StructuredNext} onBack={() => setStep(2)} />}
  
        {step === 4 && showPreview && courseDetails && (
          <StepPreview
            courseName={courseDetails.name}
            files={pickedFiles}
            userId={user?.id ?? ''}
            onConfirm={(s, n) => { setStructure(s); setTempNotes(n); setShowPreview(false); setShowBuilding(true) }}
            onBack={() => setStep(3)}
          />
        )}
  
        {step === 4 && showBuilding && courseDetails && (
          <StepBuilding
            courseDetails={courseDetails}
            mode={mode ?? 'folder'}
            structure={structure}
            tempNotes={tempNotes}
            userId={user?.id ?? ''}
          />
        )}
      </View>
    )
  }
  
  const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.base, paddingTop: Spacing.xl + 32, paddingBottom: Spacing.md },
    backBtn: { width: 36, height: 36, borderRadius: Radius.full, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary },
    progressTrack: { height: 3, backgroundColor: Colors.progressTrack, marginHorizontal: Spacing.base, borderRadius: Radius.full, overflow: 'hidden', marginBottom: Spacing.lg },
    progressFill: { height: 3, backgroundColor: Colors.primary, borderRadius: Radius.full },
    stepContainer: { paddingHorizontal: Spacing.base, paddingBottom: Spacing.xxxl, gap: Spacing.lg },
    stepTitle: { fontSize: Typography.xxl, fontWeight: Typography.bold, color: Colors.textPrimary },
    stepSubtitle: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: -Spacing.sm },
    field: { gap: Spacing.xs },
    fieldLabel: { fontSize: Typography.sm, fontWeight: Typography.medium, color: Colors.textPrimary },
    optional: { color: Colors.textMuted, fontWeight: Typography.regular },
    input: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingVertical: Spacing.md, paddingHorizontal: Spacing.md, fontSize: Typography.base, color: Colors.textPrimary },
    textarea: { minHeight: 80, paddingTop: Spacing.md },
    emojiRow: { flexDirection: 'row', gap: Spacing.sm, paddingRight: Spacing.base },
    emojiBtn: { width: 44, height: 44, borderRadius: Radius.md, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
    emojiBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryMuted },
    emojiText: { fontSize: 22 },
    modeCard: { ...CardBase, flexDirection: 'row', alignItems: 'center', padding: Spacing.base, gap: Spacing.md },
    modeCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryMuted },
    modeIconWrapper: { width: 56, height: 56, borderRadius: Radius.lg, backgroundColor: Colors.cardElevated, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    modeIconWrapperActive: { backgroundColor: Colors.primaryMuted },
    modeInfo: { flex: 1 },
    modeTitle: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary, marginBottom: 4 },
    modeTitleActive: { color: Colors.primary },
    modeDesc: { fontSize: Typography.xs, color: Colors.textSecondary, lineHeight: Typography.xs * 1.6 },
    modeRadio: { width: 22, height: 22, borderRadius: Radius.full, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    modeRadioActive: { borderColor: Colors.primary },
    modeRadioDot: { width: 10, height: 10, borderRadius: Radius.full, backgroundColor: Colors.primary },
    dropzone: { borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed', borderRadius: Radius.lg, paddingVertical: Spacing.xl, alignItems: 'center', gap: Spacing.sm },
    dropzoneTitle: { fontSize: Typography.base, fontWeight: Typography.medium, color: Colors.textSecondary },
    dropzoneSub: { fontSize: Typography.xs, color: Colors.textMuted },
    fileList: { ...CardBase, overflow: 'hidden', padding: 0 },
    fileRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, paddingHorizontal: Spacing.base, gap: Spacing.md },
    fileIcon: { width: 40, height: 40, borderRadius: Radius.md, backgroundColor: Colors.primaryMuted, alignItems: 'center', justifyContent: 'center' },
    fileInfo: { flex: 1 },
    fileName: { fontSize: Typography.sm, fontWeight: Typography.medium, color: Colors.textPrimary },
    fileMeta: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 2 },
    fileDivider: { height: 1, backgroundColor: Colors.border + '66', marginHorizontal: Spacing.base },
    fileCount: { fontSize: Typography.xs, color: Colors.textMuted, textAlign: 'center' },
    aiHint: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, backgroundColor: Colors.primaryMuted, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.primaryBorder },
    aiHintText: { flex: 1, fontSize: Typography.xs, color: Colors.primary, lineHeight: Typography.xs * 1.6 },
    previewSection: { ...CardBase, overflow: 'hidden', padding: 0 },
    previewSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, backgroundColor: Colors.primaryMuted },
    previewSectionTitle: { flex: 1, fontSize: Typography.sm, fontWeight: Typography.bold, color: Colors.primary },
    previewLesson: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, paddingHorizontal: Spacing.base, borderTopWidth: 1, borderTopColor: Colors.border + '44' },
    previewLessonLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    previewLessonTitle: { flex: 1, fontSize: Typography.sm, fontWeight: Typography.medium, color: Colors.textPrimary },
    previewEditInput: { flex: 1, fontSize: Typography.sm, color: Colors.textPrimary, borderBottomWidth: 1, borderBottomColor: Colors.primary, paddingBottom: 2 },
    previewReorder: { flexDirection: 'row', gap: Spacing.xs },
    centerView: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl },
    analyzingTitle: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary, textAlign: 'center' },
    analyzingSubtitle: { fontSize: Typography.sm, color: Colors.textSecondary, textAlign: 'center' },
    errorTitle: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary },
    errorSubtitle: { fontSize: Typography.sm, color: Colors.textSecondary, textAlign: 'center' },
    retryBtn: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.xl, backgroundColor: Colors.primary, borderRadius: Radius.full },
    retryText: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: '#fff' },
    buildingEmoji: { fontSize: 48 },
    buildingTitle: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textPrimary, textAlign: 'center' },
    buildingStatus: { fontSize: Typography.sm, color: Colors.textSecondary, textAlign: 'center' },
    buildingProgressTrack: { width: '100%', height: 6, backgroundColor: Colors.progressTrack, borderRadius: Radius.full, overflow: 'hidden', marginTop: Spacing.md },
    buildingProgressFill: { height: 6, borderRadius: Radius.full },
    buildingPct: { fontSize: Typography.sm, color: Colors.textMuted, marginTop: Spacing.xs },
    footer: { flexDirection: 'row', gap: Spacing.md, paddingHorizontal: Spacing.base, paddingVertical: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.background },
    cancelBtn: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border },
    cancelText: { fontSize: Typography.base, fontWeight: Typography.medium, color: Colors.textPrimary },
    primaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: Spacing.md, backgroundColor: Colors.primary, borderRadius: Radius.md },
    primaryBtnDisabled: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
    primaryText: { fontSize: Typography.base, fontWeight: Typography.semibold, color: '#fff' },
    primaryTextDisabled: { color: Colors.textMuted },
  })