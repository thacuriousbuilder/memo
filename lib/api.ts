

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000'

// ─────────────────────────────────────────
// BASE FETCH WRAPPER
// ─────────────────────────────────────────
async function request<T>(
  path:    string,
  options: RequestInit = {}
): Promise<T> {
  const url      = `${BASE_URL}${path}`
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.detail ?? `Request failed: ${response.status}`)
  }

  return data as T
}

// ─────────────────────────────────────────
// FILES
// ─────────────────────────────────────────
export const FilesAPI = {

  presign: (params: {
    s3_key:       string
    content_type: string
    user_id:      string
  }) =>
    request<{ upload_url: string; s3_key: string }>('/files/presign', {
      method: 'POST',
      body:   JSON.stringify(params),
    }),

  parse: (params: {
    s3_key:    string
    user_id:   string
    note_id:   string
    file_type: string
  }) =>
    request<{
      note_id:     string
      parsed_text: string
      word_count:  number
    }>('/files/parse', {
      method: 'POST',
      body:   JSON.stringify(params),
    }),

  delete: (params: { s3_key: string; user_id: string }) =>
    request<{ success: boolean; s3_key: string }>('/files/delete', {
      method: 'POST',
      body:   JSON.stringify(params),
    }),

  // ── Smart Import ──
  analyzeStructure: (params: {
    course_name: string
    files: {
      file_name:   string
      parsed_text: string
      note_id:     string
    }[]
  }) =>
    request<{
      structure: {
        sections: {
          title:   string
          lessons: {
            title:       string
            file_index:  number
            sub_lessons: { title: string }[]
          }[]
        }[]
      }
    }>('/files/analyze-structure', {
      method: 'POST',
      body:   JSON.stringify(params),
    }),
}

// ─────────────────────────────────────────
// QUIZ
// ─────────────────────────────────────────
export const QuizAPI = {

  generate: (params: {
    note_id:        string
    user_id:        string
    question_count: 5 | 10 | 15
    lesson_id?:     string | null
    sub_lesson_id?: string | null
  }) =>
    request<{
      note_id:   string
      questions: QuizQuestion[]
      count:     number
    }>('/quiz/generate', {
      method: 'POST',
      body:   JSON.stringify(params),
    }),

  fetch: (note_id: string) =>
    request<{
      note_id:   string
      questions: any[]
      count:     number
    }>(`/quiz/${note_id}`),

  regenerate: (params: {
    note_id:        string
    user_id:        string
    question_count: 5 | 10 | 15
    lesson_id?:     string | null
    sub_lesson_id?: string | null
  }) =>
    request<{
      note_id:   string
      questions: QuizQuestion[]
      count:     number
    }>('/quiz/regenerate', {
      method: 'POST',
      body:   JSON.stringify(params),
    }),
}

// ─────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────
export const NotificationsAPI = {

  send: (params: {
    user_id: string
    title:   string
    body:    string
    data?:   Record<string, any>
  }) =>
    request<{ success: boolean; sent_to: number }>('/notifications/send', {
      method: 'POST',
      body:   JSON.stringify(params),
    }),
}

// ─────────────────────────────────────────
// EXAMS
// ─────────────────────────────────────────
export const ExamsAPI = {

  create: (params: {
    user_id:             string
    course_id:           string
    title:               string
    exam_type:           string
    exam_date:           string
    location?:           string
    notes?:              string
    remind_days_before?: number
  }) =>
    request<any>('/notifications/exams', {
      method: 'POST',
      body:   JSON.stringify(params),
    }),

  getByCourse: (course_id: string) =>
    request<any[]>(`/notifications/exams/course/${course_id}`),

  getByUser: (user_id: string) =>
    request<any[]>(`/notifications/exams/user/${user_id}`),

  updateStatus: (exam_id: string, params: {
    status: string
    score?: number
  }) =>
    request<any>(`/notifications/exams/${exam_id}`, {
      method: 'PATCH',
      body:   JSON.stringify(params),
    }),

  delete: (exam_id: string) =>
    request<{ success: boolean }>(`/notifications/exams/${exam_id}`, {
      method: 'DELETE',
    }),
}

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────
export interface QuizQuestion {
  question_text:        string
  correct_option_index: number
  explanation:          string
  topic:                string
  difficulty:           'easy' | 'medium' | 'hard'
  question_type:        'recall' | 'comprehension' | 'application'
  source_quote:         string
  answer_options: {
    option_index: number
    option_text:  string
  }[]
}

// ── Smart Import Types ──
export interface StructureSuggestion {
  sections: SectionSuggestion[]
}

export interface SectionSuggestion {
  title:   string
  lessons: LessonSuggestion[]
}

export interface LessonSuggestion {
  title:       string
  file_index:  number
  sub_lessons: SubLessonSuggestion[]
}

export interface SubLessonSuggestion {
  title: string
}