

import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    Modal, ScrollView, Alert, KeyboardAvoidingView, Platform
  } from 'react-native'
  import { useState } from 'react'
  import { Ionicons } from '@expo/vector-icons'
  import { Colors, Spacing, Radius, Typography } from '@/constants/theme'
  
  // ─────────────────────────────────────────
  // CONSTANTS
  // ─────────────────────────────────────────
  const ICONS = [
    '📚', '🧬', '🌍', '📐', '🧪', '💻', '🎨', '📊',
    '🔬', '📖', '🧮', '🌿', '⚖️', '🎵', '🏛️', '💡',
  ]
  
  const COLORS = [
    '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B',
    '#EF4444', '#EC4899', '#3B82F6', '#6366F1',
  ]
  
  interface Props {
    visible:  boolean
    onClose:  () => void
    onCreate: (course: {
      name:        string
      description: string
      semester:    string
      emoji:       string
      color:       string
    }) => void
  }
  
  // ─────────────────────────────────────────
  // STEP BAR
  // ─────────────────────────────────────────
  function StepBar({ step }: { step: 1 | 2 }) {
    return (
      <View style={styles.stepBar}>
        <View style={[styles.stepSegment, styles.stepActive]} />
        <View style={[styles.stepSegment, step === 2 && styles.stepActive]} />
      </View>
    )
  }
  
  // ─────────────────────────────────────────
  // MODAL COMPONENT
  // ─────────────────────────────────────────
  export default function NewCourseModal({ visible, onClose, onCreate }: Props) {
    const [step,        setStep]        = useState<1 | 2>(1)
    const [name,        setName]        = useState('')
    const [description, setDescription] = useState('')
    const [semester,    setSemester]    = useState('')
    const [icon,        setIcon]        = useState('📚')
    const [color,       setColor]       = useState(COLORS[0])
    const [loading,     setLoading]     = useState(false)
  
    const reset = () => {
      setStep(1)
      setName('')
      setDescription('')
      setSemester('')
      setIcon('📚')
      setColor(COLORS[0])
    }
  
    const handleClose = () => {
      reset()
      onClose()
    }
  
    const handleNext = () => {
      if (!name.trim()) {
        Alert.alert('Required', 'Please enter a course name.')
        return
      }
      setStep(2)
    }
  
    const handleCreate = async () => {
      try {
        setLoading(true)
        await onCreate({ name, description, semester, emoji: icon, color })
        reset()
        onClose()
      } catch (err: any) {
        Alert.alert('Error', err.message)
      } finally {
        setLoading(false)
      }
    }
  
    return (
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={handleClose}
      >
        <View style={styles.overlay}>
          {/* Backdrop */}
          <TouchableOpacity
            style={styles.backdrop}
            onPress={handleClose}
            activeOpacity={1}
          />
  
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.sheet}>
              {/* Handle */}
              <View style={styles.handle} />
  
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.headerTitle}>
                  {step === 1 ? 'New Course' : 'Customize Course'}
                </Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleClose}
                >
                  <Ionicons name="close" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
  
              <StepBar step={step} />
  
              <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* ─── STEP 1 ─── */}
                {step === 1 && (
                  <>
                    <View style={styles.field}>
                      <Text style={styles.label}>Course Name</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="e.g., Biology 101"
                        placeholderTextColor={Colors.textMuted}
                        value={name}
                        onChangeText={setName}
                      />
                    </View>
  
                    <View style={styles.field}>
                      <Text style={styles.label}>Description</Text>
                      <TextInput
                        style={[styles.input, styles.textarea]}
                        placeholder="What will you learn in this course?"
                        placeholderTextColor={Colors.textMuted}
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                      />
                    </View>
  
                    <View style={styles.field}>
                      <Text style={styles.label}>
                        Group by{' '}
                        <Text style={styles.optional}>(Optional)</Text>
                      </Text>
                      <TextInput
                        style={styles.input}
                        placeholder="e.g., Fall 2024"
                        placeholderTextColor={Colors.textMuted}
                        value={semester}
                        onChangeText={setSemester}
                      />
                    </View>
                  </>
                )}
  
                {/* ─── STEP 2 ─── */}
                {step === 2 && (
                  <>
                    {/* Preview */}
                    <View style={styles.previewCard}>
                      <View style={[styles.previewAccent, { backgroundColor: color }]} />
                      <Text style={styles.previewEmoji}>{icon}</Text>
                      <View style={styles.previewInfo}>
                        <Text style={styles.previewName} numberOfLines={1}>
                          {name}
                        </Text>
                        <Text style={styles.previewDesc} numberOfLines={1}>
                          {description || 'No description'}
                        </Text>
                      </View>
                    </View>
  
                    {/* Icon Picker */}
                    <View style={styles.field}>
                      <Text style={styles.label}>Choose an Icon</Text>
                      <View style={styles.iconGrid}>
                        {ICONS.map((emoji) => (
                          <TouchableOpacity
                            key={emoji}
                            style={[
                              styles.iconCell,
                              icon === emoji && styles.iconCellActive,
                            ]}
                            onPress={() => setIcon(emoji)}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.iconEmoji}>{emoji}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
  
                    {/* Color Picker */}
                    <View style={styles.field}>
                      <Text style={styles.label}>Choose a Color</Text>
                      <View style={styles.colorRow}>
                        {COLORS.map((c) => (
                          <TouchableOpacity
                            key={c}
                            style={[
                              styles.colorDot,
                              { backgroundColor: c },
                              color === c && styles.colorDotActive,
                            ]}
                            onPress={() => setColor(c)}
                            activeOpacity={0.8}
                          />
                        ))}
                      </View>
                    </View>
                  </>
                )}
              </ScrollView>
  
              {/* Footer */}
              <View style={styles.footer}>
                {step === 1 ? (
                  <>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={handleClose}
                    >
                      <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.primaryButton}
                      onPress={handleNext}
                    >
                      <Text style={styles.primaryText}>Next</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => setStep(1)}
                    >
                      <Text style={styles.cancelText}>Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.primaryButton, loading && { opacity: 0.6 }]}
                      onPress={handleCreate}
                      disabled={loading}
                    >
                      <Text style={styles.primaryText}>
                        {loading ? 'Creating...' : 'Create Course'}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    )
  }
  
  // ─────────────────────────────────────────
  // STYLES
  // ─────────────────────────────────────────
  const styles = StyleSheet.create({
    overlay: {
      flex:           1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.6)',
    },
    sheet: {
      backgroundColor:      Colors.card,
      borderTopLeftRadius:  Radius.xxl,
      borderTopRightRadius: Radius.xxl,
      paddingBottom:        Spacing.lg,
      maxHeight:            '92%',
    },
    handle: {
      width:           40,
      height:          4,
      backgroundColor: Colors.border,
      borderRadius:    Radius.full,
      alignSelf:       'center',
      marginTop:       Spacing.sm,
      marginBottom:    Spacing.md,
    },
    header: {
      flexDirection:     'row',
      justifyContent:    'space-between',
      alignItems:        'center',
      paddingHorizontal: Spacing.lg,
      marginBottom:      Spacing.md,
    },
    headerTitle: {
      fontSize:   Typography.lg,
      fontWeight: Typography.bold,
      color:      Colors.textPrimary,
    },
    closeButton: {
      width:           32,
      height:          32,
      borderRadius:    Radius.full,
      backgroundColor: Colors.cardElevated,
      alignItems:      'center',
      justifyContent:  'center',
    },
    stepBar: {
      flexDirection:     'row',
      gap:               Spacing.sm,
      paddingHorizontal: Spacing.lg,
      marginBottom:      Spacing.lg,
    },
    stepSegment: {
      flex:            1,
      height:          3,
      borderRadius:    Radius.full,
      backgroundColor: Colors.border,
    },
    stepActive:      { backgroundColor: Colors.primary },
    content: {
      paddingHorizontal: Spacing.lg,
      gap:               Spacing.md,
      paddingBottom:     Spacing.lg,
    },
    field:    { gap: Spacing.xs },
    label: {
      fontSize:   Typography.sm,
      fontWeight: Typography.medium,
      color:      Colors.textPrimary,
    },
    optional: {
      color:      Colors.textMuted,
      fontWeight: Typography.regular,
    },
    input: {
      backgroundColor:   Colors.cardElevated,
      borderWidth:       1,
      borderColor:       Colors.border,
      borderRadius:      Radius.md,
      paddingVertical:   Spacing.md,
      paddingHorizontal: Spacing.md,
      fontSize:          Typography.base,
      color:             Colors.textPrimary,
    },
    textarea: {
      minHeight:  100,
      paddingTop: Spacing.md,
    },
    previewCard: {
      backgroundColor: Colors.cardElevated,
      borderRadius:    Radius.lg,
      borderWidth:     1,
      borderColor:     Colors.border,
      flexDirection:   'row',
      alignItems:      'center',
      padding:         Spacing.md,
      gap:             Spacing.md,
      overflow:        'hidden',
      marginBottom:    Spacing.sm,
    },
    previewAccent: {
      position: 'absolute',
      left:     0, top: 0, bottom: 0,
      width:    4,
    },
    previewEmoji:  { fontSize: 28, marginLeft: Spacing.sm },
    previewInfo:   { flex: 1 },
    previewName: {
      fontSize:   Typography.base,
      fontWeight: Typography.semibold,
      color:      Colors.textPrimary,
    },
    previewDesc: {
      fontSize:  Typography.xs,
      color:     Colors.textSecondary,
      marginTop: 2,
    },
    iconGrid: {
      flexDirection: 'row',
      flexWrap:      'wrap',
      gap:           Spacing.sm,
    },
    iconCell: {
      width:           52,
      height:          52,
      borderRadius:    Radius.md,
      backgroundColor: Colors.cardElevated,
      alignItems:      'center',
      justifyContent:  'center',
      borderWidth:     1,
      borderColor:     'transparent',
    },
    iconCellActive: {
      borderColor:     Colors.primary,
      backgroundColor: Colors.primaryMuted,
    },
    iconEmoji: { fontSize: 24 },
    colorRow: {
      flexDirection: 'row',
      gap:           Spacing.md,
      flexWrap:      'wrap',
    },
    colorDot: {
      width:        36,
      height:       36,
      borderRadius: Radius.full,
    },
    colorDotActive: {
      borderWidth: 3,
      borderColor: Colors.textPrimary,
    },
    footer: {
      flexDirection:     'row',
      gap:               Spacing.md,
      paddingHorizontal: Spacing.lg,
      paddingTop:        Spacing.md,
      borderTopWidth:    1,
      borderTopColor:    Colors.border,
    },
    cancelButton: {
      flex:            1,
      paddingVertical: Spacing.md,
      alignItems:      'center',
      backgroundColor: Colors.cardElevated,
      borderRadius:    Radius.md,
      borderWidth:     1,
      borderColor:     Colors.border,
    },
    cancelText: {
      fontSize:   Typography.base,
      fontWeight: Typography.medium,
      color:      Colors.textPrimary,
    },
    primaryButton: {
      flex:            1,
      paddingVertical: Spacing.md,
      alignItems:      'center',
      backgroundColor: Colors.primary,
      borderRadius:    Radius.md,
    },
    primaryText: {
      fontSize:   Typography.base,
      fontWeight: Typography.semibold,
      color:      Colors.textInverse,
    },
  })