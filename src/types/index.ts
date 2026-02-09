// ============================================
// Tipos de Base de Datos
// ============================================

export interface User {
    id: string
    email: string
    name: string
    created_at: string
}

export interface Presentation {
    id: string
    user_id: string
    title: string
    description: string | null
    is_active: boolean
    created_at: string
    updated_at: string
}

export type ActivityType =
    | 'multiple_choice'
    | 'word_cloud'
    | 'open_text'
    | 'scale'
    | 'quiz'
    | 'true_false'

export interface Activity {
    id: string
    presentation_id: string
    type: ActivityType
    question: string
    options: ActivityOptions
    order_index: number
    is_active: boolean
    settings: ActivitySettings
    created_at: string
}

export interface Session {
    id: string
    presentation_id: string
    access_code: string
    is_live: boolean
    started_at: string | null
    ended_at: string | null
}

export interface Response {
    id: string
    activity_id: string
    session_id: string
    participant_id: string
    answer: ResponseAnswer
    created_at: string
}

// ============================================
// Opciones y Configuraciones de Actividades
// ============================================

export interface MultipleChoiceOptions {
    choices: Array<{
        id: string
        text: string
    }>
    allow_multiple: boolean
}

export interface WordCloudOptions {
    max_words: number
    min_length: number
    max_length: number
}

export interface OpenTextOptions {
    max_length: number
    placeholder: string
}

export interface ScaleOptions {
    min: number
    max: number
    min_label: string
    max_label: string
}

export interface QuizOptions {
    choices: Array<{
        id: string
        text: string
        is_correct: boolean
    }>
    time_limit: number | null
    points: number
}

export interface TrueFalseOptions {
    correct_answer: boolean
    time_limit: number | null
    points: number
}

export type ActivityOptions =
    | MultipleChoiceOptions
    | WordCloudOptions
    | OpenTextOptions
    | ScaleOptions
    | QuizOptions
    | TrueFalseOptions

export interface ActivitySettings {
    show_results_immediately: boolean
    allow_anonymous: boolean
    require_name: boolean
}

// ============================================
// Respuestas
// ============================================

export type ResponseAnswer =
    | { type: 'multiple_choice'; choice_ids: string[] }
    | { type: 'word_cloud'; words: string[] }
    | { type: 'open_text'; text: string }
    | { type: 'scale'; value: number }
    | { type: 'quiz'; choice_id: string; time_taken: number }
    | { type: 'true_false'; answer: boolean; time_taken: number }

// ============================================
// Resultados Agregados
// ============================================

export interface MultipleChoiceResults {
    total_responses: number
    choices: Array<{
        id: string
        text: string
        count: number
        percentage: number
    }>
}

export interface WordCloudResults {
    total_responses: number
    words: Array<{
        text: string
        count: number
        size: number
    }>
}

export interface OpenTextResults {
    total_responses: number
    responses: Array<{
        text: string
        participant_id: string
        created_at: string
    }>
}

export interface ScaleResults {
    total_responses: number
    average: number
    distribution: Array<{
        value: number
        count: number
    }>
}

export interface QuizResults {
    total_responses: number
    correct_count: number
    incorrect_count: number
    average_time: number
    leaderboard: Array<{
        participant_id: string
        participant_name: string | null
        is_correct: boolean
        time_taken: number
        points: number
    }>
}

export interface TrueFalseResults {
    total_responses: number
    true_count: number
    false_count: number
    correct_count: number
    incorrect_count: number
    average_time: number
}

export type ActivityResults =
    | MultipleChoiceResults
    | WordCloudResults
    | OpenTextResults
    | ScaleResults
    | QuizResults
    | TrueFalseResults

// ============================================
// WebSocket Events
// ============================================

export interface RealtimeEvent {
    type: 'new_response' | 'activity_changed' | 'session_ended'
    payload: unknown
}

export interface NewResponseEvent {
    type: 'new_response'
    payload: {
        activity_id: string
        response: Response
    }
}

export interface ActivityChangedEvent {
    type: 'activity_changed'
    payload: {
        activity_id: string
    }
}

export interface SessionEndedEvent {
    type: 'session_ended'
    payload: {
        session_id: string
    }
}
