 
import { GoogleSignin } from '@react-native-google-signin/google-signin'
import * as AppleAuthentication from 'expo-apple-authentication'
import * as Crypto from 'expo-crypto'
import { supabase } from '@/lib/supabase'

export function configureGoogleSignIn() {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
  GoogleSignin.configure({ webClientId, iosClientId })
}

async function generateNonce(): Promise<[string, string]> {
  const rawNonce = Math.random().toString(36).substring(2)
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce
  )
  return [rawNonce, hashedNonce]
}

export async function signInWithGoogle() {
  await GoogleSignin.hasPlayServices()

  // Clear any stale Google session before signing in
  try {
    await GoogleSignin.signOut()
  } catch (e) {
    // ignore — not signed in is fine
  }

  const userInfo = await GoogleSignin.signIn()

  const idToken = userInfo.data?.idToken
  if (!idToken) throw new Error('No ID token returned from Google')

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
  })

  if (error) throw error
  return data
}

export async function signInWithApple() {
  const [rawNonce, hashedNonce] = await generateNonce()

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  })

  const idToken = credential.identityToken
  if (!idToken) throw new Error('No identity token returned from Apple')

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: idToken,
    nonce: rawNonce,
  })

  if (error) throw error
  return data
}