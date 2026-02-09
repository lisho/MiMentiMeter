
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LivePresenter } from './LivePresenter'

interface PageProps {
    params: { sessionId: string }
}

export default async function LiveSessionPage({ params }: PageProps) {
    const supabase = createClient()

    const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select(`
      *,
      presentations (
        id,
        title,
        description
      )
    `)
        .eq('id', params.sessionId)
        .single()

    if (sessionError || !session) {
        notFound()
    }

    const { data: activities } = await supabase
        .from('activities')
        .select('*')
        .eq('presentation_id', session.presentation_id)
        .order('order_index', { ascending: true })

    return (
        <LivePresenter
            session={session}
            presentation={session.presentations}
            activities={activities || []}
        />
    )
}
