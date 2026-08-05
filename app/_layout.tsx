
import 'react-native-gesture-handler'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useEffect, useState } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { Session } from '@supabase/supabase-js'
import { StatusBar } from 'expo-status-bar'
import { ActivityIndicator, View } from 'react-native'
import * as Notifications from 'expo-notifications'
import { supabase } from '@/lib/supabase'
import { Colors } from '@/constants/theme'
import { configureGoogleSignIn } from '@/lib/auth'
import { setupNotificationChannel, getPermissionStatus, registerForPushNotifications } from '@/lib/notifications'

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
  const router = useRouter()

  useProtectedRoute(session, loading)

  useEffect(() => {
    configureGoogleSignIn()
    setupNotificationChannel()
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

  // Re-sync push token/timezone on launch — cheap and idempotent, catches
  // a user traveling to a new timezone without re-visiting a reminder screen.
  useEffect(() => {
    const userId = session?.user?.id
    if (!userId) return
    getPermissionStatus().then(status => {
      if (status === 'granted') registerForPushNotifications(userId)
    })
  }, [session?.user?.id])

  // Tap on a reminder push → open the relevant course.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as { course_id?: string }
      if (data?.course_id) router.push(`/course/${data.course_id}`)
    })
    return () => sub.remove()
  }, [router])

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