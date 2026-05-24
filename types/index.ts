

// ─────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────
export type ProgressStatus = 'locked' | 'in_progress' | 'passed'
export type NotificationFrequency = 'daily' | 'every_2_days' | 'weekly'
export type FileType = 'pdf' | 'txt' | 'docx'
export type QuestionCount = 5 | 10 | 15

// ─────────────────────────────────────────
// USERS
// ─────────────────────────────────────────
export interface Profile {
  id: string
  full_name: string
  email: string
  avatar_url: string | null
  streak_count: number
  last_studied_at: string | null
  expo_push_token: string | null
  created_at: string
}

// ─────────────────────────────────────────
// COURSES
// ─────────────────────────────────────────
export interface Course {
  id: string
  user_id: string
  title: string
  description: string | null
  emoji: string
  created_at: string
  updated_at: string
}

// ─────────────────────────────────────────
// SECTIONS
// ─────────────────────────────────────────
export interface Section {
  id: string
  course_id: string
  title: string
  order_index: number
  is_default: boolean
  created_at: string
}

// ─────────────────────────────────────────
// LESSONS
// ─────────────────────────────────────────
export interface Lesson {
  id: string
  section_id: string
  title: string
  description: string | null
  order_index: number
  created_at: string
  updated_at: string
}

// ─────────────────────────────────────────
// SUB LESSONS
// ─────────────────────────────────────────
export interface SubLesson {
  id: string
  lesson_id: string
  title: string
  order_index: number
  created_at: string
}

// ─────────────────────────────────────────
// NOTES
// ─────────────────────────────────────────
export interface Note {
  id: string
  lesson_id: string | null
  sub_lesson_id: string | null
  file_name: string
  file_type: FileType
  s3_key: string
  parsed_text: string | null
  created_at: string
}

// ─────────────────────────────────────────
// QUESTIONS
// ─────────────────────────────────────────
export interface Question {
  id: string
  note_id: string
  question_text: string
  correct_option_index: number
  explanation: string | null
  created_at: string
}

export interface AnswerOption {
  id: string
  question_id: string
  option_index: number
  option_text: string
}

// Question with options pre-joined (used in quiz screen)
export interface QuestionWithOptions extends Question {
  answer_options: AnswerOption[]
}

// ─────────────────────────────────────────
// QUIZ ATTEMPTS
// ─────────────────────────────────────────
export interface QuizAttempt {
  id: string
  user_id: string
  lesson_id: string | null
  sub_lesson_id: string | null
  question_count: QuestionCount
  score: number
  passed: boolean
  show_wrong_answers: boolean
  completed_at: string
}

export interface AttemptAnswer {
  id: string
  attempt_id: string
  question_id: string
  selected_option_index: number
  is_correct: boolean
}

// Attempt answer with question joined (used in results screen)
export interface AttemptAnswerWithQuestion extends AttemptAnswer {
  question: QuestionWithOptions
}

// ─────────────────────────────────────────
// USER PROGRESS
// ─────────────────────────────────────────
export interface UserProgress {
  id: string
  user_id: string
  lesson_id: string | null
  sub_lesson_id: string | null
  status: ProgressStatus
  updated_at: string
}

// ─────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────
export interface NotificationSetting {
  id: string
  user_id: string
  enabled: boolean
  remind_at: string
  frequency: NotificationFrequency
  created_at: string
  updated_at: string
}

export interface NotificationCourse {
  notification_setting_id: string
  course_id: string
}

// ─────────────────────────────────────────
// COMPOSITE TYPES (used across screens)
// ─────────────────────────────────────────

// Full course with sections + lessons for course detail screen
export interface CourseWithSections extends Course {
  sections: SectionWithLessons[]
}

export interface SectionWithLessons extends Section {
  lessons: LessonWithProgress[]
}

export interface LessonWithProgress extends Lesson {
  sub_lessons: SubLessonWithProgress[]
  progress: UserProgress | null
}

export interface SubLessonWithProgress extends SubLesson {
  progress: UserProgress | null
}

// Dashboard summary card
export interface CourseSummary {
  course: Course
  total_lessons: number
  completed_lessons: number
  progress_percent: number
  last_studied_at: string | null
}