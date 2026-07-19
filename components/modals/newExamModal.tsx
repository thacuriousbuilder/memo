

import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, Modal, Alert,
    KeyboardAvoidingView, Platform, ScrollView
  } from 'react-native'
  import { useState } from 'react'
  import { Ionicons } from '@expo/vector-icons'
  import { Colors, Spacing, Radius, Typography } from '@/constants/theme'
  
  // ─────────────────────────────────────────
  // EXAM TYPES
  // ─────────────────────────────────────────
  const EXAM_TYPES = [
    { value: 'quiz',       label: 'Quiz'       },
    { value: 'midterm',    label: 'Midterm'    },
    { value: 'final',      label: 'Final'      },
    { value: 'assignment', label: 'Assignment' },
    { value: 'test',       label: 'Test'       },
    { value: 'other',      label: 'Other'      },
  ]
  
  interface Props {
    visible:  boolean
    onClose:  () => void
    onCreate: (params: {
      title:    string
      examType: string
      examDate: string
      location?: string
      notes?:    string
    }) => Promise<void>
  }
  
  export default function NewExamModal({ visible, onClose, onCreate }: Props) {
    const [title,    setTitle]    = useState('')
    const [examType, setExamType] = useState('quiz')
    const [date,     setDate]     = useState('')
    const [location, setLocation] = useState('')
    const [notes,    setNotes]    = useState('')
    const [loading,  setLoading]  = useState(false)
  
    const reset = () => {
      setTitle('')
      setExamType('quiz')
      setDate('')
      setLocation('')
      setNotes('')
    }
  
    const handleClose = () => { reset(); onClose() }
  
    const handleCreate = async () => {
      if (!title.trim()) {
        Alert.alert('Required', 'Please enter a title.')
        return
      }
      if (!date.trim()) {
        Alert.alert('Required', 'Please enter a date.')
        return
      }
  
      // Validate date format YYYY-MM-DD
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!dateRegex.test(date.trim())) {
        Alert.alert('Invalid Date', 'Please use format YYYY-MM-DD (e.g. 2024-05-28)')
        return
      }
  
      try {
        setLoading(true)
        await onCreate({
          title:    title.trim(),
          examType,
          examDate: date.trim(),
          location: location.trim() || undefined,
          notes:    notes.trim()    || undefined,
        })
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
          <TouchableOpacity
            style={styles.backdrop}
            onPress={handleClose}
            activeOpacity={1}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.sheet}>
              <View style={styles.handle} />
  
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.headerTitle}>Add Test</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleClose}
                >
                  <Ionicons name="close" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
  
              <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Title */}
                <View style={styles.field}>
                  <Text style={styles.label}>Title</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Midterm Exam"
                    placeholderTextColor={Colors.textMuted}
                    value={title}
                    onChangeText={setTitle}
                  />
                </View>
  
                {/* Type */}
                <View style={styles.field}>
                  <Text style={styles.label}>Type</Text>
                  <View style={styles.typeGrid}>
                    {EXAM_TYPES.map(type => (
                      <TouchableOpacity
                        key={type.value}
                        style={[
                          styles.typeChip,
                          examType === type.value && styles.typeChipActive,
                        ]}
                        onPress={() => setExamType(type.value)}
                        activeOpacity={0.8}
                      >
                        <Text style={[
                          styles.typeChipText,
                          examType === type.value && styles.typeChipTextActive,
                        ]}>
                          {type.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
  
                {/* Date */}
                <View style={styles.field}>
                  <Text style={styles.label}>Date</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="YYYY-MM-DD (e.g. 2024-05-28)"
                    placeholderTextColor={Colors.textMuted}
                    value={date}
                    onChangeText={setDate}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
  
                {/* Location (optional) */}
                <View style={styles.field}>
                  <Text style={styles.label}>
                    Location{' '}
                    <Text style={styles.optional}>(Optional)</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Room 204"
                    placeholderTextColor={Colors.textMuted}
                    value={location}
                    onChangeText={setLocation}
                  />
                </View>
  
                {/* Notes (optional) */}
                <View style={styles.field}>
                  <Text style={styles.label}>
                    Notes{' '}
                    <Text style={styles.optional}>(Optional)</Text>
                  </Text>
                  <TextInput
                    style={[styles.input, styles.textarea]}
                    placeholder="e.g., Chapters 1-5, open book"
                    placeholderTextColor={Colors.textMuted}
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>
              </ScrollView>
  
              {/* Footer */}
              <View style={styles.footer}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleClose}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    loading && { opacity: 0.6 }
                  ]}
                  onPress={handleCreate}
                  disabled={loading}
                >
                  <Text style={styles.primaryText}>
                    {loading ? 'Adding...' : 'Add Test'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    )
  }
  
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
      maxHeight:            '90%',
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
    content: {
      paddingHorizontal: Spacing.lg,
      gap:               Spacing.md,
      paddingBottom:     Spacing.lg,
    },
    field: { gap: Spacing.xs },
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
      minHeight:  80,
      paddingTop: Spacing.md,
    },
    typeGrid: {
      flexDirection: 'row',
      flexWrap:      'wrap',
      gap:           Spacing.sm,
    },
    typeChip: {
      paddingVertical:   Spacing.sm,
      paddingHorizontal: Spacing.md,
      borderRadius:      Radius.full,
      backgroundColor:   Colors.cardElevated,
      borderWidth:       1,
      borderColor:       Colors.border,
    },
    typeChipActive: {
      backgroundColor: Colors.primaryMuted,
      borderColor:     Colors.primary,
    },
    typeChipText: {
      fontSize:   Typography.sm,
      color:      Colors.textSecondary,
      fontWeight: Typography.medium,
    },
    typeChipTextActive: {
      color: Colors.primary,
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
      color:      '#fff',
    },
  })