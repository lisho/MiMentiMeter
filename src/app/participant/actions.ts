
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

    // Check if participant already responded
    const { data: existing } = await supabase
        .from('responses')
        .select('id')
        .eq('activity_id', activityId)
        .eq('participant_id', participantId)
        .single()

    if (existing) {
        return { error: 'Ya has respondido a esta pregunta', data: null }
    }

    const { error } = await supabase
        .from('responses')
        .insert({
            activity_id: activityId,
            session_id: sessionId,
            participant_id: participantId,
            answer,
        })

    if (error) {
        console.error('Error enviando respuesta:', error)
        if (error.code === '23505') { // Unique violation
            return { error: 'Ya has enviado una respuesta para esta actividad.', data: null }
        }
        return { error: 'Error al guardar tu respuesta. Inténtalo de nuevo.', data: null }
    }

    // Return success without data payload (we don't need it in the UI)
    return { data: { success: true }, error: null }
}

export async function checkParticipantResponse(activityId: string, participantId: string) {
    const supabase = createClient()

    const { data } = await supabase
        .from('responses')
        .select('id')
        .eq('activity_id', activityId)
        .eq('participant_id', participantId)
        .single()

    return { hasResponded: !!data }
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
