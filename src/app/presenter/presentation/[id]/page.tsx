
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PresentationEditor } from './PresentationEditor'

interface PageProps {
    params: { id: string }
}

export default async function PresentationPage({ params }: PageProps) {
    const supabase = createClient()

    const { data: presentation, error } = await supabase
        .from('presentations')
        .select('*')
        .eq('id', params.id)
        .single()

    if (error || !presentation) {
        notFound()
    }

    const { data: activities } = await supabase
        .from('activities')
        .select('*')
        .eq('presentation_id', params.id)
        .order('order_index', { ascending: true })

    const { data: sessions } = await supabase
        .from('sessions')
        .select('*')
        .eq('presentation_id', params.id)
        .order('created_at', { ascending: false })

    return (
        <PresentationEditor
            presentation={presentation}
            initialActivities={activities || []}
            initialSessions={sessions || []}
        />
    )
}
