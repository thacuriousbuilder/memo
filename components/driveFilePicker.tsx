// components/DriveFilePicker.tsx

import {
    View, Text, TouchableOpacity, StyleSheet,
    Modal, FlatList, ActivityIndicator, Alert
  } from 'react-native'
  import { Ionicons }        from '@expo/vector-icons'
  import { useGoogleDrive, DriveFile } from '@/hooks/useGoogleDrive'
  import { Colors, Spacing, Radius, Typography, CardBase } from '@/constants/theme'
  import { useEffect } from 'react'
  
  // ─────────────────────────────────────────
  // FILE ICON
  // ─────────────────────────────────────────
  function FileIcon({ mimeType }: { mimeType: string }) {
    const isPdf  = mimeType.includes('pdf')
    const isDoc  = mimeType.includes('document') || mimeType.includes('docx')
    const icon   = isPdf ? 'document-text' : isDoc ? 'document' : 'document-outline'
    const color  = isPdf ? Colors.error : Colors.primary
  
    return (
      <View style={[styles.fileIcon, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
    )
  }
  
  // ─────────────────────────────────────────
  // FILE ROW
  // ─────────────────────────────────────────
  function FileRow({
    file,
    onSelect,
  }: {
    file:     DriveFile
    onSelect: (file: DriveFile) => void
  }) {
    const isGoogleDoc = file.mimeType === 'application/vnd.google-apps.document'
    const sizeKb      = file.size
      ? `${Math.round(parseInt(file.size) / 1024)} KB`
      : isGoogleDoc ? 'Google Doc' : ''
  
    return (
      <TouchableOpacity
        style={styles.fileRow}
        onPress={() => onSelect(file)}
        activeOpacity={0.8}
      >
        <FileIcon mimeType={file.mimeType} />
        <View style={styles.fileInfo}>
          <Text style={styles.fileName} numberOfLines={1}>
            {file.name}
          </Text>
          {sizeKb ? (
            <Text style={styles.fileMeta}>{sizeKb}</Text>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
      </TouchableOpacity>
    )
  }
  
  // ─────────────────────────────────────────
  // MAIN COMPONENT
  // ─────────────────────────────────────────
  interface Props {
    visible:  boolean
    onClose:  () => void
    onSelect: (file: {
      uri:      string
      name:     string
      mimeType: string
    }) => void
  }
  
  export default function DriveFilePicker({
    visible, onClose, onSelect
  }: Props) {
    const {
        isSignedIn,
        files,
        loading,
        error,
        signIn,
        signOut,
        downloadFile,
        loadExistingToken,
      } = useGoogleDrive()
  
    const handleSelect = async (file: DriveFile) => {
      const result = await downloadFile(file)
      if (!result) {
        Alert.alert('Error', 'Failed to download file from Drive.')
        return
      }
      onSelect(result)
      onClose()
    }
    
    useEffect(() => {
        if (visible) {
          loadExistingToken()
        }
      }, [visible])
    return (
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <TouchableOpacity
            style={styles.backdrop}
            onPress={onClose}
            activeOpacity={1}
          />
          <View style={styles.sheet}>
            <View style={styles.handle} />
  
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.driveIcon}>
                  <Text style={{ fontSize: 18 }}>🟢</Text>
                </View>
                <Text style={styles.headerTitle}>Google Drive</Text>
              </View>
              <View style={styles.headerRight}>
                {isSignedIn && (
                  <TouchableOpacity
                    onPress={signOut}
                    style={styles.signOutBtn}
                  >
                    <Text style={styles.signOutText}>Sign out</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={onClose}
                >
                  <Ionicons name="close" size={18} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
  
            {/* Content */}
            {!isSignedIn ? (
              // Sign in prompt
              <View style={styles.signInPrompt}>
                <Text style={{ fontSize: 48, marginBottom: Spacing.md }}>
                  🟢
                </Text>
                <Text style={styles.signInTitle}>
                  Connect Google Drive
                </Text>
                <Text style={styles.signInSub}>
                  Import PDFs, Word docs, and Google Docs directly from your Drive.
                </Text>
                <TouchableOpacity
                  style={styles.signInButton}
                  onPress={signIn}
                  activeOpacity={0.8}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.signInButtonText}>
                      Connect Google Drive
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : loading ? (
              // Loading files
              <View style={styles.center}>
                <ActivityIndicator color={Colors.primary} size="large" />
                <Text style={styles.loadingText}>
                  Loading your files...
                </Text>
              </View>
            ) : error ? (
              // Error
              <View style={styles.center}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity
                  style={styles.retryBtn}
                  onPress={signIn}
                >
                  <Text style={styles.retryText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            ) : files.length === 0 ? (
              // Empty
              <View style={styles.center}>
                <Ionicons
                  name="folder-open-outline"
                  size={48}
                  color={Colors.textMuted}
                />
                <Text style={styles.emptyText}>
                  No compatible files found
                </Text>
                <Text style={styles.emptySubText}>
                  PDF, DOCX, TXT, and Google Docs are supported
                </Text>
              </View>
            ) : (
              // File list
              <FlatList
                data={files}
                keyExtractor={f => f.id}
                style={styles.list}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => (
                  <View style={styles.separator} />
                )}
                renderItem={({ item }) => (
                  <FileRow
                    file={item}
                    onSelect={handleSelect}
                  />
                )}
              />
            )}
          </View>
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
      paddingBottom:        Spacing.xxxl,
      maxHeight:            '85%',
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
  
    // Header
    header: {
      flexDirection:     'row',
      alignItems:        'center',
      justifyContent:    'space-between',
      paddingHorizontal: Spacing.lg,
      marginBottom:      Spacing.md,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems:    'center',
      gap:           Spacing.sm,
    },
    driveIcon: {
      width:           36,
      height:          36,
      borderRadius:    Radius.md,
      backgroundColor: Colors.cardElevated,
      alignItems:      'center',
      justifyContent:  'center',
    },
    headerTitle: {
      fontSize:   Typography.lg,
      fontWeight: Typography.bold,
      color:      Colors.textPrimary,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems:    'center',
      gap:           Spacing.sm,
    },
    signOutBtn: {
      paddingVertical:   4,
      paddingHorizontal: Spacing.sm,
    },
    signOutText: {
      fontSize: Typography.xs,
      color:    Colors.textMuted,
    },
    closeBtn: {
      width:           32,
      height:          32,
      borderRadius:    Radius.full,
      backgroundColor: Colors.cardElevated,
      alignItems:      'center',
      justifyContent:  'center',
    },
  
    // Sign in
    signInPrompt: {
      alignItems:        'center',
      paddingHorizontal: Spacing.xl,
      paddingVertical:   Spacing.xl,
      gap:               Spacing.md,
    },
    signInTitle: {
      fontSize:   Typography.xl,
      fontWeight: Typography.bold,
      color:      Colors.textPrimary,
      textAlign:  'center',
    },
    signInSub: {
      fontSize:   Typography.sm,
      color:      Colors.textSecondary,
      textAlign:  'center',
      lineHeight: Typography.sm * 1.6,
    },
    signInButton: {
      backgroundColor:   Colors.primary,
      borderRadius:      Radius.md,
      paddingVertical:   Spacing.md,
      paddingHorizontal: Spacing.xl,
      marginTop:         Spacing.sm,
      minWidth:          200,
      alignItems:        'center',
    },
    signInButtonText: {
      fontSize:   Typography.base,
      fontWeight: Typography.semibold,
      color:      '#fff',
    },
  
    // States
    center: {
      alignItems:   'center',
      paddingVertical: Spacing.xxxl,
      gap:          Spacing.md,
      paddingHorizontal: Spacing.xl,
    },
    loadingText: {
      fontSize: Typography.sm,
      color:    Colors.textSecondary,
    },
    errorText: {
      fontSize:  Typography.sm,
      color:     Colors.error,
      textAlign: 'center',
    },
    retryBtn: {
      paddingVertical:   Spacing.sm,
      paddingHorizontal: Spacing.lg,
      backgroundColor:   Colors.card,
      borderRadius:      Radius.md,
      borderWidth:       1,
      borderColor:       Colors.border,
    },
    retryText: {
      fontSize: Typography.sm,
      color:    Colors.primary,
    },
    emptyText: {
      fontSize:   Typography.base,
      fontWeight: Typography.medium,
      color:      Colors.textSecondary,
      textAlign:  'center',
    },
    emptySubText: {
      fontSize:  Typography.sm,
      color:     Colors.textMuted,
      textAlign: 'center',
    },
  
    // File list
    list:        { maxHeight: 400 },
    listContent: { paddingHorizontal: Spacing.base },
    fileRow: {
      flexDirection:   'row',
      alignItems:      'center',
      paddingVertical: Spacing.md,
      gap:             Spacing.md,
    },
    fileIcon: {
      width:          40,
      height:         40,
      borderRadius:   Radius.md,
      alignItems:     'center',
      justifyContent: 'center',
    },
    fileInfo:  { flex: 1 },
    fileName: {
      fontSize:   Typography.base,
      fontWeight: Typography.medium,
      color:      Colors.textPrimary,
    },
    fileMeta: {
      fontSize:  Typography.xs,
      color:     Colors.textMuted,
      marginTop: 2,
    },
    separator: {
      height:          1,
      backgroundColor: Colors.border + '66',
    },
  })