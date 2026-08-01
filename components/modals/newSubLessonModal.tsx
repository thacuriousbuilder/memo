

import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, Modal, Alert, KeyboardAvoidingView, Platform
  } from 'react-native'
  import { useState } from 'react'
  import { Ionicons } from '@expo/vector-icons'
  import { Colors, Spacing, Radius, Typography } from '@/constants/theme'
  
  interface Props {
    visible:   boolean
    onClose:   () => void
    onCreate:  (name: string) => void
  }
  
  export default function NewSubLessonModal({ visible, onClose, onCreate }: Props) {
    const [name,    setName]    = useState('')
    const [loading, setLoading] = useState(false)
  
    const reset = () => setName('')
  
    const handleClose = () => { reset(); onClose() }
  
    const handleCreate = async () => {
      if (!name.trim()) {
        Alert.alert('Required', 'Please enter a sub-lesson name.')
        return
      }
      try {
        setLoading(true)
        await onCreate(name)
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
                <Text style={styles.headerTitle}>New Sub-lesson</Text>
                <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                  <Ionicons name="close" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
  
              <View style={styles.content}>
                <Text style={styles.label}>Sub-lesson Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Confidentiality, Integrity"
                  placeholderTextColor={Colors.textMuted}
                  value={name}
                  onChangeText={setName}
                />
                <Text style={styles.hint}>
                  Sub-lessons help break down complex topics into smaller,
                  focused study sessions.
                </Text>
              </View>
  
              {/* Footer */}
              <View style={styles.footer}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleClose}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryButton, loading && { opacity: 0.6 }]}
                  onPress={handleCreate}
                  disabled={loading}
                >
                  <Text style={styles.primaryText}>
                    {loading ? 'Creating...' : 'Create Sub-lesson'}
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
    hint: {
      fontSize: Typography.xs,
      color:    Colors.textSecondary,
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