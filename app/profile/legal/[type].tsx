

import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Colors, Spacing, Typography } from '@/constants/theme'

const PLACEHOLDER_BODY = (docName: string) => `This is placeholder text. Replace this with MEMO's actual ${docName} before launch.

Lorem ipsum dolor sit amet, consectetur adipiscing elit. This section should describe what data is collected, how it's used, and the rights users have over it.

Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Add specific details relevant to your product, jurisdiction, and any third-party services you rely on.

Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris. Contact thacuriousbuilder@gmail.com with any questions about this document.`

const LEGAL_CONTENT: Record<string, { title: string; body: string }> = {
  privacy: { title: 'Privacy Policy',   body: PLACEHOLDER_BODY('privacy policy') },
  terms:   { title: 'Terms of Service', body: PLACEHOLDER_BODY('terms of service') },
}

export default function LegalScreen() {
  const { type } = useLocalSearchParams<{ type: string }>()
  const content = LEGAL_CONTENT[type ?? ''] ?? { title: 'Document', body: 'Not found.' }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={Colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{content.title}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container}>
        <Text style={styles.body}>{content.body}</Text>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingTop: Spacing.xl + 32, paddingBottom: Spacing.md,
  },
  headerTitle: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary },
  container: { paddingHorizontal: Spacing.base, paddingBottom: Spacing.xxxl },
  body: { fontSize: Typography.base, color: Colors.textSecondary, lineHeight: Typography.base * 1.6 },
})
