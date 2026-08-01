

import {
  View, Text, TouchableOpacity,
  StyleSheet, Modal
} from 'react-native'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { Colors, Spacing, Radius, Typography } from '@/constants/theme'

interface Props {
  visible:       boolean
  onClose:       () => void
  onSelectQuiz:  () => void
  onSelectBlurt: () => void
}

export default function StudyModeSheet({
  visible, onClose, onSelectQuiz, onSelectBlurt
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          onPress={onClose}
          activeOpacity={1}
        />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <Text style={styles.title}>Study mode</Text>

          {/* Quiz */}
          <TouchableOpacity
            style={styles.option}
            onPress={() => { onClose(); setTimeout(onSelectQuiz, 300) }}
            activeOpacity={0.8}
          >
            <View style={[styles.optionIcon, { backgroundColor: Colors.primaryMuted }]}>
              <Ionicons name="checkbox-outline" size={22} color={Colors.primary} />
            </View>
            <View style={styles.optionInfo}>
              <Text style={styles.optionTitle}>Quiz</Text>
              <Text style={styles.optionSub}>Answer questions on this material</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Blurt */}
          <TouchableOpacity
            style={styles.option}
            onPress={() => { onClose(); setTimeout(onSelectBlurt, 300) }}
            activeOpacity={0.8}
          >
            <View style={[styles.optionIcon, { backgroundColor: 'rgba(52, 211, 153, 0.15)' }]}>
              <MaterialCommunityIcons name="account-voice" size={22} color={Colors.success} />
            </View>
            <View style={styles.optionInfo}>
              <Text style={styles.optionTitle}>Blurt</Text>
              <Text style={styles.optionSub}>
                Free-recall one topic, MEMO picks one for you if nothing specific is selected
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </TouchableOpacity>

          {/* Cancel */}
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex:           1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor:      Colors.card,
    borderTopLeftRadius:  Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    paddingBottom:        Spacing.xxxl,
    paddingHorizontal:    Spacing.base,
    gap:                  Spacing.xs,
  },
  handle: {
    width:           40,
    height:          4,
    backgroundColor: Colors.border,
    borderRadius:    Radius.full,
    alignSelf:       'center',
    marginTop:       Spacing.sm,
    marginBottom:    Spacing.md,
  },
  title: {
    fontSize:          Typography.xs,
    fontWeight:        Typography.bold,
    color:             Colors.textSecondary,
    letterSpacing:     1,
    paddingHorizontal: Spacing.sm,
    marginBottom:      Spacing.sm,
  },
  option: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingVertical:   Spacing.md,
    paddingHorizontal: Spacing.sm,
    gap:               Spacing.md,
    borderRadius:      Radius.lg,
  },
  optionIcon: {
    width:          48,
    height:         48,
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
  optionSub: {
    fontSize:  Typography.xs,
    color:     Colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height:           1,
    backgroundColor:  Colors.border + '66',
    marginHorizontal: Spacing.sm,
  },
  cancelBtn: {
    marginTop:       Spacing.md,
    paddingVertical: Spacing.md,
    alignItems:      'center',
    backgroundColor: Colors.cardElevated,
    borderRadius:    Radius.md,
    borderWidth:     1,
    borderColor:     Colors.border,
  },
  cancelText: {
    fontSize:   Typography.base,
    fontWeight: Typography.medium,
    color:      Colors.textSecondary,
  },
})
