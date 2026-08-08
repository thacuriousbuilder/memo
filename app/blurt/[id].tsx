

import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, ActivityIndicator, Alert, ScrollView
  } from 'react-native'
  import { useState, useEffect, useRef } from 'react'
  import { router, useLocalSearchParams } from 'expo-router'
  import { useNavigation } from '@react-navigation/native'
  import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
  import {
    useAudioRecorder, useAudioRecorderState, AudioModule, RecordingPresets,
    setAudioModeAsync,
  } from 'expo-audio'
  import { Colors, Spacing, Radius, Typography } from '@/constants/theme'
  import { useSession } from '@/hooks/useSession'
  import { BlurtAPI } from '@/lib/api'
  import { supabase } from '@/lib/supabase'
  
  type BlurtCount   = 3 | 5 | 10
  type BlurtStep    = 'setup' | 'loading' | 'session'
  type InputMode    = 'text' | 'voice'
  type RecordingPhase = 'idle' | 'recording' | 'transcribing' | 'reviewing'
  
  interface BlurtPrompt {
    id:          string
    prompt_text: string
    topic:       string
  }
  
  interface GradeResult {
    rating:          'strong' | 'partial' | 'weak'
    feedback:        string
    review_pointers: string[]
  }
  
  function formatDuration(ms: number): string {
    const totalSec = Math.floor(ms / 1000)
    const m = Math.floor(totalSec / 60)
    const s = totalSec % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }
  
  const RATING_META = {
    strong:  { label: 'Strong understanding',  color: Colors.success, muted: Colors.successMuted },
    partial: { label: 'Partial understanding', color: Colors.warning, muted: Colors.warningMuted },
    weak:    { label: 'Needs more review',     color: Colors.error,   muted: Colors.errorMuted },
  }
  
  // ─────────────────────────────────────────
  // SETUP SCREEN
  // ─────────────────────────────────────────
  function SetupScreen({
    title, onStart,
  }: {
    title:   string
    onStart: (count: BlurtCount) => void
  }) {
    const [selected, setSelected] = useState<BlurtCount | null>(null)
  
    const counts: { value: BlurtCount; label: string; desc: string }[] = [
      { value: 3,  label: '3 prompts',  desc: 'Quick ~3 min' },
      { value: 5,  label: '5 prompts',  desc: 'Standard ~6 min' },
      { value: 10, label: '10 prompts', desc: 'Deep review ~12 min' },
    ]
  
    return (
      <ScrollView contentContainerStyle={styles.setupContainer} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <Ionicons name="close" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
  
        <View style={styles.setupHeader}>
          <View style={styles.setupIconWrapper}>
            <MaterialCommunityIcons name="account-voice" size={32} color={Colors.primary} />
          </View>
          <Text style={styles.setupMode}>BLURT</Text>
          <Text style={styles.setupTitle}>{title}</Text>
          <Text style={styles.setupSubtitle}>How many prompts do you want?</Text>
        </View>
  
        <View style={styles.countList}>
          {counts.map(({ value, label, desc }) => (
            <TouchableOpacity
              key={value}
              style={[styles.countCard, selected === value && styles.countCardActive]}
              onPress={() => setSelected(value)}
              activeOpacity={0.8}
            >
              <View style={styles.countLeft}>
                <Text style={[styles.countLabel, selected === value && styles.countLabelActive]}>{label}</Text>
                <Text style={styles.countDesc}>{desc}</Text>
              </View>
              <View style={[styles.countRadio, selected === value && styles.countRadioActive]}>
                {selected === value && <View style={styles.countRadioInner} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>
  
        <TouchableOpacity
          style={[styles.startButton, !selected && styles.startButtonDisabled]}
          onPress={() => selected && onStart(selected)}
          disabled={!selected}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="account-voice" size={20} color={Colors.textInverse} />
          <Text style={styles.startButtonText}>Start Blurt</Text>
        </TouchableOpacity>
      </ScrollView>
    )
  }
  
  // ─────────────────────────────────────────
  // SESSION SCREEN — one prompt at a time
  // ─────────────────────────────────────────
  function BlurtSession({
    prompts, scopeType, scopeId, userId, reminderId, onFinish,
  }: {
    prompts:   BlurtPrompt[]
    scopeType: 'topic' | 'subtopic'
    scopeId:   string
    userId:    string
    reminderId?: string
    onFinish:  (results: GradeResult[]) => void
  }) {
    const [index, setIndex] = useState(0)
    const [inputMode, setInputMode] = useState<InputMode>('text')
    const [answerText, setAnswerText] = useState('')
    const [inputMethod, setInputMethod] = useState<'text' | 'voice'>('text')
    const [recordingPhase, setRecordingPhase] = useState<RecordingPhase>('idle')
    const [grading, setGrading] = useState(false)
    const [result, setResult] = useState<GradeResult | null>(null)
    const [allResults, setAllResults] = useState<GradeResult[]>([])
    const [showAnswer, setShowAnswer] = useState(false)

    const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY)
    const recorderState  = useAudioRecorderState(audioRecorder)
  
    useEffect(() => {
      (async () => {
        const { granted } = await AudioModule.requestRecordingPermissionsAsync()
        if (!granted) {
          Alert.alert('Microphone Access Needed', 'Enable microphone access in Settings to record.')
          return
        }
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true })
      })()
    }, [])
  
    const current = prompts[index]
    const isLast  = index === prompts.length - 1
  
    const startRecording = async () => {
      try {
        await audioRecorder.prepareToRecordAsync()
        audioRecorder.record()
        setRecordingPhase('recording')
      } catch (err: any) {
        Alert.alert('Microphone Error', err.message ?? 'Could not start recording.')
      }
    }
  
    const stopAndTranscribe = async () => {
      try {
        await audioRecorder.stop()
        const uri = audioRecorder.uri
        if (!uri) throw new Error('No recording found.')
        setRecordingPhase('transcribing')
        const { text } = await BlurtAPI.transcribe(uri)
        setAnswerText(text)
        setInputMethod('voice')
        setRecordingPhase('reviewing')
      } catch (err: any) {
        Alert.alert('Transcription Failed', err.message ?? 'Could not transcribe your recording.')
        setRecordingPhase('idle')
      }
    }
  
    const reRecord = () => { setAnswerText(''); setRecordingPhase('idle') }
  
    const handleModeSwitch = (mode: InputMode) => {
      setInputMode(mode)
      if (mode === 'text') { setInputMethod('text'); setRecordingPhase('idle') }
    }
  
    const handleSubmit = async () => {
      if (!answerText.trim()) {
        Alert.alert('Nothing written yet', 'Write what you remember, or say "I don\'t remember much" — that\'s useful too.')
        return
      }
      setGrading(true)
      try {
        const graded = await BlurtAPI.grade({
          user_id:      userId,
          scope_type:   scopeType,
          scope_id:     scopeId,
          answer_text:  answerText.trim(),
          input_method: inputMethod,
        })
        setResult(graded)
        setAllResults(prev => [...prev, graded])

        // Best-effort — the grade already succeeded and counts regardless;
        // this only links it to the Auto/Manual plan that launched it.
        if (reminderId) {
          const { error: linkErr } = await supabase
            .from('blurt_attempts')
            .update({ reminder_id: reminderId })
            .eq('id', graded.attempt_id)
          if (linkErr) {
            console.error('[BlurtSession] Failed to link reminder_id:', linkErr)
            Alert.alert('Sync issue', 'Session saved, but couldn\'t sync to your plan today.')
          }
        }
      } catch (err: any) {
        Alert.alert('Error', err.message)
      } finally {
        setGrading(false)
      }
    }
  
    const handleNext = () => {
      if (isLast) {
        onFinish(allResults)
        return
      }
      setIndex(i => i + 1)
      setAnswerText('')
      setResult(null)
      setInputMode('text')
      setRecordingPhase('idle')
      setShowAnswer(false)
    }

    const canSubmit = !grading && recordingPhase !== 'recording' && recordingPhase !== 'transcribing' && !result
    const progressPct = ((index + (result ? 1 : 0)) / prompts.length) * 100
  
    return (
      <View style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Blurt</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.progressRow}>
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${progressPct}%` }]} />
          </View>
          <Text style={styles.progressCount}>{index + 1} of {prompts.length}</Text>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.promptCard}>
            <Text style={styles.promptText}>{current.prompt_text}</Text>
          </View>
  
          {!result && (
            <View style={styles.modeToggle}>
              <TouchableOpacity
                style={[styles.modeBtn, inputMode === 'text' && styles.modeBtnActive]}
                onPress={() => handleModeSwitch('text')}
              >
                <Ionicons name="create-outline" size={16} color={inputMode === 'text' ? '#fff' : Colors.textSecondary} />
                <Text style={[styles.modeBtnText, inputMode === 'text' && styles.modeBtnTextActive]}>Type</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeBtn, inputMode === 'voice' && styles.modeBtnActive]}
                onPress={() => handleModeSwitch('voice')}
              >
                <Ionicons name="mic-outline" size={16} color={inputMode === 'voice' ? '#fff' : Colors.textSecondary} />
                <Text style={[styles.modeBtnText, inputMode === 'voice' && styles.modeBtnTextActive]}>Speak</Text>
              </TouchableOpacity>
            </View>
          )}
  
          {!result && inputMode === 'text' && (
            <TextInput
              style={styles.textArea}
              multiline
              placeholder="Write what you remember, in your own words..."
              placeholderTextColor={Colors.textMuted}
              value={answerText}
              onChangeText={setAnswerText}
              textAlignVertical="top"
            />
          )}
  
          {!result && inputMode === 'voice' && recordingPhase === 'idle' && (
            <View style={styles.voiceStage}>
              <TouchableOpacity style={styles.recordBtn} onPress={startRecording} activeOpacity={0.8}>
                <Ionicons name="mic" size={36} color={Colors.primary} />
              </TouchableOpacity>
              <Text style={styles.voiceHint}>Tap to start recording</Text>
            </View>
          )}
  
          {!result && inputMode === 'voice' && recordingPhase === 'recording' && (
            <View style={styles.voiceStage}>
              <View style={styles.recordingPulse}><Ionicons name="mic" size={32} color="#fff" /></View>
              <Text style={styles.recordingTimer}>{formatDuration(recorderState.durationMillis ?? 0)}</Text>
              <TouchableOpacity style={styles.stopBtn} onPress={stopAndTranscribe} activeOpacity={0.8}>
                <Ionicons name="stop" size={18} color="#fff" />
                <Text style={styles.stopBtnText}>Stop</Text>
              </TouchableOpacity>
            </View>
          )}
  
          {!result && inputMode === 'voice' && recordingPhase === 'transcribing' && (
            <View style={styles.voiceStage}>
              <ActivityIndicator color={Colors.primary} size="large" />
              <Text style={styles.voiceHint}>Transcribing your answer...</Text>
            </View>
          )}
  
          {!result && inputMode === 'voice' && recordingPhase === 'reviewing' && (
            <View style={{ flex: 1, gap: Spacing.sm }}>
              <Text style={styles.reviewLabel}>Review and edit if needed:</Text>
              <TextInput
                style={styles.textArea}
                multiline
                value={answerText}
                onChangeText={setAnswerText}
                textAlignVertical="top"
              />
              <TouchableOpacity style={styles.reRecordBtn} onPress={reRecord}>
                <Ionicons name="refresh" size={14} color={Colors.textSecondary} />
                <Text style={styles.reRecordText}>Re-record</Text>
              </TouchableOpacity>
            </View>
          )}
  
          {result && (
            <View style={{ gap: Spacing.md }}>
              <View style={[styles.resultCard, { backgroundColor: RATING_META[result.rating].muted }]}>
                <View style={styles.resultBadge}>
                  <Ionicons name="refresh" size={14} color={RATING_META[result.rating].color} />
                  <Text style={[styles.resultBadgeText, { color: RATING_META[result.rating].color }]}>
                    {RATING_META[result.rating].label}
                  </Text>
                </View>
                <Text style={styles.resultFeedback}>{result.feedback}</Text>
              </View>

              {result.review_pointers.length > 0 && (
                <View style={{ gap: Spacing.sm }}>
                  <Text style={styles.pointersLabel}>KEY POINTS TO REVIEW</Text>
                  {result.review_pointers.map((p, i) => (
                    <View key={i} style={styles.pointerRow}>
                      <Ionicons name="alert-circle-outline" size={16} color={Colors.warning} />
                      <Text style={styles.pointerRowText} numberOfLines={1}>{p}</Text>
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity style={styles.answerToggle} onPress={() => setShowAnswer(v => !v)} activeOpacity={0.7}>
                <Text style={styles.answerToggleText}>Your answer</Text>
                <Ionicons name={showAnswer ? 'chevron-down' : 'chevron-forward'} size={16} color={Colors.textMuted} />
              </TouchableOpacity>
              {showAnswer && <Text style={styles.answerText}>{answerText}</Text>}
            </View>
          )}
  
          {!result ? (
            <TouchableOpacity
              style={[styles.submitBtn, !canSubmit && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={!canSubmit}
            >
              {grading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.submitBtnText}>Submit</Text>}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.submitBtn} onPress={handleNext}>
              <Text style={styles.submitBtnText}>{isLast ? 'Finish' : 'Next prompt'}</Text>
              <Ionicons name="chevron-forward" size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    )
  }
  
  // ─────────────────────────────────────────
  // MAIN SCREEN
  // ─────────────────────────────────────────
  export default function BlurtSessionScreen() {
    const params = useLocalSearchParams<{
      scopeType: 'topic' | 'subtopic'
      scopeId:   string
      title:     string
      reminderId?: string
    }>()
    const { user } = useSession()
  
    const [step,    setStep]    = useState<BlurtStep>('setup')
    const [prompts, setPrompts] = useState<BlurtPrompt[]>([])

    // Covers the on-screen close button, iOS swipe-back, and Android
    // hardware back with a single confirmation — none of them can silently
    // discard already-answered prompts. Lives on this outer screen (not the
    // inner BlurtSession) because blurt/results.tsx's "Done" button calls
    // router.dismissAll(), which can remove this route a second time well
    // after the initial router.replace to /blurt/results — a ref on a child
    // component wouldn't reliably survive to see that second removal.
    // hasFinishedRef is set once the session is legitimately finished and
    // stays true for the rest of this screen's lifetime so neither removal
    // ever prompts.
    const hasFinishedRef = useRef(false)
    const navigation = useNavigation()
    useEffect(() => {
      return navigation.addListener('beforeRemove', (e) => {
        if (hasFinishedRef.current || step !== 'session') return
        e.preventDefault()
        Alert.alert(
          'Quit Blurt Session',
          'Your progress on this session will be lost.',
          [
            { text: 'Keep Going', style: 'cancel' },
            { text: 'Quit', style: 'destructive',
              onPress: () => navigation.dispatch(e.data.action) },
          ]
        )
      })
    }, [navigation, step])

    const handleStart = async (count: BlurtCount) => {
      if (!user) return
      try {
        setStep('loading')
        const { prompts: fetched } = await BlurtAPI.getPrompts({
          scope_type: params.scopeType,
          scope_id:   params.scopeId,
          count,
        })
        if (!fetched.length) {
          Alert.alert('No materials', 'Couldn\'t find prompts for this topic.')
          setStep('setup')
          return
        }
        setPrompts(fetched)
        setStep('session')
      } catch (err: any) {
        Alert.alert('Error', err.message)
        setStep('setup')
      }
    }
  
    if (step === 'loading') return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={Colors.primary} size="large" />
        <Text style={styles.loadingText}>Preparing your prompts...</Text>
      </View>
    )
  
    if (step === 'setup') return (
      <View style={styles.root}>
        <SetupScreen title={params.title} onStart={handleStart} />
      </View>
    )
  
    return (
      <BlurtSession
        prompts={prompts}
        scopeType={params.scopeType}
        scopeId={params.scopeId}
        userId={user!.id}
        reminderId={params.reminderId}
        onFinish={(results) => {
          hasFinishedRef.current = true
          router.replace({
            pathname: '/blurt/results',
            params: {
              title: params.title,
              results: JSON.stringify(results),
              scopeType: params.scopeType,
              scopeId: params.scopeId,
            },
          })
        }}
      />
    )
  }
  
  // ─────────────────────────────────────────
  // STYLES
  // ─────────────────────────────────────────
  const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
    loadingText: { fontSize: Typography.sm, color: Colors.textSecondary },
    closeButton: {
      alignSelf: 'flex-end', width: 36, height: 36, borderRadius: Radius.full,
      backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
      alignItems: 'center', justifyContent: 'center',
    },
  
    // Setup
    setupContainer: { paddingHorizontal: Spacing.base, paddingTop: Spacing.xl + 32, paddingBottom: Spacing.xxxl, gap: Spacing.xl },
    setupHeader: { alignItems: 'center', gap: Spacing.sm },
    setupIconWrapper: {
      width: 80, height: 80, borderRadius: Radius.full, backgroundColor: Colors.primaryMuted,
      borderWidth: 1, borderColor: Colors.primaryBorder, alignItems: 'center', justifyContent: 'center',
      marginBottom: Spacing.sm,
    },
    setupMode: { fontSize: Typography.xs, fontWeight: Typography.bold, color: Colors.primary, letterSpacing: 1 },
    setupTitle: { fontSize: Typography.xxl, fontWeight: Typography.bold, color: Colors.textPrimary, textAlign: 'center' },
    setupSubtitle: { fontSize: Typography.sm, color: Colors.textSecondary, textAlign: 'center' },
    countList: { gap: Spacing.md },
    countCard: {
      backgroundColor: Colors.card, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.base,
    },
    countCardActive: { borderColor: Colors.primary, borderWidth: 1.5, backgroundColor: Colors.primaryMuted },
    countLeft: { gap: 4 },
    countLabel: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
    countLabelActive: { color: Colors.primary },
    countDesc: { fontSize: Typography.xs, color: Colors.textSecondary },
    countRadio: {
      width: 22, height: 22, borderRadius: Radius.full, borderWidth: 2, borderColor: Colors.border,
      alignItems: 'center', justifyContent: 'center',
    },
    countRadioActive: { borderColor: Colors.primary },
    countRadioInner: { width: 12, height: 12, borderRadius: Radius.full, backgroundColor: Colors.primary },
    startButton: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
      backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: Spacing.md,
    },
    startButtonDisabled: { opacity: 0.4 },
    startButtonText: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textInverse },
  
    // Session
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: Spacing.base, paddingTop: Spacing.xl + 32, paddingBottom: Spacing.md,
    },
    headerTitle: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary },
    progressRow: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
      paddingHorizontal: Spacing.base, paddingBottom: Spacing.md,
    },
    progressBarTrack: {
      flex: 1, height: 4, borderRadius: Radius.full,
      backgroundColor: Colors.progressTrack, overflow: 'hidden',
    },
    progressBarFill: { height: 4, borderRadius: Radius.full, backgroundColor: Colors.progressFill },
    progressCount: { fontSize: Typography.xs, color: Colors.textMuted },
    container: { flexGrow: 1, paddingHorizontal: Spacing.base, paddingBottom: Spacing.xxxl, gap: Spacing.md },
    promptCard: { backgroundColor: Colors.primaryMuted, borderRadius: Radius.lg, padding: Spacing.md },
    promptText: { fontSize: Typography.base, color: Colors.primary, lineHeight: Typography.base * 1.4 },
    modeToggle: {
      flexDirection: 'row', gap: 4, backgroundColor: Colors.cardElevated,
      borderRadius: Radius.full, padding: 4,
    },
    modeBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs,
      paddingVertical: Spacing.sm, borderRadius: Radius.full,
    },
    modeBtnActive: { backgroundColor: Colors.primary },
    modeBtnText: { fontSize: Typography.sm, color: Colors.textSecondary, fontWeight: Typography.medium },
    modeBtnTextActive: { color: '#fff' },
    textArea: {
      flex: 1, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.primaryBorder,
      borderRadius: Radius.lg, padding: Spacing.md, fontSize: Typography.base, color: Colors.textPrimary,
      minHeight: 140,
    },
    voiceStage: {
      flex: 1, minHeight: 280, alignItems: 'center', justifyContent: 'center', gap: Spacing.md,
    },
    recordBtn: { width: 88, height: 88, borderRadius: Radius.full, backgroundColor: Colors.primaryMuted, alignItems: 'center', justifyContent: 'center' },
    recordingPulse: { width: 64, height: 64, borderRadius: Radius.full, backgroundColor: Colors.error, alignItems: 'center', justifyContent: 'center' },
    recordingTimer: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary },
    voiceHint: { fontSize: Typography.sm, color: Colors.textMuted },
    stopBtn: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.error,
      borderRadius: Radius.full, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg,
    },
    stopBtnText: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: '#fff' },
    reviewLabel: { fontSize: Typography.sm, color: Colors.textSecondary },
    reRecordBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'center' },
    reRecordText: { fontSize: Typography.sm, color: Colors.textSecondary },
    resultCard: { borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.sm },
    resultBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
      backgroundColor: Colors.card, borderRadius: Radius.full,
      paddingVertical: 6, paddingHorizontal: Spacing.md,
    },
    resultBadgeText: { fontSize: Typography.xs, fontWeight: Typography.bold, letterSpacing: 0.5, textTransform: 'uppercase' },
    resultFeedback: { fontSize: Typography.sm, color: Colors.textPrimary, lineHeight: Typography.sm * 1.5 },
    pointersLabel: { fontSize: Typography.xs, fontWeight: Typography.bold, color: Colors.textSecondary, letterSpacing: 0.5, textTransform: 'uppercase' },
    pointerRow: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
      backgroundColor: Colors.warningMuted, borderRadius: Radius.full,
      paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
    },
    pointerRowText: { flex: 1, fontSize: Typography.sm, color: Colors.textPrimary },
    answerToggle: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
      borderRadius: Radius.lg, paddingVertical: Spacing.md, paddingHorizontal: Spacing.base,
    },
    answerToggleText: { fontSize: Typography.base, color: Colors.textSecondary, fontWeight: Typography.medium },
    answerText: {
      fontSize: Typography.sm, color: Colors.textPrimary, lineHeight: Typography.sm * 1.5,
      backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
      borderRadius: Radius.lg, padding: Spacing.base,
    },
    submitBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs,
      backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: Spacing.md,
    },
    submitBtnText: { fontSize: Typography.base, fontWeight: Typography.semibold, color: '#fff' },
  })