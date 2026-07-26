

// ─────────────────────────────────────────
// COLORS
// ─────────────────────────────────────────
export const Colors = {
  // Backgrounds
  background:   '#F5F5F7',
  card:         '#FFFFFF',
  cardElevated: '#F0F0F3',
  overlay:      'rgba(0, 0, 0, 0.45)',

  // Primary — warm purple (unchanged)
  primary:      '#8B7CF6',
  primaryLight: '#A78BFA',
  primaryMuted: 'rgba(139, 124, 246, 0.12)',
  primaryBorder:'rgba(139, 124, 246, 0.3)',

  // Borders
  border:       '#E5E5EA',
  borderLight:  '#D1D1D6',

  // Text
  textPrimary:  '#1C1C1E',
  textSecondary:'#6E6E73',
  textMuted:    '#AEAEB2',
  textInverse:  '#FFFFFF',

  // Status
  success:      '#10B981',
  successMuted: 'rgba(16, 185, 129, 0.12)',
  error:        '#DC2626',
  errorMuted:   'rgba(220, 38, 38, 0.1)',
  warning:      '#D97706',
  warningMuted: 'rgba(217, 119, 6, 0.12)',

  // Progress
  progressTrack:'#E5E5EA',
  progressFill: '#8B7CF6',

  // Locked state
  locked:       '#E5E5EA',
  lockedText:   '#AEAEB2',

  // Tab bar
  tabActive:      '#8B7CF6',
  tabInactive:    '#8A8A8E',
  tabBackground:  '#FFFFFF',
  tabBorder:      '#E5E5EA',

  // Quiz answer states
  answerDefault:       '#FFFFFF',
  answerCorrect:       'rgba(16, 185, 129, 0.12)',
  answerWrong:         'rgba(220, 38, 38, 0.1)',
  answerBorderCorrect: '#10B981',
  answerBorderWrong:   '#DC2626',
} as const

// ─────────────────────────────────────────
// TYPOGRAPHY (unchanged)
// ─────────────────────────────────────────
export const Typography = {
  xs:   11,
  sm:   13,
  base: 15,
  md:   17,
  lg:   20,
  xl:   24,
  xxl:  30,
  xxxl: 36,

  regular:   '400' as const,
  medium:    '500' as const,
  semibold:  '600' as const,
  bold:      '700' as const,
  extrabold: '800' as const,

  tight:   1.2,
  normal:  1.5,
  relaxed: 1.75,
} as const

// ─────────────────────────────────────────
// SPACING (unchanged)
// ─────────────────────────────────────────
export const Spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  base: 16,
  lg:   20,
  xl:   24,
  xxl:  32,
  xxxl: 48,
} as const

// ─────────────────────────────────────────
// BORDER RADIUS (unchanged)
// ─────────────────────────────────────────
export const Radius = {
  sm:   6,
  md:   10,
  lg:   14,
  xl:   20,
  xxl:  28,
  full: 9999,
} as const

// ─────────────────────────────────────────
// SHADOWS — lightened; the old dark-mode
// shadow opacities look muddy on white cards
// ─────────────────────────────────────────
export const Shadows = {
  sm: {
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius:  3,
    elevation:     2,
  },
  md: {
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius:  8,
    elevation:     5,
  },
  lg: {
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius:  16,
    elevation:     10,
  },
  purple: {
    shadowColor:   '#8B7CF6',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius:  8,
    elevation:     8,
  },
} as const

// ─────────────────────────────────────────
// COMPONENT TOKENS (unchanged — reference Colors dynamically)
// ─────────────────────────────────────────
export const CardBase = {
  backgroundColor: Colors.card,
  borderRadius:    Radius.lg,
  borderWidth:     1,
  borderColor:     Colors.border,
  ...Shadows.sm,
} as const

export const ButtonPrimary = {
  backgroundColor: Colors.primary,
  borderRadius:    Radius.md,
  paddingVertical: Spacing.md,
  alignItems:      'center' as const,
  justifyContent:  'center' as const,
} as const

export const ButtonGhost = {
  borderWidth:     1,
  borderColor:     Colors.primaryBorder,
  borderRadius:    Radius.md,
  paddingVertical: Spacing.md,
  alignItems:      'center' as const,
  justifyContent:  'center' as const,
} as const

// ─────────────────────────────────────────
// PROGRESS RING SIZES (unchanged)
// ─────────────────────────────────────────
export const ProgressRing = {
  sm:  { size: 40,  strokeWidth: 4  },
  md:  { size: 64,  strokeWidth: 6  },
  lg:  { size: 100, strokeWidth: 8  },
  xl:  { size: 140, strokeWidth: 10 },
} as const