
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Session, Activity, Response } from '@/types'
import { Button } from '@/components/ui/Button'
import { ResultsVisualization } from '@/components/presenter/ResultsVisualization' // Ensure this path is correct
import { exportSessionData } from '../../../results/actions'
import styles from './session-results.module.css'

interface SessionData {
    session: Session
    activities: Activity[]
    participants: { id: string; name: string }[]
    responses: Response[]
}

interface SessionResultsProps {
    session: any // Using any for session here due to the join in database query
    sessionData: SessionData
}

export function SessionResults({ session, sessionData }: SessionResultsProps) {
    const router = useRouter()
    const { activities, participants, responses } = sessionData
    const [currentIndex, setCurrentIndex] = useState(0)

    const currentActivity = activities.length > 0 ? activities[currentIndex] : null

    // Filter responses for the current activity
    const activityResponses = currentActivity
        ? responses.filter(r => r.activity_id === currentActivity.id)
        : []

    // Map answers for the visualization component
    const answers = activityResponses.map(r => r.answer || {})

    // Count participants for this activity (unique participant_ids)
    const uniqueParticipants = new Set(activityResponses.map(r => r.participant_id)).size

    const handleNext = () => {
        if (currentIndex < activities.length - 1) {
            setCurrentIndex(prev => prev + 1)
        }
    }

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1)
        }
    }

    const handleExport = async (format: 'json' | 'csv') => {
        const result = await exportSessionData(session.id, format)

        if (result.error || !result.data) {
            alert('Error al exportar datos')
            return
        }

        // Create download link
        const blob = new Blob([result.data], { type: format === 'json' ? 'application/json' : 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `session-${session.access_code}.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
    }

    if (!currentActivity) {
        return (
            <div className={styles.container}>
                <header className={styles.header}>
                    <div className={styles.headerLeft}>
                        <Link href={`/presenter/presentation/${session.presentation_id}`} className={styles.backButton}>
                            ←
                        </Link>
                        <h1>Resultados de Sesión</h1>
                    </div>
                </header>
                <div className={styles.main}>
                    <p>Esta sesión no tiene actividades.</p>
                </div>
            </div>
        )
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <Link href={`/presenter/presentation/${session.presentation_id}`} className={styles.backButton}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                    </Link>
                    <div className={styles.titleContainer}>
                        <h1>{session.presentations?.title || 'Presentación'}</h1>
                        <p className={styles.subtitle}>
                            Sesión del {new Date(session.created_at).toLocaleDateString()} - Código: {session.access_code}
                        </p>
                    </div>
                </div>
                <div>
                    <div className={styles.exportButtons}>
                        <Button variant="ghost" onClick={() => handleExport('csv')}>
                            📥 CSV
                        </Button>
                        <Button variant="ghost" onClick={() => handleExport('json')}>
                            📥 JSON
                        </Button>
                        <Button variant="secondary" onClick={() => router.push(`/presenter/presentation/${session.presentation_id}`)}>
                            Volver al Editor
                        </Button>
                    </div>
                </div>
            </header>

            <main className={styles.main}>
                <div className={styles.chartContainer}>
                    <div className={styles.statsBar}>
                        <div className={styles.statItem}>
                            <span className={styles.statLabel}>Actividad</span>
                            <span className={styles.statValue}>{currentIndex + 1} / {activities.length}</span>
                        </div>
                        <div className={styles.statItem}>
                            <span className={styles.statLabel}>Respuestas</span>
                            <span className={styles.statValue}>{activityResponses.length}</span>
                        </div>
                        <div className={styles.statItem}>
                            <span className={styles.statLabel}>Participantes</span>
                            <span className={styles.statValue}>{uniqueParticipants}</span>
                        </div>
                    </div>

                    <ResultsVisualization
                        activity={currentActivity}
                        initialResponses={activityResponses as any}
                    />
                </div>

                <div className={styles.navigation}>
                    <Button
                        onClick={handlePrev}
                        disabled={currentIndex === 0}
                        variant="secondary"
                    >
                        ← Anterior
                    </Button>

                    <span className={styles.navInfo}>
                        Navegar preguntas
                    </span>

                    <Button
                        onClick={handleNext}
                        disabled={currentIndex === activities.length - 1}
                        variant="primary"
                    >
                        Siguiente →
                    </Button>
                </div>
            </main>
        </div>
    )
}
