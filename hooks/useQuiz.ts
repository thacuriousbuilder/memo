

import { supabase } from '@/lib/supabase'

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────
export type QuizMode =
  | 'sublesson'
  | 'lesson'
  | 'lesson_all'
  | 'section'
  | 'course'
  | 'quick'
  | 'review'
  | 'practice'

export interface QuizQuestion {
  id:                   string
  question_text:        string
  correct_option_index: number
  explanation:          string | null
  topic:                string | null
  difficulty:           string | null
  question_type:        string | null
  source_quote:         string | null
  answer_options: {
    option_index: number
    option_text:  string
  }[]
}

export interface AttemptAnswer {
  questionId:     string
  selectedIndex:  number
  isCorrect:      boolean
  correctIndex:   number
  questionText:   string
  correctText:    string
  explanation:    string | null
}

// ─────────────────────────────────────────
// FETCH QUESTIONS BY MODE
// ─────────────────────────────────────────
export async function fetchQuestions(params: {
  mode:   QuizMode
  id:     string
  count:  number
  userId: string
}): Promise<QuizQuestion[]> {
  let noteIds: string[] = []

  switch (params.mode) {
    case 'sublesson':
      noteIds = await getNotesBySubLesson(params.id)
      break
    case 'lesson':
      noteIds = await getNotesByLesson(params.id)
      break
    case 'lesson_all':
    case 'practice':
      noteIds = await getNotesByLessonAll(params.id)
      break
    case 'section':
      noteIds = await getNotesBySection(params.id)
      break
    case 'course':
      noteIds = await getNotesByCourse(params.id)
      break
    case 'quick':
      noteIds = params.id === 'all'
        ? await getNotesByUser(params.userId)
        : await getNotesByCourse(params.id)
      break
    case 'review':
      return getWrongAnswerQuestions(params.userId, params.count)
  }

  if (!noteIds.length) return []
  return getQuestionsForNotes(noteIds, params.count)
}

// ─────────────────────────────────────────
// NOTE ID HELPERS
// ─────────────────────────────────────────
async function getNotesBySubLesson(id: string): Promise<string[]> {
  const { data } = await supabase
    .from('notes').select('id').eq('sub_lesson_id', id)
  return (data ?? []).map(n => n.id)
}

async function getNotesByLesson(id: string): Promise<string[]> {
  const { data } = await supabase
    .from('notes').select('id').eq('lesson_id', id)
  return (data ?? []).map(n => n.id)
}

async function getNotesByLessonAll(lessonId: string): Promise<string[]> {
  const lessonNotes = await getNotesByLesson(lessonId)

  const { data: subs } = await supabase
    .from('sub_lessons').select('id').eq('lesson_id', lessonId)

  const subIds = (subs ?? []).map(s => s.id)
  if (!subIds.length) return lessonNotes

  const { data: subNotes } = await supabase
    .from('notes').select('id').in('sub_lesson_id', subIds)

  return [...lessonNotes, ...(subNotes ?? []).map(n => n.id)]
}

async function getNotesBySection(sectionId: string): Promise<string[]> {
  const { data: lessons } = await supabase
    .from('lessons').select('id').eq('section_id', sectionId)

  const all: string[] = []
  for (const l of lessons ?? []) {
    all.push(...await getNotesByLessonAll(l.id))
  }
  return all
}

async function getNotesByCourse(courseId: string): Promise<string[]> {
  const { data: sections } = await supabase
    .from('sections').select('id').eq('course_id', courseId)

  const all: string[] = []
  for (const s of sections ?? []) {
    all.push(...await getNotesBySection(s.id))
  }
  return all
}

async function getNotesByUser(userId: string): Promise<string[]> {
  const { data: courses } = await supabase
    .from('courses').select('id').eq('user_id', userId)

  const all: string[] = []
  for (const c of courses ?? []) {
    all.push(...await getNotesByCourse(c.id))
  }
  return all
}

// ─────────────────────────────────────────
// FETCH + SHUFFLE QUESTIONS
// ─────────────────────────────────────────
async function getQuestionsForNotes(
  noteIds: string[],
  count:   number
): Promise<QuizQuestion[]> {
  const { data, error } = await supabase
    .from('questions')
    .select(`
      id,
      question_text,
      correct_option_index,
      explanation,
      topic,
      difficulty,
      question_type,
      source_quote,
      answer_options (
        option_index,
        option_text
      )
    `)
    .in('note_id', noteIds)

  if (error) throw error

  const shuffled = shuffle(data ?? [])
  return shuffled.slice(0, count).map(q => ({
    ...q,
    answer_options: (q.answer_options ?? []).sort(
      (a: any, b: any) => a.option_index - b.option_index
    ),
  }))
}

// ─────────────────────────────────────────
// REVIEW MODE — wrong answers
// ─────────────────────────────────────────
async function getWrongAnswerQuestions(
  userId: string,
  count:  number
): Promise<QuizQuestion[]> {
  const { data: wrong } = await supabase
    .from('attempt_answers')
    .select('question_id, quiz_attempts!inner(user_id)')
    .eq('quiz_attempts.user_id', userId)
    .eq('is_correct', false)
    .limit(count * 3)

  if (!wrong?.length) return []

  const uniqueIds = [...new Set(wrong.map((a: any) => a.question_id))]
  const picked    = shuffle(uniqueIds).slice(0, count)

  const { data } = await supabase
    .from('questions')
    .select(`
      id, question_text, correct_option_index,
      explanation, topic, difficulty, question_type,
      source_quote,
      answer_options (option_index, option_text)
    `)
    .in('id', picked)

  return (data ?? []).map(q => ({
    ...q,
    answer_options: (q.answer_options ?? []).sort(
      (a: any, b: any) => a.option_index - b.option_index
    ),
  }))
}

// ─────────────────────────────────────────
// SAVE QUIZ ATTEMPT + UPDATE PROGRESS
// ─────────────────────────────────────────
export async function saveQuizAttempt(params: {
  userId:        string
  mode:          QuizMode
  id:            string
  questionCount: number
  score:         number
  answers:       AttemptAnswer[]
}): Promise<{ attemptId: string; passed: boolean }> {
  const passed  = params.score / params.questionCount >= 0.8

  // Determine lesson/sub-lesson FK
  const lessonId    = ['lesson','lesson_all','section','course','quick','practice']
    .includes(params.mode) ? params.id : null
  const subLessonId = params.mode === 'sublesson' ? params.id : null

  // 1. Save attempt
  const { data: attempt, error: attemptErr } = await supabase
    .from('quiz_attempts')
    .insert({
      user_id:        params.userId,
      lesson_id:      lessonId,
      sub_lesson_id:  subLessonId,
      question_count: params.questionCount,
      score:          params.score,
    })
    .select('id')
    .single()

  if (attemptErr) throw attemptErr

  // 2. Save answers
  if (params.answers.length > 0) {
    await supabase.from('attempt_answers').insert(
      params.answers.map(a => ({
        attempt_id:            attempt.id,
        question_id:           a.questionId,
        selected_option_index: a.selectedIndex,
        is_correct:            a.isCorrect,
      }))
    )
  }

  // 3. Update progress
  const progressStatus = passed ? 'passed' : 'in_progress'

  if (lessonId) {
    await supabase.from('user_progress').upsert({
      user_id:    params.userId,
      lesson_id:  lessonId,
      status:     progressStatus,
      updated_at: new Date().toISOString(),
    })
  } else if (subLessonId) {
    await supabase.from('user_progress').upsert({
      user_id:       params.userId,
      sub_lesson_id: subLessonId,
      status:        progressStatus,
      updated_at:    new Date().toISOString(),
    })
  }

  // 4. Update streak
  await supabase.from('profiles')
    .update({ last_studied_at: new Date().toISOString() })
    .eq('id', params.userId)

  return { attemptId: attempt.id, passed }
}

// ─────────────────────────────────────────
// SHUFFLE
// ─────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}