

import {
    View, Text, TouchableOpacity, StyleSheet
  } from 'react-native'
  import { Ionicons }  from '@expo/vector-icons'
  import { Colors, Spacing, Radius, Typography } from '@/constants/theme'
  
  interface Props {
    icon:        string
    title:       string
    subtitle:    string
    actionLabel?: string
    onAction?:   () => void
  }
  
  export default function EmptyState({
    icon, title, subtitle, actionLabel, onAction
  }: Props) {
    return (
      <View style={styles.container}>
        <View style={styles.iconWrapper}>
          <Ionicons
            name={icon as any}
            size={40}
            color={Colors.textMuted}
          />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        {actionLabel && onAction && (
          <TouchableOpacity
            style={styles.button}
            onPress={onAction}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>{actionLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    )
  }
  
  const styles = StyleSheet.create({
    container: {
      flex:           1,
      alignItems:     'center',
      justifyContent: 'center',
      paddingHorizontal: Spacing.xxxl,
      gap:            Spacing.md,
    },
    iconWrapper: {
      width:           80,
      height:          80,
      borderRadius:    Radius.full,
      backgroundColor: Colors.card,
      borderWidth:     1,
      borderColor:     Colors.border,
      alignItems:      'center',
      justifyContent:  'center',
      marginBottom:    Spacing.sm,
    },
    title: {
      fontSize:   Typography.lg,
      fontWeight: Typography.bold,
      color:      Colors.textPrimary,
      textAlign:  'center',
    },
    subtitle: {
      fontSize:  Typography.sm,
      color:     Colors.textSecondary,
      textAlign: 'center',
      lineHeight: Typography.sm * 1.6,
    },
    button: {
      backgroundColor:   Colors.primary,
      borderRadius:      Radius.md,
      paddingVertical:   Spacing.md,
      paddingHorizontal: Spacing.xl,
      marginTop:         Spacing.sm,
    },
    buttonText: {
      fontSize:   Typography.base,
      fontWeight: Typography.semibold,
      color:      Colors.textInverse,
    },
  })