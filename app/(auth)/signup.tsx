
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, KeyboardAvoidingView, Platform,
    ActivityIndicator, Alert, ScrollView
  } from 'react-native'
  import { useState } from 'react'
  import { router } from 'expo-router'
  import { Ionicons, MaterialCommunityIcons, AntDesign } from '@expo/vector-icons'
  import { signUp, upsertProfile } from '@/lib/supabase'
  import { Colors, Spacing, Radius, Typography } from '@/constants/theme'
  
  export default function SignupScreen() {
    const [fullName,        setFullName]        = useState('')
    const [email,           setEmail]           = useState('')
    const [password,        setPassword]        = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword,    setShowPassword]    = useState(false)
    const [agreed,          setAgreed]          = useState(false)
    const [loading,         setLoading]         = useState(false)
  
    const handleSignup = async () => {
      if (!fullName || !email || !password || !confirmPassword) {
        Alert.alert('Missing Fields', 'Please fill in all fields.')
        return
      }
      if (password.length < 8) {
        Alert.alert('Weak Password', 'Password must be at least 8 characters.')
        return
      }
      if (password !== confirmPassword) {
        Alert.alert('Password Mismatch', 'Passwords do not match.')
        return
      }
      if (!agreed) {
        Alert.alert('Terms Required', 'Please agree to the Terms of Service.')
        return
      }
      try {
        setLoading(true)
        const data = await signUp(email.trim().toLowerCase(), password, fullName)
        if (data.user) {
          await upsertProfile(data.user.id, fullName, email.trim().toLowerCase())
        }
        Alert.alert(
          'Account Created!',
          'Please check your email to verify your account.',
          [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
        )
      } catch (err: any) {
        Alert.alert('Signup Failed', err.message ?? 'Something went wrong.')
      } finally {
        setLoading(false)
      }
    }
  
    return (
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
    
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconWrapper}>
              <MaterialCommunityIcons
                name="brain"
                size={36}
                color={Colors.primary}
              />
            </View>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.tagline}>
              Start your learning journey with MEMO
            </Text>
          </View>
  
          {/* Form */}
          <View style={styles.form}>
  
            {/* Full Name */}
            <Text style={styles.label}>Full Name</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="person-outline"
                size={18}
                color={Colors.textMuted}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="John Doe"
                placeholderTextColor={Colors.textMuted}
                value={fullName}
                onChangeText={setFullName}
                autoComplete="name"
              />
            </View>
  
            {/* Email */}
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="mail-outline"
                size={18}
                color={Colors.textMuted}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="your@email.com"
                placeholderTextColor={Colors.textMuted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
            </View>
  
            {/* Password */}
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={Colors.textMuted}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Create a password"
                textContentType="newPassword"
                autoComplete="off"
                placeholderTextColor={Colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={18}
                  color={Colors.textMuted}
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.hint}>Must be at least 8 characters</Text>
  
            {/* Confirm Password */}
            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={Colors.textMuted}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Confirm your password"
                placeholderTextColor={Colors.textMuted}
                textContentType="newPassword"
                autoComplete="off"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
            </View>
  
            {/* Terms Checkbox */}
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setAgreed(!agreed)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                {agreed && (
                  <Ionicons name="checkmark" size={12} color={Colors.textInverse} />
                )}
              </View>
              <Text style={styles.checkboxText}>
                I agree to the{' '}
                <Text style={styles.link}>Terms of Service</Text>
                {' '}and{' '}
                <Text style={styles.link}>Privacy Policy</Text>
              </Text>
            </TouchableOpacity>
  
            {/* Create Account Button */}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSignup}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading
                ? <ActivityIndicator color={Colors.textInverse} />
                : <Text style={styles.buttonText}>Create Account</Text>
              }
            </TouchableOpacity>
  
            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or sign up with</Text>
              <View style={styles.dividerLine} />
            </View>
  
            {/* Social Buttons */}
            <View style={styles.socialRow}>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => Alert.alert('Coming Soon', 'Google signup coming soon.')}
              >
                <AntDesign name="google" size={18} color={Colors.textPrimary} />
                <Text style={styles.socialText}>Google</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => Alert.alert('Coming Soon', 'Apple signup coming soon.')}
              >
                <AntDesign name="apple" size={18} color={Colors.textPrimary} />
                <Text style={styles.socialText}>Apple</Text>
              </TouchableOpacity>
            </View>
          </View>
  
          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
              <Text style={styles.footerLink}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    )
  }
  
  const styles = StyleSheet.create({
    root: {
      flex:            1,
      backgroundColor: Colors.background,
    },
    container: {
      flexGrow:          1,
      paddingHorizontal: Spacing.xl,
      paddingTop:        Spacing.xl,
      paddingBottom:     Spacing.xxxl,
    },
    backButton: {
      flexDirection: 'row',
      alignItems:    'center',
      gap:           Spacing.xs,
      marginBottom:  Spacing.lg,
    },
    backText: {
      color:    Colors.textSecondary,
      fontSize: Typography.sm,
    },
    header: {
      alignItems:   'center',
      marginBottom: Spacing.xl,
    },
    iconWrapper: {
      width:           72,
      height:          72,
      borderRadius:    Radius.xl,
      backgroundColor: Colors.primaryMuted,
      borderWidth:     1,
      borderColor:     Colors.primaryBorder,
      alignItems:      'center',
      justifyContent:  'center',
      marginBottom:    Spacing.md,
    },
    title: {
      fontSize:   Typography.xxl,
      fontWeight: Typography.extrabold,
      color:      Colors.primary,
    },
    tagline: {
      fontSize:  Typography.sm,
      color:     Colors.textSecondary,
      marginTop: Spacing.xs,
      textAlign: 'center',
    },
    form: {
      gap: Spacing.xs,
    },
    label: {
      fontSize:    Typography.sm,
      fontWeight:  Typography.medium,
      color:       Colors.textPrimary,
      marginTop:   Spacing.md,
      marginBottom: 6,
    },
    inputWrapper: {
      flexDirection:   'row',
      alignItems:      'center',
      backgroundColor: Colors.card,
      borderWidth:     1,
      borderColor:     Colors.border,
      borderRadius:    Radius.md,
    },
    inputIcon: {
      paddingLeft: Spacing.md,
    },
    input: {
      flex:              1,
      paddingVertical:   Spacing.md,
      paddingHorizontal: Spacing.sm,
      fontSize:          Typography.base,
      color:             Colors.textPrimary,
    },
    eyeIcon: {
      paddingRight: Spacing.md,
      paddingLeft:  Spacing.sm,
    },
    hint: {
      fontSize:  Typography.xs,
      color:     Colors.textMuted,
      marginTop: 4,
    },
    checkboxRow: {
      flexDirection: 'row',
      alignItems:    'center',
      gap:           Spacing.sm,
      marginTop:     Spacing.md,
    },
    checkbox: {
      width:           20,
      height:          20,
      borderRadius:    Radius.sm,
      borderWidth:     1,
      borderColor:     Colors.border,
      backgroundColor: Colors.card,
      alignItems:      'center',
      justifyContent:  'center',
    },
    checkboxChecked: {
      backgroundColor: Colors.primary,
      borderColor:     Colors.primary,
    },
    checkboxText: {
      flex:     1,
      fontSize: Typography.sm,
      color:    Colors.textSecondary,
    },
    link: {
      color:      Colors.primary,
      fontWeight: Typography.medium,
    },
    button: {
      backgroundColor: Colors.primary,
      borderRadius:    Radius.md,
      paddingVertical: Spacing.md,
      alignItems:      'center',
      marginTop:       Spacing.lg,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      fontSize:   Typography.base,
      fontWeight: Typography.semibold,
      color:      Colors.textInverse,
    },
    divider: {
      flexDirection:  'row',
      alignItems:     'center',
      marginVertical: Spacing.lg,
      gap:            Spacing.sm,
    },
    dividerLine: {
      flex:            1,
      height:          1,
      backgroundColor: Colors.border,
    },
    dividerText: {
      fontSize: Typography.xs,
      color:    Colors.textMuted,
    },
    socialRow: {
      flexDirection: 'row',
      gap:           Spacing.md,
    },
    socialButton: {
      flex:            1,
      flexDirection:   'row',
      alignItems:      'center',
      justifyContent:  'center',
      gap:             Spacing.sm,
      backgroundColor: Colors.card,
      borderWidth:     1,
      borderColor:     Colors.border,
      borderRadius:    Radius.md,
      paddingVertical: Spacing.md,
    },
    socialText: {
      color:      Colors.textPrimary,
      fontSize:   Typography.sm,
      fontWeight: Typography.medium,
    },
    footer: {
      flexDirection:  'row',
      justifyContent: 'center',
      marginTop:      Spacing.xxl,
    },
    footerText: {
      color:    Colors.textSecondary,
      fontSize: Typography.sm,
    },
    footerLink: {
      color:      Colors.primary,
      fontSize:   Typography.sm,
      fontWeight: Typography.semibold,
    },
  })