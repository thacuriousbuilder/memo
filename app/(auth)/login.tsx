
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, KeyboardAvoidingView, Platform,
    ActivityIndicator, Alert, ScrollView
  } from 'react-native'
  import { useState } from 'react'
  import { router } from 'expo-router'
  import { Ionicons, MaterialCommunityIcons, AntDesign } from '@expo/vector-icons'
  import { signIn } from '@/lib/supabase'
  import { Colors, Spacing, Radius, Typography } from '@/constants/theme'
  
  export default function LoginScreen() {
    const [email,        setEmail]        = useState('')
    const [password,     setPassword]     = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading,      setLoading]      = useState(false)
  
    const handleLogin = async () => {
      if (!email || !password) {
        Alert.alert('Missing fields', 'Please enter your email and password.')
        return
      }
      try {
        setLoading(true)
        await signIn(email.trim().toLowerCase(), password)
        router.replace('/(tabs)')
      } catch (err: any) {
        Alert.alert('Login Failed', err.message ?? 'Something went wrong.')
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
        >
          {/* Logo */}
          <View style={styles.header}>
            <View style={styles.iconWrapper}>
              <MaterialCommunityIcons
                name="brain"
                size={36}
                color={Colors.primary}
              />
            </View>
            <Text style={styles.logo}>MEMO</Text>
            <Text style={styles.tagline}>
              Welcome back! Sign in to continue learning.
            </Text>
          </View>
  
          {/* Form */}
          <View style={styles.form}>
  
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
                placeholder="Enter your password"
                placeholderTextColor={Colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="password"
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
  
            {/* Forgot Password */}
            <TouchableOpacity
              style={styles.forgotWrapper}
              onPress={() => Alert.alert('Coming Soon', 'Password reset coming soon.')}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
  
            {/* Sign In Button */}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading
                ? <ActivityIndicator color={Colors.textInverse} />
                : <Text style={styles.buttonText}>Sign In</Text>
              }
            </TouchableOpacity>
  
            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>
  
            {/* Social Buttons */}
            <View style={styles.socialRow}>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => Alert.alert('Coming Soon', 'Google login coming soon.')}
              >
                <AntDesign name="google" size={18} color={Colors.textPrimary} />
                <Text style={styles.socialText}>Google</Text>
              </TouchableOpacity>
  
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => Alert.alert('Coming Soon', 'Apple login coming soon.')}
              >
                <AntDesign name="apple" size={18} color={Colors.textPrimary} />
                <Text style={styles.socialText}>Apple</Text>
              </TouchableOpacity>
            </View>
          </View>
  
          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
              <Text style={styles.footerLink}>Sign up</Text>
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
      justifyContent:    'center',
      paddingHorizontal: Spacing.xl,
      paddingVertical:   Spacing.xxxl,
    },
    header: {
      alignItems:   'center',
      marginBottom: Spacing.xxxl,
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
    logo: {
      fontSize:      Typography.xxl,
      fontWeight:    Typography.extrabold,
      color:         Colors.primary,
      letterSpacing: 4,
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
      color:       Colors.textSecondary,
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
    forgotWrapper: {
      alignSelf:  'flex-end',
      marginTop:  Spacing.sm,
    },
    forgotText: {
      color:      Colors.primary,
      fontSize:   Typography.sm,
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