
import 'react-native-gesture-handler'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useEffect, useState } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { Session } from '@supabase/supabase-js'
import { StatusBar } from 'expo-status-bar'
import { ActivityIndicator, View } from 'react-native'
import { supabase } from '@/lib/supabase'
import { Colors } from '@/constants/theme'
import { configureGoogleSignIn } from '@/lib/auth'

function useProtectedRoute(session: Session | null, loading: boolean) {
  const segments = useSegments()
  const router   = useRouter()

  useEffect(() => {
    if (loading) return
    const inAuthGroup = segments[0] === '(auth)'
    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login')
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)')
    }
  }, [session, segments, loading])
}

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useProtectedRoute(session, loading)

  useEffect(() => {
    configureGoogleSignIn()
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setSession(session)
    )
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <View style={{
      flex:            1,
      backgroundColor: Colors.background,
      alignItems:      'center',
      justifyContent:  'center',
    }}>
      <ActivityIndicator color={Colors.primary} size="large" />
    </View>
  )

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" backgroundColor={Colors.background} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)"          />
        <Stack.Screen name="(auth)"          />
        <Stack.Screen name="course/[id]"     />
        <Stack.Screen name="results"  options={{ headerShown: false }} />
        <Stack.Screen name="study/[id]" />
        <Stack.Screen name="course/create" options={{ headerShown: false }}/>
      </Stack>
    </GestureHandlerRootView>
  )
}