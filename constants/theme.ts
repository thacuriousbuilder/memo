

// ─────────────────────────────────────────
// COLORS
// ─────────────────────────────────────────
export const Colors = {
  // Backgrounds
  background:   '#0d0d0d',
  card:         '#1a1a1a',
  cardElevated: '#222222',
  overlay:      'rgba(13, 13, 13, 0.85)',

  // Primary — warm purple
  primary:      '#8B7CF6',
  primaryLight: '#A78BFA',
  primaryMuted: 'rgba(139, 124, 246, 0.15)',
  primaryBorder:'rgba(139, 124, 246, 0.3)',

  // Borders
  border:       '#2a2a2a',
  borderLight:  '#333333',

  // Text
  textPrimary:  '#F2F0FF',
  textSecondary:'#7A7590',
  textMuted:    '#555555',
  textInverse:  '#ffffff',

  // Status
  success:      '#34D399',
  successMuted: 'rgba(52, 211, 153, 0.15)',
  error:        '#EF4444',
  errorMuted:   'rgba(239, 68, 68, 0.15)',
  warning:      '#F59E0B',
  warningMuted: 'rgba(245, 158, 11, 0.15)',

  // Progress
  progressTrack:'#2a2a2a',
  progressFill: '#8B7CF6',

  // Locked state
  locked:       '#2a2a2a',
  lockedText:   '#555555',

  // Tab bar
  tabActive:      '#8B7CF6',
  tabInactive:    '#555555',
  tabBackground:  '#0d0d0d',
  tabBorder:      '#2a2a2a',

  // Quiz answer states
  answerDefault:       '#1a1a1a',
  answerCorrect:       'rgba(52, 211, 153, 0.2)',
  answerWrong:         'rgba(239, 68, 68, 0.2)',
  answerBorderCorrect: '#34D399',
  answerBorderWrong:   '#EF4444',
} as const

// ─────────────────────────────────────────
// TYPOGRAPHY
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
// SPACING
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
// BORDER RADIUS
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
// SHADOWS
// ─────────────────────────────────────────
export const Shadows = {
  sm: {
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius:  3,
    elevation:     2,
  },
  md: {
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius:  8,
    elevation:     5,
  },
  lg: {
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius:  16,
    elevation:     10,
  },
  purple: {
    shadowColor:   '#8B7CF6',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius:  8,
    elevation:     8,
  },
} as const

// ─────────────────────────────────────────
// COMPONENT TOKENS
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
// PROGRESS RING SIZES
// ─────────────────────────────────────────
export const ProgressRing = {
  sm:  { size: 40,  strokeWidth: 4  },
  md:  { size: 64,  strokeWidth: 6  },
  lg:  { size: 100, strokeWidth: 8  },
  xl:  { size: 140, strokeWidth: 10 },
} as const