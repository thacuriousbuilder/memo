

import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'
import { AppState } from 'react-native'
import 'react-native-url-polyfill/auto'

// ─────────────────────────────────────────
// SECURE STORAGE ADAPTER
// Tokens stored in SecureStore (encrypted)
// Falls back to AsyncStorage for large values
// ─────────────────────────────────────────
const SecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(key)
    } catch {
      return await AsyncStorage.getItem(key)
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(key, value)
    } catch {
      await AsyncStorage.setItem(key, value)
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(key)
    } catch {
      await AsyncStorage.removeItem(key)
    }
  },
}

// ─────────────────────────────────────────
// SUPABASE CLIENT
// ─────────────────────────────────────────


const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage:          SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession:   true,
    detectSessionInUrl: false,
  },
})

AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh()
  } else {
    supabase.auth.stopAutoRefresh()
  }
})

// ─────────────────────────────────────────
// AUTH HELPERS
// ─────────────────────────────────────────
export const signUp = async (
  email: string,
  password: string,
  fullName: string
) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  })
  if (error) throw error
  return data
}

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw error
  return data
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error) throw error
  return session
}

export const getUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  return user
}

// ─────────────────────────────────────────
// PROFILE HELPERS
// ─────────────────────────────────────────
export const getProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

export const upsertProfile = async (
  userId: string,
  fullName: string,
  email: string
) => {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id:        userId,
      full_name: fullName,
      email:     email,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export const updatePushToken = async (
  userId: string,
  token: string
) => {
  const { error } = await supabase
    .from('profiles')
    .update({ expo_push_token: token })
    .eq('id', userId)
  if (error) throw error
}

export const updateTimezone = async (
  userId: string,
  timezone: string
) => {
  const { error } = await supabase
    .from('profiles')
    .update({ timezone })
    .eq('id', userId)
  if (error) throw error
}