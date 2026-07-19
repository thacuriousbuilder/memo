

// ─────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────
export type ProgressStatus        = 'locked' | 'in_progress' | 'passed'
export type NotificationFrequency = 'daily' | 'every_2_days' | 'weekly'
export type FileType              = 'pdf' | 'txt' | 'docx'
export type QuestionCount         = 5 | 10 | 15
export type QuestionDifficulty    = 'easy' | 'medium' | 'hard'
export type QuestionType          = 'recall' | 'comprehension' | 'application'
export type ExamType              = 'quiz' | 'midterm' | 'final' | 'assignment' | 'test' | 'other'
export type ExamStatus            = 'upcoming' | 'completed' | 'missed'

// ─────────────────────────────────────────
// USERS
// ─────────────────────────────────────────
export interface Profile {
  id:              string
  full_name:       string
  email:           string
  avatar_url:      string | null
  streak_count:    number
  last_studied_at: string | null
  expo_push_token: string | null
  created_at:      string
}

// ─────────────────────────────────────────
// COURSES
// ─────────────────────────────────────────
export interface Course {
  id:          string
  user_id:     string
  title:       string
  description: string | null
  emoji:       string
  color:       string | null
  created_at:  string
  updated_at:  string
}

// ─────────────────────────────────────────
// SECTIONS
// ─────────────────────────────────────────
export interface Section {
  id:          string
  course_id:   string
  title:       string
  order_index: number
  is_default:  boolean
  created_at:  string
}

// ─────────────────────────────────────────
// LESSONS
// ─────────────────────────────────────────
export interface Lesson {
  id:          string
  section_id:  string
  title:       string
  description: string | null
  order_index: number
  created_at:  string
  updated_at:  string
}

// ─────────────────────────────────────────
// SUB LESSONS
// ─────────────────────────────────────────
export interface SubLesson {
  id:          string
  lesson_id:   string
  title:       string
  order_index: number
  created_at:  string
}

// ─────────────────────────────────────────
// NOTES
// ─────────────────────────────────────────
export interface Note {
  id:            string
  lesson_id:     string | null
  sub_lesson_id: string | null
  file_name:     string
  file_type:     FileType
  s3_key:        string
  parsed_text:   string | null
  created_at:    string
}

// ─────────────────────────────────────────
// QUESTIONS
// ─────────────────────────────────────────
export interface Question {
  id:                   string
  note_id:              string
  question_text:        string
  correct_option_index: number
  explanation:          string | null
  topic:                string | null
  difficulty:           QuestionDifficulty | null
  question_type:        QuestionType | null
  source_quote:         string | null
  created_at:           string
}

export interface AnswerOption {
  id:           string
  question_id:  string
  option_index: number
  option_text:  string
}

// Question with options pre-joined (quiz screen)
export interface QuestionWithOptions extends Question {
  answer_options: AnswerOption[]
}

// ─────────────────────────────────────────
// QUIZ ATTEMPTS
// ─────────────────────────────────────────
export interface QuizAttempt {
  id:                 string
  user_id:            string
  lesson_id:          string | null
  sub_lesson_id:      string | null
  question_count:     QuestionCount
  score:              number
  passed:             boolean
  show_wrong_answers: boolean
  completed_at:       string
}

export interface AttemptAnswer {
  id:                    string
  attempt_id:            string
  question_id:           string
  selected_option_index: number
  is_correct:            boolean
}

// Attempt answer with question joined (results screen)
export interface AttemptAnswerWithQuestion extends AttemptAnswer {
  question: QuestionWithOptions
}

// ─────────────────────────────────────────
// USER PROGRESS
// ─────────────────────────────────────────
export interface UserProgress {
  id:            string
  user_id:       string
  lesson_id:     string | null
  sub_lesson_id: string | null
  status:        ProgressStatus
  updated_at:    string
}

// ─────────────────────────────────────────
// EXAMS
// ─────────────────────────────────────────
export interface Exam {
  id:                 string
  user_id:            string
  course_id:          string
  title:              string
  exam_type:          ExamType
  exam_date:          string
  location:           string | null
  notes:              string | null
  status:             ExamStatus
  score:              number | null
  remind_days_before: number
  created_at:         string
  updated_at:         string
}

// For dashboard + course detail display
export interface UpcomingExam extends Exam {
  course_title: string
  course_emoji: string
  days_until:   number
}

// ─────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────
export interface NotificationSetting {
  id:         string
  user_id:    string
  enabled:    boolean
  remind_at:  string
  frequency:  NotificationFrequency
  created_at: string
  updated_at: string
}

export interface NotificationCourse {
  notification_setting_id: string
  course_id:               string
}

// ─────────────────────────────────────────
// COMPOSITE TYPES
// ─────────────────────────────────────────

// Course with sections + lessons + exams
export interface CourseWithSections extends Course {
  sections:       SectionWithLessons[]
  upcoming_exams: UpcomingExam[]
}

export interface SectionWithLessons extends Section {
  lessons: LessonWithProgress[]
}

export interface LessonWithProgress extends Lesson {
  sub_lessons: SubLessonWithProgress[]
  progress:    UserProgress | null
  notes:       Note[]
}

export interface SubLessonWithProgress extends SubLesson {
  progress: UserProgress | null
  notes:    Note[]
}

// Dashboard summary card
export interface CourseSummary {
  course:            Course
  total_lessons:     number
  completed_lessons: number
  progress_percent:  number
  last_studied_at:   string | null
  upcoming_exams:    UpcomingExam[]
}

// Quiz session (used when taking a quiz)
export interface QuizSession {
  attempt_id:    string
  questions:     QuestionWithOptions[]
  lesson_id:     string | null
  sub_lesson_id: string | null
  total:         number
  needed:        number  // questions needed to pass (80% threshold)
}