

import { supabase } from '@/lib/supabase'
import { QuizAPI } from '@/lib/api'
import { bumpAutoPlanLevel } from '@/hooks/useReminders'
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
  | 'custom'

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

function pickBankSize(parsedText: string): 5 | 10 | 15 {
  const wordCount = parsedText.trim().split(/\s+/).length
  if (wordCount < 400)  return 5
  if (wordCount < 1200) return 10
  return 15
}

async function ensureQuestionsExist(
  noteIds: string[],
  userId:  string
): Promise<void> {
  const uniqueNoteIds = Array.from(new Set(noteIds))
  if (!uniqueNoteIds.length) return

  const { data: notes } = await supabase
    .from('notes')
    .select('id, parsed_text, lesson_id, sub_lesson_id')
    .in('id', uniqueNoteIds)

  if (!notes?.length) return

  const { data: existing } = await supabase
    .from('questions')
    .select('note_id')
    .in('note_id', noteIds)

  const notesWithQuestions = new Set((existing ?? []).map(q => q.note_id))

  const notesNeedingGeneration = notes.filter(
    n => n.parsed_text && !notesWithQuestions.has(n.id)
  )

  if (!notesNeedingGeneration.length) return

  await Promise.all(
    notesNeedingGeneration.map(note =>
      QuizAPI.generate({
        note_id:        note.id,
        user_id:        userId,
        question_count: pickBankSize(note.parsed_text),
        lesson_id:      note.lesson_id,
        sub_lesson_id:  note.sub_lesson_id,
      }).catch(err => {
        console.error('Generation failed for note:', note.id, err)
      })
    )
  )
}

// ─────────────────────────────────────────
// FETCH QUESTIONS BY MODE — updated to generate on demand
// ─────────────────────────────────────────
export async function fetchQuestions(params: {
  mode:     QuizMode
  id:       string
  count:    number
  userId:   string
  noteIds?: string[]
}): Promise<QuizQuestion[]> {
  let noteIds: string[] = []

  switch (params.mode) {
    case 'custom':
      noteIds = params.noteIds ?? []
      break
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

  await ensureQuestionsExist(noteIds, params.userId)

  return getQuestionsForNotes(noteIds, params.count, params.userId)
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
  const { data: flatNotes } = await supabase
    .from('notes').select('id').eq('course_id', courseId)

  const { data: sections } = await supabase
    .from('sections').select('id').eq('course_id', courseId)

  const all: string[] = (flatNotes ?? []).map(n => n.id)
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
// LATEST-ATTEMPT CORRECTNESS — shared primitive
// A question only counts as "missed" if its MOST RECENT attempt was
// wrong; a later correct answer graduates it immediately. No time
// decay — this is the one thing that clears a miss.
// ─────────────────────────────────────────
export async function getLatestCorrectnessMap(
  userId:      string,
  questionIds: string[]
): Promise<Map<string, boolean>> {
  if (!questionIds.length) return new Map()

  const { data, error } = await supabase
    .from('attempt_answers')
    .select('question_id, is_correct, quiz_attempts!inner(user_id, completed_at)')
    .in('question_id', questionIds)
    .eq('quiz_attempts.user_id', userId)

  if (error) throw error

  // attempt_answers -> quiz_attempts is many-to-one (each answer row nests
  // a single quiz_attempts object, not an array), so there's no nested
  // array for .order(col, {foreignTable}) to reorder. Sorting client-side
  // on the nested completed_at is the correct, unambiguous approach.
  const sorted = (data ?? []).slice().sort((a: any, b: any) =>
    new Date(a.quiz_attempts.completed_at).getTime() -
    new Date(b.quiz_attempts.completed_at).getTime()
  )

  const latest = new Map<string, boolean>()
  for (const row of sorted) {
    latest.set(row.question_id, row.is_correct) // ascending order → last write = most recent
  }
  return latest
}

async function getMissedQuestionIds(
  userId:      string,
  questionIds: string[]
): Promise<Set<string>> {
  const latest = await getLatestCorrectnessMap(userId, questionIds)
  const missed = new Set<string>()
  for (const [id, isCorrect] of latest) if (!isCorrect) missed.add(id)
  return missed
}

// ─────────────────────────────────────────
// FETCH + BLEND QUESTIONS — miss pool + fresh pool
// Blends in previously-missed-and-not-yet-corrected questions
// (capped at 50% of the session, never more than actually exist),
// filling the rest from fresh/graduated questions. Falls back to
// pure random when there's no miss history in scope.
// ─────────────────────────────────────────
async function getQuestionsForNotes(
  noteIds: string[],
  count:   number,
  userId:  string
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

  const pool = data ?? []
  if (!pool.length) return []

  const missedIds = await getMissedQuestionIds(userId, pool.map(q => q.id))

  let selected: typeof pool

  if (!missedIds.size) {
    selected = shuffle(pool).slice(0, count)
  } else {
    const missPool  = pool.filter(q => missedIds.has(q.id))
    const freshPool = pool.filter(q => !missedIds.has(q.id))

    const missCap   = Math.floor(count * 0.5)
    const missTaken = Math.min(missCap, missPool.length, count)

    const shuffledMiss  = shuffle(missPool)
    const shuffledFresh = shuffle(freshPool)

    const pickedMiss = shuffledMiss.slice(0, missTaken)
    const remaining  = count - pickedMiss.length
    let pickedFresh  = shuffledFresh.slice(0, remaining)

    // Fresh pool smaller than remaining slots — backfill from leftover
    // miss questions rather than under-filling the session.
    if (pickedFresh.length < remaining) {
      const shortfall    = remaining - pickedFresh.length
      const leftoverMiss = shuffledMiss.slice(missTaken)
      pickedFresh = pickedFresh.concat(leftoverMiss.slice(0, shortfall))
    }

    selected = shuffle([...pickedMiss, ...pickedFresh])
  }

  return selected.map(q => ({
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

  // Graduation-aware: only resurface questions whose MOST RECENT attempt
  // (which may postdate this "ever wrong" snapshot) is still wrong.
  const missedIds   = await getMissedQuestionIds(userId, uniqueIds)
  const stillMissed = uniqueIds.filter(id => missedIds.has(id))
  if (!stillMissed.length) return []

  const picked = shuffle(stillMissed).slice(0, count)

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
  reminderId?:   string | null
}): Promise<{ attemptId: string; passed: boolean }> {
  const passed  = params.score / params.questionCount >= 0.8

  const lessonId = ['lesson', 'lesson_all', 'practice']
  .includes(params.mode) ? params.id : null
const subLessonId = params.mode === 'sublesson' ? params.id : null

// course_id is only ever set for course-level modes — quiz_attempts has an
// "at_most_one_parent" check constraint (lesson_id XOR sub_lesson_id XOR
// course_id), so it must stay null whenever lessonId/subLessonId is set
// (previously this fell back to resolveCourseId(lessonId, subLessonId),
// which populated course_id alongside lesson_id/sub_lesson_id and violated
// the constraint).
const courseId = params.mode === 'quick' && params.id === 'all'
  ? null
  : ['course', 'quick', 'custom'].includes(params.mode)
    ? params.id
    : null

  // 1. Save attempt
  const { data: attempt, error: attemptErr } = await supabase
    .from('quiz_attempts')
    .insert({
      user_id:        params.userId,
      lesson_id:      lessonId,
      sub_lesson_id:  subLessonId,
      course_id:      courseId,
      question_count: params.questionCount,
      score:          params.score,
      reminder_id:    params.reminderId ?? null,
    })
    .select('id')
    .single()

  if (attemptErr) throw attemptErr

  // Best-effort — an Auto plan's level shouldn't block saving the attempt
  if (params.reminderId) {
    try {
      await bumpAutoPlanLevel(params.reminderId, passed, params.questionCount)
    } catch (err) {
      console.error('[saveQuizAttempt] bumpAutoPlanLevel failed:', err)
    }
  }

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
// FETCH A PAST ATTEMPT'S FULL BREAKDOWN
// attempt_answers only stores selection/correctness — question text,
// the correct option, and the explanation are joined live from the
// current questions/answer_options tables.
// ─────────────────────────────────────────
export async function fetchQuizAttemptDetail(attemptId: string): Promise<{
  correct: number
  total:   number
  answers: AttemptAnswer[]
}> {
  const { data, error } = await supabase
    .from('attempt_answers')
    .select(`
      question_id, selected_option_index, is_correct,
      questions ( question_text, correct_option_index, explanation, answer_options ( option_index, option_text ) )
    `)
    .eq('attempt_id', attemptId)

  if (error) throw error

  const answers: AttemptAnswer[] = (data ?? []).map((row: any) => {
    const q = row.questions
    const correctOption = (q?.answer_options ?? []).find((o: any) => o.option_index === q?.correct_option_index)
    return {
      questionId:    row.question_id,
      selectedIndex: row.selected_option_index,
      isCorrect:     row.is_correct,
      correctIndex:  q?.correct_option_index ?? 0,
      questionText:  q?.question_text ?? '',
      correctText:   correctOption?.option_text ?? '',
      explanation:   q?.explanation ?? null,
    }
  })

  return {
    correct: answers.filter(a => a.isCorrect).length,
    total:   answers.length,
    answers,
  }
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


