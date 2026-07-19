// components/UploadProgress.tsx

import {
    View, Text, StyleSheet, Animated, Easing
  } from 'react-native'
  import { useEffect, useRef } from 'react'
  import { Ionicons }          from '@expo/vector-icons'
  import { Colors, Spacing, Radius, Typography } from '@/constants/theme'
  import { UploadStage }       from '@/hooks/useLessons'
  
  // ─────────────────────────────────────────
  // STAGE CONFIG
  // ─────────────────────────────────────────
  const STAGES: {
    key:   UploadStage
    label: string
    icon:  string
  }[] = [
    { key: 'uploading',  label: 'Uploading notes',     icon: 'cloud-upload-outline' },
    { key: 'parsing',    label: 'Reading content',      icon: 'document-text-outline' },
    { key: 'generating', label: 'Generating questions', icon: 'flash-outline' },
  ]
  
  function getStageIndex(stage: UploadStage): number {
    return STAGES.findIndex(s => s.key === stage)
  }
  
  // ─────────────────────────────────────────
  // SPINNING ICON
  // ─────────────────────────────────────────
  function SpinningIcon({ icon }: { icon: string }) {
    const spin = useRef(new Animated.Value(0)).current
  
    useEffect(() => {
      Animated.loop(
        Animated.timing(spin, {
          toValue:         1,
          duration:        1200,
          easing:          Easing.linear,
          useNativeDriver: true,
        })
      ).start()
    }, [])
  
    const rotate = spin.interpolate({
      inputRange:  [0, 1],
      outputRange: ['0deg', '360deg'],
    })
  
    return (
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Ionicons name={icon as any} size={22} color={Colors.primary} />
      </Animated.View>
    )
  }
  
  // ─────────────────────────────────────────
  // STAGE DOT
  // ─────────────────────────────────────────
  function StageDot({
    status
  }: { status: 'done' | 'active' | 'pending' }) {
    const scale = useRef(new Animated.Value(1)).current
    const pulse = useRef(new Animated.Value(0.6)).current
  
    useEffect(() => {
      if (status === 'active') {
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulse, {
              toValue:         1,
              duration:        600,
              useNativeDriver: true,
            }),
            Animated.timing(pulse, {
              toValue:         0.6,
              duration:        600,
              useNativeDriver: true,
            }),
          ])
        ).start()
      } else {
        pulse.setValue(1)
      }
    }, [status])
  
    if (status === 'done') {
      return (
        <View style={[styles.dot, styles.dotDone]}>
          <Ionicons name="checkmark" size={10} color="#fff" />
        </View>
      )
    }
  
    if (status === 'active') {
      return (
        <Animated.View style={[
          styles.dot,
          styles.dotActive,
          { opacity: pulse }
        ]} />
      )
    }
  
    return <View style={[styles.dot, styles.dotPending]} />
  }
  
  // ─────────────────────────────────────────
  // MAIN COMPONENT
  // ─────────────────────────────────────────
  interface Props {
    stage: UploadStage
  }
  
  export default function UploadProgress({ stage }: Props) {
    const currentIndex = getStageIndex(stage)
    const labelOpacity = useRef(new Animated.Value(0)).current
    const labelY       = useRef(new Animated.Value(8)).current
  
    // Animate label change
    useEffect(() => {
      labelOpacity.setValue(0)
      labelY.setValue(8)
  
      Animated.parallel([
        Animated.timing(labelOpacity, {
          toValue:         1,
          duration:        300,
          useNativeDriver: true,
        }),
        Animated.timing(labelY, {
          toValue:         0,
          duration:        300,
          easing:          Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start()
    }, [stage])
  
    const currentStage = STAGES[currentIndex]
  
    // Progress percentage
    const progressPct = stage === 'done'
      ? 100
      : ((currentIndex + 1) / STAGES.length) * 100
  
    return (
      <View style={styles.container}>
        {/* Icon + Label */}
        <View style={styles.iconRow}>
          {currentStage && (
            <SpinningIcon icon={currentStage.icon} />
          )}
          {stage === 'done' && (
            <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
          )}
          <Animated.Text style={[
            styles.label,
            {
              opacity:   labelOpacity,
              transform: [{ translateY: labelY }],
            }
          ]}>
            {stage === 'done'
              ? '✓ Questions ready!'
              : currentStage?.label ?? ''
            }
          </Animated.Text>
        </View>
  
        {/* Progress Bar */}
        <View style={styles.progressTrack}>
          <Animated.View style={[
            styles.progressFill,
            {
              width: `${progressPct}%`,
              backgroundColor: stage === 'done'
                ? Colors.success
                : Colors.primary,
            }
          ]} />
        </View>
  
        {/* Stage Dots */}
        <View style={styles.dotsRow}>
          {STAGES.map((s, idx) => {
            const status = stage === 'done'    ? 'done'
                         : idx < currentIndex  ? 'done'
                         : idx === currentIndex ? 'active'
                         : 'pending'
            return (
              <View key={s.key} style={styles.dotWrapper}>
                <StageDot status={status} />
                <Text style={[
                  styles.dotLabel,
                  status === 'active' && styles.dotLabelActive,
                  status === 'done'   && styles.dotLabelDone,
                ]}>
                  {s.label.split(' ')[0]}
                </Text>
              </View>
            )
          })}
        </View>
      </View>
    )
  }
  
  // ─────────────────────────────────────────
  // STYLES
  // ─────────────────────────────────────────
  const styles = StyleSheet.create({
    container: {
      paddingVertical:   Spacing.lg,
      paddingHorizontal: Spacing.base,
      gap:               Spacing.md,
      alignItems:        'center',
    },
  
    // Icon + Label
    iconRow: {
      flexDirection: 'row',
      alignItems:    'center',
      gap:           Spacing.sm,
    },
    label: {
      fontSize:   Typography.base,
      fontWeight: Typography.medium,
      color:      Colors.textPrimary,
    },
  
    // Progress Bar
    progressTrack: {
      width:           '100%',
      height:          4,
      backgroundColor: Colors.progressTrack,
      borderRadius:    Radius.full,
      overflow:        'hidden',
    },
    progressFill: {
      height:          4,
      borderRadius:    Radius.full,
    },
  
    // Dots
    dotsRow: {
      flexDirection:  'row',
      justifyContent: 'space-between',
      width:          '100%',
      paddingHorizontal: Spacing.sm,
    },
    dotWrapper: {
      alignItems: 'center',
      gap:        Spacing.xs,
    },
    dot: {
      width:          16,
      height:         16,
      borderRadius:   Radius.full,
      alignItems:     'center',
      justifyContent: 'center',
    },
    dotDone: {
      backgroundColor: Colors.success,
    },
    dotActive: {
      backgroundColor: Colors.primary,
      width:           20,
      height:          20,
    },
    dotPending: {
      backgroundColor: Colors.border,
    },
    dotLabel: {
      fontSize: 10,
      color:    Colors.textMuted,
    },
    dotLabelActive: {
      color:      Colors.primary,
      fontWeight: Typography.semibold,
    },
    dotLabelDone: {
      color: Colors.success,
    },
  })