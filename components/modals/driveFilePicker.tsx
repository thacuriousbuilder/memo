

import {
  View, Text, TouchableOpacity, StyleSheet,
  Modal, FlatList, ActivityIndicator, Alert, ScrollView
} from 'react-native'
import { useEffect, useState }  from 'react'
import { Ionicons }             from '@expo/vector-icons'
import { Colors, Spacing, Radius, Typography } from '@/constants/theme'
import { useGoogleDrive, DriveFile } from '@/hooks/useGoogleDrive'
import { fetchDocTabs, flattenTabs, FlatDocTab } from '@/lib/googleDocs'

// ─────────────────────────────────────────
// FILE ICON
// ─────────────────────────────────────────
function FileIcon({ file }: { file: DriveFile }) {
  if (file.isFolder) {
    return (
      <View style={[styles.fileIcon, { backgroundColor: Colors.warning + '22' }]}>
        <Ionicons name="folder" size={20} color={Colors.warning} />
      </View>
    )
  }
  const isPdf = file.mimeType.includes('pdf')
  const color = isPdf ? Colors.error : Colors.primary
  return (
    <View style={[styles.fileIcon, { backgroundColor: color + '22' }]}>
      <Ionicons
        name={isPdf ? 'document-text' : 'document-outline'}
        size={20}
        color={color}
      />
    </View>
  )
}

// ─────────────────────────────────────────
// FILE ROW
// ─────────────────────────────────────────
function FileRow({
  file, multiple, isSelected, onPress,
}: {
  file:       DriveFile
  multiple:   boolean
  isSelected: boolean
  onPress:    (file: DriveFile) => void
}) {
  const isGDoc = file.mimeType === 'application/vnd.google-apps.document'
  const sizeKb = file.size
    ? `${Math.round(parseInt(file.size) / 1024)} KB`
    : isGDoc ? 'Google Doc' : file.isFolder ? 'Folder' : ''

  return (
    <TouchableOpacity style={styles.fileRow} onPress={() => onPress(file)} activeOpacity={0.8}>
      {multiple && !file.isFolder && (
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
        </View>
      )}
      <FileIcon file={file} />
      <View style={styles.fileInfo}>
        <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
        {!!sizeKb && <Text style={styles.fileMeta}>{sizeKb}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
    </TouchableOpacity>
  )
}

// ─────────────────────────────────────────
// TAB ROW (for tab-selection view)
// ─────────────────────────────────────────
function TabRow({
  tab, isSelected, onToggle,
}: {
  tab:        FlatDocTab
  isSelected: boolean
  onToggle:   (tabId: string) => void
}) {
  return (
    <TouchableOpacity
      style={[styles.fileRow, { paddingLeft: 12 + tab.depth * 20 }]}
      onPress={() => onToggle(tab.tabId)}
      activeOpacity={0.8}
    >
      <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
        {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
      </View>
      <Ionicons name="document-text-outline" size={18} color={Colors.textSecondary} />
      <View style={styles.fileInfo}>
        <Text style={styles.fileName} numberOfLines={1}>{tab.title}</Text>
      </View>
    </TouchableOpacity>
  )
}

// ─────────────────────────────────────────
// BREADCRUMB BAR
// ─────────────────────────────────────────
function BreadcrumbBar({
  breadcrumbs, onNavigate,
}: {
  breadcrumbs: { id: string; name: string }[]
  onNavigate:  (index: number) => void
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.breadcrumbBar}
      contentContainerStyle={styles.breadcrumbContent}
    >
      {breadcrumbs.map((crumb, idx) => (
        <View key={crumb.id} style={styles.breadcrumbItem}>
          <TouchableOpacity onPress={() => onNavigate(idx)}>
            <Text style={[
              styles.breadcrumbText,
              idx === breadcrumbs.length - 1 && styles.breadcrumbTextActive,
            ]}>
              {crumb.name}
            </Text>
          </TouchableOpacity>
          {idx < breadcrumbs.length - 1 && (
            <Ionicons name="chevron-forward" size={12} color={Colors.textMuted} style={{ marginHorizontal: 2 }} />
          )}
        </View>
      ))}
    </ScrollView>
  )
}

// ─────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────
interface Props {
  visible:           boolean
  onClose:           () => void
  multiple?:         boolean
  onSelect?:         (file: { uri: string; name: string; mimeType: string }) => void
  onSelectMultiple?: (files: { uri: string; name: string; mimeType: string }[]) => void
  onImportTabs?:     (tabs: { title: string; text: string }[]) => void
}

export default function DriveFilePicker({
  visible, onClose, multiple = false, onSelect, onSelectMultiple, onImportTabs,
}: Props) {
  const {
    isSignedIn, token, files, breadcrumbs, loading, error,
    signIn, signOut, downloadFile,
    checkExistingSession, navigateToFolder, navigateBack,
  } = useGoogleDrive()

  const [selected,       setSelected]       = useState<Map<string, DriveFile>>(new Map())
  const [importing,      setImporting]      = useState(false)
  const [checkingTabs,   setCheckingTabs]   = useState(false)

  const [tabPickerFile,  setTabPickerFile]  = useState<DriveFile | null>(null)
  const [docTabs,        setDocTabs]        = useState<FlatDocTab[]>([])
  const [selectedTabIds, setSelectedTabIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (visible) checkExistingSession()
  }, [visible])

  useEffect(() => {
    if (!visible) {
      setSelected(new Map())
      setTabPickerFile(null)
      setDocTabs([])
      setSelectedTabIds(new Set())
    }
  }, [visible])

  const isGDoc = (file: DriveFile) => file.mimeType === 'application/vnd.google-apps.document'

  const handleSelect = async (file: DriveFile) => {
    const result = await downloadFile(file)
    if (!result) {
      Alert.alert('Error', 'Failed to download file from Drive.')
      return
    }
    onSelect?.(result)
    onClose()
  }

  const handleToggle = (file: DriveFile) => {
    setSelected(prev => {
      const next = new Map(prev)
      if (next.has(file.id)) next.delete(file.id)
      else next.set(file.id, file)
      return next
    })
  }

  const handleFilePress = async (file: DriveFile) => {
    if (file.isFolder) { navigateToFolder(file); return }
    if (multiple) { handleToggle(file); return }

    // Tab-check path — only when the caller supports importing tabs
    if (onImportTabs && isGDoc(file) && token) {
      setCheckingTabs(true)
      try {
        const tabs = await fetchDocTabs(file.id, token)
        const flat = flattenTabs(tabs)
        if (flat.length > 1) {
          setDocTabs(flat)
          setSelectedTabIds(new Set(flat.map(t => t.tabId)))
          setTabPickerFile(file)
        } else {
          await handleSelect(file)
        }
      } catch (err: any) {
        // Fall back to normal single-file import if tab lookup fails
        await handleSelect(file)
      } finally {
        setCheckingTabs(false)
      }
      return
    }

    await handleSelect(file)
  }

  const handleImportSelected = async () => {
    setImporting(true)
    try {
      const results: { uri: string; name: string; mimeType: string }[] = []
      for (const file of selected.values()) {
        const result = await downloadFile(file)
        if (result) results.push(result)
      }
      if (results.length === 0) {
        Alert.alert('Error', 'Failed to download selected files.')
        return
      }
      onSelectMultiple?.(results)
      onClose()
    } finally {
      setImporting(false)
    }
  }

  const toggleTab = (tabId: string) => {
    setSelectedTabIds(prev => {
      const next = new Set(prev)
      if (next.has(tabId)) next.delete(tabId)
      else next.add(tabId)
      return next
    })
  }

  const handleImportTabs = () => {
    const selectedTabs = docTabs
      .filter(t => selectedTabIds.has(t.tabId))
      .map(t => ({ title: t.title, text: t.text }))
    onImportTabs?.(selectedTabs)
    onClose()
  }

  const canGoBack = breadcrumbs.length > 1

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {tabPickerFile ? (
                <TouchableOpacity onPress={() => setTabPickerFile(null)} hitSlop={{top:8,bottom:8,left:8,right:8}}>
                  <Ionicons name="chevron-back" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              ) : isSignedIn && canGoBack && (
                <TouchableOpacity onPress={() => navigateBack()} hitSlop={{top:8,bottom:8,left:8,right:8}}>
                  <Ionicons name="chevron-back" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              )}
              <View style={styles.driveIcon}>
                <Text style={{ fontSize: 18 }}>📂</Text>
              </View>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {tabPickerFile ? tabPickerFile.name : 'Google Drive'}
              </Text>
            </View>
            <View style={styles.headerRight}>
              {isSignedIn && !tabPickerFile && (
                <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
                  <Text style={styles.signOutText}>Sign out</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <Ionicons name="close" size={18} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Tab picker view */}
          {tabPickerFile ? (
            <>
              <Text style={styles.tabHint}>
                This doc has multiple tabs — pick which ones to import as sub-lessons.
              </Text>
              <FlatList
                data={docTabs}
                keyExtractor={t => t.tabId}
                style={[styles.list, { maxHeight: 320 }]}
                contentContainerStyle={[styles.listContent, { paddingBottom: 70 }]}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                renderItem={({ item }) => (
                  <TabRow
                    tab={item}
                    isSelected={selectedTabIds.has(item.tabId)}
                    onToggle={toggleTab}
                  />
                )}
              />
              <View style={styles.importBar}>
                <TouchableOpacity
                  style={[styles.importBtn, selectedTabIds.size === 0 && { opacity: 0.5 }]}
                  onPress={handleImportTabs}
                  disabled={selectedTabIds.size === 0}
                  activeOpacity={0.8}
                >
                  <Text style={styles.importBtnText}>
                    Import {selectedTabIds.size} tab{selectedTabIds.size !== 1 ? 's' : ''} as sub-lessons
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              {/* Breadcrumbs */}
              {isSignedIn && !error && (
                <BreadcrumbBar breadcrumbs={breadcrumbs} onNavigate={navigateBack} />
              )}

              {/* Content */}
              {!isSignedIn ? (
                <View style={styles.signInPrompt}>
                  <Text style={{ fontSize: 48, marginBottom: Spacing.md }}>📂</Text>
                  <Text style={styles.signInTitle}>Connect Google Drive</Text>
                  <Text style={styles.signInSub}>
                    Import PDFs, Word docs, and Google Docs directly from your Drive.
                  </Text>
                  <TouchableOpacity
                    style={[styles.signInButton, loading && { opacity: 0.6 }]}
                    onPress={signIn}
                    activeOpacity={0.8}
                    disabled={loading}
                  >
                    {loading
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={styles.signInButtonText}>Connect Google Drive</Text>}
                  </TouchableOpacity>
                </View>

              ) : loading || checkingTabs ? (
                <View style={styles.center}>
                  <ActivityIndicator color={Colors.primary} size="large" />
                  <Text style={styles.loadingText}>
                    {checkingTabs ? 'Checking document...' : 'Loading your files...'}
                  </Text>
                </View>

              ) : error ? (
                <View style={styles.center}>
                  <Ionicons name="warning-outline" size={32} color={Colors.error} />
                  <Text style={styles.errorText}>{error}</Text>
                  <TouchableOpacity style={styles.retryBtn} onPress={signIn}>
                    <Text style={styles.retryText}>Try Again</Text>
                  </TouchableOpacity>
                </View>

              ) : files.length === 0 ? (
                <View style={styles.center}>
                  <Ionicons name="folder-open-outline" size={48} color={Colors.textMuted} />
                  <Text style={styles.emptyText}>This folder is empty</Text>
                  <Text style={styles.emptySubText}>PDF, DOCX, TXT, and Google Docs supported</Text>
                </View>

              ) : (
                <FlatList
                  data={files}
                  keyExtractor={f => f.id}
                  style={styles.list}
                  contentContainerStyle={[styles.listContent, multiple && selected.size > 0 && { paddingBottom: 70 }]}
                  showsVerticalScrollIndicator={false}
                  ItemSeparatorComponent={() => <View style={styles.separator} />}
                  renderItem={({ item }) => (
                    <FileRow
                      file={item}
                      multiple={multiple}
                      isSelected={selected.has(item.id)}
                      onPress={handleFilePress}
                    />
                  )}
                />
              )}

              {/* Import bar (multi-select) */}
              {multiple && selected.size > 0 && (
                <View style={styles.importBar}>
                  <TouchableOpacity
                    style={[styles.importBtn, importing && { opacity: 0.6 }]}
                    onPress={handleImportSelected}
                    disabled={importing}
                    activeOpacity={0.8}
                  >
                    {importing
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={styles.importBtnText}>
                          Import {selected.size} file{selected.size !== 1 ? 's' : ''}
                        </Text>}
                  </TouchableOpacity>
                </View>
              )}
            </>
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
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    paddingBottom: Spacing.xxxl,
    maxHeight: '85%',
  },
  handle: {
    width: 40, height: 4, backgroundColor: Colors.border,
    borderRadius: Radius.full, alignSelf: 'center',
    marginTop: Spacing.sm, marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  driveIcon: {
    width: 36, height: 36, borderRadius: Radius.md,
    backgroundColor: Colors.cardElevated, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary, flexShrink: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  signOutBtn: { paddingVertical: 4, paddingHorizontal: Spacing.sm },
  signOutText: { fontSize: Typography.xs, color: Colors.textMuted },
  closeBtn: {
    width: 32, height: 32, borderRadius: Radius.full,
    backgroundColor: Colors.cardElevated, alignItems: 'center', justifyContent: 'center',
  },

  breadcrumbBar: { maxHeight: 32, marginBottom: Spacing.sm },
  breadcrumbContent: { paddingHorizontal: Spacing.lg, alignItems: 'center' },
  breadcrumbItem: { flexDirection: 'row', alignItems: 'center' },
  breadcrumbText: { fontSize: Typography.xs, color: Colors.textMuted },
  breadcrumbTextActive: { color: Colors.primary, fontWeight: Typography.semibold },

  tabHint: {
    fontSize: Typography.xs, color: Colors.textSecondary,
    paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm, lineHeight: Typography.xs * 1.5,
  },

  signInPrompt: {
    alignItems: 'center', paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl, gap: Spacing.md,
  },
  signInTitle: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textPrimary, textAlign: 'center' },
  signInSub: { fontSize: Typography.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: Typography.sm * 1.6 },
  signInButton: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl,
    marginTop: Spacing.sm, minWidth: 200, alignItems: 'center',
  },
  signInButtonText: { fontSize: Typography.base, fontWeight: Typography.semibold, color: '#fff' },
  center: { alignItems: 'center', paddingVertical: Spacing.xxxl, gap: Spacing.md, paddingHorizontal: Spacing.xl },
  loadingText: { fontSize: Typography.sm, color: Colors.textSecondary },
  errorText: { fontSize: Typography.sm, color: Colors.error, textAlign: 'center' },
  retryBtn: {
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.card, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  retryText: { fontSize: Typography.sm, color: Colors.primary },
  emptyText: { fontSize: Typography.base, fontWeight: Typography.medium, color: Colors.textSecondary, textAlign: 'center' },
  emptySubText: { fontSize: Typography.sm, color: Colors.textMuted, textAlign: 'center' },
  list: { maxHeight: 380 },
  listContent: { paddingHorizontal: Spacing.base },
  fileRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, gap: Spacing.md },
  checkbox: {
    width: 22, height: 22, borderRadius: Radius.sm, borderWidth: 2,
    borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  checkboxSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  fileIcon: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  fileInfo: { flex: 1 },
  fileName: { fontSize: Typography.base, fontWeight: Typography.medium, color: Colors.textPrimary },
  fileMeta: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 2 },
  separator: { height: 1, backgroundColor: Colors.border + '66' },

  importBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.md,
    backgroundColor: Colors.card, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  importBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: Spacing.md, alignItems: 'center', justifyContent: 'center',
  },
  importBtnText: { fontSize: Typography.base, fontWeight: Typography.semibold, color: '#fff' },
})