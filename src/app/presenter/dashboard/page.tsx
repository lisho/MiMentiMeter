
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Presentation } from '@/types'
import { getPresentations, createPresentation, deletePresentation, createSession } from '../actions'
import { PresentationCard } from '@/components/presenter/PresentationCard'
import { CreatePresentationModal } from '@/components/presenter/CreatePresentationModal'
import styles from './dashboard.module.css'

export default function PresenterDashboard() {
    const router = useRouter()
    const [presentations, setPresentations] = useState<Presentation[]>([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)

    useEffect(() => {
        loadPresentations()
    }, [])

    const loadPresentations = async () => {
        setLoading(true)
        const result = await getPresentations()
        if (result.data) {
            setPresentations(result.data)
        }
        setLoading(false)
    }

    const handleCreatePresentation = async (formData: FormData) => {
        const result = await createPresentation(formData)
        if (result.error) {
            throw new Error(result.error)
        }
        await loadPresentations()
    }

    const handleDeletePresentation = async (id: string) => {
        const result = await deletePresentation(id)
        if (!result.error) {
            setPresentations(presentations.filter(p => p.id !== id))
        }
    }

    const handleStartSession = async (presentationId: string) => {
        const result = await createSession(presentationId)
        if (result.data) {
            router.push(`/presenter/live/${result.data.id}`)
        }
    }

    const handleLogout = async () => {
        const response = await fetch('/api/auth/logout', { method: 'POST' })
        if (response.ok) {
            router.push('/login')
        }
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerContent}>
                    <Link href="/" className={styles.logo}>
                        <span className={styles.logoGradient}>MiMentiMeter</span>
                    </Link>
                    <nav className={styles.nav}>
                        <button className="btn btn-ghost" onClick={handleLogout}>
                            Cerrar Sesión
                        </button>
                    </nav>
                </div>
            </header>

            <main className={styles.main}>
                <div className={styles.welcome}>
                    <h1>Panel del Presentador</h1>
                    <p className="text-secondary">Gestiona tus presentaciones interactivas</p>
                </div>

                <div className={styles.actions}>
                    <button
                        className="btn btn-primary btn-lg"
                        onClick={() => setIsModalOpen(true)}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Nueva Presentación
                    </button>
                </div>

                <div className={styles.presentations}>
                    {loading ? (
                        <div className={styles.loadingState}>
                            <div className={styles.spinner}></div>
                            <p>Cargando presentaciones...</p>
                        </div>
                    ) : presentations.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>📊</div>
                            <h3>No tienes presentaciones aún</h3>
                            <p className="text-muted">
                                Crea tu primera presentación interactiva para comenzar
                            </p>
                        </div>
                    ) : (
                        presentations.map((presentation) => (
                            <PresentationCard
                                key={presentation.id}
                                presentation={presentation}
                                onDelete={handleDeletePresentation}
                                onStartSession={handleStartSession}
                            />
                        ))
                    )}
                </div>
            </main>

            <CreatePresentationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleCreatePresentation}
            />
        </div>
    )
}
