

import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, Switch, ActivityIndicator, AppState, Linking
} from 'react-native'
import { useState, useEffect, useCallback } from 'react'
import { Ionicons }       from '@expo/vector-icons'
import { router }         from 'expo-router'
import { signOut }        from '@/lib/supabase'
import { useSession }     from '@/hooks/useSession'
import { useDashboard }   from '@/hooks/useDashboard'
import { Colors, Spacing, Radius, Typography, CardBase } from '@/constants/theme'
import { useCourses } from '@/hooks/useCourses'
import { getPermissionStatus, requestPermission, registerForPushNotifications } from '@/lib/notifications'

// ─────────────────────────────────────────
// REUSABLE ROW
// ─────────────────────────────────────────
function SettingsRow({
  icon, title, subtitle, onPress, rightElement, showDivider = true
}: {
  icon:          string
  title:         string
  subtitle?:     string
  onPress?:      () => void
  rightElement?: React.ReactNode
  showDivider?:  boolean
}) {
  return (
    <>
      <TouchableOpacity
        style={styles.settingsRow}
        onPress={onPress}
        activeOpacity={onPress ? 0.7 : 1}
      >
        <Ionicons name={icon as any} size={20} color={Colors.textSecondary} />
        <View style={styles.settingsRowInfo}>
          <Text style={styles.settingsRowTitle}>{title}</Text>
          {subtitle && (
            <Text style={styles.settingsRowSubtitle}>{subtitle}</Text>
          )}
        </View>
        {rightElement ?? (
          onPress
            ? <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            : null
        )}
      </TouchableOpacity>
      {showDivider && <View style={styles.rowDivider} />}
    </>
  )
}

// ─────────────────────────────────────────
// TOGGLE ROW
// ─────────────────────────────────────────
function ToggleRow({
  icon, title, subtitle, value, onValueChange, showDivider = true
}: {
  icon:          string
  title:         string
  subtitle:      string
  value:         boolean
  onValueChange: (v: boolean) => void
  showDivider?:  boolean
}) {
  return (
    <SettingsRow
      icon={icon}
      title={title}
      subtitle={subtitle}
      showDivider={showDivider}
      rightElement={
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: Colors.border, true: Colors.primary }}
          thumbColor={Colors.answerDefault}
        />
      }
    />
  )
}

// ─────────────────────────────────────────
// SECTION LABEL
// ─────────────────────────────────────────
function SectionLabel({ title }: { title: string }) {
  return <Text style={styles.sectionLabel}>{title}</Text>
}

// ─────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────
export default function ProfileScreen() {
  const { user, profile }   = useSession()
  const { data: dashboard } = useDashboard(user?.id ?? null)

  // Push permission reflects real OS state — apps can't self-revoke
  // notification permission, so this drives UI copy/behavior, not a
  // freely togglable local flag.
  const [pushStatus, setPushStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined')

  const refreshPushStatus = useCallback(async () => {
    const status = await getPermissionStatus()
    setPushStatus(status as 'granted' | 'denied' | 'undetermined')
  }, [])

  useEffect(() => {
    refreshPushStatus()
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshPushStatus()
    })
    return () => sub.remove()
  }, [refreshPushStatus])

  const handlePushToggle = async () => {
    if (pushStatus !== 'undetermined') {
      // Already decided at the OS level (granted or denied) — the app
      // can't flip it back, only the Settings app can.
      Linking.openSettings()
      return
    }
    const granted = await requestPermission()
    if (granted && user) await registerForPushNotifications(user.id)
    refreshPushStatus()
  }

  const pushSubtitle = pushStatus === 'denied'
    ? 'Disabled in system Settings — tap to open'
    : pushStatus === 'granted'
    ? 'Manage in system Settings'
    : 'Get notified on your device'

  // ── Derived display values ──
  const fullName = profile?.full_name ?? user?.email?.split('@')[0] ?? 'User'
  const email    = user?.email ?? ''
  const initials = fullName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  // Stats from dashboard
  const todayItems = [
    ...(dashboard?.next_up ? [dashboard.next_up] : []),
    ...(dashboard?.later_today ?? []),
  ]
  const { courses } = useCourses(user?.id ?? null)
  const courseCount = courses.length
  const completedQ  = dashboard?.week_stats.questions ?? 0
  const streak      = dashboard?.streak ?? 0

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text:  'Log Out',
        style: 'destructive',
        onPress: async () => {
          await signOut()
          router.replace('/(auth)/login')
        },
      },
    ])
  }

  if (!user) return (
    <View style={[styles.root, styles.center]}>
      <ActivityIndicator color={Colors.primary} />
    </View>
  )

  return (
    <View style={styles.root}>
    <View style={styles.fixedHeader}>
      <Text style={styles.headerTitle}>Profile</Text>
    </View>

    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Avatar */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarWrapper}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <TouchableOpacity style={styles.editAvatarBadge} onPress={() => router.push('/profile/edit')}>
            <Ionicons name="pencil" size={12} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.userName}>{fullName}</Text>
        <Text style={styles.userEmail}>{email}</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{courseCount}</Text>
          <Text style={styles.statLabel}>Subjects</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{completedQ}</Text>
          <Text style={styles.statLabel}>Completed Quiz</Text>
        </View>
        <View style={styles.statCard}>
          <View style={styles.streakRow}>
            <Text style={styles.streakFire}>🔥</Text>
            <Text style={styles.statValue}>{streak}</Text>
          </View>
          <Text style={styles.statLabel}>Streak</Text>
        </View>
      </View>

      {/* Notifications */}
      <SectionLabel title="NOTIFICATIONS" />
      <View style={styles.card}>
        <ToggleRow
          icon="phone-portrait-outline"
          title="Push Notifications"
          subtitle={pushSubtitle}
          value={pushStatus === 'granted'}
          onValueChange={handlePushToggle}
          showDivider={false}
        />
      </View>

      {/* Account */}
      <SectionLabel title="ACCOUNT" />
      <View style={styles.card}>
        <SettingsRow
          icon="person-outline"
          title="Edit Profile"
          subtitle="Name"
          onPress={() => router.push('/profile/edit')}
        />
        <SettingsRow
          icon="lock-closed-outline"
          title="Change Password"
          subtitle="Update your password"
          onPress={() => router.push('/profile/change-password')}
          showDivider={false}
        />
      </View>

      {/* Support */}
      <SectionLabel title="SUPPORT" />
      <View style={styles.card}>
        <SettingsRow
          icon="mail-outline"
          title="Contact Support"
          subtitle="Get help from our team"
          onPress={() => Linking.openURL('mailto:thacuriousbuilder@gmail.com')}
        />
        <SettingsRow
          icon="document-text-outline"
          title="Privacy Policy"
          onPress={() => router.push('/profile/legal/privacy')}
        />
        <SettingsRow
          icon="document-text-outline"
          title="Terms of Service"
          onPress={() => router.push('/profile/legal/terms')}
        />
        <SettingsRow
          icon="trash-outline"
          title="Delete Account"
          subtitle="Permanently delete your account and data"
          onPress={() => router.push('/profile/delete-account')}
          showDivider={false}
        />
      </View>

      {/* Log Out */}
      <TouchableOpacity
        style={styles.logoutCard}
        onPress={handleLogout}
        activeOpacity={0.8}
      >
        <Ionicons name="log-out-outline" size={20} color={Colors.error} />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      {/* Version */}
      <Text style={styles.version}>MEMO v1.0.0</Text>
    </ScrollView>
    </View>
  )
}

// ─────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: Colors.background,
  },
  center: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
  },
  fixedHeader: {
    paddingHorizontal: Spacing.base, paddingTop: Spacing.xl + 32, paddingBottom: Spacing.base,
    backgroundColor: Colors.background,
  },
  headerTitle: {
    fontSize: Typography.xxl, fontWeight: Typography.bold, color: Colors.textPrimary,
  },
  container: {
    paddingHorizontal: Spacing.base,
    paddingBottom:     Spacing.xxxl,
  },

  // Profile Header
  profileHeader: {
    alignItems:   'center',
    gap:          Spacing.xs,
    marginBottom: Spacing.sm,
  },
  avatarWrapper: {
    position:     'relative',
    marginBottom: Spacing.sm,
  },
  avatar: {
    width:           80,
    height:          80,
    borderRadius:    Radius.full,
    backgroundColor: Colors.primary,
    alignItems:      'center',
    justifyContent:  'center',
  },
  avatarText: {
    fontSize:   Typography.xl,
    fontWeight: Typography.bold,
    color:      Colors.textInverse,
  },
  editAvatarBadge: {
    position:        'absolute',
    bottom:          0,
    right:           0,
    width:           26,
    height:          26,
    borderRadius:    Radius.full,
    backgroundColor: Colors.cardElevated,
    borderWidth:     2,
    borderColor:     Colors.background,
    alignItems:      'center',
    justifyContent:  'center',
  },
  userName: {
    fontSize:   Typography.xl,
    fontWeight: Typography.bold,
    color:      Colors.textPrimary,
  },
  userEmail: {
    fontSize: Typography.sm,
    color:    Colors.textSecondary,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap:           Spacing.sm,
  },
  statCard: {
    flex:        1,
    ...CardBase,
    padding:     Spacing.md,
    alignItems:  'center',
    gap:         Spacing.xs,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           4,
  },
  streakFire: { fontSize: 16 },
  statValue: {
    fontSize:   Typography.xxl,
    fontWeight: Typography.bold,
    color:      Colors.textPrimary,
  },
  statLabel: {
    fontSize: Typography.xs,
    color:    Colors.textSecondary,
  },

  // Section Label
  sectionLabel: {
    fontSize:      Typography.xs,
    fontWeight:    Typography.bold,
    color:         Colors.textSecondary,
    letterSpacing: 1,
    marginTop:     Spacing.sm,
  },

  // Card
  card: {
    ...CardBase,
    overflow: 'hidden',
    padding:  0,
  },

  // Settings Row
  settingsRow: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingVertical:   Spacing.md,
    paddingHorizontal: Spacing.base,
    gap:               Spacing.md,
  },
  settingsRowInfo: { flex: 1 },
  settingsRowTitle: {
    fontSize:   Typography.base,
    fontWeight: Typography.medium,
    color:      Colors.textPrimary,
  },
  settingsRowSubtitle: {
    fontSize:  Typography.xs,
    color:     Colors.textSecondary,
    marginTop: 2,
  },
  rowDivider: {
    height:           1,
    backgroundColor:  Colors.border,
    marginHorizontal: Spacing.base,
  },

  // Logout
  logoutCard: {
    ...CardBase,
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            Spacing.sm,
    padding:        Spacing.base,
    marginTop:      Spacing.sm,
  },
  logoutText: {
    fontSize:   Typography.base,
    fontWeight: Typography.semibold,
    color:      Colors.error,
  },
  // Version
  version: {
    textAlign: 'center',
    fontSize:  Typography.xs,
    color:     Colors.textMuted,
    marginTop: Spacing.sm,
  },
})