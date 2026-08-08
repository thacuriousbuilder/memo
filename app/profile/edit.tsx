

import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native'
import { useState } from 'react'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Colors, Spacing, Radius, Typography } from '@/constants/theme'
import { useSession } from '@/hooks/useSession'
import { updateFullName } from '@/lib/supabase'

export default function EditProfileScreen() {
  const { user, profile, refreshProfile } = useSession()
  const [name,   setName]   = useState(profile?.full_name ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!user) return
    if (!name.trim()) { Alert.alert('Required', 'Please enter your name.'); return }

    setSaving(true)
    try {
      await updateFullName(user.id, name.trim())
      await refreshProfile()
      router.back()
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
          <Text style={styles.headerTitle}>Edit profile</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color={Colors.primary} /> : <Text style={styles.saveText}>Save</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.container}>
          <Text style={styles.fieldLabel}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={Colors.textMuted}
            autoFocus
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
  container: { paddingHorizontal: Spacing.base },
  fieldLabel: { fontSize: Typography.sm, fontWeight: Typography.medium, color: Colors.textPrimary, marginBottom: Spacing.xs },
  input: {
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.full,
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.md, fontSize: Typography.base, color: Colors.textPrimary,
  },
})
