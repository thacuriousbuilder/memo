

import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, Switch, ActivityIndicator
} from 'react-native'
import { useState }       from 'react'
import { Ionicons }       from '@expo/vector-icons'
import { router }         from 'expo-router'
import { signOut }        from '@/lib/supabase'
import { useSession }     from '@/hooks/useSession'
import { useDashboard }   from '@/hooks/useDashboard'
import { Colors, Spacing, Radius, Typography, CardBase } from '@/constants/theme'
import { useCourses } from '@/hooks/useCourses'

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
          thumbColor={Colors.textPrimary}
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

  const [allNotifs,      setAllNotifs]      = useState(true)
  const [pushNotifs,     setPushNotifs]     = useState(true)
  const [emailNotifs,    setEmailNotifs]    = useState(true)
  const [studyReminders, setStudyReminders] = useState(true)

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

  const handleAllNotifs = (val: boolean) => {
    setAllNotifs(val)
    if (!val) {
      setPushNotifs(false)
      setEmailNotifs(false)
      setStudyReminders(false)
    }
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
          <TouchableOpacity style={styles.editAvatarBadge}>
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
          <Text style={styles.statLabel}>Courses</Text>
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
        {/* <ToggleRow
          icon="notifications-outline"
          title="All Notifications"
          subtitle="Master toggle for all notifications"
          value={allNotifs}
          onValueChange={handleAllNotifs}
        /> */}
        <ToggleRow
          icon="phone-portrait-outline"
          title="Push Notifications"
          subtitle="Get notified on your device"
          value={pushNotifs}
          onValueChange={setPushNotifs}
        />
        <ToggleRow
          icon="mail-outline"
          title="Email Notifications"
          subtitle="Receive updates via email"
          value={emailNotifs}
          onValueChange={setEmailNotifs}
        />
        {/* <ToggleRow
          icon="alarm-outline"
          title="Study Reminders"
          subtitle="Daily reminders based on schedule"
          value={studyReminders}
          onValueChange={setStudyReminders}
          showDivider={false}
        /> */}
      </View>

      {/* Account */}
      <SectionLabel title="ACCOUNT" />
      <View style={styles.card}>
        <SettingsRow
          icon="person-outline"
          title="Edit Profile"
          subtitle="Name, email, avatar"
          onPress={() => Alert.alert('Coming Soon', 'Profile editing coming soon.')}
        />
        <SettingsRow
          icon="lock-closed-outline"
          title="Change Password"
          subtitle="Update your password"
          onPress={() => Alert.alert('Coming Soon', 'Password change coming soon.')}
          showDivider={false}
        />
      </View>

      {/* Support */}
      <SectionLabel title="SUPPORT" />
      <View style={styles.card}>
        {/* <SettingsRow
          icon="help-circle-outline"
          title="Help Center"
          subtitle="FAQs and guides"
          onPress={() => Alert.alert('Coming Soon', 'Help center coming soon.')}
        /> */}
        <SettingsRow
          icon="mail-outline"
          title="Contact Support"
          subtitle="Get help from our team"
          onPress={() => Alert.alert('Coming Soon', 'Contact support coming soon.')}
        />
        <SettingsRow
          icon="document-text-outline"
          title="Privacy Policy"
          onPress={() => Alert.alert('Coming Soon', 'Privacy policy coming soon.')}
        />
        <SettingsRow
          icon="document-text-outline"
          title="Terms of Service"
          onPress={() => Alert.alert('Coming Soon', 'Terms coming soon.')}
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