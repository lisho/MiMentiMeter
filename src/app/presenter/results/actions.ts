
'use server'

import { createClient } from '@/lib/supabase/server'

export async function getSessionResults(sessionId: string) {
    const supabase = createClient()

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'No autenticado', data: null }
    }

    // Get session with presentation
    const { data: session } = await supabase
        .from('sessions')
        .select(`
      id,
      access_code,
      created_at,
      ended_at,
      presentation_id,
      presentations (
        id,
        title,
        user_id
      )
    `)
        .eq('id', sessionId)
        .single()

    if (!session) {
        return { error: 'Sesión no encontrada', data: null }
    }

    // Check ownership
    const presentation = session.presentations as unknown as { id: string; title: string; user_id: string } | null
    if (presentation?.user_id !== user.id) {
        return { error: 'No autorizado', data: null }
    }

    // Get activities
    const { data: activities } = await supabase
        .from('activities')
        .select('*')
        .eq('presentation_id', session.presentation_id)
        .order('order_index', { ascending: true })

    // Get participants
    const { data: participants } = await supabase
        .from('participants')
        .select('id, name, created_at')
        .eq('session_id', sessionId)

    // Get all responses
    const { data: responses } = await supabase
        .from('responses')
        .select('*')
        .eq('session_id', sessionId)

    return {
        data: {
            session,
            activities: activities || [],
            participants: participants || [],
            responses: responses || []
        },
        error: null
    }
}

export async function exportSessionData(sessionId: string, format: 'json' | 'csv' = 'json') {
    const result = await getSessionResults(sessionId)

    if (result.error || !result.data) {
        return { error: result.error || 'Error al obtener datos', data: null }
    }

    const { session, activities, participants, responses } = result.data

    if (format === 'json') {
        return {
            data: JSON.stringify({
                session: {
                    id: session.id,
                    code: session.access_code,
                    created_at: session.created_at,
                    ended_at: session.ended_at
                },
                activities,
                participants,
                responses
            }, null, 2),
            error: null
        }
    }

    // CSV format - create a simplified flat structure
    const csvRows = []
    csvRows.push(['Activity', 'Question', 'Participant', 'Answer', 'Timestamp'])

    responses.forEach(response => {
        const activity = activities.find(a => a.id === response.activity_id)
        const participant = participants.find(p => p.id === response.participant_id)

        let answerText = ''
        if (response.answer.choice_ids) {
            answerText = response.answer.choice_ids.join(', ')
        } else if (response.answer.choice_id) {
            answerText = response.answer.choice_id
        } else if (response.answer.value !== undefined) {
            answerText = String(response.answer.value)
        } else if (response.answer.answer !== undefined) {
            answerText = String(response.answer.answer)
        } else if (response.answer.text) {
            answerText = response.answer.text
        } else if (response.answer.words) {
            answerText = response.answer.words.join(', ')
        }

        csvRows.push([
            activity?.type || 'Unknown',
            activity?.question || 'Unknown',
            participant?.name || 'Anónimo',
            answerText,
            response.created_at
        ])
    })

    const csvContent = csvRows.map(row =>
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n')

    return {
        data: csvContent,
        error: null
    }
}
