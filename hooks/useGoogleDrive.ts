

import { useState, useCallback } from 'react'
import * as WebBrowser           from 'expo-web-browser'
import { supabase }              from '@/lib/supabase'
import { File, Paths }           from 'expo-file-system/next'

WebBrowser.maybeCompleteAuthSession()

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────
export interface DriveFile {
  id:       string
  name:     string
  mimeType: string
  size:     string
}

// ─────────────────────────────────────────
// SUPPORTED MIME TYPES
// ─────────────────────────────────────────
const SUPPORTED_TYPES = [
  'application/pdf',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.google-apps.document',
]

const MIME_QUERY = SUPPORTED_TYPES
  .map(t => `mimeType='${t}'`)
  .join(' or ')

// ─────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────
export function useGoogleDrive() {
  const [token,   setToken]   = useState<string | null>(null)
  const [files,   setFiles]   = useState<DriveFile[]>([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  // ── Get token from existing Supabase session ──
  const getTokenFromSession = useCallback(async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.provider_token ?? null
  }, [])

  // ── Sign in with Google via Supabase ──
  const signIn = useCallback(async () => {
    try {
      setError(null)
      setLoading(true)

      // Check if we already have a provider token
      const existingToken = await getTokenFromSession()
      if (existingToken) {
        setToken(existingToken)
        await fetchFiles(existingToken)
        return
      }

      // Trigger Google OAuth via Supabase
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes:        'https://www.googleapis.com/auth/drive.readonly',
          redirectTo:     'memo://auth/callback',
          skipBrowserRedirect: true,
        },
      })

      if (oauthError) throw oauthError
      if (!data.url)  throw new Error('No OAuth URL returned')

      // Open browser
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
         'memo://auth/callback'
      )

      if (result.type !== 'success') {
        setError('Google sign-in was cancelled.')
        return
      }

      // Extract tokens from URL
      const url    = new URL(result.url)
      const hash   = url.hash.substring(1)
      const params = new URLSearchParams(hash)

      const accessToken        = params.get('access_token')
      const refreshToken       = params.get('refresh_token')
      const providerToken      = params.get('provider_token')

      if (accessToken) {
        // Set session in Supabase
        await supabase.auth.setSession({
          access_token:  accessToken,
          refresh_token: refreshToken ?? '',
        })
      }

      // Use provider_token for Drive API
      const driveToken = providerToken ?? await getTokenFromSession()

      if (!driveToken) {
        throw new Error('No Drive access token received. Make sure drive.readonly scope is enabled in Supabase.')
      }

      setToken(driveToken)
      await fetchFiles(driveToken)

    } catch (err: any) {
      setError(err.message)
      console.error('Google Drive sign-in error:', err)
    } finally {
      setLoading(false)
    }
  }, [getTokenFromSession])

  // ── Fetch files ──
  const fetchFiles = useCallback(async (accessToken: string) => {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?` +
        `q=(${encodeURIComponent(MIME_QUERY)}) and trashed=false` +
        `&fields=files(id,name,mimeType,size)` +
        `&orderBy=modifiedTime desc` +
        `&pageSize=50`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )

      if (!res.ok) {
        // Token may have expired — clear it
        if (res.status === 401) {
          setToken(null)
          throw new Error('Session expired. Please reconnect Google Drive.')
        }
        throw new Error('Failed to fetch Drive files.')
      }

      const data = await res.json()
      setFiles(data.files ?? [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Download file ──
  const downloadFile = useCallback(async (
    file: DriveFile
  ): Promise<{ uri: string; name: string; mimeType: string } | null> => {
    if (!token) return null

    try {
      setLoading(true)

      let url:      string
      let fileName = file.name
      let mimeType = file.mimeType

      // Google Docs → export as DOCX
      if (file.mimeType === 'application/vnd.google-apps.document') {
        const exportMime =
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        url      = `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=${encodeURIComponent(exportMime)}`
        mimeType = exportMime
        fileName = file.name.endsWith('.docx')
          ? file.name
          : `${file.name}.docx`
      } else {
        url = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) throw new Error('Failed to download file from Drive.')

      const blob = await res.blob()

      // Write to temp file
      const ext      = mimeType.includes('pdf')  ? '.pdf'
                     : mimeType.includes('docx') ? '.docx'
                     : '.txt'
      const tempFile = new File(Paths.cache, `drive_${Date.now()}${ext}`)

      const buffer = await blob.arrayBuffer()
      await tempFile.write(new Uint8Array(buffer))

      return { uri: tempFile.uri, name: fileName, mimeType }
    } catch (err: any) {
      setError(err.message)
      console.error('Drive download error:', err)
      return null
    } finally {
      setLoading(false)
    }
  }, [token])

  // ── Sign out (Drive only — keep Supabase session) ──
  const signOut = useCallback(() => {
    setToken(null)
    setFiles([])
  }, [])

  // ── Auto-load token on mount ──
  const loadExistingToken = useCallback(async () => {
    const existing = await getTokenFromSession()
    if (existing) {
      setToken(existing)
      await fetchFiles(existing)
    }
  }, [getTokenFromSession, fetchFiles])

  return {
    isSignedIn:   !!token,
    files,
    loading,
    error,
    signIn,
    signOut,
    downloadFile,
    loadExistingToken,
    refetchFiles: () => token ? fetchFiles(token) : undefined,
  }
}