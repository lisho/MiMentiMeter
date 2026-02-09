
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Presentation, Activity, ActivityType, Session } from '@/types'
import { createActivity, deleteActivity, createSession, deleteSession } from '../../actions'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ActivityEditor } from '@/components/presenter/ActivityEditor'
import { AddActivityModal } from '@/components/presenter/AddActivityModal'
import styles from './presentation.module.css'

interface PresentationEditorProps {
    presentation: Presentation
    initialActivities: Activity[]
    initialSessions: (Session & { response_count?: number })[]
}

const activityTypeLabels: Record<ActivityType, string> = {
    multiple_choice: 'Opción Múltiple',
    word_cloud: 'Nube de Palabras',
    open_text: 'Texto Abierto',
    scale: 'Escala',
    quiz: 'Quiz',
    true_false: 'Verdadero/Falso',
    image_choice: 'Opción con Imágenes',
}

const activityTypeIcons: Record<ActivityType, string> = {
    multiple_choice: '📊',
    word_cloud: '☁️',
    open_text: '✏️',
    scale: '📏',
    quiz: '🎯',
    true_false: '✅',
    image_choice: '🖼️',
}

export function PresentationEditor({ presentation, initialActivities, initialSessions }: PresentationEditorProps) {
    const router = useRouter()
    const [activities, setActivities] = useState<Activity[]>(initialActivities)
    const [sessions, setSessions] = useState<(Session & { response_count?: number })[]>(initialSessions)
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [sessionViewMode, setSessionViewMode] = useState<'grid' | 'list'>('grid')
    const [selectedActivity, setSelectedActivity] = useState<Activity | null>(
        activities.length > 0 ? activities[0] : null
    )

    const handleAddActivity = async (type: ActivityType, question: string, options: object) => {
        const formData = new FormData()
        formData.append('presentation_id', presentation.id)
        formData.append('type', type)
        formData.append('question', question)
        formData.append('options', JSON.stringify(options))

        const result = await createActivity(formData)
        if (result.data) {
            setActivities([...activities, result.data])
            setSelectedActivity(result.data)
        }
        setIsAddModalOpen(false)
    }

    const handleDeleteActivity = async (id: string) => {
        if (confirm('¿Estás seguro de eliminar esta actividad?')) {
            const result = await deleteActivity(id, presentation.id)
            if (!result.error) {
                const newActivities = activities.filter(a => a.id !== id)
                setActivities(newActivities)
                setSelectedActivity(newActivities.length > 0 ? newActivities[0] : null)
            }
        }
    }

    const handleStartSession = async () => {
        const result = await createSession(presentation.id)
        if (result.data) {
            router.push(`/presenter/live/${result.data.id}`)
        }
    }

    const handleDeleteSession = async (sessionId: string) => {
        if (confirm('¿Estás seguro de eliminar esta sesión? Se perderán todos los resultados.')) {
            const result = await deleteSession(sessionId)
            if (!result.error) {
                setSessions(sessions.filter(s => s.id !== sessionId))
            }
        }
    }

    const handleViewSession = (sessionId: string) => {
        router.push(`/presenter/session/${sessionId}/results`)
    }

    return (
        <div className={styles.container}>
            {/* Header */}
            <header className={styles.header}>
                <div className={styles.headerContent}>
                    <div className={styles.headerLeft}>
                        <Link href="/presenter/dashboard" className={styles.backButton}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="15 18 9 12 15 6" />
                            </svg>
                        </Link>
                        <div>
                            <h1 className={styles.title}>{presentation.title}</h1>
                            {presentation.description && (
                                <p className={styles.description}>{presentation.description}</p>
                            )}
                        </div>
                    </div>
                    <div className={styles.headerActions}>
                        <Button variant="primary" onClick={handleStartSession} className={styles.startBtn}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polygon points="5 3 19 12 5 21 5 3" />
                            </svg>
                            Iniciar Presentación
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Editor */}
            <div className={styles.editor}>
                {/* Sidebar - Activity List */}
                <aside className={styles.sidebar}>
                    <div className={styles.sidebarHeader}>
                        <h2>Actividades</h2>
                        <button
                            className={styles.addButton}
                            onClick={() => setIsAddModalOpen(true)}
                            aria-label="Añadir actividad"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                        </button>
                    </div>

                    <div className={styles.activityList}>
                        {activities.length === 0 ? (
                            <div className={styles.emptyActivities}>
                                <p>No hay actividades aún</p>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setIsAddModalOpen(true)}
                                >
                                    Añadir primera actividad
                                </Button>
                            </div>
                        ) : (
                            activities.map((activity, index) => (
                                <div
                                    key={activity.id}
                                    className={`${styles.activityItem} ${selectedActivity?.id === activity.id ? styles.selected : ''}`}
                                    onClick={() => setSelectedActivity(activity)}
                                >
                                    <span className={styles.activityIndex}>{index + 1}</span>
                                    <span className={styles.activityIcon}>{activityTypeIcons[activity.type]}</span>
                                    <div className={styles.activityInfo}>
                                        <span className={styles.activityType}>{activityTypeLabels[activity.type]}</span>
                                        <span className={styles.activityQuestion}>{activity.question}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </aside>

                {/* Main Content - Activity Editor */}
                <main className={styles.main}>
                    {selectedActivity ? (
                        <ActivityEditor
                            key={selectedActivity.id}
                            activity={selectedActivity}
                            onUpdate={(updated) => {
                                setActivities(activities.map(a => a.id === updated.id ? updated : a))
                                setSelectedActivity(updated)
                            }}
                            onDelete={() => handleDeleteActivity(selectedActivity.id)}
                        />
                    ) : (
                        <Card className={styles.emptyEditor} shouldGlass>
                            <div className={styles.emptyIcon}>📝</div>
                            <h3>Selecciona o crea una actividad</h3>
                            <p>Añade actividades a tu presentación para interactuar con tu audiencia</p>
                            <Button onClick={() => setIsAddModalOpen(true)}>
                                Añadir Actividad
                            </Button>
                        </Card>
                    )}
                </main>
            </div>

            {/* Sessions History Section */}
            {sessions.length > 0 && (
                <div className={styles.sessionsSection}>
                    <div className={styles.sessionsHeader}>
                        <h2 className={styles.sectionTitle}>📊 Sesiones Pasadas</h2>
                        <div className={styles.viewToggle}>
                            <button
                                className={`${styles.toggleBtn} ${sessionViewMode === 'grid' ? styles.active : ''}`}
                                onClick={() => setSessionViewMode('grid')}
                                title="Vista de Cuadrícula"
                            >
                                ⊞
                            </button>
                            <button
                                className={`${styles.toggleBtn} ${sessionViewMode === 'list' ? styles.active : ''}`}
                                onClick={() => setSessionViewMode('list')}
                                title="Vista de Lista"
                            >
                                ≡
                            </button>
                        </div>
                    </div>
                    <div className={sessionViewMode === 'grid' ? styles.sessionsGrid : styles.sessionsList}>
                        {sessions.map((session) => (
                            <Card key={session.id} className={sessionViewMode === 'grid' ? styles.sessionCard : styles.sessionListItem} shouldGlass>
                                <div className={styles.sessionHeader}>
                                    <div className={styles.sessionInfo}>
                                        <span className={styles.sessionCode}>
                                            Código: <strong>{session.access_code}</strong>
                                        </span>
                                        <span className={styles.sessionDate}>
                                            {new Date(session.created_at).toLocaleDateString('es-ES', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                        <div className={styles.sessionStatsSummary}>
                                            <span className={styles.statItem}>
                                                <strong>{session.response_count || 0}</strong> respuestas
                                            </span>
                                        </div>
                                    </div>
                                    <div className={styles.sessionStatus}>
                                        {session.is_live ? (
                                            <span className={styles.statusLive}>🟢 En vivo</span>
                                        ) : (
                                            <span className={styles.statusEnded}>⚫ Finalizada</span>
                                        )}
                                    </div>
                                </div>
                                <div className={styles.sessionActions}>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => handleViewSession(session.id)}
                                        className={styles.actionBtn}
                                    >
                                        👁️ Ver Resultados
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => handleDeleteSession(session.id)}
                                        className={styles.actionBtn}
                                    >
                                        🗑️ Eliminar
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            <AddActivityModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAdd={handleAddActivity}
            />

            <footer className={styles.footer}>
                <div className={styles.footerContent}>
                    <p>© 2026 MiMentiMeter • Dashboard del Presentador</p>
                </div>
            </footer>
        </div>
    )
}
