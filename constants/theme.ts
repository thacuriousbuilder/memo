// constants/theme.ts

// ─────────────────────────────────────────
// COLORS
// ─────────────────────────────────────────
export const Colors = {
    // Backgrounds
    background:     '#0a1419',
    card:           '#0f1f26',
    cardElevated:   '#132830',
    overlay:        'rgba(10, 20, 25, 0.85)',
  
    // Primary
    primary:        '#06B6D4',
    primaryLight:   '#22D3EE',
    primaryMuted:   'rgba(6, 182, 212, 0.15)',
    primaryBorder:  'rgba(6, 182, 212, 0.3)',
  
    // Borders
    border:         '#1e3a44',
    borderLight:    '#254d5a',
  
    // Text
    textPrimary:    '#F0FAFB',
    textSecondary:  '#7AACB8',
    textMuted:      '#4A7A88',
    textInverse:    '#0a1419',
  
    // Status
    success:        '#10B981',
    successMuted:   'rgba(16, 185, 129, 0.15)',
    error:          '#EF4444',
    errorMuted:     'rgba(239, 68, 68, 0.15)',
    warning:        '#F59E0B',
    warningMuted:   'rgba(245, 158, 11, 0.15)',
  
    // Progress
    progressTrack:  '#1e3a44',
    progressFill:   '#06B6D4',
  
    // Locked state
    locked:         '#254d5a',
    lockedText:     '#4A7A88',
  
    // Tab bar
    tabActive:      '#06B6D4',
    tabInactive:    '#4A7A88',
    tabBackground:  '#0a1419',
    tabBorder:      '#1e3a44',
  
    // Quiz answer states
    answerDefault:  '#0f1f26',
    answerCorrect:  'rgba(16, 185, 129, 0.2)',
    answerWrong:    'rgba(239, 68, 68, 0.2)',
    answerBorderCorrect: '#10B981',
    answerBorderWrong:   '#EF4444',
  } as const
  
  // ─────────────────────────────────────────
  // TYPOGRAPHY
  // ─────────────────────────────────────────
  export const Typography = {
    // Font sizes
    xs:   11,
    sm:   13,
    base: 15,
    md:   17,
    lg:   20,
    xl:   24,
    xxl:  30,
    xxxl: 36,
  
    // Font weights
    regular:    '400' as const,
    medium:     '500' as const,
    semibold:   '600' as const,
    bold:       '700' as const,
    extrabold:  '800' as const,
  
    // Line heights
    tight:      1.2,
    normal:     1.5,
    relaxed:    1.75,
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
    sm:     6,
    md:     10,
    lg:     14,
    xl:     20,
    xxl:    28,
    full:   9999,
  } as const
  
  // ─────────────────────────────────────────
  // SHADOWS
  // ─────────────────────────────────────────
  export const Shadows = {
    sm: {
      shadowColor:   '#000',
      shadowOffset:  { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius:  3,
      elevation:     2,
    },
    md: {
      shadowColor:   '#000',
      shadowOffset:  { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius:  8,
      elevation:     5,
    },
    lg: {
      shadowColor:   '#000',
      shadowOffset:  { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius:  16,
      elevation:     10,
    },
  } as const
  
  // ─────────────────────────────────────────
  // COMPONENT TOKENS
  // ─────────────────────────────────────────
  
  // Reusable card style base
  export const CardBase = {
    backgroundColor: Colors.card,
    borderRadius:    Radius.lg,
    borderWidth:     1,
    borderColor:     Colors.border,
    ...Shadows.sm,
  } as const
  
  // Primary button base
  export const ButtonPrimary = {
    backgroundColor: Colors.primary,
    borderRadius:    Radius.md,
    paddingVertical: Spacing.md,
    alignItems:      'center' as const,
    justifyContent:  'center' as const,
  }
  
  // Ghost button base
  export const ButtonGhost = {
    borderWidth:     1,
    borderColor:     Colors.primaryBorder,
    borderRadius:    Radius.md,
    paddingVertical: Spacing.md,
    alignItems:      'center' as const,
    justifyContent:  'center' as const,
  }
  
  // ─────────────────────────────────────────
  // PROGRESS RING SIZES
  // ─────────────────────────────────────────
  export const ProgressRing = {
    sm:  { size: 40,  strokeWidth: 4  },
    md:  { size: 64,  strokeWidth: 6  },
    lg:  { size: 100, strokeWidth: 8  },
    xl:  { size: 140, strokeWidth: 10 },
  } as const