

import { useState, useCallback } from 'react'
import * as WebBrowser           from 'expo-web-browser'
import { supabase }              from '@/lib/supabase'

WebBrowser.maybeCompleteAuthSession()

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

  // ── Check existing session ──
  const checkExistingSession = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.provider_token) {
        setToken(session.provider_token)
        setBreadcrumbs([{ id: 'root', name: 'Drive' }])
        await fetchFiles(session.provider_token, 'root')
        return true
      }
      return false
    } catch {
      return false
    }
  }, [fetchFiles])

  // ── Sign in ──
  const signIn = useCallback(async () => {
    try {
      setError(null)
      setLoading(true)

      const { data: { session } } = await supabase.auth.getSession()
      if (session?.provider_token) {
        setToken(session.provider_token)
        setBreadcrumbs([{ id: 'root', name: 'Drive' }])
        await fetchFiles(session.provider_token, 'root')
        return
      }

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes:              'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/documents.readonly',
          redirectTo:          'memo://auth/callback',
          skipBrowserRedirect: true,
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

        if (!providerToken) {
          throw new Error(
            'No Drive token received. Make sure drive.readonly scope ' +
            'is enabled in Supabase Google provider settings.'
          )
        }

        setToken(providerToken)
        setBreadcrumbs([{ id: 'root', name: 'Drive' }])
        await fetchFiles(providerToken, 'root')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [fetchFiles])

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
        const ext  = mimeType.includes('pdf')  ? '.pdf'
                   : mimeType.includes('docx') ? '.docx'
                   : '.txt'
        
        // RN's Blob doesn't support arrayBuffer() — read via FileReader instead
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

  const signOut = useCallback(() => {
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