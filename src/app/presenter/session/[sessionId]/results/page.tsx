
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSessionResults } from '../../../results/actions'
import { SessionResults } from './SessionResults'

interface PageProps {
    params: { sessionId: string }
}

export default async function SessionResultsPage({ params }: PageProps) {
    const supabase = createClient()

    // Get session details
    const { data: session, error } = await supabase
        .from('sessions')
        .select(`
            id,
            access_code,
            created_at,
            ended_at,
            is_live,
            presentation_id,
            presentations (
                id,
                title
            )
        `)
        .eq('id', params.sessionId)
        .single()

    if (error || !session) {
        notFound()
    }

    // Get full session results
    const result = await getSessionResults(params.sessionId)

    if (result.error || !result.data) {
        notFound()
    }

    return (
        <SessionResults
            session={session as any}
            sessionData={result.data as any}
        />
    )
}
