
import * as FileSystem from 'expo-file-system'
import { FileType } from '@/types'

// ─────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────
const BUCKET_NAME = process.env.EXPO_PUBLIC_S3_BUCKET!
const REGION      = process.env.EXPO_PUBLIC_AWS_REGION!
const API_URL     = process.env.EXPO_PUBLIC_API_URL!

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────
export interface UploadResult {
  s3_key:    string
  file_name: string
  file_type: FileType
  file_size: number
}

export interface PresignedUrlResponse {
  upload_url: string
  s3_key:     string
}

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
export const getFileType = (uri: string): FileType => {
  const ext = uri.split('.').pop()?.toLowerCase()
  if (ext === 'pdf')  return 'pdf'
  if (ext === 'docx') return 'docx'
  return 'txt'
}

export const buildS3Key = (
  userId:   string,
  lessonId: string,
  fileName: string
): string => {
  const timestamp = Date.now()
  const clean     = fileName.replace(/\s+/g, '_')
  return `notes/${userId}/${lessonId}/${timestamp}_${clean}`
}

export const getS3Url = (s3Key: string): string => {
  return `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/${s3Key}`
}

// ─────────────────────────────────────────
// PRESIGNED URL
// ─────────────────────────────────────────
export const getPresignedUrl = async (
  s3Key:       string,
  contentType: string,
  userId:      string
): Promise<PresignedUrlResponse> => {
  const response = await fetch(`${API_URL}/files/presign`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ s3_key: s3Key, content_type: contentType, user_id: userId }),
  })
  if (!response.ok) throw new Error('Failed to get presigned URL')
  return response.json()
}

// ─────────────────────────────────────────
// UPLOAD TO S3 — fetch blob approach
// Works across all expo-file-system versions
// ─────────────────────────────────────────
export const uploadFileToS3 = async (
  fileUri:      string,
  presignedUrl: string,
  contentType:  string
): Promise<void> => {
  // Read file from device filesystem as blob
  const fileResponse = await fetch(fileUri)
  const blob         = await fileResponse.blob()

  // PUT blob directly to S3 presigned URL
  const upload = await fetch(presignedUrl, {
    method:  'PUT',
    headers: { 'Content-Type': contentType },
    body:    blob,
  })

  if (!upload.ok) {
    throw new Error(`S3 upload failed with status: ${upload.status}`)
  }
}

// ─────────────────────────────────────────
// MAIN UPLOAD FUNCTION
// ─────────────────────────────────────────
export const uploadNote = async (
  fileUri:  string,
  fileName: string,
  userId:   string,
  lessonId: string,
): Promise<UploadResult> => {
  const fileType    = getFileType(fileUri)
  const contentType = getContentType(fileType)
  const s3Key       = buildS3Key(userId, lessonId, fileName)

  // Step 1 — get presigned URL from backend
  const { upload_url } = await getPresignedUrl(s3Key, contentType, userId)

  // Step 2 — upload to S3
  await uploadFileToS3(fileUri, upload_url, contentType)

  // Step 3 — get file size via getInfoAsync (correct API)
  const fileInfo = await FileSystem.getInfoAsync(fileUri)
  const fileSize = fileInfo.exists ? (fileInfo as any).size ?? 0 : 0

  return { s3_key: s3Key, file_name: fileName, file_type: fileType, file_size: fileSize }
}

// ─────────────────────────────────────────
// DELETE FILE
// ─────────────────────────────────────────
export const deleteNote = async (
  s3Key:  string,
  userId: string
): Promise<void> => {
  const response = await fetch(`${API_URL}/files/delete`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ s3_key: s3Key, user_id: userId }),
  })
  if (!response.ok) throw new Error('Failed to delete file from S3')
}

// ─────────────────────────────────────────
// CONTENT TYPE MAP
// ─────────────────────────────────────────
export const getContentType = (fileType: FileType): string => {
  const map: Record<FileType, string> = {
    pdf:  'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    txt:  'text/plain',
  }
  return map[fileType]
}