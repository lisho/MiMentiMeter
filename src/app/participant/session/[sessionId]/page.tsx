
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ParticipantSession } from './ParticipantSession'

interface PageProps {
    params: { sessionId: string }
}

export default async function SessionPage({ params }: PageProps) {
    const supabase = createClient()

    // Get session info
    const { data: session, error } = await supabase
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
        .eq('id', params.sessionId)
        .single()

    if (error || !session) {
        notFound()
    }

    // Get activities for this presentation
    const { data: activities } = await supabase
        .from('activities')
        .select('*')
        .eq('presentation_id', session.presentation_id)
        .order('order_index', { ascending: true })

    const presentation = session.presentations as unknown as { id: string; title: string } | null

    return (
        <ParticipantSession
            session={session as any}
            presentationTitle={presentation?.title || 'Presentación'}
            initialActivities={activities || []}
        />
    )
}
