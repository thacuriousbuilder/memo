

import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native'
import { useState } from 'react'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Colors, Spacing, Radius, Typography } from '@/constants/theme'
import { useSession } from '@/hooks/useSession'
import { supabase } from '@/lib/supabase'

export default function ChangePasswordScreen() {
  const { user } = useSession()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword,     setNewPassword]     = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving,          setSaving]          = useState(false)

  const handleSave = async () => {
    if (!user?.email) return
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Required', 'Please fill in all fields.')
      return
    }
    if (newPassword.length < 6) {
      Alert.alert('Password too short', 'New password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Passwords don\'t match', 'New password and confirmation must match.')
      return
    }

    setSaving(true)
    try {
      // Supabase has no dedicated "verify password" call — re-authenticating
      // against the same account is the standard way to confirm the current
      // password client-side before allowing a change. This re-signs-in the
      // same user, so it doesn't disrupt the existing session.
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      })
      if (signInError) {
        Alert.alert('Incorrect password', 'Your current password is incorrect.')
        return
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
      if (updateError) throw updateError

      Alert.alert('Password updated', 'Your password has been changed.', [
        { text: 'OK', onPress: () => router.back() },
      ])
    } catch (err: any) {
      Alert.alert('Error', err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Change password</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color={Colors.primary} /> : <Text style={styles.saveText}>Save</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.container}>
          <Text style={styles.fieldLabel}>Current password</Text>
          <TextInput
            style={styles.input}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Current password"
            placeholderTextColor={Colors.textMuted}
            secureTextEntry
            autoFocus
          />

          <Text style={styles.fieldLabel}>New password</Text>
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="New password"
            placeholderTextColor={Colors.textMuted}
            secureTextEntry
          />

          <Text style={styles.fieldLabel}>Confirm new password</Text>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm new password"
            placeholderTextColor={Colors.textMuted}
            secureTextEntry
          />
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
  saveText: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.primary },
  container: { paddingHorizontal: Spacing.base, gap: Spacing.xs },
  fieldLabel: { fontSize: Typography.sm, fontWeight: Typography.medium, color: Colors.textPrimary, marginTop: Spacing.lg, marginBottom: Spacing.xs },
  input: {
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.full,
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.md, fontSize: Typography.base, color: Colors.textPrimary,
  },
})
