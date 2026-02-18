
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// =============================================
// PRESENTATIONS
// =============================================

export async function getPresentations() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Usuario no autenticado', data: [] }
    }

    const { data, error } = await supabase
        .from('presentations')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

    if (error) {
        return { error: error.message, data: [] }
    }

    return { data, error: null }
}

export async function createPresentation(formData: FormData) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Not authenticated' }
    }

    const title = formData.get('title') as string
    const description = formData.get('description') as string | null

    const { data, error } = await supabase
        .from('presentations')
        .insert({
            user_id: user.id,
            title,
            description,
        })
        .select()
        .single()

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/presenter/dashboard')
    return { data, error: null }
}

export async function updatePresentation(formData: FormData) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Not authenticated' }
    }

    const id = formData.get('id') as string
    const title = formData.get('title') as string
    const description = formData.get('description') as string | null

    const { error } = await supabase
        .from('presentations')
        .update({
            title,
            description,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/presenter/dashboard')
    return { error: null }
}

export async function deletePresentation(id: string) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Not authenticated' }
    }

    const { error } = await supabase
        .from('presentations')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/presenter/dashboard')
    return { error: null }
}

// =============================================
// SESSIONS
// =============================================

function generateAccessCode(): string {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 6; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length))
    }
    return code
}

export async function createSession(presentationId: string) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Not authenticated' }
    }

    // Close any previous active sessions for this presentation
    await supabase
        .from('sessions')
        .update({
            is_live: false,
            ended_at: new Date().toISOString()
        })
        .eq('presentation_id', presentationId)
        .eq('is_live', true)

    // Generate unique access code
    let accessCode = generateAccessCode()
    let attempts = 0

    while (attempts < 5) {
        const { data: existing } = await supabase
            .from('sessions')
            .select('id')
            .eq('access_code', accessCode)
            .single()

        if (!existing) break
        accessCode = generateAccessCode()
        attempts++
    }

    const { data, error } = await supabase
        .from('sessions')
        .insert({
            presentation_id: presentationId,
            access_code: accessCode,
            is_live: true,
            started_at: new Date().toISOString(),
        })
        .select()
        .single()

    if (error) {
        return { error: error.message }
    }

    return { data, error: null }
}

export async function endSession(sessionId: string) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'No autenticado' }
    }

    const { error } = await supabase
        .from('sessions')
        .update({
            is_live: false,
            ended_at: new Date().toISOString(),
        })
        .eq('id', sessionId)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/presenter')
    return { error: null }
}

export async function reactivateSession(sessionId: string, presentationId: string) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'No autenticado' }
    }

    // Close any other live sessions for this presentation first
    await supabase
        .from('sessions')
        .update({
            is_live: false,
            ended_at: new Date().toISOString()
        })
        .eq('presentation_id', presentationId)
        .eq('is_live', true)

    // Reactivate this session
    const { error } = await supabase
        .from('sessions')
        .update({
            is_live: true,
            ended_at: null,
        })
        .eq('id', sessionId)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/presenter')
    revalidatePath(`/presenter/presentation/${presentationId}`)
    return { error: null }
}

export async function updateCurrentActivity(sessionId: string, activityIndex: number) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'No autenticado' }
    }

    console.log('[updateCurrentActivity] User:', user.id, 'Session:', sessionId, 'Index:', activityIndex)

    const { data, error } = await supabase
        .from('sessions')
        .update({
            current_activity_index: activityIndex,
        })
        .eq('id', sessionId)
        .select()
        .single()

    if (error) {
        console.error('[updateCurrentActivity] Error:', error.message)
        return { error: error.message }
    }

    if (!data) {
        console.error('[updateCurrentActivity] No data returned - update may have been blocked')
        return { error: 'No se pudo actualizar la actividad actual' }
    }

    console.log('[updateCurrentActivity] SUCCESS - current_activity_index:', data.current_activity_index)
    return { error: null }
}

export async function getSessions(presentationId: string) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Usuario no autenticado', data: [] }
    }

    const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('presentation_id', presentationId)
        .order('created_at', { ascending: false })

    if (error) {
        return { error: error.message, data: [] }
    }

    return { data, error: null }
}

export async function deleteSession(sessionId: string) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Usuario no autenticado' }
    }

    const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/presenter')
    return { error: null }
}


// =============================================
// ACTIVITIES
// =============================================

export async function getActivities(presentationId: string) {
    const supabase = createClient()

    const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('presentation_id', presentationId)
        .order('order_index', { ascending: true })

    if (error) {
        return { error: error.message, data: [] }
    }

    return { data, error: null }
}

export async function createActivity(formData: FormData) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Not authenticated' }
    }

    const presentationId = formData.get('presentation_id') as string
    const type = formData.get('type') as string
    const question = formData.get('question') as string
    const optionsJson = formData.get('options') as string
    const settingsJson = formData.get('settings') as string

    // Get the next order index
    const { data: existingActivities } = await supabase
        .from('activities')
        .select('order_index')
        .eq('presentation_id', presentationId)
        .order('order_index', { ascending: false })
        .limit(1)

    const nextOrderIndex = existingActivities && existingActivities.length > 0
        ? existingActivities[0].order_index + 1
        : 0

    const { data, error } = await supabase
        .from('activities')
        .insert({
            presentation_id: presentationId,
            type,
            question,
            options: JSON.parse(optionsJson || '{}'),
            settings: JSON.parse(settingsJson || '{"show_results_immediately": true, "allow_anonymous": true, "require_name": false, "max_responses_per_participant": 1}'),
            order_index: nextOrderIndex,
        })
        .select()
        .single()

    if (error) {
        return { error: error.message }
    }

    revalidatePath(`/presenter/presentation/${presentationId}`)
    return { data, error: null }
}

export async function updateActivity(formData: FormData) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'No autenticado' }
    }

    const id = formData.get('id') as string
    const presentationId = formData.get('presentation_id') as string
    const question = formData.get('question') as string
    const optionsJson = formData.get('options') as string
    const settingsJson = formData.get('settings') as string

    // Verify the presentation belongs to this user
    const { data: presentation } = await supabase
        .from('presentations')
        .select('id')
        .eq('id', presentationId)
        .eq('user_id', user.id)
        .single()

    if (!presentation) {
        return { error: 'No tienes permiso para editar esta presentación' }
    }

    const parsedOptions = JSON.parse(optionsJson || '{}')
    const parsedSettings = settingsJson ? JSON.parse(settingsJson) : undefined

    const updateData: Record<string, any> = {
        question,
        options: parsedOptions,
    }

    if (parsedSettings !== undefined) {
        updateData.settings = parsedSettings
    }

    console.log('[updateActivity] User:', user.id, 'Activity:', id)
    console.log('[updateActivity] Settings to save:', JSON.stringify(parsedSettings))

    const { data, error } = await supabase
        .from('activities')
        .update(updateData)
        .eq('id', id)
        .eq('presentation_id', presentationId)
        .select()
        .single()

    if (error) {
        console.error('[updateActivity] Supabase error:', error.message, error.code)
        return { error: error.message }
    }

    if (!data) {
        console.error('[updateActivity] No data returned - update may have been blocked')
        return { error: 'No se pudo actualizar la actividad' }
    }

    console.log('[updateActivity] SUCCESS - Saved settings:', JSON.stringify(data.settings))

    revalidatePath(`/presenter/presentation/${presentationId}`)
    revalidatePath('/presenter')
    return { error: null, data }
}

export async function deleteActivity(id: string, presentationId: string) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'No autenticado' }
    }

    const { error } = await supabase
        .from('activities')
        .delete()
        .eq('id', id)

    if (error) {
        return { error: error.message }
    }

    revalidatePath(`/presenter/presentation/${presentationId}`)
    return { error: null }
}

export async function reorderActivities(presentationId: string, orderedIds: string[]) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'No autenticado' }
    }

    const updates = orderedIds.map((id, index) =>
        supabase
            .from('activities')
            .update({ order_index: index })
            .eq('id', id)
    )

    await Promise.all(updates)

    revalidatePath(`/presenter/presentation/${presentationId}`)
    return { error: null }
}
