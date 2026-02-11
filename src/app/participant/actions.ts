
'use server'

import { createClient } from '@/lib/supabase/server'

export async function joinSession(accessCode: string) {
    const supabase = createClient()

    // Find the session by access code
    const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select(`
      id,
      access_code,
      is_live,
      presentation_id,
      presentations (
        id,
        title
      )
    `)
        .eq('access_code', accessCode.toUpperCase())
        .single()

    if (sessionError || !session) {
        return { error: 'Código de sesión no válido', data: null }
    }

    if (!session.is_live) {
        return { error: 'Esta sesión ha finalizado', data: null }
    }

    const presentation = session.presentations as unknown as { id: string; title: string } | null

    return {
        data: {
            sessionId: session.id,
            presentationTitle: presentation?.title || 'Presentación'
        },
        error: null
    }
}

export async function registerParticipant(sessionId: string, name?: string) {
    const supabase = createClient()

    const { data: participant, error } = await supabase
        .from('participants')
        .insert({
            session_id: sessionId,
            name: name || null,
        })
        .select()
        .single()

    if (error) {
        console.error('Error registro participante:', error)
        return { error: 'No se pudo registrar al participante. Inténtalo de nuevo.', data: null }
    }

    return { data: participant, error: null }

}

export async function getSessionActivities(sessionId: string) {
    const supabase = createClient()

    // Get session with presentation
    const { data: session } = await supabase
        .from('sessions')
        .select('presentation_id')
        .eq('id', sessionId)
        .single()

    if (!session) {
        return { error: 'Sesión no encontrada', data: [] }
    }

    // Get activities for this presentation
    const { data: activities, error } = await supabase
        .from('activities')
        .select('*')
        .eq('presentation_id', session.presentation_id)
        .order('order_index', { ascending: true })

    if (error) {
        return { error: error.message, data: [] }
    }

    return { data: activities, error: null }
}

export async function submitResponse(
    activityId: string,
    sessionId: string,
    participantId: string,
    answer: object
) {
    const supabase = createClient()

    // Get activity settings to check max responses
    const { data: activity } = await supabase
        .from('activities')
        .select('settings')
        .eq('id', activityId)
        .single()

    if (!activity) {
        return { error: 'Actividad no encontrada', data: null }
    }

    const maxResponses = activity.settings?.max_responses_per_participant

    // Count existing responses from this participant
    const { count } = await supabase
        .from('responses')
        .select('id', { count: 'exact', head: true })
        .eq('activity_id', activityId)
        .eq('participant_id', participantId)

    // Check if limit is reached (if limit is set)
    if (maxResponses !== null && maxResponses !== undefined && count !== null && count >= maxResponses) {
        return {
            error: `Has alcanzado el límite de ${maxResponses} ${maxResponses === 1 ? 'respuesta' : 'respuestas'} para esta actividad`,
            data: null
        }
    }

    console.log('[submitResponse] Inserting response for activity:', activityId, 'participant:', participantId, 'existing count:', count, 'maxResponses:', maxResponses)

    const { data, error } = await supabase
        .from('responses')
        .insert({
            activity_id: activityId,
            session_id: sessionId,
            participant_id: participantId,
            answer,
        })
        .select()

    if (error) {
        console.error('[submitResponse] Supabase error:', error.message, error.code, error.details, error.hint)

        // Detect unique constraint violation
        if (error.code === '23505' || error.message.includes('duplicate key') || error.message.includes('unique')) {
            return {
                error: 'Ya has respondido a esta actividad. Si deseas responder múltiples veces, contacta al presentador para ajustar la configuración.',
                data: null
            }
        }

        return { error: `Error al guardar tu respuesta: ${error.message}`, data: null }
    }

    return { data: { success: true }, error: null }
}

export async function checkParticipantResponse(activityId: string, participantId: string) {
    const supabase = createClient()

    // Get activity settings
    const { data: activity } = await supabase
        .from('activities')
        .select('settings')
        .eq('id', activityId)
        .single()

    const maxResponses = activity?.settings?.max_responses_per_participant

    // Count responses
    const { count } = await supabase
        .from('responses')
        .select('id', { count: 'exact', head: true })
        .eq('activity_id', activityId)
        .eq('participant_id', participantId)

    const responseCount = count || 0
    const hasReachedLimit = maxResponses !== null && maxResponses !== undefined && responseCount >= maxResponses

    return {
        hasResponded: responseCount > 0,
        responseCount,
        maxResponses,
        hasReachedLimit
    }
}


export async function checkSessionStatus(sessionId: string) {
    const supabase = createClient()

    const { data: session } = await supabase
        .from('sessions')
        .select('is_live')
        .eq('id', sessionId)
        .single()

    return {
        isLive: session?.is_live || false
    }
}
