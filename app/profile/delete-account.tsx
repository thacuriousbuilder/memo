

import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native'
import { useState } from 'react'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Colors, Spacing, Radius, Typography } from '@/constants/theme'
import { useSession } from '@/hooks/useSession'
import { supabase, signOut } from '@/lib/supabase'
import { AccountAPI } from '@/lib/api'

const CONFIRM_WORD = 'DELETE'

export default function DeleteAccountScreen() {
  const { user } = useSession()
  const [password, setPassword]     = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting]     = useState(false)

  const isEmailAccount = (user?.app_metadata?.provider ?? 'email') === 'email'
  const canDelete = !deleting && (isEmailAccount ? password.length > 0 : confirmText === CONFIRM_WORD)

  const handleDelete = async () => {
    if (!user?.email) return
    setDeleting(true)
    try {
      if (isEmailAccount) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password,
        })
        if (signInError) {
          Alert.alert('Incorrect password', 'Your current password is incorrect.')
          return
        }
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { Alert.alert('Error', 'Your session has expired. Please log in again.'); return }

      await AccountAPI.deleteAccount(session.access_token)

      try { await signOut() } catch {}
      router.replace('/(auth)/login')
    } catch (err: any) {
      Alert.alert('Error', err.message)
    } finally {
      setDeleting(false)
    }
  }

  const confirmDelete = () => {
    Alert.alert(
      'Delete Account',
      'This is permanent and cannot be undone. Delete your account now?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: handleDelete },
      ]
    )
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Delete account</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.container}>
          <View style={styles.warningBox}>
            <Ionicons name="warning-outline" size={20} color={Colors.error} />
            <Text style={styles.warningText}>
              This permanently deletes your account and all your data, subjects, materials,
              quizzes, reminders, and exam records. This cannot be undone.
            </Text>
          </View>

          {isEmailAccount ? (
            <>
              <Text style={styles.fieldLabel}>Current password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Current password"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry
                autoFocus
              />
            </>
          ) : (
            <>
              <Text style={styles.fieldLabel}>Type "{CONFIRM_WORD}" to confirm</Text>
              <TextInput
                style={styles.input}
                value={confirmText}
                onChangeText={setConfirmText}
                placeholder={CONFIRM_WORD}
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="characters"
                autoCorrect={false}
                autoFocus
              />
            </>
          )}

          <TouchableOpacity
            style={[styles.deleteButton, !canDelete && styles.deleteButtonDisabled]}
            onPress={confirmDelete}
            disabled={!canDelete}
          >
            {deleting
              ? <ActivityIndicator color={Colors.textInverse} />
              : <Text style={styles.deleteButtonText}>Delete My Account</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingTop: Spacing.xl + 32, paddingBottom: Spacing.md,
  },
  headerTitle: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary },
  container: { paddingHorizontal: Spacing.base, gap: Spacing.xs },
  warningBox: {
    flexDirection: 'row', gap: Spacing.sm, backgroundColor: Colors.errorMuted,
    borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md,
  },
  warningText: { flex: 1, fontSize: Typography.sm, color: Colors.error, lineHeight: Typography.sm * 1.5 },
  fieldLabel: { fontSize: Typography.sm, fontWeight: Typography.medium, color: Colors.textPrimary, marginTop: Spacing.lg, marginBottom: Spacing.xs },
  input: {
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.full,
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.md, fontSize: Typography.base, color: Colors.textPrimary,
  },
  deleteButton: {
    backgroundColor: Colors.error, borderRadius: Radius.md,
    paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.xl,
  },
  deleteButtonDisabled: { opacity: 0.4 },
  deleteButtonText: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textInverse },
})
