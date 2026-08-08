

import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Modal, ActivityIndicator,
  KeyboardAvoidingView, Platform
} from 'react-native'
import { useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { Colors, Spacing, Radius, Typography } from '@/constants/theme'

interface Props {
  visible:     boolean
  courseTitle: string
  onCancel:    () => void
  onConfirm:   () => Promise<void>
}

export default function DeleteCourseModal({
  visible, courseTitle, onCancel, onConfirm
}: Props) {
  const [input,    setInput]    = useState('')
  const [deleting, setDeleting] = useState(false)

  const canDelete = input.trim() === courseTitle.trim() && !deleting

  const reset = () => setInput('')

  const handleCancel = () => { reset(); onCancel() }

  const handleConfirm = async () => {
    if (!canDelete) return
    setDeleting(true)
    try {
      await onConfirm()
      reset()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          onPress={handleCancel}
          activeOpacity={1}
          disabled={deleting}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.sheet}>
            <View style={styles.handle} />

            <View style={styles.header}>
              <Text style={styles.headerTitle}>Delete Subject</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleCancel}
                disabled={deleting}
              >
                <Ionicons name="close" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.content}>
              <Text style={styles.message}>
                Delete "{courseTitle}"? This will permanently remove all lessons, notes, and questions.
              </Text>
              <Text style={styles.label}>Type "{courseTitle}" to confirm</Text>
              <TextInput
                style={styles.input}
                placeholder={courseTitle}
                placeholderTextColor={Colors.textMuted}
                value={input}
                onChangeText={setInput}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!deleting}
              />
            </View>

            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
                disabled={deleting}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteButton, !canDelete && styles.deleteButtonDisabled]}
                onPress={handleConfirm}
                disabled={!canDelete}
              >
                {deleting
                  ? <ActivityIndicator color={Colors.textInverse} />
                  : <Text style={styles.deleteText}>Delete</Text>}
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
    marginBottom:      Spacing.lg,
  },
  headerTitle: {
    fontSize:   Typography.lg,
    fontWeight: Typography.bold,
    color:      Colors.error,
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
  message: {
    fontSize:   Typography.sm,
    color:      Colors.textSecondary,
    lineHeight: Typography.sm * 1.5,
  },
  label: {
    fontSize:   Typography.sm,
    fontWeight: Typography.medium,
    color:      Colors.textPrimary,
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
  deleteButton: {
    flex:            1,
    paddingVertical: Spacing.md,
    alignItems:      'center',
    backgroundColor: Colors.error,
    borderRadius:    Radius.md,
  },
  deleteButtonDisabled: {
    opacity: 0.4,
  },
  deleteText: {
    fontSize:   Typography.base,
    fontWeight: Typography.semibold,
    color:      Colors.textInverse,
  },
})
