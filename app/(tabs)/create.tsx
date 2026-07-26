
import {
    View, Text, TouchableOpacity, StyleSheet
  } from 'react-native'
  import { router }   from 'expo-router'
  import { Ionicons } from '@expo/vector-icons'
  import { Colors, Spacing, Radius, Typography, CardBase } from '@/constants/theme'
  
  // ─────────────────────────────────────────
  // CREATE OPTIONS
  // ─────────────────────────────────────────
  const OPTIONS = [
    {
      id:       'course',
      icon:     'book',
      iconBg:   Colors.primary,
      title:    'Create Course',
      subtitle: 'Start a new course from scratch',
      route:    '/(course)/create',
      action:   'new_course',
    },
    {
      id:       'lesson',
      icon:     'add-circle',
      iconBg:   Colors.textMuted,
      title:    'Add Lesson',
      subtitle: 'Add a lesson to an existing course',
      route:    '/(tabs)/courses',
      action:   'new_lesson',
    },
    {
      id:       'test',
      icon:     'document-text',
      iconBg:   Colors.textMuted,
      title:    'Add Test',
      subtitle: 'Track an exam for an existing course',
      route:    '/(tabs)/courses',
      action:   'new_test',
    },
  ]
  
  export default function CreateScreen() {
    const handleOption = (option: typeof OPTIONS[0]) => {
      // Navigate to courses tab
      // In future each action can open its specific modal
      router.push('/course/create')
    }
  
    return (
      <View style={styles.root}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons
              name="chevron-back"
              size={20}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create</Text>
        </View>
  
        {/* Options */}
        <View style={styles.list}>
          {OPTIONS.map((option, index) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionRow,
                index < OPTIONS.length - 1 && styles.optionRowBorder,
              ]}
              activeOpacity={0.8}
              onPress={() => handleOption(option)}
            >
              {/* Icon */}
              <View style={[
                styles.optionIcon,
                { backgroundColor: option.iconBg + '33' }
              ]}>
                <Ionicons
                  name={option.icon as any}
                  size={22}
                  color={option.iconBg === Colors.primary
                    ? Colors.primary
                    : Colors.textSecondary
                  }
                />
              </View>
  
              {/* Text */}
              <View style={styles.optionInfo}>
                <Text style={styles.optionTitle}>{option.title}</Text>
                <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
              </View>
  
              <Ionicons
                name="chevron-forward"
                size={18}
                color={Colors.textMuted}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    )
  }
  
  const styles = StyleSheet.create({
    root: {
      flex:            1,
      backgroundColor: Colors.background,
    },
    header: {
      flexDirection:     'row',
      alignItems:        'center',
      gap:               Spacing.sm,
      paddingHorizontal: Spacing.base,
      paddingTop:        Spacing.xl + 32,
      paddingBottom:     Spacing.lg,
    },
    backButton: {
      width:           36,
      height:          36,
      borderRadius:    Radius.full,
      backgroundColor: Colors.card,
      alignItems:      'center',
      justifyContent:  'center',
      borderWidth:     1,
      borderColor:     Colors.border,
    },
    headerTitle: {
      fontSize:   Typography.xxl,
      fontWeight: Typography.bold,
      color:      Colors.textPrimary,
    },
    list: {
      marginHorizontal: Spacing.base,
      ...CardBase,
      overflow: 'hidden',
      padding:  0,
    },
    optionRow: {
      flexDirection:     'row',
      alignItems:        'center',
      paddingVertical:   Spacing.lg,
      paddingHorizontal: Spacing.base,
      gap:               Spacing.md,
    },
    optionRowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: Colors.border,
    },
    optionIcon: {
      width:          52,
      height:         52,
      borderRadius:   Radius.md,
      alignItems:     'center',
      justifyContent: 'center',
    },
    optionInfo: { flex: 1 },
    optionTitle: {
      fontSize:   Typography.base,
      fontWeight: Typography.semibold,
      color:      Colors.textPrimary,
    },
    optionSubtitle: {
      fontSize:  Typography.sm,
      color:     Colors.textSecondary,
      marginTop: 2,
    },
  })