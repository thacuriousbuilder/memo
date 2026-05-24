
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, Modal, Alert, KeyboardAvoidingView, Platform
  } from 'react-native'
  import { useState } from 'react'
  import * as DocumentPicker from 'expo-document-picker'
  import { Ionicons } from '@expo/vector-icons'
  import { Colors, Spacing, Radius, Typography } from '@/constants/theme'
  
  interface Props {
    visible:   boolean
    onClose:   () => void
    onCreate:  (lesson: { name: string; files: any[] }) => void
  }
  
  function StepBar({ step }: { step: 1 | 2 }) {
    return (
      <View style={styles.stepBar}>
        <View style={[styles.stepSegment, styles.stepActive]} />
        <View style={[styles.stepSegment, step === 2 && styles.stepActive]} />
      </View>
    )
  }
  
  export default function NewLessonModal({ visible, onClose, onCreate }: Props) {
    const [step,    setStep]    = useState<1 | 2>(1)
    const [name,    setName]    = useState('')
    const [files,   setFiles]   = useState<any[]>([])
    const [loading, setLoading] = useState(false)
  
    const reset = () => {
      setStep(1)
      setName('')
      setFiles([])
    }
  
    const handleClose = () => { reset(); onClose() }
  
    const handleNext = () => {
      if (!name.trim()) {
        Alert.alert('Required', 'Please enter a lesson name.')
        return
      }
      setStep(2)
    }
  
    const handleUpload = async () => {
      try {
        const result = await DocumentPicker.getDocumentAsync({
          type: [
            'application/pdf',
            'text/plain',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          ],
          multiple: true,
        })
        if (!result.canceled) {
          setFiles(prev => [...prev, ...result.assets])
        }
      } catch {
        Alert.alert('Upload Failed', 'Could not pick file.')
      }
    }
  
    const handleCreate = async (skip = false) => {
      try {
        setLoading(true)
        await onCreate({ name, files: skip ? [] : files })
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
                <Text style={styles.headerTitle}>
                  {step === 1 ? 'New Lesson' : 'Upload Materials'}
                </Text>
                <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                  <Ionicons name="close" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
  
              <StepBar step={step} />
  
              <View style={styles.content}>
                {/* ─── STEP 1 ─── */}
                {step === 1 && (
                  <>
                    <Text style={styles.label}>Lesson Name</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., Introduction to Cells"
                      placeholderTextColor={Colors.textMuted}
                      value={name}
                      onChangeText={setName}
                      autoFocus
                    />
                    <Text style={styles.hint}>
                      Give your lesson a descriptive name that reflects the topic.
                    </Text>
                  </>
                )}
  
                {/* ─── STEP 2 ─── */}
                {step === 2 && (
                  <>
                    {/* Lesson preview */}
                    <View style={styles.previewRow}>
                      <View style={styles.previewIcon}>
                        <Ionicons name="book-outline" size={18} color={Colors.primary} />
                      </View>
                      <Text style={styles.previewName}>{name}</Text>
                    </View>
  
                    {/* Upload Zone */}
                    <TouchableOpacity
                      style={styles.dropzone}
                      onPress={handleUpload}
                      activeOpacity={0.8}
                    >
                      <View style={styles.uploadIconWrapper}>
                        <Ionicons name="share-outline" size={22} color={Colors.primary} />
                      </View>
                      <Text style={styles.dropzoneTitle}>Upload study materials</Text>
                      <Text style={styles.dropzoneSubtitle}>
                        PDF, DOCX, TXT, or drag and drop
                      </Text>
                    </TouchableOpacity>
  
                    {/* Uploaded files */}
                    {files.length > 0 && (
                      <View style={styles.fileList}>
                        {files.map((file, i) => (
                          <View key={i} style={styles.fileRow}>
                            <Ionicons
                              name="document-text-outline"
                              size={16}
                              color={Colors.primary}
                            />
                            <Text style={styles.fileName} numberOfLines={1}>
                              {file.name}
                            </Text>
                            <TouchableOpacity
                              onPress={() =>
                                setFiles(prev => prev.filter((_, idx) => idx !== i))
                              }
                            >
                              <Ionicons
                                name="close-circle"
                                size={16}
                                color={Colors.error}
                              />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )}
  
                    <Text style={styles.hint}>
                      Upload your notes, slides, or textbook excerpts. MEMO will
                      generate personalized quizzes from your materials.
                    </Text>
                  </>
                )}
              </View>
  
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
                      onPress={() => handleCreate(files.length === 0)}
                      disabled={loading}
                    >
                      <Text style={styles.primaryText}>
                        {files.length > 0 ? 'Create Lesson' : 'Skip & Create'}
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
      paddingBottom:        Spacing.xxxl,
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
    stepActive: { backgroundColor: Colors.primary },
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
      borderColor:       Colors.primary,
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
    previewRow: {
      flexDirection:   'row',
      alignItems:      'center',
      gap:             Spacing.md,
      backgroundColor: Colors.primaryMuted,
      borderRadius:    Radius.md,
      padding:         Spacing.md,
      borderWidth:     1,
      borderColor:     Colors.primaryBorder,
    },
    previewIcon: {
      width:           36,
      height:          36,
      borderRadius:    Radius.md,
      backgroundColor: Colors.primary,
      alignItems:      'center',
      justifyContent:  'center',
    },
    previewName: {
      fontSize:   Typography.base,
      fontWeight: Typography.semibold,
      color:      Colors.textPrimary,
      flex:       1,
    },
    dropzone: {
      borderWidth:     1,
      borderColor:     Colors.border,
      borderStyle:     'dashed',
      borderRadius:    Radius.lg,
      paddingVertical: Spacing.xl,
      alignItems:      'center',
      gap:             Spacing.sm,
    },
    uploadIconWrapper: {
      width:           48,
      height:          48,
      borderRadius:    Radius.full,
      backgroundColor: Colors.primaryMuted,
      alignItems:      'center',
      justifyContent:  'center',
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
    fileList: { gap: Spacing.xs },
    fileRow: {
      flexDirection:   'row',
      alignItems:      'center',
      gap:             Spacing.sm,
      backgroundColor: Colors.cardElevated,
      padding:         Spacing.sm,
      borderRadius:    Radius.md,
    },
    fileName: {
      flex:     1,
      fontSize: Typography.xs,
      color:    Colors.textPrimary,
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