
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

export async function updateCurrentActivity(sessionId: string, activityIndex: number) {
    const supabase = createClient()

    const { error } = await supabase
        .from('sessions')
        .update({
            current_activity_index: activityIndex,
        })
        .eq('id', sessionId)

    if (error) {
        return { error: error.message }
    }

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
            settings: JSON.parse(settingsJson || '{"show_results_immediately": true, "allow_anonymous": true, "require_name": false}'),
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

    const id = formData.get('id') as string
    const question = formData.get('question') as string
    const optionsJson = formData.get('options') as string

    const { error } = await supabase
        .from('activities')
        .update({
            question,
            options: JSON.parse(optionsJson || '{}'),
        })
        .eq('id', id)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/presenter')
    return { error: null }
}

export async function deleteActivity(id: string, presentationId: string) {
    const supabase = createClient()

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
