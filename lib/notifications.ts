import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { updatePushToken, updateTimezone } from '@/lib/supabase'

const ANDROID_CHANNEL_ID = 'reminders'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert:  true,
    shouldPlaySound:  true,
    shouldSetBadge:   false,
    shouldShowBanner: true,
    shouldShowList:   true,
  }),
})

export async function setupNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name:              'Study Reminders',
    importance:        Notifications.AndroidImportance.DEFAULT,
    vibrationPattern:  [0, 250, 250, 250],
  })
}

export async function getPermissionStatus(): Promise<Notifications.PermissionStatus> {
  const { status } = await Notifications.getPermissionsAsync()
  return status
}

export async function requestPermission(): Promise<boolean> {
  if (!Device.isDevice) return false
  const existing = await Notifications.getPermissionsAsync()
  if (existing.status === 'granted') return true
  if (existing.status === 'denied' && !existing.canAskAgain) return false
  const { status } = await Notifications.requestPermissionsAsync()
  return status === 'granted'
}

// Server owns all scheduling — this just registers the device so the
// backend's cron-driven sender (memo-backend /notifications/send-study-reminders)
// can reach it. Safe to call repeatedly (idempotent writes).
export async function registerForPushNotifications(userId: string): Promise<void> {
  const granted = await getPermissionStatus() === 'granted'
  if (!granted) return

  const projectId = Constants.expoConfig?.extra?.eas?.projectId
  if (!projectId) return

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId })
    await updatePushToken(userId, token)

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (timezone) await updateTimezone(userId, timezone)
  } catch (err) {
    console.warn('[registerForPushNotifications] failed:', err)
  }
}
