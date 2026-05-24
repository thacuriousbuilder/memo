

import {
    View, Text, ScrollView, TouchableOpacity,
    StyleSheet, Alert, Switch, LayoutAnimation,
    Platform, UIManager
  } from 'react-native'
  import { useState } from 'react'
  import { Ionicons } from '@expo/vector-icons'
  import { router } from 'expo-router'
  import { signOut } from '@/lib/supabase'
  import { Colors, Spacing, Radius, Typography, CardBase } from '@/constants/theme'
  
  if (Platform.OS === 'android') {
    UIManager.setLayoutAnimationEnabledExperimental?.(true)
  }
  
  // ─────────────────────────────────────────
  // TYPES
  // ─────────────────────────────────────────
  type DayKey = 'M' | 'T' | 'W' | 'Th' | 'F' | 'S' | 'Su'
  
  interface Reminder {
    id:      string
    emoji:   string
    title:   string
    enabled: boolean
    time:    string
    days:    DayKey[]
  }
  
  // ─────────────────────────────────────────
  // CONSTANTS
  // ─────────────────────────────────────────
  const DAYS: DayKey[] = ['M', 'T', 'W', 'Th', 'F', 'S', 'Su']
  
  const PRESETS: { label: string; days: DayKey[] }[] = [
    { label: 'Every day',   days: ['M','T','W','Th','F','S','Su'] },
    { label: 'Weekdays',    days: ['M','T','W','Th','F'] },
    { label: 'Weekends',    days: ['S','Su'] },
    { label: 'Mon/Wed/Fri', days: ['M','W','F'] },
    { label: 'Tue/Thu',     days: ['T','Th'] },
  ]
  
  const MOCK_USER = {
    fullName: 'Alhouseny',
    email:    'alhouseny@email.com',
    initials: 'AH',
    courses:   4,
    completed: 12,
    streak:    7,
  }
  
  const INITIAL_REMINDERS: Reminder[] = [
    { id: '1', emoji: '🧬', title: 'Biology 101',  enabled: true,  time: '08:00 AM', days: ['M','W','F']  },
    { id: '2', emoji: '🌍', title: 'World History', enabled: true,  time: '14:00 PM', days: ['T','Th']    },
    { id: '3', emoji: '📐', title: 'Calculus I',    enabled: false, time: '09:00 AM', days: []            },
    { id: '4', emoji: '🧪', title: 'Chemistry',     enabled: true,  time: '18:00 PM', days: ['S','Su']    },
  ]
  
  // ─────────────────────────────────────────
  // HELPER
  // ─────────────────────────────────────────
  const formatSchedule = (reminder: Reminder): string => {
    if (!reminder.enabled || reminder.days.length === 0) return 'Reminders off'
    const preset = PRESETS.find(p =>
      p.days.length === reminder.days.length &&
      p.days.every(d => reminder.days.includes(d))
    )
    const dayStr = preset ? preset.label : reminder.days.join(', ')
    return `${reminder.time} • ${dayStr}`
  }
  
  // ─────────────────────────────────────────
  // REMINDER CARD (collapsible)
  // ─────────────────────────────────────────
  function ReminderCard({
    reminder,
    expanded,
    onToggleExpand,
    onUpdate,
  }: {
    reminder:       Reminder
    expanded:       boolean
    onToggleExpand: () => void
    onUpdate:       (updated: Reminder) => void
  }) {
    const toggleDay = (day: DayKey) => {
      const days = reminder.days.includes(day)
        ? reminder.days.filter(d => d !== day)
        : [...reminder.days, day]
      onUpdate({ ...reminder, days })
    }
  
    const applyPreset = (preset: { label: string; days: DayKey[] }) => {
      onUpdate({ ...reminder, days: preset.days, enabled: true })
    }
  
    const activePreset = PRESETS.find(p =>
      p.days.length === reminder.days.length &&
      p.days.every(d => reminder.days.includes(d))
    )
  
    return (
      <View style={[styles.reminderCard, expanded && styles.reminderCardExpanded]}>
        {/* Header Row */}
        <TouchableOpacity
          style={styles.reminderHeader}
          onPress={onToggleExpand}
          activeOpacity={0.8}
        >
          <Text style={styles.reminderEmoji}>{reminder.emoji}</Text>
          <View style={styles.reminderInfo}>
            <Text style={styles.reminderTitle}>{reminder.title}</Text>
            <Text style={styles.reminderSchedule}>
              {formatSchedule(reminder)}
            </Text>
          </View>
          <View style={styles.reminderRight}>
            <View style={[
              styles.reminderDot,
              { backgroundColor: reminder.enabled && reminder.days.length > 0
                  ? Colors.success : Colors.lockedText }
            ]} />
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={Colors.textMuted}
            />
          </View>
        </TouchableOpacity>
  
        {/* Expanded Content */}
        {expanded && (
          <View style={styles.reminderExpanded}>
            <View style={styles.expandDivider} />
  
            {/* Enable Toggle */}
            <View style={styles.toggleRow}>
              <Text style={styles.expandLabel}>Enable reminders</Text>
              <Switch
                value={reminder.enabled}
                onValueChange={(val) => onUpdate({ ...reminder, enabled: val })}
                trackColor={{ false: Colors.border, true: Colors.primary }}
                thumbColor={Colors.textPrimary}
              />
            </View>
  
            {/* Time */}
            <Text style={styles.expandLabel}>Remind me at</Text>
            <TouchableOpacity
              style={styles.timeRow}
              onPress={() => Alert.alert('Coming Soon', 'Time picker coming soon.')}
              activeOpacity={0.8}
            >
              <Ionicons name="time-outline" size={18} color={Colors.textSecondary} />
              <Text style={styles.timeText}>{reminder.time}</Text>
              <Ionicons name="time-outline" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
  
            {/* Day Selector */}
            <Text style={styles.expandLabel}>Repeat on</Text>
            <View style={styles.dayRow}>
              {DAYS.map((day) => (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayCircle,
                    reminder.days.includes(day) && styles.dayCircleActive,
                  ]}
                  onPress={() => toggleDay(day)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.dayText,
                    reminder.days.includes(day) && styles.dayTextActive,
                  ]}>
                    {day === 'Th' ? 'T' : day === 'Su' ? 'S' : day}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
  
            {/* Preset Chips */}
            <View style={styles.presetRow}>
              {PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset.label}
                  style={[
                    styles.presetChip,
                    activePreset?.label === preset.label && styles.presetChipActive,
                  ]}
                  onPress={() => applyPreset(preset)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.presetText,
                    activePreset?.label === preset.label && styles.presetTextActive,
                  ]}>
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>
    )
  }
  
  // ─────────────────────────────────────────
  // MAIN SCREEN
  // ─────────────────────────────────────────
  export default function ProfileScreen() {
    const [reminders,    setReminders]    = useState<Reminder[]>(INITIAL_REMINDERS)
    const [expandedId,   setExpandedId]   = useState<string | null>(null)
  
    const toggleExpand = (id: string) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
      setExpandedId(prev => prev === id ? null : id)
    }
  
    const updateReminder = (updated: Reminder) => {
      setReminders(prev => prev.map(r => r.id === updated.id ? updated : r))
    }
  
    const handleLogout = () => {
      Alert.alert('Log Out', 'Are you sure you want to log out?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text:    'Log Out',
          style:   'destructive',
          onPress: async () => {
            await signOut()
            router.replace('/(auth)/login')
          },
        },
      ])
    }
  
    return (
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{MOCK_USER.initials}</Text>
          </View>
          <Text style={styles.userName}>{MOCK_USER.fullName}</Text>
          <Text style={styles.userEmail}>{MOCK_USER.email}</Text>
          <TouchableOpacity
            onPress={() => Alert.alert('Coming Soon', 'Profile editing coming soon.')}
          >
            <Text style={styles.editProfile}>Edit Profile</Text>
          </TouchableOpacity>
        </View>
  
        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{MOCK_USER.courses}</Text>
            <Text style={styles.statLabel}>Courses</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{MOCK_USER.completed}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.streakRow}>
              <Text style={styles.streakFire}>🔥</Text>
              <Text style={styles.statValue}>{MOCK_USER.streak}</Text>
            </View>
            <Text style={styles.statLabel}>Streak</Text>
          </View>
        </View>
  
        {/* Study Reminders */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="notifications-outline" size={18} color={Colors.textPrimary} />
            <Text style={styles.sectionTitle}>Study Reminders</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Set custom reminder schedules for each course
          </Text>
  
          <View style={styles.reminderList}>
            {reminders.map((reminder) => (
              <ReminderCard
                key={reminder.id}
                reminder={reminder}
                expanded={expandedId === reminder.id}
                onToggleExpand={() => toggleExpand(reminder.id)}
                onUpdate={updateReminder}
              />
            ))}
          </View>
        </View>
  
        {/* Log Out Only */}
        <TouchableOpacity
          style={styles.logoutCard}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color={Colors.error} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
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
    container: {
      paddingHorizontal: Spacing.base,
      paddingTop:        Spacing.xl + 32,
      paddingBottom:     Spacing.xxxl,
      gap:               Spacing.xl,
    },
  
    // Profile Header
    profileHeader: {
      alignItems: 'center',
      gap:        Spacing.xs,
    },
    avatar: {
      width:           80,
      height:          80,
      borderRadius:    Radius.full,
      backgroundColor: Colors.primary,
      alignItems:      'center',
      justifyContent:  'center',
      marginBottom:    Spacing.sm,
    },
    avatarText: {
      fontSize:   Typography.xl,
      fontWeight: Typography.bold,
      color:      Colors.textInverse,
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
    editProfile: {
      fontSize:   Typography.sm,
      fontWeight: Typography.medium,
      color:      Colors.primary,
      marginTop:  Spacing.xs,
    },
  
    // Stats
    statsRow: {
      flexDirection: 'row',
      gap:           Spacing.sm,
    },
    statCard: {
      flex:            1,
      ...CardBase,
      padding:         Spacing.md,
      alignItems:      'center',
      gap:             Spacing.xs,
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
  
    // Section
    section:      { gap: Spacing.sm },
    sectionHeader: {
      flexDirection: 'row',
      alignItems:    'center',
      gap:           Spacing.sm,
    },
    sectionTitle: {
      fontSize:   Typography.md,
      fontWeight: Typography.bold,
      color:      Colors.textPrimary,
    },
    sectionSubtitle: {
      fontSize: Typography.sm,
      color:    Colors.textSecondary,
    },
  
    // Reminders
    reminderList: { gap: Spacing.sm },
    reminderCard: {
      ...CardBase,
      overflow: 'hidden',
    },
    reminderCardExpanded: {
      borderColor: Colors.primaryBorder,
    },
    reminderHeader: {
      flexDirection: 'row',
      alignItems:    'center',
      padding:       Spacing.md,
      gap:           Spacing.md,
    },
    reminderEmoji:    { fontSize: 24 },
    reminderInfo:     { flex: 1 },
    reminderTitle: {
      fontSize:   Typography.sm,
      fontWeight: Typography.semibold,
      color:      Colors.textPrimary,
    },
    reminderSchedule: {
      fontSize:  Typography.xs,
      color:     Colors.textSecondary,
      marginTop: 2,
    },
    reminderRight: {
      flexDirection: 'row',
      alignItems:    'center',
      gap:           Spacing.sm,
    },
    reminderDot: {
      width:        8,
      height:       8,
      borderRadius: Radius.full,
    },
  
    // Expanded
    reminderExpanded: {
      paddingHorizontal: Spacing.md,
      paddingBottom:     Spacing.md,
      gap:               Spacing.md,
    },
    expandDivider: {
      height:          1,
      backgroundColor: Colors.border,
      marginBottom:    Spacing.xs,
    },
    toggleRow: {
      flexDirection:  'row',
      justifyContent: 'space-between',
      alignItems:     'center',
    },
    expandLabel: {
      fontSize:   Typography.sm,
      fontWeight: Typography.medium,
      color:      Colors.textPrimary,
    },
    timeRow: {
      flexDirection:     'row',
      alignItems:        'center',
      justifyContent:    'space-between',
      backgroundColor:   Colors.cardElevated,
      borderRadius:      Radius.md,
      borderWidth:       1,
      borderColor:       Colors.border,
      paddingVertical:   Spacing.md,
      paddingHorizontal: Spacing.md,
    },
    timeText: {
      fontSize:   Typography.md,
      fontWeight: Typography.semibold,
      color:      Colors.textPrimary,
    },
  
    // Day Selector
    dayRow: {
      flexDirection: 'row',
      gap:           Spacing.sm,
    },
    dayCircle: {
      width:           38,
      height:          38,
      borderRadius:    Radius.full,
      backgroundColor: Colors.cardElevated,
      borderWidth:     1,
      borderColor:     Colors.border,
      alignItems:      'center',
      justifyContent:  'center',
    },
    dayCircleActive: {
      backgroundColor: Colors.primary,
      borderColor:     Colors.primary,
    },
    dayText: {
      fontSize:   Typography.xs,
      fontWeight: Typography.semibold,
      color:      Colors.textSecondary,
    },
    dayTextActive: {
      color: Colors.textInverse,
    },
  
    // Presets
    presetRow: {
      flexDirection: 'row',
      flexWrap:      'wrap',
      gap:           Spacing.sm,
    },
    presetChip: {
      paddingVertical:   6,
      paddingHorizontal: Spacing.md,
      borderRadius:      Radius.full,
      backgroundColor:   Colors.cardElevated,
      borderWidth:       1,
      borderColor:       Colors.border,
    },
    presetChipActive: {
      backgroundColor: Colors.primaryMuted,
      borderColor:     Colors.primary,
    },
    presetText: {
      fontSize: Typography.xs,
      color:    Colors.textSecondary,
    },
    presetTextActive: {
      color:      Colors.primary,
      fontWeight: Typography.medium,
    },
  
    // Logout
    logoutCard: {
      ...CardBase,
      flexDirection:  'row',
      alignItems:     'center',
      gap:            Spacing.md,
      padding:        Spacing.base,
    },
    logoutText: {
      fontSize:   Typography.base,
      fontWeight: Typography.medium,
      color:      Colors.error,
    },
  })