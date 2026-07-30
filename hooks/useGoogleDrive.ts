
import { useState, useCallback } from 'react'
import * as WebBrowser           from 'expo-web-browser'
import * as SecureStore          from 'expo-secure-store'
import { supabase }              from '@/lib/supabase'

WebBrowser.maybeCompleteAuthSession()

const API_URL = process.env.EXPO_PUBLIC_API_URL!

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────
export interface DriveFile {
  id:       string
  name:     string
  mimeType: string
  size:     string
  isFolder: boolean
}

export interface BreadcrumbEntry {
  id:   string
  name: string
}

interface StoredCredentials {
  providerToken: string
  refreshToken:  string | null
  expiresAt:     number
}

// ─────────────────────────────────────────
// SECURE STORAGE — Drive credentials
// ─────────────────────────────────────────
const KEYS = {
  token:   'drive_provider_token',
  refresh: 'drive_refresh_token',
  expiry:  'drive_token_expiry',
}

async function saveCredentials(providerToken: string, refreshToken: string | null, expiresInSec: number) {
  const expiresAt = Date.now() + expiresInSec * 1000
  await SecureStore.setItemAsync(KEYS.token, providerToken)
  await SecureStore.setItemAsync(KEYS.expiry, String(expiresAt))
  if (refreshToken) {
    await SecureStore.setItemAsync(KEYS.refresh, refreshToken)
  }
}

async function loadCredentials(): Promise<StoredCredentials | null> {
  const [providerToken, refreshToken, expiryStr] = await Promise.all([
    SecureStore.getItemAsync(KEYS.token),
    SecureStore.getItemAsync(KEYS.refresh),
    SecureStore.getItemAsync(KEYS.expiry),
  ])
  if (!providerToken || !expiryStr) return null
  return { providerToken, refreshToken, expiresAt: Number(expiryStr) }
}

async function clearCredentials() {
  await SecureStore.deleteItemAsync(KEYS.token)
  await SecureStore.deleteItemAsync(KEYS.refresh)
  await SecureStore.deleteItemAsync(KEYS.expiry)
}

// ─────────────────────────────────────────
// REFRESH ACCESS TOKEN — via backend proxy
// ─────────────────────────────────────────
async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch(`${API_URL}/auth/google/refresh`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ refresh_token: refreshToken }),
  })
  if (!res.ok) throw new Error('Failed to refresh Drive access.')
  return res.json()
}

// ─────────────────────────────────────────
// QUERY BUILDING BLOCKS
// ─────────────────────────────────────────
const FOLDER_MIME = "mimeType='application/vnd.google-apps.folder'"

const DOC_MIME = [
  "mimeType='application/pdf'",
  "mimeType='text/plain'",
  "mimeType='application/vnd.openxmlformats-officedocument.wordprocessingml.document'",
  "mimeType='application/vnd.google-apps.document'",
].join(' or ')

// ─────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────
export function useGoogleDrive() {
  const [token,       setToken]       = useState<string | null>(null)
  const [files,        setFiles]      = useState<DriveFile[]>([])
  const [breadcrumbs,  setBreadcrumbs] = useState<BreadcrumbEntry[]>([
    { id: 'root', name: 'Drive' },
  ])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  // ── Fetch files + folders inside a given folder ──
  const fetchFiles = useCallback(async (
    accessToken: string,
    folderId:    string
  ) => {
    try {
      setLoading(true)
      setError(null)

      const q = `'${folderId}' in parents and trashed=false and (${FOLDER_MIME} or ${DOC_MIME})`
      const searchParams = new URLSearchParams({
        q,
        fields:   'files(id,name,mimeType,size)',
        orderBy:  'folder,modifiedTime desc',
        pageSize: '100',
      })

      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?${searchParams.toString()}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )

      if (res.status === 401) {
        setToken(null)
        throw new Error('Session expired. Please reconnect Google Drive.')
      }
      if (!res.ok) throw new Error('Failed to fetch Drive files.')

      const data = await res.json()
      const mapped: DriveFile[] = (data.files ?? []).map((f: any) => ({
        ...f,
        isFolder: f.mimeType === 'application/vnd.google-apps.folder',
      }))
      setFiles(mapped)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Restore a previous session silently, refreshing if needed ──
  const restoreSession = useCallback(async (): Promise<boolean> => {
    try {
      const creds = await loadCredentials()
      if (!creds) return false

      const isExpired = Date.now() >= creds.expiresAt - 60_000

      let activeToken = creds.providerToken

      if (isExpired) {
        if (!creds.refreshToken) {
          await clearCredentials()
          return false
        }
        const refreshed = await refreshAccessToken(creds.refreshToken)
        activeToken = refreshed.access_token
        await saveCredentials(activeToken, creds.refreshToken, refreshed.expires_in)
      }

      setToken(activeToken)
      setBreadcrumbs([{ id: 'root', name: 'Drive' }])
      await fetchFiles(activeToken, 'root')
      return true
    } catch {
      await clearCredentials()
      return false
    }
  }, [fetchFiles])

  const checkExistingSession = restoreSession

  // ── Sign in ──
  const signIn = useCallback(async () => {
    try {
      setError(null)
      setLoading(true)

      const restored = await restoreSession()
      if (restored) return

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes:              'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/documents.readonly',
          redirectTo:          'memo://auth/callback',
          skipBrowserRedirect: true,
          queryParams: {
            access_type: 'offline',
            prompt:      'consent',
          },
        },
      })

      if (oauthError) throw oauthError
      if (!data.url)  throw new Error('No OAuth URL returned')

      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        'memo://auth/callback'
      )

      if (result.type === 'cancel') {
        setError('Sign in was cancelled.')
        return
      }

      if (result.type === 'success') {
        const url    = result.url
        const hash   = url.includes('#') ? url.split('#')[1] : url.split('?')[1]
        const params = new URLSearchParams(hash ?? '')

        const providerToken = params.get('provider_token')
        const refreshToken  = params.get('provider_refresh_token')
        const expiresInStr  = params.get('expires_in')
        const expiresIn     = expiresInStr ? Number(expiresInStr) : 3600


        if (!providerToken) {
          throw new Error(
            'No Drive token received. Make sure drive.readonly scope ' +
            'is enabled in Supabase Google provider settings.'
          )
        }

        await saveCredentials(providerToken, refreshToken, expiresIn)
      

        setToken(providerToken)
        setBreadcrumbs([{ id: 'root', name: 'Drive' }])
        await fetchFiles(providerToken, 'root')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [fetchFiles, restoreSession])

  // ── Navigate into a folder ──
  const navigateToFolder = useCallback((folder: DriveFile) => {
    if (!token || !folder.isFolder) return
    setBreadcrumbs(prev => [...prev, { id: folder.id, name: folder.name }])
    fetchFiles(token, folder.id)
  }, [token, fetchFiles])

  // ── Navigate back to a specific breadcrumb (or one level up if no index given) ──
  const navigateBack = useCallback((toIndex?: number) => {
    if (!token) return
    setBreadcrumbs(prev => {
      const targetIndex = toIndex ?? prev.length - 2
      if (targetIndex < 0) return prev
      const next = prev.slice(0, targetIndex + 1)
      fetchFiles(token, next[next.length - 1].id)
      return next
    })
  }, [token, fetchFiles])

  // ── Download file ──
  const downloadFile = useCallback(async (
    file: DriveFile
  ): Promise<{ uri: string; name: string; mimeType: string } | null> => {
    if (!token || file.isFolder) return null

    try {
      setLoading(true)

      let url:      string
      let fileName = file.name
      let mimeType = file.mimeType

      if (file.mimeType === 'application/vnd.google-apps.document') {
        const exportMime =
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        url      = `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=${encodeURIComponent(exportMime)}`
        mimeType = exportMime
        fileName = file.name.endsWith('.docx') ? file.name : `${file.name}.docx`
      } else {
        url = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) throw new Error('Failed to download file from Drive.')

      const blob = await res.blob()
      const ext  = mimeType.includes('pdf')
        ? '.pdf'
        : mimeType.includes('wordprocessingml') || mimeType.includes('msword')
        ? '.docx'
        : '.txt'

      const arrayBuffer: ArrayBuffer = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload  = () => resolve(reader.result as ArrayBuffer)
        reader.onerror = () => reject(new Error('Failed to read downloaded file.'))
        reader.readAsArrayBuffer(blob)
      })

      const { File, Paths } = await import('expo-file-system/next')
      const tempFile = new File(Paths.cache, `drive_${Date.now()}${ext}`)
      await tempFile.write(new Uint8Array(arrayBuffer))

      return { uri: tempFile.uri, name: fileName, mimeType }
    } catch (err: any) {
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [token])

  const signOut = useCallback(async () => {
    await clearCredentials()
    setToken(null)
    setFiles([])
    setBreadcrumbs([{ id: 'root', name: 'Drive' }])
  }, [])

  return {
    isSignedIn: !!token,
    token,
    files,
    breadcrumbs,
    loading,
    error,
    signIn,
    signOut,
    downloadFile,
    checkExistingSession,
    navigateToFolder,
    navigateBack,
    refetchFiles: () => token
      ? fetchFiles(token, breadcrumbs[breadcrumbs.length - 1].id)
      : undefined,
  }
}